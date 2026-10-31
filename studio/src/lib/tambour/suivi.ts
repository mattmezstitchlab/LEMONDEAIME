/**
 * Le suivi de broderie dans le cercle : quels points de la couleur active restent à broder, et lequel montrer ensuite.
 * Des calculs purs sur le vrai motif (ses cases et leur état « brodé ») : rien n'est modifié, rien n'est deviné.
 * Le « prochain point » est le plus proche du dernier point coché (on continue là où la main travaille) ;
 * sans point coché, le premier dans l'ordre de lecture (haut à gauche).
 */
import { compositePattern, type Pattern } from "../pattern";

/** la case porte-t-elle ce fil (point entier, demi-point ou quart) ? */
export function caseDeCouleur(p: Pattern, i: number, couleur: number): boolean {
  return p.cross[i] === couleur || p.fwd[i] === couleur || p.bwd[i] === couleur || p.q.some(q => q[i] === couleur);
}

/** les cases de cette couleur qui restent à broder (indices, ordre de lecture) */
export function restants(p: Pattern, couleur: number): number[] {
  const c = compositePattern(p), r: number[] = [];
  for (let i = 0; i < c.w * c.h; i++) if (!c.done[i] && caseDeCouleur(c, i, couleur)) r.push(i);
  return r;
}

/** la case la plus récemment cochée entre deux états du motif (pour cette couleur), ou null */
export function dernierCoche(avant: Pattern | null | undefined, apres: Pattern, couleur: number): number | null {
  if (!avant || avant.w !== apres.w || avant.h !== apres.h) return null;
  let trouve: number | null = null;
  for (let i = 0; i < apres.w * apres.h; i++) if (apres.done[i] && !avant.done[i] && caseDeCouleur(apres, i, couleur)) trouve = i;
  return trouve;
}

export interface Prochain { i: number; x: number; y: number; reste: number }
/** le prochain point à montrer : le plus proche de « depuis », sinon le premier dans l'ordre de lecture */
export function prochainPoint(p: Pattern, couleur: number, depuis?: number | null): Prochain | null {
  const r = restants(p, couleur); if (!r.length) return null;
  let choix = r[0];
  if (depuis != null) {
    const dx = depuis % p.w, dy = Math.floor(depuis / p.w); let meilleur = Infinity;
    for (const i of r) { const d = (i % p.w - dx) ** 2 + (Math.floor(i / p.w) - dy) ** 2; if (d < meilleur) { meilleur = d; choix = i; } }
  }
  return { i: choix, x: choix % p.w, y: Math.floor(choix / p.w), reste: r.length };
}
