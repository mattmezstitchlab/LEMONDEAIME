import { FLOSS } from "./dmc";
import { deltaE2000 } from "./colorScience";

/**
 * Le réglage de couleurs d'une zone, à même la toile.
 *
 * La brodeuse sélectionne un rectangle de cases avec l'outil zone, puis
 * serre ou desserre le nombre de fils : les couleurs rares de la zone sont
 * regroupées vers la couleur proche la plus fréquente (deltaE2000, comme
 * partout dans l'atelier), et remonter le nombre restaure les teintes
 * d'origine. Tout se recalcule depuis le motif source : rien ne se dégrade
 * en cascade, on peut toujours revenir en arrière.
 */

export interface RectZone {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ReglageZone {
  rect: RectZone;
  n: number;
}

const memeRect = (a: RectZone, b: RectZone) =>
  a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

/** Couleurs présentes dans la zone, triées par fréquence décroissante. */
export function couleursZone(cross: Int16Array, w: number, h: number, rect: RectZone): { idx: number; count: number }[] {
  const comptes = new Map<number, number>();
  for (let y = rect.y; y < Math.min(h, rect.y + rect.h); y += 1) {
    for (let x = rect.x; x < Math.min(w, rect.x + rect.w); x += 1) {
      if (y < 0 || x < 0) continue;
      const v = cross[y * w + x];
      if (v < 0) continue;
      comptes.set(v, (comptes.get(v) ?? 0) + 1);
    }
  }
  return [...comptes.entries()]
    .map(([idx, count]) => ({ idx, count }))
    .sort((a, b) => b.count - a.count || a.idx - b.idx);
}

/** Le motif source, avec chaque réglage de zone appliqué dans l'ordre. */
export function appliquerZones(
  source: Int16Array,
  w: number,
  h: number,
  reglages: ReglageZone[],
): Int16Array {
  if (!reglages.length) return source;
  const out = Int16Array.from(source);
  for (const r of reglages) {
    const presentes = couleursZone(source, w, h, r.rect);
    if (presentes.length <= r.n) continue;
    const gardees = presentes.slice(0, r.n).map((c) => c.idx);
    const rapproche = new Map<number, number>();
    for (const c of presentes) {
      if (gardees.includes(c.idx)) {
        rapproche.set(c.idx, c.idx);
        continue;
      }
      let meilleur = gardees[0];
      let d = Infinity;
      for (const g of gardees) {
        const de = deltaE2000(FLOSS[c.idx].lab, FLOSS[g].lab);
        if (de < d) {
          d = de;
          meilleur = g;
        }
      }
      rapproche.set(c.idx, meilleur);
    }
    for (let y = r.rect.y; y < Math.min(h, r.rect.y + r.rect.h); y += 1) {
      for (let x = r.rect.x; x < Math.min(w, r.rect.x + r.rect.w); x += 1) {
        if (y < 0 || x < 0) continue;
        const v = out[y * w + x];
        if (v < 0) continue;
        out[y * w + x] = rapproche.get(v) ?? v;
      }
    }
  }
  return out;
}

export function reglageDe(rect: RectZone, reglages: ReglageZone[]): ReglageZone | null {
  return reglages.find((r) => memeRect(r.rect, rect)) ?? null;
}
