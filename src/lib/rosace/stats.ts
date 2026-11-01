// ROSACE — Indicateurs de réalisation
//
// Tous les nombres ci-dessous viennent du modèle (computeStats de l'atelier
// Point Zéro) appliqué au patron généré. Les estimations de temps et de
// toile sont des hypothèses d'atelier, explicitement documentées : ce ne sont
// ni des mesures fabricant, ni des garanties de réalisation.

import { computeStats, type Pattern, type ColorStat } from "../../../studio/src/lib/pattern";

export type { ColorStat };
import { type Signature5D } from "./signature";

/** Hypothèse d'atelier : 45 secondes de travail par croix en moyenne,
 * changement de fil et arrêts inclus, pour une brodeuse intermédiaire.
 * Arrondi au quart d'heure près. À afficher comme une estimation, pas un délai garanti. */
export const SECONDES_PAR_CROIX = 45;

/** Un écheveau DMC Mouliné Spécial contient 8 m de fil à 6 brins = 48 m de brin simple. */
export const METRES_PAR_ECHEAVEAU = 48;

/** Temps estimé pour broder le patron entier (hypothèse d'atelier). */
export function estimerTemps(croix: number): {
  secondes: number;
  minutes: number;
  heures: number;
  texte: string;
} {
  const secondes = Math.round(croix * SECONDES_PAR_CROIX);
  const minutes = Math.round(secondes / 60);
  const heures = minutes / 60;
  let texte: string;
  if (minutes < 60) texte = `${minutes} min`;
  else if (heures < 24) {
    const h = Math.floor(heures);
    const m = minutes - h * 60;
    texte = m === 0 ? `${h} h` : `${h} h ${m} min`;
  } else {
    texte = `${Math.round(heures)} h`;
  }
  return { secondes, minutes, heures, texte };
}

/** Critères documentés de difficulté (modèle d'atelier, pas une échelle labo). */
export interface Difficulte {
  niveau: "debutant" | "intermediaire" | "expert";
  score: number;
  critères: { nom: string; valeur: number; commentaire: string }[];
}

export function difficulté(pattern: Pattern, signature: Signature5D): Difficulte {
  const stats = computeStats(pattern);
  const nbCouleurs = stats.rows.filter((r) => r.cells > 0).length;
  const formatMap: Record<Signature5D["format"], number> = { "40": 40, "80": 80, "120": 120, "160": 160 };
  const taille = formatMap[signature.format];

  const critères: Difficulte["critères"] = [
    {
      nom: "Nombre de couleurs",
      valeur: nbCouleurs,
      commentaire: `Chaque couleur supplémentaire ajoute des changements de fil (${nbCouleurs} dans ce motif).`,
    },
    {
      nom: "Taille de la grille",
      valeur: taille,
      commentaire: `${taille} × ${taille} points, soit ${stats.totals.contentCells} points de pose environ.`,
    },
    {
      nom: "Densité",
      valeur: signature.densité === "dense" ? 2 : signature.densité === "equilibree" ? 1 : 0,
      commentaire: signature.densité === "dense" ? "Beaucoup de points rapprochés." : signature.densité === "aeree" ? "Points espacés, motif aéré." : "Remplissage équilibré.",
    },
  ];

  let score = 0;
  score += (nbCouleurs - 1) * 6;
  score += (taille / 40) * 5;
  score += signature.densité === "dense" ? 14 : signature.densité === "equilibree" ? 7 : 0;
  score += signature.tracé === "rempli" ? 6 : signature.tracé === "contours" ? 4 : signature.tracé === "croix" ? 2 : 0;

  let niveau: Difficulte["niveau"] = "debutant";
  if (score > 60) niveau = "expert";
  else if (score > 30) niveau = "intermediaire";

  return { niveau, score, critères };
}

/** Recommandation de toile, seulement lorsqu'elle est justifiée par la taille du motif. */
export interface ToileConseillee {
  count: number;
  libelle: string;
  approxCm: number;
  justifiee: boolean;
  raison: string;
}

export function toileConseillee(formatPoints: number): ToileConseillee | null {
  const count = formatPoints >= 100 ? 16 : 14;
  const approxCm = Math.round((2.54 / count) * formatPoints * 10) / 10;
  const justifiee = formatPoints >= 80;
  const raison =
    formatPoints >= 120
      ? "Grande grille : un comptage 16 points/cm préserve le détail des petits éléments."
      : formatPoints >= 80
      ? "Moyenne grande grille : l'Aida 14 reste confortable, le 16 affine le rendu."
      : "Grille de taille modeste : l'Aida 14 points/cm est tout à fait adaptée, y compris pour débuter.";
  return {
    count,
    libelle: count === 14 ? "Aida 14 points/cm" : "Aida 16 points/cm (ou lin 16 sur 2 fils)",
    approxCm,
    justifiee,
    raison,
  };
}

/** Métriques d'achat : mètres de fil et écheveaux par couleur, du modèle atelier. */
export function approvisionnement(pattern: Pattern) {
  const stats = computeStats(pattern);
  const lignes = stats.rows
    .filter((r) => r.cells > 0)
    .map((r) => ({
      code: r.code,
      name: r.name,
      hex: r.hex,
      cells: r.cells,
      mètres: Math.round((r.meters / 100) * 10) / 10,
      écheveaux: r.skeins,
    }))
    .sort((a, b) => b.cells - a.cells);
  return { lignes, totalMètres: stats.totals.meters / 100, totalÉcheveaux: stats.totals.skeins };
}
