import { FLOSS, BASE_FLOSS, labOf } from "../dmc";
import { createPattern, ensurePalette, TOILE_DEFAUT, type Count, type Pattern } from "../pattern";
import { codeDe, codeSignature, lireCode, type Recette, type Signature } from "./code";
import { cosTour, fractionOctant, hasard, melanger, type Hasard } from "./maths";

/**
 * Le générateur 5D : une recette et une taille donnent un ouvrage Point Zéro ordinaire, toujours le même.
 * Règle n°1 : un geste ne change que ce qu'il annonce. Le squelette du motif ne dépend que de la structure,
 * du tracé et de l'échelle ; la densité le remplit plus ou moins ; la palette le colore.
 */
export interface Demande extends Recette { w: number; h: number; count?: Count; nom?: string }
export interface Controle {
  croix: number; fils: number; confettis: number; maxFils10: number;
  essai: number; ajustements: string[];
}

const ECHELLE = [6, 4, 3, 2];
const COUVERTURE = [0.42, 0.52, 0.78, 0.78];
const NB_FILS = [4, 6, 7, 8];
/** La taille proposée sans question : 61 × 61 (11 cm sur Aida 14), une frise en marque-page 121 × 31. */
export const formatParDefaut = (s: Signature): [number, number] => s.structure === 2 ? [121, 31] : [61, 61];

/** Les garde-fous qui modifient la signature avant le calcul (combinaisons fragiles). */
export function signatureEffective(s: Signature, w: number, h: number): { s: Signature; notes: string[] } {
  const notes: string[] = []; const e = { ...s };
  if (e.echelle === 3 && e.densite === 0) { e.echelle = 2; notes.push("Dentelle aérée : passée en Fin (sinon des filaments)."); }
  if (e.echelle === 3 && Math.min(w, h) < (e.structure === 2 ? 25 : 61)) { e.echelle = 2; notes.push("Dentelle trop petite : passée en Fin."); }
  return { s: e, notes };
}

/* ------------------------------------------------------------------ géométrie */

function distance(u: number, v: number, trace: number) {
  if (trace === 0) return Math.max(u, v);              // droit : des carrés
  if (trace === 1) return (u + v) * 0.72;              // diagonal : des losanges
  return Math.sqrt(u * u + v * v);                     // courbe et itératif : des cercles
}

/** Une rosace (ou des anneaux) dans un rectangle : le dessin est calculé dans l'octant, la symétrie est donc exacte. */
function rosace(W: number, H: number, s: Signature, r: Hasard, anneaux: boolean): Int16Array {
  const L = new Int16Array(W * H).fill(-1);
  const cx = (W - 1) / 2, cy = (H - 1) / 2, R = Math.min(W, H) / 2 - 0.5;
  const w = ECHELLE[s.echelle] * (anneaux ? 2 : 1);
  const n = Math.max(2, Math.floor(R / w)) + 2;
  const lobes: number[] = [], poids: number[] = [], tirage: number[] = [], teinte: number[] = [];
  for (let i = 0; i < n; i++) { lobes.push(anneaux ? r.entier(2, 5) : r.entier(1, 3)); poids.push(r()); tirage.push(r()); teinte.push(r.entier(0, 99)); }
  const couv = COUVERTURE[s.densite], plein = s.densite >= 2 ? 1 : 0.82;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let u = Math.abs(x - cx), v = Math.abs(y - cy);
    if (v > u) { const t = u; u = v; v = t; }
    const d = distance(u, v, s.trace);
    if (d > R) continue;
    const i = Math.floor(d / w), reste = d - i * w, f = reste / w;
    if (tirage[i] >= plein) continue;
    const a = fractionOctant(u, v);
    const brut = Math.abs(cosTour(lobes[i] * a / 2));
    const lobe = brut * (1 - poids[i]) + brut * brut * poids[i];
    let ok: boolean;
    if (anneaux) {
      if (reste < 1) { L[y * W + x] = 0; continue; }       // filet séparateur d'un point
      ok = f > 0.2 && f < 0.2 + 0.8 * couv * (0.25 + 0.75 * lobe) * 1.3;
    } else ok = f < couv * 1.25 * lobe + (i === 0 ? 0.15 : 0);
    if (s.trace === 3) {
      const b = Math.max(1, Math.floor(w / 2));
      ok = ok && ((((Math.floor(u / b) & Math.floor(v / b)) % 2) === 0) || f < 0.3);
    }
    if (ok) L[y * W + x] = 1 + teinte[i];
  }
  return L;
}

function frise(W: number, H: number, s: Signature, r: Hasard): Int16Array {
  let P = 4 * ECHELLE[s.echelle] + 1;
  if (P > H - 4) P = Math.max(5, (H - 4) | 1);
  const tuile = rosace(P, P, s, r, false), L = new Int16Array(W * H).fill(-1);
  const oy = Math.floor((H - P) / 2), ox = Math.floor((W % P) / 2);
  for (let y = 0; y < P; y++) for (let x = 0; x < W; x++) L[(oy + y) * W + x] = tuile[y * P + (((x - ox) % P) + P) % P];
  if (H >= 5) for (let x = 0; x < W; x++) { L[W + x] = 0; L[(H - 2) * W + x] = 0; }   // les deux filets de bordure
  return L;
}

function pavage(W: number, H: number, s: Signature, r: Hasard): Int16Array {
  const P = 4 * ECHELLE[s.echelle] + 1;
  const t1 = rosace(P, P, s, r, false), t2 = rosace(P, P, s, r, false), L = new Int16Array(W * H).fill(-1);
  const ox = Math.floor((W % P) / 2), oy = Math.floor((H % P) / 2);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const tx = Math.floor((x - ox + P * 100) / P), ty = Math.floor((y - oy + P * 100) / P);
    const t = (tx + ty) % 2 === 0 ? t1 : t2;
    L[y * W + x] = t[(((y - oy) % P) + P) % P * P + (((x - ox) % P) + P) % P];
  }
  return L;
}

/** Anti-confettis équivariant : un point seul prend la couleur la plus présente autour (à égalité, la plus petite). */
function nettoyer(L: Int16Array, W: number, H: number): Int16Array {
  const M = L.slice();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = L[y * W + x]; if (v < 0) continue;
    const vois: number[] = [];
    if (y > 0) vois.push(L[(y - 1) * W + x]); if (y < H - 1) vois.push(L[(y + 1) * W + x]);
    if (x > 0) vois.push(L[y * W + x - 1]); if (x < W - 1) vois.push(L[y * W + x + 1]);
    if (vois.includes(v)) continue;
    const cpt = new Map<number, number>(); for (const o of vois) cpt.set(o, (cpt.get(o) ?? 0) + 1);
    let best = -1, n = -1; for (const [k, c] of cpt) if (c > n || (c === n && k < best)) { best = k; n = c; }
    M[y * W + x] = best;
  }
  return M;
}

/* ------------------------------------------------------------------ couleurs */

const d2 = (a: readonly number[], b: readonly number[]) => { const x = a[0] - b[0], y = a[1] - b[1], z = a[2] - b[2]; return x * x + y * y + z * z; };
function hsl(h: number, s: number, l: number): [number, number, number] {
  const f = (p: number, q: number, t: number) => { t = t - Math.floor(t); return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  return [Math.round(f(p, q, h + 1 / 3) * 255), Math.round(f(p, q, h) * 255), Math.round(f(p, q, h - 1 / 3) * 255)];
}
const toileLab = labOf([0xf3, 0xf3, 0xf1]);
/** Le fil DMC le plus proche (écart Lab au carré, sans trigonométrie), loin de ceux déjà pris et de la toile. */
function filProche(rgb: [number, number, number], pris: number[], loinToile: boolean): number {
  const lab = labOf(rgb);
  let best = -1, bd = Infinity;
  for (let i = 0; i < BASE_FLOSS.length; i++) {
    const L = FLOSS[i].lab, d = d2(L, lab);
    if (d >= bd) continue;
    if (pris.some(p => d2(FLOSS[p].lab, L) < 81)) continue;         // ΔE ≥ 9 entre deux fils
    if (loinToile && d2(L, toileLab) < 225) continue;               // ΔE ≥ 15 avec la toile
    best = i; bd = d;
  }
  return best >= 0 ? best : 0;
}
function palette(mode: number, n: number, r: Hasard): number[] {
  const h0 = r();
  const teintes: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    if (mode === 0) teintes.push([h0, 0.55, 0.22 + (0.62 * i) / Math.max(1, n - 1)]);
    else if (mode === 1) teintes.push([h0 + (i - n / 2) * 0.045, 0.36, 0.5 + (0.22 * ((i * 7) % n)) / n]);
    else if (mode === 2) { const hs = [h0, h0 + 0.5, h0 + 0.12, h0 + 0.62]; teintes.push([hs[i % 4], 0.78, 0.38 + 0.3 * Math.floor(i / 4) / Math.max(1, Math.floor((n - 1) / 4)) + 0.08 * (i % 2)]); }
    else teintes.push([0.03 + 0.28 * ((i * 0.37 + h0) % 1), 0.38, 0.28 + (0.45 * ((i * 5) % n)) / n]);
  }
  const pris: number[] = [];
  for (const [h, s, l] of teintes) pris.push(filProche(hsl(h - Math.floor(h), s, l), pris, true));
  return pris;
}

/* ------------------------------------------------------------------ le motif */

function dessiner(s: Signature, graine: number, W: number, H: number) {
  const squelette = hasard(melanger(graine, 1 + s.structure * 16 + s.trace * 4 + s.echelle));
  let L = s.structure === 2 ? frise(W, H, s, squelette) : s.structure === 3 ? pavage(W, H, s, squelette) : rosace(W, H, s, squelette, s.structure === 1);
  // les teintes tirées deviennent quelques niveaux de fil
  const vus = [...new Set(L)].filter(v => v > 0).sort((a, b) => a - b), nf = NB_FILS[s.echelle];
  const remap = new Map<number, number>(); vus.forEach((v, k) => remap.set(v, 1 + (k % (nf - 1))));
  L = L.map(v => v <= 0 ? v : remap.get(v)!) as Int16Array;
  if (s.densite === 3) L = L.map(v => v < 0 ? nf : v) as Int16Array;   // Totale : le fond est brodé
  return { L: nettoyer(L, W, H), nf };
}

function mesurer(L: Int16Array, W: number, H: number) {
  let croix = 0, seuls = 0, max10 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = L[y * W + x]; if (v < 0) continue; croix++;
    if (!((y > 0 && L[(y - 1) * W + x] === v) || (y < H - 1 && L[(y + 1) * W + x] === v) || (x > 0 && L[y * W + x - 1] === v) || (x < W - 1 && L[y * W + x + 1] === v))) seuls++;
  }
  for (let by = 0; by < H; by += 10) for (let bx = 0; bx < W; bx += 10) {
    const set = new Set<number>();
    for (let y = by; y < Math.min(H, by + 10); y++) for (let x = bx; x < Math.min(W, bx + 10); x++) { const v = L[y * W + x]; if (v >= 0) set.add(v); }
    max10 = Math.max(max10, set.size);
  }
  return { croix, confettis: croix ? seuls / croix : 0, max10 };
}

/** Une recette + une taille → l'ouvrage, et ce qu'on a vérifié. Toujours le même résultat pour la même demande. */
export function generer(d: Demande): { pattern: Pattern; controle: Controle } {
  const W = Math.max(5, Math.min(1000, Math.round(d.w))), H = Math.max(5, Math.min(1000, Math.round(d.h)));
  const { s, notes } = signatureEffective(d.signature, W, H);
  let essai = 0, res = dessiner(s, d.graine, W, H), m = mesurer(res.L, W, H);
  // garde-fou : trop de points isolés → graines dérivées, dans un ordre fixe
  while ((m.confettis > 0.02 || m.croix === 0) && essai < 8) { essai++; res = dessiner(s, melanger(d.graine, 7919 + essai), W, H); m = mesurer(res.L, W, H); }
  const { L, nf } = res;
  const couleurs = hasard(melanger(d.graine, 211 + s.palette));
  const pal = palette(s.palette, nf + (s.densite === 3 ? 1 : 0), couleurs);
  const ajustements = [...notes];
  // Totale : le fond = le fil le plus clair (le plus sombre en Vive) ; les autres fils dessinent le motif
  let fond = -1;
  if (s.densite === 3) {
    const ordre = pal.map((_, k) => k).sort((a, b) => FLOSS[pal[a]].lab[0] - FLOSS[pal[b]].lab[0] || a - b);
    fond = s.palette === 2 ? ordre[0] : ordre[ordre.length - 1];
  }
  const motif = pal.filter((_, k) => k !== fond);
  const fil = (label: number) => label === nf && fond >= 0 ? pal[fond] : motif[label % motif.length];
  const cross = new Int16Array(W * H).fill(-1);
  for (let i = 0; i < L.length; i++) if (L[i] >= 0) cross[i] = fil(L[i]);
  if (fond >= 0) {
    const fl = FLOSS[pal[fond]].lab, motifs = [...new Set(cross)].filter(v => v >= 0 && v !== pal[fond]);
    const loin = motifs.sort((a, b) => d2(FLOSS[b].lab, fl) - d2(FLOSS[a].lab, fl))[0];
    let fusion = 0;
    for (let i = 0; i < cross.length; i++) if (cross[i] >= 0 && cross[i] !== pal[fond] && d2(FLOSS[cross[i]].lab, fl) < 400) { cross[i] = loin; fusion++; }
    if (fusion) ajustements.push("Fils trop proches du fond : fondus dans le fil le plus contrasté.");
  }
  // au plus 5 fils dans un carré de 10 × 10 : le fil le plus rare rejoint son plus proche voisin
  for (let tour = 0; tour < 6 && mesurer(Int16Array.from(cross), W, H).max10 > 5; tour++) {
    const n = new Map<number, number>(); for (const v of cross) if (v >= 0) n.set(v, (n.get(v) ?? 0) + 1);
    if (n.size <= 3) break;
    const rare = [...n.entries()].sort((a, b) => a[1] - b[1] || a[0] - b[0])[0][0];
    const autres = [...n.keys()].filter(k => k !== rare);
    const vers = autres.sort((a, b) => d2(FLOSS[a].lab, FLOSS[rare].lab) - d2(FLOSS[b].lab, FLOSS[rare].lab))[0];
    for (let i = 0; i < cross.length; i++) if (cross[i] === rare) cross[i] = vers;
    ajustements.push("Un fil rare fondu dans son voisin (5 fils au plus par carré de 10).");
  }
  const code = codeDe(d);
  const p = createPattern(d.nom ?? "Rosace " + codeSignature(d.signature), W, H, d.count ?? 14, 2);
  p.cross = cross;
  const n = new Map<number, number>(); for (const v of cross) if (v >= 0) n.set(v, (n.get(v) ?? 0) + 1);
  for (const [idx] of [...n.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])) ensurePalette(p, idx);
  p.fabric = { type: "aida", over: 1, color: TOILE_DEFAUT, margin: 7.5, units: "cm" };
  p.provenance = { kind: "original", source: "Composer une rosace · " + code, author: "Point Zéro", license: "Création Point Zéro : usage personnel", personalOnly: true };
  p.recette = { code, empreinte: empreinteCroix(p) };
  const fin = mesurer(cross, W, H);
  return { pattern: p, controle: { croix: fin.croix, fils: n.size, confettis: fin.confettis, maxFils10: fin.max10, essai, ajustements } };
}

/** L'empreinte des croix (même calcul que pour une photo) : si elle change, l'ouvrage a été retouché. */
export function empreinteCroix(p: Pattern): number {
  let h = 2166136261 ^ p.w ^ (p.h << 12);
  for (let i = 0; i < p.cross.length; i++) { h ^= p.cross[i] + 2; h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Le Cadre : régénérer un ouvrage composé à une autre taille, en gardant son nom, sa toile et son identité. */
export function regenerer(base: Pattern, w: number, h: number): Pattern | null {
  const r = base.recette ? lireCode(base.recette.code) : null;
  if (!r) return null;
  const { pattern: p } = generer({ ...r, w, h, count: base.count, nom: base.name });
  return { ...p, id: base.id, folder: base.folder, fabric: base.fabric ?? p.fabric, notes: base.notes, supplies: base.supplies, stock: base.stock, updated: Date.now() };
}
export const retoucheRecette = (p: Pattern) => !!p.recette && empreinteCroix(p) !== p.recette.empreinte;
