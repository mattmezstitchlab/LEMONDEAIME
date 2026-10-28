import { pollinationsUrl } from "./promptcraft";
import { loadRemoteImage } from "./convert";
import { imageToDmc } from "./dither";

/**
 * Le tuyau de génération, partagé.
 *
 * La toile s'en sert pour son motif d'ambiance (différent à chaque visite),
 * le champ du hero s'en sert pour les motifs qu'on décrit : même service
 * tiers d'image, même conversion dithering vers la palette DMC. Rien n'est
 * dupliqué, rien n'est simulé ici — si le réseau manque, l'appelant le sait
 * et peut replier sur un motif local.
 */
export interface MotifBrut {
  cross: Int16Array;
  palette: number[];
}

export async function genererMotif(texte: string, seed: number): Promise<MotifBrut> {
  const img = await loadRemoteImage(pollinationsUrl(texte, 512, 512, seed));
  const { cross, palette } = imageToDmc(img, 44, 44, { mode: "dither", maxColors: 18, dropWhite: false });
  return { cross, palette };
}

/** Les sujets d'ambiance : la toile brode toujours quelque chose. */
export const PROMPTS_AMBIANCE = [
  "renard endormi dans les fougères",
  "village pastel sous la neige",
  "pissenlit au vent",
  "chat roux sur un rebord de fenêtre",
  "citrons et feuillage sur fond crème",
  "phare dans la brume matinale",
  "bouquet de bleuets et de coquelicots",
  "montagnes au crépuscule",
];

export function promptAmbiance(): { texte: string; seed: number } {
  const texte = PROMPTS_AMBIANCE[Math.floor(Math.random() * PROMPTS_AMBIANCE.length)];
  return { texte, seed: Math.floor(Math.random() * 1000000) };
}
