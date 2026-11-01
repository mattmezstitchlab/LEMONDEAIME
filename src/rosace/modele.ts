/**
 * ROSACE est une lecture de l'ouvrage 5D du Studio, pas un autre moteur.
 * Une seule recette produit le Pattern partagé par le Disque, la grille, le
 * nuancier, les mesures et l'aperçu du patron. Seul son code passe à l'atelier.
 */
import { codeDe, MAX_GRAINE, VERSION, type Choix, type Recette, type Signature } from '../../studio/src/lib/motif5d/code';
import { formatParDefaut, generer } from '../../studio/src/lib/motif5d/generer';
import { mesures } from '../../studio/src/lib/cadre';
import { computeStats } from '../../studio/src/lib/pattern';

export const RECETTE_INITIALE: Recette = {
  signature: { structure: 0, trace: 2, densite: 2, echelle: 2, palette: 2 },
  graine: 6,
  version: VERSION,
};

export function calculerRosace(recette: Recette) {
  const [w, h] = formatParDefaut(recette.signature);
  const { pattern, controle } = generer({ ...recette, w, h });
  return { pattern, controle, code: codeDe(recette), cadre: mesures(pattern), statistiques: computeStats(pattern) };
}

export function changerDimension(recette: Recette, cle: keyof Signature, choix: Choix): Recette {
  return { ...recette, signature: { ...recette.signature, [cle]: choix } };
}

export function varier(recette: Recette): Recette {
  return { ...recette, graine: recette.graine >= MAX_GRAINE ? 1 : recette.graine + 1 };
}

/** L'atelier sait déjà lire ce code : l'aperçu s'ouvre sans créer d'ouvrage. */
export function lienAtelier(recette: Recette): string {
  return '/studio/atelier?rosace=' + encodeURIComponent(codeDe(recette));
}
