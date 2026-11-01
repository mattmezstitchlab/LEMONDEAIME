/**
 * Un parcours de 64 recettes de structure « rosace », pas un nouveau moteur ni
 * l'échiquier SYST'AIME. Les trois exemples nommés viennent du Studio ; les
 * autres compositions sont des recettes 5D déterministes de cette page.
 */
import { codeDe, lireCode, VERSION, type Choix, type Recette } from '../../studio/src/lib/motif5d/code';
import { RECETTES } from '../../studio/src/lib/motif5d/recettes';
import { RECETTE_INITIALE } from './modele';

export interface RosaceCollection {
  numero: number;
  nom: string;
  code: string;
  recette: Recette;
}

const exemples = ['Carreau rose', 'Givre', 'Kaléidoscope'].map(nom => {
  const entree = RECETTES.find(r => r.nom === nom);
  const recette = entree && lireCode(entree.code);
  if (!recette) throw new Error(`Recette de démonstration introuvable : ${nom}`);
  return { nom, recette };
});

const compositions = Array.from({ length: 60 }, (_, i) => {
  const trace = (i % 4) as Choix;
  const densite = (Math.floor(i / 4) % 4) as Choix;
  const echelle = (Math.floor(i / 16) % 4) as Choix;
  const palette = ((trace + densite + echelle) % 4) as Choix;
  const recette: Recette = { signature: { structure: 0, trace, densite, echelle, palette }, graine: 101 + 37 * i, version: VERSION };
  return { nom: `Rosace ${String(i + 5).padStart(2, '0')}`, recette };
});

export const COLLECTION_ROSACES: RosaceCollection[] = [
  { nom: 'Rosace vive', recette: RECETTE_INITIALE },
  ...exemples,
  ...compositions,
].map(({ nom, recette }, i) => ({ numero: i + 1, nom, recette, code: codeDe(recette) }));

/** Après une création libre hors collection, suivant commence au début, précédent à la fin. */
export function prochaineRosace(code: string, direction: -1 | 1): RosaceCollection {
  const i = COLLECTION_ROSACES.findIndex(r => r.code === code);
  const prochain = i < 0 ? (direction === 1 ? 0 : COLLECTION_ROSACES.length - 1)
    : (i + direction + COLLECTION_ROSACES.length) % COLLECTION_ROSACES.length;
  return COLLECTION_ROSACES[prochain];
}
