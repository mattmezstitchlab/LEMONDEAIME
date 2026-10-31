/**
 * LUMIERE — le rendu. Un seul shader (WebGL2) pour les matières : cosmos, nuages, brume, perle nacrée, goutte transparente,
 * eau. Un calque 2D, par-dessus, pour la géométrie Ripple (anneaux, repères, positions) et le Disque .0NE.
 * Les deux lisent le MÊME contrat d'onde (lib/onde/contrat) : les fronts qui ondulent dans l'eau sont exactement ceux que le
 * calque dessine en lignes. Chaque image est une fonction pure du temps t : rendu exact, image par image.
 */
import { ANNEAUX_PRINCIPAUX, ANNEAU_HEURES, ANNEAU_PERSONNES, fronts, polarXY, reperes, versAnneaux } from "../../lib/onde/contrat";
import { geometrieDisque } from "../../lib/tambour/disque";
import { ONDE_FILM, REPERES, scene, type Scene, type Voyage } from "./partition";
import { RAYON_DISQUE_SOL, type Atterrissage } from "./atterrissage";
export type FonctionScene = (t: number) => Scene;

const F = 1.6, D = 3.75, D0 = 1.9, SHIFT0 = -0.12, PHI0 = Math.atan(0.2 / F);
const MAX_FRONTS = 8;

const VERT = `#version 300 es
in vec2 a; 
void main(){ gl_Position = vec4(a, 0., 1.); }`;

const FRAG = `#version 300 es
precision highp float;
out vec4 o;
uniform vec2 uRes; uniform float uT, uQ;
uniform float uEtoiles, uNuages, uDefil, uBrume;
uniform vec4 uPerle; uniform float uPerleVis, uGoutte, uEtire;
uniform float uD; uniform float uEau, uPhi, uShift, uDepuis, uGrille, uCarres, uBlanc, uLueur, uRepli;
uniform vec4 uFronts[${MAX_FRONTS}]; uniform float uEsp;
/* le voyage (clip complet) : galaxie, ciel, mer de nuages, crépuscule, nuit, arc-en-ciel, Terre, herbe */
uniform float uGalaxie, uAvance, uCiel, uCrep, uNuit, uMer, uArc, uTraverse, uTerre, uAltSol, uPlongeeSol, uAvanceSol;
/* l'atterrissage : l'heure (0 = non utilisé · 1 nuit · 2 aube · 3 lever), le plan macro, la goutte ronde vue d'en haut, l'onde au sol */
uniform float uHeure, uMacro, uRond; uniform vec2 uCentreSol; uniform vec4 uOndeSol;

#define PI 3.14159265
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float bruit(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float s = 0., a = .5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 6; i++){ if (float(i) >= uQ) break; s += a*bruit(p); p = m*p; a *= .5; } return s; }

/* la nacre : un blanc irisé (interférence de couche mince) */
vec3 nacre(float x){ vec3 film = .5 + .5*cos(6.2832*(vec3(0., .33, .67) + x));
  return mix(vec3(.97, .965, 1.), mix(vec3(.85, .9, 1.), film, .55), clamp(x*.9, 0., 1.)); }

/* la lumière de la perle sur le monde (elle éclaire nuages, brume et particules) */
float lumierePerle(vec2 p){ vec2 d = p - uPerle.xy; return uPerleVis * uPerle.w * exp(-length(d)*3.2); }

/* ——— le voyage ——— */
vec3 spectre(float x){ return clamp(abs(fract(x + vec3(0., .667, .333))*6. - 3.) - 1., 0., 1.); }
vec3 galaxie(vec2 p){
  vec2 q = p*1.25 + vec2(uAvance*.035, uAvance*.01);
  float n = fbm(q*1.4 + vec2(fbm(q*2.1), fbm(q*2.1 + 4.))*.9);
  vec3 c = mix(vec3(.22, .1, .42), vec3(.08, .32, .48), fbm(q*2.6 + 5.));
  c = mix(c, vec3(.72, .36, .58), smoothstep(.55, .9, fbm(q*2.2 - 3.)));
  float bande = exp(-pow((p.y*.95 - p.x*.38 + .04*sin(p.x*3.))*2.2, 2.));
  return c*pow(n, 2.)*(.25 + 1.1*bande) + vec3(.9, .85, 1.)*pow(bande, 6.)*.08*fbm(q*9.);
}
float etoilesVoyage(vec2 p){
  float e = 0.;
  for (int k = 0; k < 4; k++){
    float z = fract(uAvance*.06 + float(k)*.25);
    vec2 g = p/(.12 + z*1.9)*26.; vec2 i = floor(g), f = fract(g) - .5; float r = h21(i + float(k)*17.);
    if (r > .935) e += smoothstep(.1, 0., length(f))*smoothstep(0., .3, z)*smoothstep(1., .75, z)*(r - .935)*16.;
  }
  return e;
}
vec3 cielJour(vec2 p){
  vec3 zen = mix(mix(vec3(.13, .38, .8), vec3(.26, .2, .5), uCrep), vec3(.02, .025, .07), uNuit);
  vec3 hor = mix(mix(vec3(.8, .9, .99), vec3(1., .62, .42), uCrep), vec3(.09, .08, .18), uNuit);
  vec3 c = mix(hor, zen, smoothstep(-.08, .55, p.y));
  vec2 sp = vec2(.42, mix(.24, -.03, uCrep)); float d = length(p - sp);
  /* un soleil doux : un disque crème, sans blanc brûlé, et un grand halo chaud (pas de saturation) */
  c = mix(c, mix(vec3(1., .93, .8), vec3(1., .66, .46), uCrep), smoothstep(.034, .026, d)*.82*(1. - uNuit));
  c += mix(vec3(1., .86, .68), vec3(1., .52, .34), uCrep)*(exp(-d*9.)*.2 + exp(-d*2.6)*.1)*(1. - uNuit);
  /* la nuit : les étoiles reviennent */
  vec2 q = p*90.; vec2 i = floor(q), f = fract(q) - .5; float r = h21(i + 3.);
  if (r > .975) c += vec3(.85, .9, 1.)*smoothstep(.08, 0., length(f))*(r - .975)*40.*uNuit*(.7 + .3*sin(uT*1.5 + r*40.))*smoothstep(-.1, .2, p.y);
  return c;
}
vec3 merNuages(vec2 p, vec3 ciel){
  float h0 = -.03; if (p.y > h0) return ciel;
  float d = .32/(h0 - p.y + .015);
  vec2 uv = vec2(p.x*d, d) + vec2(uT*.015, uT*.12);
  float n = fbm(uv*.32 + vec2(fbm(uv*.18), fbm(uv*.18 + 3.))*.7);
  vec3 lum = mix(mix(vec3(1., .99, .97), vec3(1., .7, .52), uCrep), vec3(.3, .33, .5), uNuit);
  vec3 omb = mix(mix(vec3(.6, .69, .85), vec3(.52, .36, .46), uCrep), vec3(.04, .05, .11), uNuit);
  vec3 c = mix(omb, lum, smoothstep(.32, .82, n));
  return mix(c, ciel, smoothstep(2.4, 10., d)*.9);
}
/* le sol, d'un continent à un brin d'herbe : Z est l'échelle du monde (grand = loin) */
vec3 solBrut(vec2 uv, float Z){
  vec2 u = uv*.05; float n = fbm(u*1.2);
  vec3 grand = mix(vec3(.04, .2, .4), mix(vec3(.2, .4, .16), vec3(.55, .5, .32), fbm(u*4.)), smoothstep(.47, .52, n));
  grand = mix(grand, vec3(.97), smoothstep(.56, .82, fbm(u*2.6 + 7. + uT*.004))*.85);
  vec2 c = uv*.6; vec2 ci = floor(c + .3*vec2(fbm(c*.3), fbm(c*.3 + 2.))); float hc = h21(ci);
  vec3 champs = mix(vec3(.28, .45, .16), vec3(.62, .56, .26), step(.7, hc)); champs = mix(champs, vec3(.2, .36, .12), step(.45, hc)*(1. - step(.7, hc)));
  vec2 f = fract(c + .3*vec2(fbm(c*.3), fbm(c*.3 + 2.))) - .5; champs *= .82 + .18*smoothstep(.5, .46, max(abs(f.x), abs(f.y)));
  vec2 g = uv*22.; float vent = sin(uT*.9 + g.y*.15)*.25;
  float brins = fbm(vec2(g.x*2.6 + vent, g.y*.55)); float fins = fbm(vec2(g.x*7. + vent*2., g.y*1.4));
  vec3 herbe = mix(vec3(.08, .25, .06), vec3(.4, .62, .2), brins*.7 + fins*.5)*(.8 + .35*fbm(uv*3.));
  vec3 col = mix(herbe, champs, smoothstep(.35, 1.4, Z));
  return mix(col, grand, smoothstep(4., 14., Z));
}
/* la lumière de l'heure sur le sol (atterrissage seulement) */
vec3 lumiereHeure(float h){
  vec3 nuit = vec3(.17, .21, .38), aube = vec3(.66, .72, .92), lever = vec3(1.12, 1., .84);
  return h < 2. ? mix(nuit, aube, clamp(h - 1., 0., 1.)) : mix(aube, lever, clamp(h - 2., 0., 1.));
}
/* une bande de lumière au passage d'un front de l'onde (d : distance au centre, en unités sol) */
float passage(float d, float r, float i){ float w = .0045; return i*exp(-pow((d - r)/w, 2.)); }
/* l'herbe vue d'en haut, de près : des brins (segments) aux orientations libres, en trois couches qui se recouvrent */
float segment(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba)/dot(ba, ba), 0., 1.); return length(pa - ba*h); }
vec4 brins(vec2 uv, float n, float graine){
  vec2 g = uv*n, gi = floor(g); float best = 0.; vec3 cb = vec3(0.);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
    vec2 c = gi + vec2(float(i), float(j)); float h = h21(c + graine), h2 = h21(c + graine + 17.), h3 = h21(c + graine + 41.);
    vec2 o = c + vec2(h, h2); float a = h3*6.2832 + .35*sin(uT*.6 + h*9.)*.08, L = .7 + .6*h2;
    vec2 d = vec2(cos(a), sin(a))*L*.5;
    float dist = segment(g, o - d, o + d), w = .06 + .03*h;
    float m = smoothstep(w, w*.35, dist);
    if (m > best){ best = m; float k = clamp(dot(g - (o - d), d)/(dot(d, d)*2.), 0., 1.);
      vec3 vert = mix(vec3(.1, .26, .08), vec3(.3, .5, .16), h*.8 + k*.35); cb = h3 > .93 ? vec3(.5, .46, .27)*(.8 + .3*k) : vert; }
  }
  return vec4(cb, best);
}
vec3 herbeHaut(vec2 uv){
  vec3 c = vec3(.03, .08, .035)*(.7 + .6*fbm(uv*30.));
  vec4 b = brins(uv, 120., 1.); c = mix(c, b.rgb*.75, b.a);
  b = brins(uv, 190., 7.); c = mix(c, b.rgb*.9, b.a);
  b = brins(uv, 300., 13.); c = mix(c, b.rgb, b.a*.9);
  return c*(.8 + .4*fbm(uv*9. + 3.));
}
vec3 sol(vec2 uv, float Z){
#ifndef ATTERRISSAGE
  return solBrut(uv, Z);
#else
  vec3 c = uHeure > .5 && Z < 1.4 ? herbeHaut(uv) : solBrut(uv, Z);
  if (uHeure < .5) return c;
  vec3 L = lumiereHeure(uHeure); c *= L;
  float d = length(uv - uCentreSol);
  float onde = passage(d, uOndeSol.x, uOndeSol.y) + passage(d, uOndeSol.z, uOndeSol.w);
  /* l'onde allume la prairie : une lumière nacrée, douce, qui passe */
  c += vec3(.62, .58, .9)*onde*.35*smoothstep(1.6, .3, Z);
  /* la rosée : de petites perles sur les brins ; chacune s'allume quand l'onde passe, puis garde une lueur */
  vec2 g = uv*420.; vec2 gi = floor(g), gf = fract(g) - .5; float h = h21(gi + 11.);
  if (h > .82){
    vec2 o = vec2(h21(gi + 3.), h21(gi + 7.)) - .5; float dd = length(gf - o*.5);
    float goutte = smoothstep(.16, .02, dd)*smoothstep(1.4, .25, Z);
    float eclat = .25 + .2*sin(uT*1.7 + h*40.);
    float vu = length(gi/420. - uCentreSol);
    float allume = passage(vu, uOndeSol.x, uOndeSol.y)*3. + passage(vu, uOndeSol.z, uOndeSol.w)*3. + smoothstep(uOndeSol.x, uOndeSol.x - .02, vu)*.35*step(.001, uOndeSol.y);
    c += mix(vec3(.75, .8, .95)*L, vec3(.95, .92, 1.), clamp(allume, 0., 1.))*goutte*(eclat + allume*1.6);
  }
  return c;
#endif
}
vec3 terre(vec2 p){
  float phi = mix(.62, 1.5707, uPlongeeSol), s = sin(phi), co = cos(phi);
  vec3 ro = vec3(0., s, -co), fw = normalize(-ro), rt = vec3(1., 0., 0.), up = cross(fw, rt);
  vec3 rd = normalize(fw*1.6 + rt*p.x + up*p.y);
  vec3 ciel = cielJour(p + vec2(0., .1));
  if (uHeure > .5) ciel = mix(mix(vec3(.2, .22, .42), vec3(.86, .7, .78), smoothstep(.3, -.05, p.y)), mix(vec3(.45, .6, .9), vec3(1., .78, .55), smoothstep(.3, -.05, p.y)), clamp(uHeure - 2., 0., 1.));
  /* la courbure : à haute altitude, l'horizon s'arrondit */
  float courbe = .1*smoothstep(4., 20., uAltSol)*(1. - uPlongeeSol)*p.x*p.x;
  if (rd.y + courbe > -.002) return ciel + vec3(.25, .35, .45)*exp(-abs(rd.y + courbe)*40.)*(1. - uPlongeeSol);
  float t = -ro.y/(rd.y + courbe); vec2 xz = (ro + rd*t).xz + vec2(0., uAvanceSol);
  vec3 c = sol(xz*uAltSol, uAltSol);
  vec3 brume = uHeure > .5 ? mix(vec3(.62, .66, .84), vec3(.95, .82, .7), clamp(uHeure - 2., 0., 1.)) : vec3(.72, .84, .96);
  return mix(c, brume, smoothstep(2.5, 14., t)*.55*(1. - uPlongeeSol));
}
float arcFronts(float r, out vec3 teinte){
  float g = 0.; teinte = vec3(0.);
  for (int k = 0; k < ${MAX_FRONTS}; k++){ vec4 f = uFronts[k]; if (f.w < .5) continue;
    float d = r - f.x, w = uEsp*.24, b = f.y*exp(-(d*d)/(2.*w*w))*smoothstep(.02, .25, f.x); g += b; teinte += mix(spectre(.62 - d/(w*3.2)), vec3(1.), .3)*b; }
  teinte /= max(g, 1e-4); return g;
}

vec3 cosmos(vec2 p){
  vec3 c = mix(vec3(.004, .006, .018), vec3(.012, .01, .03), smoothstep(-.6, .7, p.y));
  /* étoiles : trois profondeurs, scintillement lent */
  float e = 0.;
  for (int k = 0; k < 3; k++){ float s = 70. + float(k)*55.; vec2 q = p*s + vec2(float(k)*17.3, uDefil*float(k+1)*6.);
    vec2 i = floor(q), f = fract(q) - .5; float r = h21(i); if (r > .965){ float b = (r - .965)/.035;
      float tw = .65 + .35*sin(uT*(1.2 + r*2.) + r*40.); e += b*tw*smoothstep(.09, 0., length(f))*(1. - float(k)*.28); } }
  c += vec3(.8, .85, 1.)*e*uEtoiles;
  /* une nébuleuse à peine visible : l'immensité, pas un décor */
  c += vec3(.05, .035, .09)*fbm(p*1.2 + vec2(0., uDefil*.4))*uEtoiles*.6;
  return c;
}

vec3 nuages(vec2 p, vec3 c){
  if (uNuages <= 0.001 && uBrume <= 0.001) return c;
  float L = lumierePerle(p);
  /* trois couches qui défilent vers le haut quand la perle descend (parallaxe) */
  for (int k = 0; k < 3; k++){ float fk = float(k), z = 1. + fk*.7;
    vec2 q = p*z*1.4 + vec2(fk*7.1, -uDefil*(2.2 + fk*1.6) - uT*.01*(fk+1.));
    q += .35*vec2(fbm(q*.7 + 3.), fbm(q*.7 - 2.));                       /* déformation : volume */
    float d = smoothstep(.42 - fk*.04, .85, fbm(q));
    float bord = smoothstep(.0, .25, d) - smoothstep(.35, .9, d);
    vec3 ombre = vec3(.03, .028, .065), lumi = mix(vec3(.78, .76, .95), nacre(.15 + fbm(q*2.)*.35), .3)*1.05;
    vec3 col = ombre + lumi*(.16 + 1.9*L)*(.4 + bord) + vec3(.06, .05, .1)*.4;
    c = mix(c, col, d*uNuages*(.55 + fk*.15));
  }
  /* la brume : un voile éclairé de l'intérieur ; les particules en suspension se révèlent près de la perle */
  float b = fbm(p*2.2 + vec2(uT*.03, -uDefil*1.5));
  c = mix(c, vec3(.15, .14, .23) + vec3(.85, .83, 1.)*L*.8, uBrume*.55*smoothstep(.2, .9, b));
  float part = 0.;
  for (int k = 0; k < 2; k++){ vec2 q = p*(38. + float(k)*30.) + vec2(uT*.08, -uDefil*20. + uT*.05*float(k+1));
    vec2 i = floor(q), f = fract(q) - .5 + .3*vec2(h21(i+1.) - .5, h21(i+2.) - .5);
    float r = h21(i); if (r > .9) part += smoothstep(.06, .0, length(f))*(r - .9)*10.; }
  c += nacre(.5)*part*(.04 + 2.4*L)*max(uBrume, uNuages*.6);
  return c;
}

/* la surface : la somme des fronts du contrat (même formule que hauteur()) */
float hauteurEau(float r){
  float h = 0.;
  for (int k = 0; k < ${MAX_FRONTS}; k++){ vec4 f = uFronts[k]; if (f.w < .5) continue;
    float d = r - f.x, w = uEsp*.5; h += f.y*exp(-(d*d)/(2.*w*w))*cos(d/uEsp*2.*PI + f.z*2.*PI); }
  return h;
}
float lueurFronts(float r){
  float g = 0.;
  for (int k = 0; k < ${MAX_FRONTS}; k++){ vec4 f = uFronts[k]; if (f.w < .5) continue;
    float d = r - f.x; g += f.y*exp(-(d*d)/(2.*pow(uEsp*.16, 2.))); }
  return g;
}

/* le ciel au-dessus de l'eau (et le ciel réfléchi) */
vec3 cielEau(vec3 rd, vec2 pPerle){
  float y = max(rd.y, 0.);
  vec3 c = mix(vec3(.11, .1, .17), vec3(.012, .012, .035), pow(y, .45));
  c += vec3(.13, .12, .2)*exp(-y*5.)*.55 + vec3(.1, .09, .15)*exp(-y*28.)*.25;                                  /* la brume sur l'horizon */
  return c;
}

vec3 eau(vec2 p, vec2 q, out float masque){
  float s = sin(uPhi), co = cos(uPhi);
  vec3 ro = vec3(0., uD*s, -uD*co), fw = normalize(-ro), rt = vec3(1., 0., 0.), up = cross(fw, rt);
  vec3 rd = normalize(fw*${F.toFixed(2)} + rt*q.x + up*q.y);
  if (rd.y > -.0005){ masque = 0.; return cielEau(rd, uPerle.xy); }
  masque = 1.;
  float t = -ro.y/rd.y; vec3 hit = ro + rd*t; vec2 xz = hit.xz; float r = length(xz);
  /* la normale : dérivée radiale de la hauteur + une micro-agitation infime (l'eau vit, sans bouger avant l'impact) */
  float e = .002, dh = (hauteurEau(r + e) - hauteurEau(r - e))/(2.*e);
  vec2 dir = r > 1e-4 ? xz/r : vec2(0.);
  float micro = (fbm(xz*9. + uT*.15) - .5)*.0016;
  vec3 n = normalize(vec3(-dh*dir.x*.12 + micro*2.2, 1., -dh*dir.y*.12 + micro*1.6));
  vec3 rf = reflect(rd, n);
  float fres = .02 + .98*pow(1. - max(dot(-rd, n), 0.), 5.);
  vec3 refl = cielEau(rf, uPerle.xy);
  /* le reflet de la goutte : miroir de sa position par rapport au point de contact (avant l'impact) */
  vec2 m = vec2(p.x, 2.*uShift - p.y) + n.xz*.5;
  vec2 dp = m - uPerle.xy; float rr = uPerle.z*(1. + .6*uGoutte);
  refl += nacre(.4)*uPerleVis*uPerle.w*(exp(-length(dp)/(rr*1.1))*.7 + exp(-length(dp)*12.)*.12)*(1. - uEtire*.3);
  /* sous la surface : l'eau profonde ; la lumière entrée dans l'eau au centre ; la grille d'ATLAS */
  /* le chemin de lumière : la perle (au-dessus du point de contact) se reflète en scintillant */
  vec3 Lp = vec3(0., .55*uD/3.75, 0.);
  float sc = pow(max(dot(rf, normalize(Lp - hit)), 0.), 380.);
  refl += vec3(.92, .9, 1.)*sc*uPerleVis*uPerle.w*2.2 + vec3(.6, .58, .8)*pow(max(dot(rf, normalize(Lp - hit)), 0.), 30.)*uPerleVis*.05;
  vec2 sous = xz + n.xz*.35;
  vec3 prof = vec3(.006, .012, .028);
  float entree = smoothstep(0., .08, uDepuis)*exp(-max(uDepuis, 0.)*.08);
  prof += nacre(.35)*entree*exp(-length(sous)*9.)*.9;
  float cellule = .125;
  vec2 g = sous/cellule, gi = floor(g), gf = abs(fract(g) - .5);
  float lignes = smoothstep(.49, .5, max(gf.x, gf.y));
  float carre = step(.86 - uCarres*.22, h21(gi + 3.))*smoothstep(.48, .3, max(gf.x, gf.y));
  float revele = smoothstep(.0, .35, uGrille)*smoothstep(1.15, .15, length(gi*cellule)/(.2 + uGrille*1.1));
  vec3 grille = mix(vec3(.82, .84, 1.), nacre(.2 + h21(gi)*.5), .35)*(lignes*.16*uGrille + carre*.3*uCarres*(.7 + .3*sin(uT*1.2 + h21(gi)*12.)))*revele;
  vec3 col = mix(prof + grille, refl, fres);
  /* la lumière des fronts (la ligne de l'onde) ; elle s'affirme quand la caméra s'élève */
  float lu = lueurFronts(r);
  col += mix(vec3(.85, .85, 1.), nacre(.3 + r*.4), .4)*lu*(.22 + .45*uLueur)*smoothstep(4., .2, r)*(1. - uArc*.7);
  if (uArc > .001){ vec3 te; float ga = arcFronts(r, te); col += te*ga*uArc*.9*smoothstep(5., .2, r); }
  /* une lumière douce et brève au contact (pas d'explosion) */
  float flash = exp(-max(uDepuis, 0.)*5.)*step(0., uDepuis);
  col += vec3(.95, .93, 1.)*flash*(exp(-r*18.)*1.8 + exp(-r*4.)*.25);
  /* la brume au loin */
  col = mix(col, cielEau(vec3(rd.x, 0.002, rd.z), uPerle.xy), smoothstep(5., 26., t)*.85);
  return col;
}

/* la perle, puis la goutte (même objet) ; sa lumière doit exister même sur quelques pixels */
/* le creux : macro de la goutte suspendue. Derrière, l'aube floue (bokeh) ; dans la goutte, le monde inversé :
   la prairie en haut, le Disque au milieu de la prairie, le ciel de l'aube et l'arc-en-ciel en bas. */
vec3 macroFond(vec2 p){
  vec3 c = mix(vec3(.16, .3, .2), mix(vec3(.82, .66, .78), vec3(.36, .44, .74), smoothstep(-.02, .5, p.y)), smoothstep(-.12, .02, p.y));
  for (int k = 0; k < 2; k++){ float s = 5. + float(k)*4.; vec2 g = p*s + vec2(float(k)*3.1, 0.); vec2 gi = floor(g), gf = fract(g) - .5; float h = h21(gi + float(k)*9.);
    if (h > .55) c += mix(vec3(.95, .85, .9), vec3(.7, .9, .75), step(p.y, -.05))*smoothstep(.42, .36, length(gf - (vec2(h21(gi + 2.), h21(gi + 5.)) - .5)*.3))*.07*(h - .55)*2.2; }
  return c;
}
vec3 mondeInverse(vec2 u){
  float v = u.y;   /* la lentille inverse : le bas du monde (la prairie) apparaît en haut */
  vec3 ciel = mix(vec3(.3, .36, .66), vec3(.95, .74, .78), smoothstep(-.9, .05, v));
  float r = length(vec2(u.x, v + 1.25)); float arc = smoothstep(.06, 0., abs(r - .95));
  ciel = mix(ciel, mix(spectre(.76*(1. - clamp((r - .89)/.12, 0., 1.))), vec3(1.), .35), arc*.45*step(v, .05));
  vec3 pre = mix(vec3(.3, .44, .3), vec3(.16, .3, .18), smoothstep(.1, 1.2, v))*(.9 + .2*fbm(u*6.));
  vec2 dq = vec2(u.x*1.8, (v - .42)*4.); float dd = length(dq);
  pre = mix(pre, vec3(.08), smoothstep(.2, .17, dd)); pre = mix(pre, vec3(.86, .82, .74), smoothstep(.11, .09, dd));
  vec3 c = mix(ciel, pre, smoothstep(-.25, .35, v));
  return c*.95 + vec3(.05);
}
vec4 perle(vec2 p, vec3 fond){
  if (uPerleVis <= .001) return vec4(0.);
  vec2 q = p - uPerle.xy; float r = uPerle.z;
  q.y /= (1. + uEtire*.18);                                          /* l'étirement de la chute */
  /* la forme : une sphère qui devient goutte (pointe vers le haut) */
  float gs = uGoutte*(1. - uRond);
  float haut = r*(1. + 1.25*gs);
  float larg = q.y <= 0. ? r*sqrt(max(0., 1. - (q.y*q.y)/(r*r))) : mix(r*sqrt(max(0., 1. - (q.y*q.y)/(r*r))), r*pow(max(0., 1. - q.y/haut), 1.25 + .4*gs)*(1. - .02*gs), smoothstep(.0, .6, gs));   /* la perle est ronde ; elle s'effile en devenant goutte */
  float dedans = (q.y > -r && q.y < max(haut, r) && larg > 0.) ? smoothstep(1.5/uRes.y, -1.5/uRes.y, abs(q.x) - larg) : 0.;
  float d = length(q);
  vec3 c = vec3(0.); float a = 0.;
  /* le halo et l'éclat (lisibles quand la perle n'occupe que quelques pixels) */
  float halo = (exp(-max(d - r, 0.)/(r*1.6 + .004))*.55 + exp(-d*18.)*.18)*(1. - .82*uMacro);
  float tw = .8 + .2*sin(uT*2.1);
  float etoile = (exp(-abs(q.x)*900.)*exp(-abs(q.y)*60.) + exp(-abs(q.y)*900.)*exp(-abs(q.x)*60.))*smoothstep(.02, .004, r)*tw;
  c += nacre(.35)*(halo + etoile*.8)*uPerle.w; a = 0.;
  if (dedans > 0.){
    vec2 u = vec2(q.x/max(larg, 1e-5), q.y <= 0. ? q.y/r : q.y/haut);
    vec3 n = normalize(vec3(u.x, u.y*.8, sqrt(max(.02, 1. - dot(u, u)*.7))));
    vec3 L = normalize(vec3(-.45, .6, .65));
    float dif = max(dot(n, L), 0.), spec = pow(max(dot(reflect(-L, n), vec3(0, 0, 1)), 0.), 70.), bord = pow(1. - n.z, 2.2);
    /* perle : nacre opaque, irisée sur les bords */
    float grand = smoothstep(.03, .15, r);   /* de près, la nacre est plus douce (moins d'arc-en-ciel au bord) */
    vec3 nac = nacre(.15 + bord*(1.1 - .7*grand) + .08*sin(uT*.7))*(.42 + .62*dif) + spec*1.2 + nacre(.8)*bord*.25;
    /* goutte : transparente ; elle réfracte le fond (décalé) et garde un cœur nacré */
    /* une goutte est une lentille : elle montre le monde inversé (la brume de l'horizon passe en bas) */
    vec3 refr = mix(vec3(.05, .05, .09), vec3(.42, .4, .58), smoothstep(.4, -.6, u.y))*.9 + fond*.25;
#ifdef ATTERRISSAGE
    if (uMacro > .5) refr = mondeInverse(u);
    else if (uHeure > .5) refr = terre(uPerle.xy - (p - uPerle.xy)*2.4)*1.15 + vec3(.04, .04, .07);
#endif
    float dc = length(q - vec2(0., -r*.12))/r;
    vec3 coeur = nacre(.25 + .2*sin(uT))*(smoothstep(.62, .12, dc)*1.15 + smoothstep(1., .3, dc)*.18)*(1. - .55*uMacro)*(1. - .85*smoothstep(.03, .15, r));
    float caus = smoothstep(.35, 0., length(q - vec2(r*.1, -r*.62))/r)*.9*(1. - .75*uMacro)*(1. - .8*smoothstep(.03, .15, r));
    vec3 gtt = refr + coeur + spec*1.6 + bord*vec3(.62, .64, .82)*1.1 + vec3(.95, .93, 1.)*caus;
    /* l'Orbe du site AIME : nacre blanche, bleue, lavande, rose et menthe, avec une transparence qui respire */
    vec3 site = mix(mix(vec3(1.), vec3(.85, .91, 1.), smoothstep(.0, .5, length(u - vec2(-.3, .35)))), mix(vec3(.79, .72, 1.), vec3(1., .84, .93), .5 + .5*u.x), smoothstep(.4, 1., length(u)));
    site = mix(site, vec3(.72, .94, .89), smoothstep(.75, 1., length(u))*.6);
    vec3 m = mix(mix(nac, mix(site, fond, .18 + .1*sin(uT*.7 + u.y*2.)) + spec*.8, .7), gtt, uGoutte);
#ifdef ATTERRISSAGE
    if (uMacro > .5){ vec3 site = mix(mix(vec3(1.), vec3(.85, .91, 1.), smoothstep(.0, .5, length(u - vec2(-.3, .35)))), mix(vec3(.79, .72, 1.), vec3(1., .84, .93), .5 + .5*u.x), smoothstep(.4, 1., length(u)));
      m = mix(gtt, site, .66 + .14*sin(uT*.6 + u.y*3.)) + spec*.6; }   /* l'Orbe du site AIME : nacre, transparence qui varie */
#endif
    c = mix(c, m, dedans); a = dedans;
  }
  return vec4(c*uPerleVis, a*uPerleVis);
}


void main(){
  vec2 p = (gl_FragCoord.xy - .5*uRes)/uRes.y;
  vec3 col = cosmos(p);
  if (uGalaxie > .001) col += galaxie(p)*uGalaxie + vec3(.85, .88, 1.)*etoilesVoyage(p)*uGalaxie;
  if (uCiel > .001){ vec3 c = cielJour(p); if (uMer > .001) c = mix(c, merNuages(p, c), uMer); col = mix(col, c, uCiel); }
  col = nuages(p, col);
  if (uEau > .001){
    float m; vec3 w = eau(p, p - vec2(0., uShift), m);
    col = mix(col, w, uEau);
  }
  if (uTerre > .001) col = mix(col, terre(p), uTerre);
  /* on traverse l'arc-en-ciel : ses anneaux s'ouvrent autour de nous, puis la lumière du jour */
  if (uTraverse > .001){
    vec2 c0 = vec2(0., uShift); float R = uTraverse*uTraverse*2.6, d = length(p - c0) - R;
    /* un seul arc-en-ciel, une bande fine (rouge dehors, violet dedans), qui s'ouvre autour de nous et nous dépasse */
    float x = d/.085; float bande = smoothstep(1., .55, abs(x));
    col = mix(col, mix(spectre(.76*(1. - clamp(x*.5 + .5, 0., 1.))), vec3(1.), .22), bande*.6*smoothstep(0., .12, uTraverse)*step(uTraverse, 1.));
    /* de l'autre côté de l'arc : la lumière du jour, qui se lève comme un voile (uTraverse > 1 : le voile se retire sur la Terre) */
    col = mix(col, vec3(.86, .93, 1.), smoothstep(.72, 1., uTraverse)*(1. - smoothstep(1., 2., uTraverse))*step(d, 0.)*.9);
  }
#ifdef ATTERRISSAGE
  if (uMacro > .5) col = macroFond(p);
#endif
  vec4 pe = perle(p, col);
  col = col*(1. - pe.a) + pe.rgb;
  /* le Point au centre, pendant RIPPLE et ATLAS : la lumière entrée dans l'eau, qui ne s'éteint jamais */
  vec2 centre = vec2(0., uShift);
  float rc = length(p - centre);
  col += nacre(.3)*uLueur*(exp(-rc*60.)*.9 + exp(-rc*10.)*.08)*(1. - uRepli*.0);
  /* le blanc AIME : il naît du Point et s'étend */
  float front = uBlanc*1.9;
  float bl = max(smoothstep(front, front - .35, rc), pow(uBlanc, 3.));
  col = mix(col, vec3(.984, .984, .992), bl);
  /* le Point nacré, repris par le Disque replié : il ne disparaît jamais (même taille que l'Orbe de la marque .0NE) */
  float rp = 11./720.;
  vec2 qp = (p - centre)/rp; float dpt = length(qp);
  if (uRepli > 0.){ vec3 n3 = normalize(vec3(qp, sqrt(max(0., 1. - dpt*dpt))));
    vec3 pt = nacre(.15 + pow(1. - n3.z, 2.)*1.1)*(.75 + .3*max(dot(n3, normalize(vec3(-.4, .6, .7))), 0.));
    float m = smoothstep(1.04, .96, dpt)*uRepli;
    col = mix(col, pt, m);
    col = mix(col, col*.86 + vec3(.79, .72, 1.)*.14, smoothstep(2.6, 1., dpt)*(1. - smoothstep(1., .96, dpt))*uRepli*bl); }
  /* grain très léger et vignette (cinéma) */
  col *= mix(1., .82 + .18*smoothstep(1.1, .2, length(p)), 1. - bl);
  col += (h21(gl_FragCoord.xy + uT*60.) - .5)*.012*(1. - bl);
  o = vec4(pow(max(col, 0.), vec3(1./1.08)), 1.);
}`;

export interface OptionsRendu { qualite?: number; echelle?: number; /** compiler aussi l'atterrissage (herbe, rosée, macro) : un shader plus lourd, seulement quand le montage en a besoin */ atterrissage?: boolean; /** prévenu quand le contexte graphique est perdu (GPU surchargé, veille…) */ surPerte?: () => void }

export class Rendu {
  gl: WebGL2RenderingContext;
  prog!: WebGLProgram;
  u: Record<string, WebGLUniformLocation | null> = {};
  ctx: CanvasRenderingContext2D;
  derniere: Scene | null = null;
  perdu = false;
  /** une destruction voulue (fin du film) n'est pas une panne */
  detruit = false;
  constructor(public toile: HTMLCanvasElement, public calque: HTMLCanvasElement, public opts: OptionsRendu = {}) {
    const gl = toile.getContext("webgl2", { antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    if (!gl) throw new Error("WebGL2 indisponible");
    this.gl = gl;
    /* le contexte peut être perdu (GPU surchargé, mise en veille) : on le dit, on attend sa restauration, on reprend */
    toile.addEventListener("webglcontextlost", e => { e.preventDefault(); this.perdu = true; if (!this.detruit) this.opts.surPerte?.(); });
    toile.addEventListener("webglcontextrestored", () => { try { this.initialiser(); this.perdu = false; } catch { /* le lecteur recrée un rendu */ } });
    this.initialiser();
    this.ctx = calque.getContext("2d")!;
  }

  private initialiser() {
    const gl = this.gl;
    const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader"); return s; };
    const p = gl.createProgram()!; gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, this.opts.atterrissage ? FRAG.replace("precision highp float;", "precision highp float;\n#define ATTERRISSAGE") : FRAG)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? "programme");
    this.prog = p; gl.useProgram(p);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(p, "a"); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    for (const n of ["uRes", "uT", "uQ", "uEtoiles", "uNuages", "uDefil", "uBrume", "uPerle", "uPerleVis", "uGoutte", "uEtire", "uD", "uEau", "uPhi", "uShift", "uDepuis", "uGrille", "uCarres", "uBlanc", "uLueur", "uRepli", "uFronts", "uEsp", "uGalaxie", "uAvance", "uCiel", "uCrep", "uNuit", "uMer", "uArc", "uTraverse", "uTerre", "uAltSol", "uPlongeeSol", "uAvanceSol", "uHeure", "uMacro", "uRond", "uCentreSol", "uOndeSol"]) this.u[n] = gl.getUniformLocation(p, n);
  }

  /** dimensionner les deux toiles (la toile WebGL peut être rendue plus petite : `echelle`) */
  taille(l: number, h: number, dpr: number) {
    const e = this.opts.echelle ?? 1;
    this.toile.width = Math.round(l * dpr * e); this.toile.height = Math.round(h * dpr * e);
    this.calque.width = Math.round(l * dpr); this.calque.height = Math.round(h * dpr);
  }

  /** la géométrie de l'onde à l'instant t : les fronts du contrat ; en V, ils rejoignent les anneaux Ripple */
  geometrie(s: Scene) {
    const fs = fronts(ONDE_FILM, s.t).slice(0, MAX_FRONTS);
    const poses = versAnneaux(fs.map(f => f.rayon), s.ripple);
    const parRayon = [...fs].sort((a, b) => a.rayon - b.rayon);
    return parRayon.map((f, i) => ({ ...f, rayon: poses[i], intensite: s.ripple > 0 ? Math.max(f.intensite, .35 * s.ripple) : f.intensite }));
  }

  /** Rendre une image. `t` : le temps du RÉCIT (ce que décrit la partition) ; `reel` : le temps du film, qui anime les
      matières (nuages qui dérivent, étoiles qui scintillent) même quand le récit avance lentement (chapitre complet). */
  rendre(t: number, reel: number = t, fonction: FonctionScene = scene) {
    const s = fonction(t); this.derniere = s;
    if (this.perdu || this.gl.isContextLost()) return s;
    const gl = this.gl, W = this.toile.width, H = this.toile.height, u = this.u;
    gl.viewport(0, 0, W, H);
    const asp = W / H;
    const shift = SHIFT0 * (1 - s.plongee), phi = PHI0 + (Math.PI / 2 - PHI0) * s.plongee;
    gl.uniform2f(u.uRes, W, H); gl.uniform1f(u.uT, s.gel ? reel - (t - REPERES.suspension.t) : reel);   /* pendant le creux, les matières se figent */ gl.uniform1f(u.uQ, this.opts.qualite ?? 6);
    gl.uniform1f(u.uEtoiles, s.etoiles); gl.uniform1f(u.uNuages, s.nuages); gl.uniform1f(u.uDefil, s.defilement); gl.uniform1f(u.uBrume, s.brume);
    const chute = t >= REPERES.chute.t && t < REPERES.contact.t ? (t - REPERES.chute.t) / (REPERES.contact.t - REPERES.chute.t) : 0;
    gl.uniform4f(u.uPerle, (s.perle.x - 0.5) * asp, 0.5 - s.perle.y, s.perle.r, s.perle.eclat);
    gl.uniform1f(u.uPerleVis, s.perle.visible); gl.uniform1f(u.uGoutte, s.goutte); gl.uniform1f(u.uEtire, chute * chute);
    gl.uniform1f(u.uD, D0 + (D - D0) * s.plongee); gl.uniform1f(u.uEau, s.eau); gl.uniform1f(u.uPhi, phi); gl.uniform1f(u.uShift, shift); gl.uniform1f(u.uDepuis, s.depuisContact);
    gl.uniform1f(u.uGrille, s.grille); gl.uniform1f(u.uCarres, s.carres); gl.uniform1f(u.uBlanc, s.blanc);
    gl.uniform1f(u.uLueur, s.depuisContact > 0 ? Math.min(1, s.plongee * 1.2 + 0.15) * (1 - s.repli) : 0); gl.uniform1f(u.uRepli, s.repli);
    const g = this.geometrie(s), arr = new Float32Array(MAX_FRONTS * 4);
    g.forEach((f, i) => { arr.set([f.rayon, f.intensite, f.phase, 1], i * 4); });
    gl.uniform4fv(u.uFronts, arr); gl.uniform1f(u.uEsp, ONDE_FILM.espacement);
    const v = s.voyage;
    for (const [k, val] of [["uGalaxie", v?.galaxie], ["uAvance", v?.avance], ["uCiel", v?.ciel], ["uCrep", v?.crepuscule], ["uNuit", v?.nuit], ["uMer", v?.mer], ["uArc", v?.arc], ["uTraverse", v?.traverse],
      ["uTerre", v?.terre], ["uAltSol", v?.altitude ?? 1], ["uPlongeeSol", v?.plongeeSol], ["uAvanceSol", v?.avanceSol]] as const) gl.uniform1f(u[k], val ?? 0);
    const at = (v as (Voyage & { att?: Atterrissage }) | undefined)?.att;
    gl.uniform1f(u.uHeure, at?.heure ?? 0); gl.uniform1f(u.uMacro, at?.macro ?? 0); gl.uniform1f(u.uRond, at?.rond ?? 0);
    gl.uniform2f(u.uCentreSol, at?.centreSol[0] ?? 0, at?.centreSol[1] ?? 0); gl.uniform4f(u.uOndeSol, ...(at?.ondeSol ?? [0, 0, 0, 0]));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.dessinerCalque(s, g);
    return s;
  }

  /** le calque géométrique : seulement quand la caméra est verticale (les anneaux sont alors de vrais cercles) */
  dessinerCalque(s: Scene, g: { rayon: number; intensite: number }[]) {
    const c = this.ctx, W = this.calque.width, H = this.calque.height;
    c.clearRect(0, 0, W, H);
    const vue = Math.pow(s.plongee, 4) * (1 - s.blanc);
    const cx = W / 2, cy = H / 2, echelle = (F / D) * H;          // 1 unité du cadran → pixels (caméra verticale)
    const ligne = Math.max(1, H / 900);
    if (vue > 0.01 && s.ripple > 0.01) {
      const visibles = 1 - s.disque * 0.85;
      c.lineWidth = ligne;
      for (const f of g) { c.strokeStyle = `rgba(244,241,255,${(0.1 + 0.42 * s.ripple) * vue * visibles})`; c.beginPath(); c.arc(cx, cy, f.rayon * echelle, 0, Math.PI * 2); c.stroke(); }
      /* les repères angulaires (12), déployés dans le sens horaire */
      for (const r of reperes(12, s.reperes)) if (r.visible > 0) {
        const a = polarXY(cx, cy, ANNEAU_HEURES * echelle - 7 * ligne, r.angle), b = polarXY(cx, cy, ANNEAU_HEURES * echelle + 7 * ligne, r.angle);
        c.strokeStyle = `rgba(255,255,255,${0.75 * r.visible * vue * visibles})`; c.lineWidth = ligne * (r.angle % 90 === 0 ? 2 : 1.2);
        c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
      }
      /* les positions polaires : des points sur l'anneau des personnes (aucune personne réelle : la géométrie seule) */
      const n = 24;
      for (let i = 0; i < n; i++) { const v = Math.min(1, Math.max(0, s.positions * n - i)); if (v <= 0) continue;
        const q = polarXY(cx, cy, ANNEAU_PERSONNES * echelle, (360 * i) / n + 7.5);
        c.fillStyle = `rgba(244,241,255,${0.85 * v * vue * visibles})`; c.beginPath(); c.arc(q.x, q.y, 2.4 * ligne, 0, Math.PI * 2); c.fill(); }
    }
    /* le clip : le Disque posé dans l'herbe (même géométrie que le vrai), la goutte qui tombe, la Perle qui s'allume */
    const v = s.voyage;
    const att = (v as (Voyage & { att?: Atterrissage }) | undefined)?.att;
    if (v && att) { this.dessinerAtterrissage(v, att, cx, cy, H); return; }
    if (v && v.disqueSol > 0.01 && s.blanc < 0.999) {
      const dq = geometrieDisque(800, 800, 0, { bas: 0, cote: 0, toileMin: 96 });
      const Ro = v.rDisque * H, ri = Ro * dq.ri / dq.Ro, rb = Ro * dq.rb / dq.Ro, r = Ro * dq.r / dq.Ro, rho = Ro * dq.rho / dq.Ro;
      c.save(); c.globalAlpha = v.disqueSol * (1 - s.blanc);
      /* l'ombre portée dans l'herbe */
      const om = c.createRadialGradient(cx + Ro * .06, cy + Ro * .1, Ro * .8, cx + Ro * .06, cy + Ro * .1, Ro * 1.25);
      om.addColorStop(0, "rgba(0,0,0,.45)"); om.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = om; c.beginPath(); c.arc(cx + Ro * .06, cy + Ro * .1, Ro * 1.25, 0, Math.PI * 2); c.fill();
      /* la couronne noire mate */
      const co = c.createLinearGradient(cx, cy - Ro, cx, cy + Ro); co.addColorStop(0, "#2a2a2a"); co.addColorStop(.55, "#151515"); co.addColorStop(1, "#0c0c0c");
      c.fillStyle = co; c.beginPath(); c.arc(cx, cy, Ro, 0, Math.PI * 2); c.arc(cx, cy, ri, 0, Math.PI * 2, true); c.fill("evenodd");
      c.strokeStyle = "rgba(255,255,255,.08)"; c.lineWidth = Math.max(1, Ro * .006); c.beginPath(); c.arc(cx, cy, Ro - c.lineWidth, 0, Math.PI * 2); c.stroke();
      /* le bois (sable clair), puis la toile */
      const bo = c.createRadialGradient(cx - rb * .3, cy - rb * .3, r, cx, cy, rb); bo.addColorStop(0, "#efe4cc"); bo.addColorStop(1, "#cdbb94");
      c.fillStyle = bo; c.beginPath(); c.arc(cx, cy, ri, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#faf7f0"; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
      /* les commandes de la couronne : des points qui s'allument un à un quand la Perle naît */
      for (let k = 0; k < 8; k++) {
        const a = -Math.PI / 2 + (Math.PI * 2 * k) / 8, x = cx + Math.cos(a) * rho, y = cy + Math.sin(a) * rho, on = Math.min(1, Math.max(0, v.activation * 9 - k));
        c.fillStyle = `rgba(255,255,255,${.12 + .1 * on})`; c.beginPath(); c.arc(x, y, Ro * .055, 0, Math.PI * 2); c.fill();
        if (on > 0) { const g = c.createRadialGradient(x, y, 0, x, y, Ro * .05); g.addColorStop(0, `rgba(240,232,255,${on})`); g.addColorStop(1, "rgba(201,184,255,0)"); c.fillStyle = g; c.beginPath(); c.arc(x, y, Ro * .05, 0, Math.PI * 2); c.fill(); }
      }
      /* la goutte vue d'en haut : elle tombe vers la toile (elle rapetisse), son ombre se resserre */
      if (v.goutteDisque > 0 && v.goutteDisque < 1) {
        const g = v.goutteDisque, gg = g * g, rr = Ro * (.16 - .12 * gg), ombre = Ro * (.09 - .06 * gg);
        c.fillStyle = `rgba(0,0,0,${.06 + .18 * gg})`; c.beginPath(); c.arc(cx + Ro * .05 * (1 - gg), cy + Ro * .08 * (1 - gg), ombre, 0, Math.PI * 2); c.fill();
        const d = c.createRadialGradient(cx - rr * .35, cy - rr * .35, rr * .1, cx, cy, rr);
        d.addColorStop(0, "rgba(255,255,255,.95)"); d.addColorStop(.45, "rgba(214,226,255,.45)"); d.addColorStop(.85, "rgba(201,184,255,.25)"); d.addColorStop(1, "rgba(255,255,255,.7)");
        c.globalAlpha = v.disqueSol * (1 - s.blanc) * (.4 + .6 * gg); c.fillStyle = d; c.beginPath(); c.arc(cx, cy, rr, 0, Math.PI * 2); c.fill(); c.globalAlpha = v.disqueSol * (1 - s.blanc);
      }
      /* le contact : une onde de lumière sur la toile, puis la Perle nacrée au centre */
      if (v.activation > 0) {
        const a = v.activation, onde = r * (.1 + .95 * a);
        c.strokeStyle = `rgba(201,184,255,${.7 * (1 - a)})`; c.lineWidth = Math.max(1, r * .03 * (1 - a)); c.beginPath(); c.arc(cx, cy, onde, 0, Math.PI * 2); c.stroke();
        const pr = r * .17 * Math.min(1, a * 1.6), pe = c.createRadialGradient(cx - pr * .35, cy - pr * .4, pr * .05, cx, cy, pr);
        pe.addColorStop(0, "#ffffff"); pe.addColorStop(.25, "#d9e8ff"); pe.addColorStop(.5, "#c9b8ff"); pe.addColorStop(.75, "#ffd6ec"); pe.addColorStop(1, "#b9f0e4");
        const halo = c.createRadialGradient(cx, cy, pr * .6, cx, cy, pr * 2.6); halo.addColorStop(0, `rgba(201,184,255,${.45 * a})`); halo.addColorStop(1, "rgba(201,184,255,0)");
        c.fillStyle = halo; c.beginPath(); c.arc(cx, cy, pr * 2.6, 0, Math.PI * 2); c.fill();
        c.fillStyle = pe; c.beginPath(); c.arc(cx, cy, pr, 0, Math.PI * 2); c.fill();
      }
      c.restore();
    }
    /* le Disque .0NE : la même géométrie que le Disque réel (geometrieDisque), puis son repli en Point */
    if (s.disque > 0.01 && s.blanc < 0.999) {
      const dq = geometrieDisque(800, 800, 0, { bas: 0, cote: 0, toileMin: 96 });
      /* le Disque naît SUR l'anneau extérieur du cadran Ripple : une seule géométrie */
      const z = (1 - s.repli) * (0.82 + 0.18 * s.disque) + 0.0001, Rmax = ANNEAUX_PRINCIPAUX[0] * echelle * z;
      const Ro = Rmax, ri = Rmax * dq.ri / dq.Ro, r = Rmax * dq.r / dq.Ro;
      c.save(); c.globalAlpha = s.disque * (1 - s.blanc);
      const grd = c.createRadialGradient(cx, cy, ri, cx, cy, Ro);
      grd.addColorStop(0, "rgba(10,10,14,.92)"); grd.addColorStop(1, "rgba(18,18,24,.92)");
      c.fillStyle = grd; c.beginPath(); c.arc(cx, cy, Ro, 0, Math.PI * 2); c.arc(cx, cy, ri, 0, Math.PI * 2, true); c.fill("evenodd");
      c.strokeStyle = "rgba(201,184,255,.55)"; c.lineWidth = ligne; c.beginPath(); c.arc(cx, cy, Ro, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = "rgba(201,184,255,.35)"; c.beginPath(); c.arc(cx, cy, ri, 0, Math.PI * 2); c.stroke();
      const toile = c.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.05, cx, cy, r);
      toile.addColorStop(0, "rgba(255,255,255,.97)"); toile.addColorStop(0.7, "rgba(246,244,252,.96)"); toile.addColorStop(1, "rgba(232,228,246,.96)");
      c.fillStyle = toile; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
      c.restore();
    }
  }

  /** L'atterrissage : le Disque .0NE posé dans l'herbe à l'aube, la goutte vue d'en haut (une vraie lentille : elle montre
      le monde inversé), la perle éteinte, puis le contact — les anneaux du cadran RIPPLE s'allument au passage de l'onde. */
  dessinerAtterrissage(v: Voyage, att: Atterrissage, cx: number, cy: number, H: number) {
    const c = this.ctx;
    /* l'Orbe porte une lueur et des particules de plusieurs couleurs, en mouvement (surtout sur la nuit) */
    const particules = (px: number, py: number, R: number, n: number, force: number) => {
      const t = att.temps, teintes = [[201, 184, 255], [255, 196, 228], [176, 238, 226], [255, 226, 170], [190, 214, 255]];
      c.save(); c.globalCompositeOperation = "lighter";
      for (let i = 0; i < n; i++) {
        const h1 = Math.sin(i * 12.9898) * 43758.5453 % 1, h2 = Math.sin(i * 78.233) * 12345.678 % 1, h3 = Math.sin(i * 39.425) * 9876.54 % 1;
        const a = Math.abs(h1) * Math.PI * 2 + t * (.25 + Math.abs(h2) * .5) * (h3 > 0 ? 1 : -1), d = R * (1.15 + Math.abs(h2) * 2.6) + Math.sin(t * 1.3 + i) * R * .08;
        const x = px + Math.cos(a) * d, y = py + Math.sin(a) * d * .92 - (t * 14 * Math.abs(h3) % (R * 2)) * .2;
        const [r, g, b] = teintes[i % teintes.length], vie = .5 + .5 * Math.sin(t * 2.1 + i * 1.7), rr = Math.max(.6, R * (.025 + .04 * Math.abs(h1)));
        const gr = c.createRadialGradient(x, y, 0, x, y, rr * 4); gr.addColorStop(0, `rgba(${r},${g},${b},${.85 * force * vie})`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
        c.fillStyle = gr; c.beginPath(); c.arc(x, y, rr * 4, 0, Math.PI * 2); c.fill();
      }
      const halo = c.createRadialGradient(px, py, R * .8, px, py, R * 3.2); halo.addColorStop(0, `rgba(214,200,255,${.28 * force})`); halo.addColorStop(.5, `rgba(255,206,232,${.1 * force})`); halo.addColorStop(1, "rgba(180,236,226,0)");
      c.fillStyle = halo; c.beginPath(); c.arc(px, py, R * 3.2, 0, Math.PI * 2); c.fill();
      c.restore();
    };
    if (att.macro) { particules(cx, cy - .03 * H, .2 * H, 70, 1); return; }
    if (v.disqueSol < 0.01) return;
    const dq = geometrieDisque(800, 800, 0, { bas: 0, cote: 0, toileMin: 96 });
    const Ro = v.rDisque * H, ri = Ro * dq.ri / dq.Ro, rb = Ro * dq.rb / dq.Ro, r = Ro * dq.r / dq.Ro, rho = Ro * dq.rho / dq.Ro;
    const solVersPx = (w: number) => (w / RAYON_DISQUE_SOL) * Ro;   /* le Disque mesure toujours RAYON_DISQUE_SOL au sol */
    const L = att.heure < 2 ? [20 + 108 * (att.heure - 1), 28 + 115 * (att.heure - 1), 54 + 140 * (att.heure - 1)] : [128 + 140 * (att.heure - 2), 143 + 94 * (att.heure - 2), 194 + 5 * (att.heure - 2)];
    c.save();
    /* l'ombre portée dans l'herbe (douce : la lumière de l'aube est diffuse) */
    const om = c.createRadialGradient(cx + Ro * .03, cy + Ro * .05, Ro * .85, cx + Ro * .03, cy + Ro * .05, Ro * 1.18);
    om.addColorStop(0, "rgba(0,0,0,.42)"); om.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = om; c.beginPath(); c.arc(cx, cy, Ro * 1.2, 0, Math.PI * 2); c.fill();
    /* la couronne noire mate, l'anneau de sable, la toile blanc chaud */
    const co = c.createLinearGradient(cx, cy - Ro, cx, cy + Ro); co.addColorStop(0, "#2b2b2b"); co.addColorStop(.55, "#161616"); co.addColorStop(1, "#0d0d0d");
    c.fillStyle = co; c.beginPath(); c.arc(cx, cy, Ro, 0, Math.PI * 2); c.arc(cx, cy, ri, 0, Math.PI * 2, true); c.fill("evenodd");
    c.strokeStyle = "rgba(255,255,255,.1)"; c.lineWidth = Math.max(1, Ro * .006); c.beginPath(); c.arc(cx, cy, Ro - c.lineWidth, 0, Math.PI * 2); c.stroke();
    const bo = c.createRadialGradient(cx - rb * .3, cy - rb * .3, r, cx, cy, rb); bo.addColorStop(0, "#efe4cc"); bo.addColorStop(1, "#cdbb94");
    c.fillStyle = bo; c.beginPath(); c.arc(cx, cy, ri, 0, Math.PI * 2); c.fill();
    const to = c.createRadialGradient(cx - r * .25, cy - r * .3, r * .1, cx, cy, r); to.addColorStop(0, "#fbf8f1"); to.addColorStop(1, "#ece5d6");
    c.fillStyle = to; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
    /* les anneaux du cadran RIPPLE, gravés à peine dans la toile et la couronne (la vraie géométrie de RIPPLECIRCLE) */
    const Rcadran = Ro / ANNEAUX_PRINCIPAUX[0];
    c.lineWidth = Math.max(1, H / 1100);
    for (const a of ANNEAUX_PRINCIPAUX.slice(1)) { const rr = a * Rcadran; c.strokeStyle = rr < r ? "rgba(120,104,80,.16)" : "rgba(255,255,255,.07)"; c.beginPath(); c.arc(cx, cy, rr, 0, Math.PI * 2); c.stroke(); }
    /* les huit commandes de la couronne, éteintes */
    for (let k = 0; k < 8; k++) { const a = -Math.PI / 2 + (Math.PI * 2 * k) / 8; c.fillStyle = "rgba(255,255,255,.13)"; c.beginPath(); c.arc(cx + Math.cos(a) * rho, cy + Math.sin(a) * rho, Ro * .052, 0, Math.PI * 2); c.fill(); }
    /* la perle éteinte, au centre : posée là par le fondateur ; elle attend */
    const pr = r * .17, pm = c.createRadialGradient(cx - pr * .35, cy - pr * .4, pr * .05, cx, cy, pr);
    pm.addColorStop(0, "#f4f1ea"); pm.addColorStop(.5, "#d8d2c6"); pm.addColorStop(1, "#a9a296");
    c.fillStyle = "rgba(0,0,0,.18)"; c.beginPath(); c.arc(cx + pr * .12, cy + pr * .18, pr * 1.05, 0, Math.PI * 2); c.fill();
    c.fillStyle = pm; c.beginPath(); c.arc(cx, cy, pr, 0, Math.PI * 2); c.fill();
    /* la lumière de l'heure : le Disque est éclairé par la même aube que la prairie */
    c.globalCompositeOperation = "multiply"; c.fillStyle = `rgb(${L.map(x => Math.round(Math.min(255, 255 - (255 - x) * .55))).join(",")})`;   /* le Disque reçoit l'aube, sans perdre son blanc chaud */
    c.beginPath(); c.arc(cx, cy, Ro * 1.01, 0, Math.PI * 2); c.fill(); c.globalCompositeOperation = "source-over";
    /* l'onde (contrat RIPPLE) : le front sur la toile et la couronne ; chaque anneau du cadran s'allume à son passage */
    for (const f of att.fronts) {
      const fp = solVersPx(f.rayon), i = f.intensite; if (i <= 0.01) continue;
      for (const a of ANNEAUX_PRINCIPAUX) {
        const rr = a * Rcadran, e = Math.exp(-Math.pow((fp - rr) / (Ro * .05), 2)) * i + (fp > rr ? .16 * i : 0);
        if (e > .01) { c.strokeStyle = `rgba(226,216,255,${Math.min(.9, e)})`; c.lineWidth = Math.max(1, H / 900) * (1 + 1.5 * e); c.beginPath(); c.arc(cx, cy, rr, 0, Math.PI * 2); c.stroke(); }
      }
      if (fp < Ro * 1.02) { c.strokeStyle = `rgba(240,234,255,${.55 * i})`; c.lineWidth = Math.max(1, Ro * .012); c.beginPath(); c.arc(cx, cy, fp, 0, Math.PI * 2); c.stroke(); }
    }
    /* les points de la couronne s'allument un par temps (120 BPM), dans le sens horaire */
    for (let k = 0; k < 8; k++) {
      const on = Math.min(1, Math.max(0, v.activation * 9 - k - .5)); if (on <= 0) continue;
      const a = -Math.PI / 2 + (Math.PI * 2 * k) / 8, x = cx + Math.cos(a) * rho, y = cy + Math.sin(a) * rho, g = c.createRadialGradient(x, y, 0, x, y, Ro * .085);
      g.addColorStop(0, `rgba(250,246,255,${on})`); g.addColorStop(.4, `rgba(214,200,255,${.75 * on})`); g.addColorStop(1, "rgba(201,184,255,0)");
      c.fillStyle = g; c.beginPath(); c.arc(x, y, Ro * .085, 0, Math.PI * 2); c.fill();
    }
    /* le contact : la perle s'allume (nacre), une lumière douce, sans explosion */
    if (v.activation > 0) {
      const a = Math.min(1, v.activation * 5), q = pr * (1 + .06 * a), pe = c.createRadialGradient(cx - q * .35, cy - q * .4, q * .05, cx, cy, q);
      pe.addColorStop(0, "#ffffff"); pe.addColorStop(.25, "#e4eeff"); pe.addColorStop(.5, "#d2c4ff"); pe.addColorStop(.75, "#ffdcef"); pe.addColorStop(1, "#c4f2e8");
      const flash = Math.exp(-v.activation * 9 * 1.6);
      const halo = c.createRadialGradient(cx, cy, q * .5, cx, cy, q * (3 + 3 * flash)); halo.addColorStop(0, `rgba(236,228,255,${.55 * a + .35 * flash})`); halo.addColorStop(1, "rgba(201,184,255,0)");
      c.fillStyle = halo; c.beginPath(); c.arc(cx, cy, q * (3 + 3 * flash), 0, Math.PI * 2); c.fill();
      c.globalAlpha = a; c.fillStyle = pe; c.beginPath(); c.arc(cx, cy, q, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
    }
    /* la goutte vue d'en haut : son ombre se resserre sur la perle, puis la goutte elle-même — une lentille qui montre
       le monde inversé (on recopie l'image du sol et du Disque, retournée et réduite) */
    const rg = att.goutteHaut * H;
    if (rg > 0.5) {
      const proche = Math.min(1, (0.07 * H) / rg - 1), ombre = rg * (.55 + .2 * (1 - proche));
      c.fillStyle = `rgba(10,12,30,${.1 + .22 * proche})`; c.beginPath(); c.arc(cx + rg * .25 * (1 - proche), cy + rg * .35 * (1 - proche), ombre, 0, Math.PI * 2); c.fill();
      c.save(); c.beginPath(); c.arc(cx, cy, rg, 0, Math.PI * 2); c.clip();
      c.translate(cx, cy); c.scale(-0.42, -0.42);
      c.drawImage(this.toile, -cx, -cy, this.calque.width, this.calque.height); c.drawImage(this.calque, -cx, -cy);
      c.setTransform(1, 0, 0, 1, 0, 0);
      /* la nacre de l'Orbe du site AIME (blanc, bleu, lavande, rose, menthe), qui laisse voir le monde par endroits */
      const verre = c.createRadialGradient(cx - rg * .3, cy - rg * .35, rg * .05, cx, cy, rg);
      verre.addColorStop(0, "rgba(255,255,255,.92)"); verre.addColorStop(.25, `rgba(217,232,255,${.55 + .15 * Math.sin(att.temps * 1.3)})`); verre.addColorStop(.5, "rgba(201,184,255,.45)"); verre.addColorStop(.75, `rgba(255,214,236,${.5 + .15 * Math.sin(att.temps * .9 + 1)})`); verre.addColorStop(1, "rgba(185,240,228,.8)");
      c.fillStyle = verre; c.fillRect(cx - rg, cy - rg, rg * 2, rg * 2);
      const coeur = c.createRadialGradient(cx, cy + rg * .1, 0, cx, cy + rg * .1, rg * .5); coeur.addColorStop(0, "rgba(248,244,255,.8)"); coeur.addColorStop(1, "rgba(201,184,255,0)");
      c.fillStyle = coeur; c.fillRect(cx - rg, cy - rg, rg * 2, rg * 2);
      const spec = c.createRadialGradient(cx - rg * .38, cy - rg * .42, 0, cx - rg * .38, cy - rg * .42, rg * .22); spec.addColorStop(0, "rgba(255,255,255,.95)"); spec.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = spec; c.fillRect(cx - rg, cy - rg, rg * 2, rg * 2);
      c.restore();
      c.strokeStyle = "rgba(245,244,255,.35)"; c.lineWidth = Math.max(1, rg * .02); c.beginPath(); c.arc(cx, cy, rg * .985, 0, Math.PI * 2); c.stroke();
      particules(cx, cy, rg, 34, .55 + .45 * Math.min(1, (0.07 * H) / rg - 1));
    }
    c.restore();
  }

  detruire() { this.detruit = true; this.gl.getExtension("WEBGL_lose_context")?.loseContext(); }
}
