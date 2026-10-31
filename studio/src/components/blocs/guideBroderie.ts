/**
 * Le Guide lumineux de la broderie : des règles explicites, sans IA, à partir de l'état réel de l'ouvrage.
 * Il propose UNE commande (son point s'allume en violet, le cartouche dit pourquoi) ; il n'exécute jamais rien.
 * La personne reste libre de suivre ou d'ignorer ; la suggestion avance avec les véritables événements du studio.
 */
export interface EtatGuide {
  /** points posés dans le motif (0 : motif vide) */
  points: number;
  /** points déjà brodés (suivi) */
  brodes: number;
  /** un fil a été choisi pendant cette séance */
  filChoisi: boolean;
  /** un outil de dessin ou de broderie est en main */
  outilEnMain: boolean;
  /** la couleur active est entièrement brodée */
  couleurTerminee: boolean;
}
export interface Suggestion { commande: string; libelle: string }

export function suggestion(e: EtatGuide): Suggestion | null {
  if (e.points === 0) return { commande: "importer", libelle: "Commencez par choisir une photographie ou un motif." };
  if (e.couleurTerminee) return { commande: "fils", libelle: "Cette couleur est terminée : choisissez la suivante." };
  if (!e.filChoisi) return { commande: "fils", libelle: "Choisissez les couleurs de votre ouvrage." };
  if (!e.outilEnMain) return e.brodes > 0
    ? { commande: "broder", libelle: "Reprenez la broderie : cochez les points brodés dans la toile." }
    : { commande: "points", libelle: "Choisissez un point pour travailler dans la toile." };
  return null;
}
