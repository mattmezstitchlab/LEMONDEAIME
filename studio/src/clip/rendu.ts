/**
 * Le clip brodé, dessiné point par point dans le navigateur (WebGL 2) : rien n'est une vidéo.
 * À chaque image, une texture de 160 × 160 dit quel fil DMC va dans chaque point ; le nuanceur dessine ce point
 * dans le rendu demandé (réaliste, toile, demi-point, symboles, à plat), à n'importe quel grossissement (la loupe),
 * à l'endroit ou à l'envers, avec les points arrière sur les contours. Les fils se règlent un par un (illuminés, estompés, cachés).
 * Le dessin des fils reprend celui du rendu vidéo (scratchpad brodeur.py) : brin cylindrique, torsade, reflet, ombre portée.
 */
import { SYMBOLS, drawSymbol } from "../lib/symbols";

export const MODES = ["tissu", "toile", "symboles", "mosaique", "demi"] as const;
export type ModeClip = typeof MODES[number];
export const CODE_MODE: Record<ModeClip, number> = { tissu: 0, toile: 1, symboles: 2, mosaique: 3, demi: 4 };
const G = 160, MAX_PARTIES = 16, NB_FILS = 64;

const VS = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;

const FS = `#version 300 es
precision highp float; precision highp int; precision highp usampler2D;
uniform usampler2D uIdx; uniform sampler2D uPal; uniform sampler2D uSym; uniform sampler2D uMarque; uniform float uPulse;
uniform vec2 uTaille;            // la toile, en pixels (du canevas)
uniform vec3 uVue;               // centre de la vue (en cases) et cases par pixel
uniform vec4 uLoupe;             // x, y (pixels), rayon (pixels), grossissement (0 : pas de loupe)
uniform vec4 uTambour;           // la toile du Disque, posée sur le clip plein écran : x, y, rayon (pixels), grossissement (0 : pas de tambour)
uniform float uT, uBattue, uBrode, uBrodeT0, uEclat, uEnvers, uArriere, uGrille;
uniform vec2 uParties[${MAX_PARTIES}]; uniform int uNParties;
uniform int uNFils;
out vec4 o;

float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float front(vec2 c){ vec2 d = (c + .5 - ${G / 2}.) / ${G / 2}.; return length(d) / 1.41421 * .9 + h21(c) * .1; }
float ordre(vec2 c){ vec2 d = (c + .5 - ${G / 2}.) / ${G / 2}.; float f = length(d) / 1.41421 * .92 + h21(c + 7.) * .08;
  return f < .7071 ? 1.5708 * f * f : .7854 + .2146 * clamp((f - .7071) / .2929, 0., 1.); }

int modeCase(vec2 c){
  int m = int(uParties[0].y);
  for (int k = 1; k < ${MAX_PARTIES}; k++){ if (k >= uNParties) break; vec2 pk = uParties[k]; if (uT < pk.x) break;
    if (front(c) <= (uT - pk.x) / uBattue * 1.02) m = int(pk.y); }
  return m;
}

vec3 aida(vec2 uv, vec2 c){
  vec2 q = uv; float bloc = 1. - .40 * dot(q - .5, q - .5);
  float trame = .035 * sin(q.x * 31.4) * sin(q.y * 6.28) + .035 * sin(q.y * 31.4) * sin(q.x * 6.28);
  float bord = min(min(q.x, 1. - q.x), min(q.y, 1. - q.y));
  float sillon = 1. - .18 * exp(-pow(bord / .06, 2.));
  float coin = min(min(length(q), length(q - vec2(1., 0.))), min(length(q - vec2(0., 1.)), length(q - 1.)));
  float trou = 1. - .78 * exp(-pow(coin / .10, 2.));
  return vec3(236., 231., 219.) / 255. * bloc * sillon * trou * (1. + trame) * (1. + (h21(c + floor(uv * 6.)) - .5) * .04);
}

// un brin de a à b, tracé jusqu'à « fait » (0 → 1) : couleur, ombre portée ; renvoie le mélange sur « fond »
vec3 brin(vec3 fond, vec2 uv, vec2 a, vec2 b, float w, vec3 col, float phase, bool ombre, float fait){
  vec2 v = b - a; float L = length(v); vec2 u = v / L;
  float hw = w / 2.;
  if (ombre){ vec2 pp = uv - a - vec2(.03, .05); float uu = dot(pp, u), dd = abs(-pp.x * u.y + pp.y * u.x);
    float m = clamp((hw * 1.15 - dd) / .03, 0., 1.) * step(-hw * .3, uu) * step(uu, L * fait + hw * .3); fond *= 1. - .38 * m; }
  vec2 pp = uv - a; float uu = dot(pp, u), d = -pp.x * u.y + pp.y * u.x;
  float t = clamp(d / hw, -1., 1.);
  float cyl = .55 + .55 * sqrt(1. - t * t) - .12 * t;
  float tor = .86 + .14 * sin(uu / (hw * .9) * 3.1 + t * 2.2 + phase);
  float bout = pow(clamp(min(uu + hw * .45, L * fait + hw * .45 - uu) / (hw * .5), 0., 1.), .5);
  vec3 c = clamp(col * cyl * tor + exp(-pow((t + .35) / .22, 2.)) * .22 * tor, 0., 1.);
  float al = step(abs(d), hw) * clamp((hw - abs(d)) / .03, 0., 1.) * bout * step(-hw * .45, uu) * step(uu, L * fait + hw * .45);
  return mix(fond, c, al);
}

vec3 croix(vec3 fond, vec2 uv, vec2 c, vec3 col, float w, float marge, bool demi, float fait1, float fait2){
  float j = .02; vec2 r1 = (vec2(h21(c + 1.), h21(c + 2.)) - .5) * j * 2., r2 = (vec2(h21(c + 3.), h21(c + 4.)) - .5) * j * 2.;
  float i = marge;
  vec3 x = brin(fond, uv, vec2(i, 1. - i) + r1, vec2(1. - i, i) + r2, w, col, h21(c) * 6.28, false, fait1);
  if (!demi && fait2 > 0.) x = brin(x, uv, vec2(i, i) + r2.yx, vec2(1. - i, 1. - i) + r1.yx, w, col, h21(c + 9.) * 6.28, true, fait2);
  return x;
}

vec4 fil(uint k){ return texelFetch(uPal, ivec2(int(k), 0), 0); }
float lum(vec3 c){ return dot(c, vec3(.299, .587, .114)); }

// une case : son fil, son rendu ; « macro » : les points vivent (la loupe)
vec3 caseRendu(vec2 g, float macro){
  vec2 c = floor(g); vec2 uv = fract(g);
  if (uEnvers > .5) { c.x = ${G - 1}. - c.x; uv.x = 1. - uv.x; }
  if (c.x < 0. || c.y < 0. || c.x > ${G - 1}. || c.y > ${G - 1}.) return aida(uv, c) * .96;
  uint k = texelFetch(uIdx, ivec2(c), 0).r; vec4 f = fil(k); vec3 col = f.rgb;
  float etat = f.a;                        // 1 : montré ; ~.4 : estompé ; 0 : caché (la toile nue)
  int m = modeCase(c);
  if (macro > .5 && m != 4) m = 0;         // la loupe montre la vraie broderie (et ses symboles au bord)
  if (macro > 1.5) m = 2;
  // l'ouverture (et « Broder ») : un point n'existe qu'une fois brodé ; d'abord « / », puis « \\ »
  float a = pow(clamp((uT - uBrodeT0) / uBrode, 0., 1.), 2.6), o_ = ordre(c);
  float f1 = clamp((a - o_) / .0015, 0., 1.), f2 = clamp((a - o_ - .0015) / .0015, 0., 1.);
  if (macro > .5 && macro < 1.5){         // sous la loupe : à chaque battue, une vague de points se rebrode depuis le centre de la loupe
    float ph = fract(uT / uBattue * .5 + h21(c + 5.));
    f2 = min(f2, smoothstep(0., .45, ph));
  }
  bool clair = lum(col) > .86 && abs(col.r - col.b) < .06;
  if (uEnvers > .5){                       // l'envers (calculé) : de petits points droits, et les passages d'un point à l'autre
    vec3 fond = aida(uv, c);
    if (f1 <= 0. || etat < .05) return fond;
    vec3 x = brin(fond, uv, vec2(.12, .04), vec2(.12, .96), .30, col, h21(c) * 6.28, false, 1.);
    x = brin(x, uv, vec2(.88, .04), vec2(.88, .96), .30, col, h21(c + 1.) * 6.28, true, f2);
    for (int s = 2; s <= 3; s++){          // un passage : le même fil reprend deux ou trois cases plus loin
      vec2 n = c + vec2(float(s), 0.); if (n.x > ${G - 1}.) break;
      uint kn = texelFetch(uIdx, ivec2(n), 0).r; uint k1 = texelFetch(uIdx, ivec2(c + vec2(1., 0.)), 0).r;
      if (kn == k && k1 != k && h21(c + 11.) > .45){ x = brin(x, uv, vec2(.5, .62), vec2(1.02, .58), .16, col * .92, 0., false, 1.); break; }
    }
    for (int s = 2; s <= 3; s++){
      vec2 n = c - vec2(float(s), 0.); if (n.x < 0.) break;
      uint kn = texelFetch(uIdx, ivec2(n), 0).r; uint k1 = texelFetch(uIdx, ivec2(c - vec2(1., 0.)), 0).r;
      if (kn == k && k1 != k && h21(n + 11.) > .45){ x = brin(x, uv, vec2(-.02, .58), vec2(.5, .62), .16, col * .92, 0., false, 1.); break; }
    }
    return mix(fond, x, etat);
  }
  vec3 r;
  if (m == 3){ r = col; if (uv.x < .06 || uv.y < .06) r *= .8; }
  else if (m == 2){
    vec3 fond = 1. - (1. - col) * .62; float s = texture(uSym, (vec2(float(int(k) % 8), float(int(k) / 8)) + uv) / 8.).a;
    r = mix(fond, lum(fond) > .47 ? vec3(.08, .08, .094) : vec3(.98), s);
    if (uv.x < .04 || uv.y < .04) r = vec3(.745, .745, .77);
  }
  else if (f1 <= 0.) r = aida(uv, c);
  else if (m == 1 && clair) r = aida(uv, c);
  else if (m == 0){ vec3 fond = mix(aida(uv, c) * .25 + col * .45, aida(uv, c), 1. - f1); r = croix(fond, uv, c, col, .60, .05, false, f1, f2); }
  else r = croix(aida(uv, c), uv, c, col, .32, .11, m == 4, f1, f2);
  vec3 nu = m == 2 ? vec3(1.) : aida(uv, c);
  r = mix(nu, r, clamp(etat * 2.4 - .2, 0., 1.));            // caché : la toile nue
  if (etat > .05 && etat < .9) r = mix(vec3(lum(r)) * .9 + .1, r, .28);   // estompé
  // les points arrière : le contour des formes, un fil sombre sur le bord des cases (calculé là où deux fils s'opposent)
  if (uArriere > .5 && m != 3){
    vec3 nr = fil(texelFetch(uIdx, ivec2(min(c + vec2(1., 0.), vec2(${G - 1}.))), 0).r).rgb, nb = fil(texelFetch(uIdx, ivec2(min(c + vec2(0., 1.), vec2(${G - 1}.))), 0).r).rgb;
    vec3 noir = vec3(.09, .09, .1);
    if (abs(lum(nr) - lum(col)) > .28) r = brin(r, uv, vec2(1., -.02), vec2(1., 1.02), .16, noir, h21(c + 21.) * 6.28, true, 1.);
    if (abs(lum(nb) - lum(col)) > .28) r = brin(r, uv, vec2(-.02, 1.), vec2(1.02, 1.), .16, noir, h21(c + 22.) * 6.28, true, 1.);
  }
  if (m == 2 && uGrille > .5 && (mod(c.x, 10.) < .5 && uv.x < .07 || mod(c.y, 10.) < .5 && uv.y < .07)) r = vec3(.275, .275, .306);
  // les points marqués (les confettis : un point seul de sa couleur) battent, cerclés d'or
  if (uPulse > 0. && texelFetch(uMarque, ivec2(c), 0).r > .5){
    float d = length(uv - .5); r = mix(r, r * 1.25 + .12, uPulse);
    if (abs(d - .44) < .07) r = mix(r, vec3(1., .82, .2), uPulse);
  }
  return r * (1. + .10 * uEclat) + .024 * uEclat;
}

// où tombe un pixel dans la grille : dans le tambour (grossi), ou sur le fond (le clip plein écran) ; z : cases par pixel
vec3 place(vec2 p){
  if (uTambour.w > 0. && length(p - uTambour.xy) < uTambour.z){
    vec2 c = uVue.xy + (uTambour.xy - uTaille / 2.) * uVue.z; float z = uVue.z / uTambour.w; return vec3(c + (p - uTambour.xy) * z, z); }
  return vec3(uVue.xy + (p - uTaille / 2.) * uVue.z, uVue.z);
}
vec3 vue(vec2 p){
  vec3 q = place(p);
  // de loin, un pixel couvre une bonne part de point : quatre échantillons (sinon les brins scintillent)
  if (q.z > .08){ float e = q.z * .25; return (caseRendu(q.xy + vec2(-e, -e * .5), 0.) + caseRendu(q.xy + vec2(e, e * .5), 0.)
      + caseRendu(q.xy + vec2(-e * .5, e), 0.) + caseRendu(q.xy + vec2(e * .5, -e), 0.)) * .25; }
  return caseRendu(q.xy, 0.);
}
void main(){
  vec2 px = vec2(gl_FragCoord.x, uTaille.y - gl_FragCoord.y);
  vec3 r = vue(px);
  if (uTambour.w > 0.){ float dt = length(px - uTambour.xy); if (dt > uTambour.z - 1.5 && dt < uTambour.z + 1.) r *= .7; }
  if (uLoupe.w > 0.){
    float d = length(px - uLoupe.xy);
    if (d < uLoupe.z){
      vec3 q = place(uLoupe.xy);
      vec2 gz = q.xy + (px - uLoupe.xy) * q.z / uLoupe.w;
      float bord = smoothstep(uLoupe.z * .70, uLoupe.z * .76, d);
      vec3 l = caseRendu(gz, bord > .5 ? 2. : 1.);
      r = l * (1. - .25 * smoothstep(uLoupe.z * .9, uLoupe.z, d));
      if (abs(d - uLoupe.z * .73) < 1.) r = mix(r, vec3(1.), .55);
    }
    if (abs(d - uLoupe.z) < 2.5) r = vec3(.96, .95, .92);
    if (abs(d - uLoupe.z - 3.) < 1.2) r = vec3(.1);
  }
  o = vec4(r, 1.);
}`;

export interface EtatRendu {
  t: number; battue: number; brode: number; brodeT0: number; eclat: number;
  envers: boolean; arriere: boolean; grille: boolean;
  parties: [number, number][];
  /** centre de la vue (en cases) et cases par pixel */
  vue: [number, number, number];
  loupe: [number, number, number, number] | null;
  /** la toile du Disque sur le clip plein écran : x, y, rayon (pixels du canevas), grossissement */
  tambour?: [number, number, number, number] | null;
}

export class RenduClip {
  gl: WebGL2RenderingContext; prog: WebGLProgram; tIdx: WebGLTexture; tPal: WebGLTexture; tSym: WebGLTexture; tMarque: WebGLTexture;
  u: Record<string, WebGLUniformLocation | null> = {};
  constructor(public canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", { antialias: false, preserveDrawingBuffer: false });
    if (!gl) throw new Error("WebGL 2 indisponible");
    this.gl = gl;
    const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "nuanceur"); return s; };
    const p = gl.createProgram()!; gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || "programme");
    this.prog = p; gl.useProgram(p);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(p, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    for (const n of ["uIdx", "uPal", "uSym", "uTaille", "uVue", "uLoupe", "uTambour", "uT", "uBattue", "uBrode", "uBrodeT0", "uEclat", "uEnvers", "uArriere", "uGrille", "uParties", "uNParties", "uNFils", "uMarque", "uPulse"]) this.u[n] = gl.getUniformLocation(p, n);
    const tex = (unit: number) => { const t = gl.createTexture()!; gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
    this.tIdx = tex(0); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8UI, G, G, 0, gl.RED_INTEGER, gl.UNSIGNED_BYTE, new Uint8Array(G * G));
    this.tPal = tex(1); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, NB_FILS, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(NB_FILS * 4));
    this.tSym = tex(2); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlasSymboles());
    this.tMarque = tex(3); gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, G, G, 0, gl.RED, gl.UNSIGNED_BYTE, new Uint8Array(G * G));
    gl.uniform1i(this.u.uIdx, 0); gl.uniform1i(this.u.uPal, 1); gl.uniform1i(this.u.uSym, 2); gl.uniform1i(this.u.uMarque, 3);
  }
  /** les fils : leur couleur, et leur état (1 montré, .4 estompé, 0 caché) */
  palette(fils: { rgb: number[]; etat: number }[]) {
    const gl = this.gl, d = new Uint8Array(NB_FILS * 4);
    fils.forEach((f, i) => { d.set([f.rgb[0], f.rgb[1], f.rgb[2], Math.round(f.etat * 255)], i * 4); });
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.tPal); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, NB_FILS, 1, gl.RGBA, gl.UNSIGNED_BYTE, d);
    gl.uniform1i(this.u.uNFils, fils.length);
  }
  /** les points à montrer (1 octet par point : 255 marqué), et l'intensité du battement (0 : rien) */
  marque(m: Uint8Array | null, pulse = 0) {
    const gl = this.gl; if (m) { gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, this.tMarque); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, G, G, gl.RED, gl.UNSIGNED_BYTE, m); }
    gl.uniform1f(this.u.uPulse, pulse);
  }
  image(idx: Uint8Array) {
    const gl = this.gl; gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tIdx);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, G, G, gl.RED_INTEGER, gl.UNSIGNED_BYTE, idx);
  }
  dessiner(e: EtatRendu) {
    const gl = this.gl, c = this.canvas; gl.viewport(0, 0, c.width, c.height);
    gl.uniform2f(this.u.uTaille, c.width, c.height); gl.uniform3f(this.u.uVue, ...e.vue);
    gl.uniform4f(this.u.uLoupe, ...(e.loupe ?? [0, 0, 0, 0])); gl.uniform4f(this.u.uTambour, ...(e.tambour ?? [0, 0, 0, 0]));
    gl.uniform1f(this.u.uT, e.t); gl.uniform1f(this.u.uBattue, e.battue); gl.uniform1f(this.u.uBrode, e.brode); gl.uniform1f(this.u.uBrodeT0, e.brodeT0);
    gl.uniform1f(this.u.uEclat, e.eclat); gl.uniform1f(this.u.uEnvers, e.envers ? 1 : 0); gl.uniform1f(this.u.uArriere, e.arriere ? 1 : 0); gl.uniform1f(this.u.uGrille, e.grille ? 1 : 0);
    const p = new Float32Array(MAX_PARTIES * 2); e.parties.slice(0, MAX_PARTIES).forEach(([t, m], i) => { p[2 * i] = t; p[2 * i + 1] = m; });
    gl.uniform2fv(this.u.uParties, p); gl.uniform1i(this.u.uNParties, Math.min(MAX_PARTIES, e.parties.length));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}

/** les symboles du patron (les mêmes que l'atelier et le PDF : lib/symbols), 8 × 8 cases de 64 px, blancs sur transparent */
function atlasSymboles(): HTMLCanvasElement {
  const c = document.createElement("canvas"); c.width = c.height = 512; const ctx = c.getContext("2d")!;
  for (let k = 0; k < Math.min(64, NB_FILS); k++) drawSymbol(ctx, k % SYMBOLS.length, (k % 8) * 64 + 32, Math.floor(k / 8) * 64 + 32, 21, "#fff");
  return c;
}
