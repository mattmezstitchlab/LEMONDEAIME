import { FLOSS, labOf, nearestFloss } from "./dmc";
import { deltaE2000 } from "./colorScience";
import { compositePattern, computeStats, createPattern, ensurePalette, type Count, type Pattern } from "./pattern";
import { pasteSelection } from "./editing";

/**
 * Le Cadre : le format de l'ouvrage posé sur une grille de points magnétiques.
 * On le trace, on tire ses coins pour agrandir le motif (les points sont recomptés),
 * on tire ses bords pour agrandir la toile (les points restent). Aucune question au départ :
 * taille réelle, fils, nettoyage et fond se déduisent du format.
 */

/* ------------------------------ Mesures ------------------------------ */

/** Une brodeuse moyenne : ~130 croix par heure, deux fois plus de demi-points, un peu de temps par changement de fil. */
const CROIX_HEURE = 130;
export interface Mesures { cmL: number; cmH: number; heures: number; echeveaux: number; fils: number; points: number }
export function mesures(p: Pattern): Mesures {
  const t = computeStats(p).totals;
  const over = p.fabric?.over ?? 1, pouce = 2.54 * over / p.count;
  const heures = (t.cross + t.half / 2 + t.quarter / 3 + t.knots / 2 + (t.backCm + t.longCm) / 6) / CROIX_HEURE + t.colors * .15;
  return { cmL: p.w * pouce, cmH: p.h * pouce, heures, echeveaux: t.skeins, fils: t.colors, points: t.contentCells };
}
/** Estimation sans recompter : utile en direct pendant qu'on tire un coin (le motif est mis à l'échelle). */
export function mesuresAEchelle(m: Mesures, f: number): Mesures {
  const a = f * f;
  return { ...m, cmL: m.cmL * f, cmH: m.cmH * f, heures: (m.heures - m.fils * .15) * a + m.fils * .15, echeveaux: m.echeveaux ? Math.max(1, Math.round(m.echeveaux * a)) : 0, points: Math.round(m.points * a) };
}
const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
export const cm = (v: number) => nf.format(v) + " cm";
export function duree(h: number) {
  if (h <= 0) return "—";
  if (h < 1) return "≈ " + Math.max(5, Math.round(h * 60 / 5) * 5) + " min";
  return "≈ " + (h < 10 ? nf.format(Math.round(h * 2) / 2) : Math.round(h)) + " h";
}
export const TOILES: { count: Count; nom: string; over?: 1 | 2; type?: "aida" | "linen" }[] = [
  { count: 11, nom: "Aida 11" }, { count: 14, nom: "Aida 14" }, { count: 16, nom: "Aida 16" }, { count: 18, nom: "Aida 18" },
  { count: 28, nom: "Lin 28, sur 2 fils", over: 2, type: "linen" }, { count: 32, nom: "Lin 32, sur 2 fils", over: 2, type: "linen" },
];
export const nomToile = (p: Pattern) => TOILES.find(t => t.count === p.count && (t.over ?? 1) === (p.fabric?.over ?? 1))?.nom ?? `${p.fabric?.type === "linen" ? "Lin" : "Aida"} ${p.count}${(p.fabric?.over ?? 1) === 2 ? ", sur 2 fils" : ""}`;
export function changerToile(p: Pattern, count: Count, over: 1 | 2 = 1, type: "aida" | "linen" = "aida"): Pattern {
  return { ...p, count, fabric: { type, over, color: p.fabric?.color ?? "#f3f3f1", margin: p.fabric?.margin ?? 5, units: p.fabric?.units ?? "cm" }, updated: Date.now() };
}

/** Formats tout faits, en centimètres sur la toile : convertis en points selon la toile choisie. */
export const FORMATS: { id: string; nom: string; cm: [number, number] }[] = [
  { id: "carre", nom: "Carré", cm: [15, 15] },
  { id: "marque-page", nom: "Marque-page", cm: [6, 18] },
  { id: "carte", nom: "Carte postale", cm: [15, 10] },
  { id: "tambour", nom: "Tambour 15 cm", cm: [13, 13] },
  { id: "tableau", nom: "Tableau", cm: [30, 24] },
];
export const pointsPourCm = (cmv: number, count: Count, over: 1 | 2 = 1) => Math.max(4, Math.min(1000, Math.round(cmv / 2.54 * count / over)));

/* ------------------------- Agrandir, étendre ------------------------- */

/** Coins : le motif change d'échelle ; chaque case nouvelle prend la case d'origine la plus proche. Les calques sont aplatis. */
export function reechantillonner(src: Pattern, w: number, h: number): Pattern {
  const p = compositePattern(src);
  w = Math.max(1, Math.min(1000, Math.round(w))); h = Math.max(1, Math.min(1000, Math.round(h)));
  const d = createPattern(p.name, w, h, p.count, p.strands);
  const fx = p.w / w, fy = p.h / h;
  for (let y = 0; y < h; y++) {
    const sy = Math.min(p.h - 1, Math.floor((y + .5) * fy));
    for (let x = 0; x < w; x++) {
      const sx = Math.min(p.w - 1, Math.floor((x + .5) * fx)), i = y * w + x, j = sy * p.w + sx;
      d.cross[i] = p.cross[j]; d.fwd[i] = p.fwd[j]; d.bwd[i] = p.bwd[j]; d.done[i] = p.done[j];
      for (let k = 0; k < 4; k++) d.q[k][i] = p.q[k][j];
    }
  }
  const kx = w / p.w, ky = h / p.h;
  const seg = (s: Pattern["back"][number]) => ({ ...s, x1: Math.round(s.x1 * kx), y1: Math.round(s.y1 * ky), x2: Math.round(s.x2 * kx), y2: Math.round(s.y2 * ky) });
  return {
    ...p, ...d, id: p.id, name: p.name, fabric: p.fabric, provenance: p.provenance, notes: p.notes, supplies: p.supplies, stock: p.stock,
    symbolMap: p.symbolMap, beadMap: p.beadMap, photo: p.photo, palette: [...p.palette],
    back: p.back.map(seg).filter(s => s.x1 !== s.x2 || s.y1 !== s.y2), long: p.long.map(seg).filter(s => s.x1 !== s.x2 || s.y1 !== s.y2),
    knots: p.knots.map(k => ({ ...k, x: Math.round(k.x * kx), y: Math.round(k.y * ky) })),
    layers: [], mistakes: [], parked: [], annotations: [], special: [], updated: Date.now(),
  };
}

/** Bords : la toile grandit ou rétrécit d'un côté ; les points ne bougent pas sur le tissu. */
export interface Cotes { gauche: number; haut: number; droite: number; bas: number }
export function etendre(src: Pattern, c: Cotes): Pattern {
  const p = compositePattern(src);
  const w = Math.max(1, Math.min(1000, p.w + c.gauche + c.droite)), h = Math.max(1, Math.min(1000, p.h + c.haut + c.bas));
  const d = pasteSelection(createPattern(p.name, w, h, p.count, p.strands), p, c.gauche, c.haut);
  return { ...p, ...d, id: p.id, name: p.name, fabric: p.fabric, provenance: p.provenance, notes: p.notes, supplies: p.supplies, stock: p.stock, symbolMap: p.symbolMap, beadMap: p.beadMap, photo: p.photo, layers: [], mistakes: [], parked: [], updated: Date.now() };
}

/** Déplacer le motif dans son cadre, case par case (ce qui sort du cadre est coupé). */
export function decaler(src: Pattern, dx: number, dy: number): Pattern {
  if (!dx && !dy) return src;
  const p = compositePattern(src);
  const d = pasteSelection(createPattern(p.name, p.w, p.h, p.count, p.strands), p, dx, dy);
  return { ...p, ...d, id: p.id, name: p.name, fabric: p.fabric, provenance: p.provenance, notes: p.notes, supplies: p.supplies, stock: p.stock, symbolMap: p.symbolMap, beadMap: p.beadMap, photo: p.photo, layers: [], updated: Date.now() };
}

/* ------------------------------ La photo ------------------------------ */

export { PALETTES, REGLAGES_AUTO, lirePhoto, lireReglages, type PaletteMode, type PhotoSource, type ReglagesPhoto } from "./photoSource";
import type { PhotoSource, ReglagesPhoto } from "./photoSource";

/** Empreinte des croix : si elle change après la conversion, la brodeuse a retouché le motif. */
export function empreinte(p: Pattern): number {
  let h = 2166136261 ^ p.w ^ (p.h << 12);
  for (let i = 0; i < p.cross.length; i++) { h ^= p.cross[i] + 2; h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export const retouche = (p: Pattern) => !!p.photo && empreinte(p) !== p.photo.empreinte;

/** Assez de fils pour le détail, pas plus : un petit format en demande peu. */
export const filsAuto = (w: number, h: number) => Math.max(8, Math.min(40, Math.round(6 + Math.sqrt(w * h) / 4)));

const rgb2hsl = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > .5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
};
const hsl2rgb = (h: number, s: number, l: number): [number, number, number] => {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const f = (p: number, q: number, t: number) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  return [f(p, q, h + 1 / 3) * 255, f(p, q, h) * 255, f(p, q, h - 1 / 3) * 255];
};
const dTeinte = (a: number, b: number) => { const d = Math.abs(a - b) % 1; return Math.min(d, 1 - d); };

/** Les teintes dominantes (pondérées par la saturation), pour l'harmonie et le camaïeu. */
function teintesDominantes(d: Uint8ClampedArray, n: number): number[] {
  const bac = new Float64Array(36);
  for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 128) continue; const [h, s, l] = rgb2hsl(d[i], d[i + 1], d[i + 2]); if (s > .12 && l > .08 && l < .95) bac[Math.floor(h * 36) % 36] += s; }
  const lisse = [...bac].map((_, k) => bac[(k + 35) % 36] * .5 + bac[k] + bac[(k + 1) % 36] * .5);
  const out: number[] = [];
  for (let t = 0; t < n; t++) {
    let best = -1, v = 0; lisse.forEach((x, k) => { if (x > v && out.every(o => dTeinte(o, (k + .5) / 36) > .1)) { v = x; best = k; } });
    if (best < 0 || v <= 0) break; out.push((best + .5) / 36);
  }
  return out.length ? out : [0.02];
}

/**
 * Règle les pixels d'une photo sur place : niveaux automatiques, lumière, contraste, saturation, palette, fond.
 * Pur : n'utilise pas le DOM (testable, et utilisable dans un worker).
 */
export function reglerPixels(d: Uint8ClampedArray, w: number, h: number, r: ReglagesPhoto) {
  // Le fond : la couleur médiane du bord, si le bord est assez uni ; elle devient transparente (toile nue).
  let fond: [number, number, number] | null = null;
  if (r.fond) {
    const bord: [number, number, number][] = [];
    for (let x = 0; x < w; x += 2) for (const y of [0, h - 1]) { const o = (y * w + x) * 4; if (d[o + 3] > 127) bord.push([d[o], d[o + 1], d[o + 2]]); }
    for (let y = 0; y < h; y += 2) for (const x of [0, w - 1]) { const o = (y * w + x) * 4; if (d[o + 3] > 127) bord.push([d[o], d[o + 1], d[o + 2]]); }
    if (bord.length > 8) {
      const med = [0, 1, 2].map(k => bord.map(c => c[k]).sort((a, b) => a - b)[bord.length >> 1]) as [number, number, number];
      const proches = bord.filter(c => Math.hypot(c[0] - med[0], c[1] - med[1], c[2] - med[2]) < 40).length;
      if (proches / bord.length > .7) fond = med;
    }
  }
  // Le fond est rempli depuis le bord, de proche en proche : un dégradé ou un vignettage suit,
  // le sujet (un saut de couleur net) arrête le remplissage.
  if (fond) {
    const vu = new Uint8Array(w * h), file = new Int32Array(w * h); let tete = 0, queue = 0;
    const loin = (i: number, c: readonly number[]) => Math.hypot(d[i * 4] - c[0], d[i * 4 + 1] - c[1], d[i * 4 + 2] - c[2]);
    const semer = (i: number) => { if (!vu[i] && d[i * 4 + 3] > 127 && loin(i, fond!) < 46) { vu[i] = 1; file[queue++] = i; } };
    for (let x = 0; x < w; x++) { semer(x); semer((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { semer(y * w); semer(y * w + w - 1); }
    while (tete < queue) {
      const i = file[tete++], x = i % w, c = [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]];
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
        if (j < 0 || j >= w * h || vu[j] || d[j * 4 + 3] < 128) continue;
        if (loin(j, c) < 13 && loin(j, fond) < 95) { vu[j] = 1; file[queue++] = j; }
      }
    }
    for (let i = 0; i < w * h; i++) if (vu[i]) d[i * 4 + 3] = 0;
  }
  // Niveaux automatiques : 1 % des pixels les plus sombres au noir, 1 % des plus clairs au blanc.
  let bas = 0, haut = 255;
  if (r.auto) {
    const hist = new Uint32Array(256); let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 127) { hist[Math.round(d[i] * .299 + d[i + 1] * .587 + d[i + 2] * .114)]++; n++; }
    let acc = 0; for (bas = 0; bas < 255 && (acc += hist[bas]) < n * .01; bas++);
    acc = 0; for (haut = 255; haut > 0 && (acc += hist[haut]) < n * .01; haut--);
    if (haut - bas < 40) { bas = 0; haut = 255; }
  }
  const k = 255 / Math.max(1, haut - bas);
  const c = 1 + r.contraste / 100 * (r.contraste > 0 ? 1.5 : .8), lum = r.lumiere / 100 * 70;
  const sat = 1 + r.saturation / 100 + (r.auto ? .08 : 0);
  const domin = r.palette === "harmonieuse" || r.palette === "camaieu" ? teintesDominantes(d, r.palette === "camaieu" ? 1 : 3) : [];
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) continue;
    let px: [number, number, number] = [d[i], d[i + 1], d[i + 2]];
    px = px.map(v => ((v - bas) * k - 128) * c + 128 + lum) as [number, number, number];
    let [hh, s, l] = rgb2hsl(...px.map(v => Math.max(0, Math.min(255, v))) as [number, number, number]);
    s = Math.min(1, s * sat);
    if (r.palette === "harmonieuse" && s > .06) {
      let cible = domin[0]; for (const t of domin) if (dTeinte(t, hh) < dTeinte(cible, hh)) cible = t;
      let dt = cible - hh; if (dt > .5) dt -= 1; if (dt < -.5) dt += 1; hh = (hh + dt * .55 + 1) % 1;
    } else if (r.palette === "douce") { s *= .55; l = l + (1 - l) * .22; }
    else if (r.palette === "camaieu") { hh = domin[0]; s = Math.max(.18, s * .7); }
    let out = hsl2rgb(hh, s, l);
    if (r.palette === "ancienne") {
      const [R, G, B] = out, se: [number, number, number] = [R * .393 + G * .769 + B * .189, R * .349 + G * .686 + B * .168, R * .272 + G * .534 + B * .131];
      out = [0, 1, 2].map(j => (out[j] * .45 + se[j] * .55) * .92 + 18) as [number, number, number];
    }
    d[i] = out[0]; d[i + 1] = out[1]; d[i + 2] = out[2];
  }
}

/** Palette harmonieuse : un fil trop voisin d'un fil plus présent le rejoint (moins d'achats, plus d'unité). */
export function fusionnerVoisins(cross: Int16Array, seuil = 8): number[] {
  const n = new Map<number, number>(); for (const v of cross) if (v >= 0) n.set(v, (n.get(v) ?? 0) + 1);
  const ordre = [...n.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]), garde: number[] = [], vers = new Map<number, number>();
  for (const f of ordre) { const proche = garde.find(g => deltaE2000(FLOSS[g].lab, FLOSS[f].lab) < seuil); if (proche === undefined) garde.push(f); else vers.set(f, proche); }
  for (let i = 0; i < cross.length; i++) { const t = vers.get(cross[i]); if (t !== undefined) cross[i] = t; }
  return garde;
}

/** Le fil DMC le plus proche d'une couleur (exposé pour les tests). */
export const filDe = (rgb: [number, number, number]) => nearestFloss(labOf(rgb));

/** Pose une conversion dans un motif : croix, palette, et la photo gardée pour les prochains formats. */
export function poserConversion(base: Pattern, w: number, h: number, cross: Int16Array, palette: number[], photo: PhotoSource): Pattern {
  const d = createPattern(base.name, w, h, base.count, base.strands);
  const p: Pattern = { ...d, id: base.id, name: base.name, fabric: base.fabric, provenance: base.provenance, notes: base.notes, supplies: base.supplies, stock: base.stock, cross, updated: Date.now() };
  for (const idx of palette) ensurePalette(p, idx);
  p.photo = { ...photo, empreinte: empreinte(p) };
  return p;
}
