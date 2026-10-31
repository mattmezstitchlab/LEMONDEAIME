/**
 * Les dispositions du Point : comment le disque se présente à la personne (phase 4 du Bureau, « Personnaliser mon Point »).
 * Ce fichier réserve seulement leur place dans la configuration. Il n'est lu par aucun composant aujourd'hui :
 * le dock radial n'est pas modifié.
 *
 * - « disque » : le Point actuel, la disposition par défaut.
 * - « tambour » : RÉSERVÉ, non construit. Le tambour de brodeuse devient une surface de broderie : la toile au centre,
 *   les commandes du Point autour du cercle. Il réutilisera le Cadre et le moteur radial existants ; la toile n'est jamais
 *   découpée, les points hors du cercle restent dans l'ouvrage (on déplace le tambour sur la toile).
 *
 * - « projection » : RÉSERVÉ, non construit. Projection sur toile : le centre du cercle ouvre la caméra, la personne filme
 *   sa vraie toile ou son tambour, et le patron s'y superpose avec correction de perspective (alignement automatique puis
 *   manuel : quatre coins, rotation, échelle, décalage ; opacité ; symboles, aplats, grille ou couleur DMC active ;
 *   suivi pas à pas). L'image de la caméra reste sur l'appareil, rien n'est envoyé.
 *
 * Une préférence enregistrée qui nomme une disposition inconnue ou pas encore disponible retombe sur « disque » :
 * aucune configuration ne peut faire disparaître le Point.
 */
export type Disposition = "disque" | "tambour" | "projection";

export interface InfoDisposition { id: Disposition; nom: string; aide: string; disponible: boolean }

export const DISPOSITIONS: readonly InfoDisposition[] = [
  { id: "disque", nom: "Disque", aide: "le Point, ses familles et ses anneaux", disponible: true },
  { id: "tambour", nom: "Tambour", aide: "la toile au centre, les commandes autour du cercle (à venir)", disponible: false },
  { id: "projection", nom: "Projection sur toile", aide: "le patron superposé à votre vraie toile, filmée par la caméra (à venir)", disponible: false },
];

export const DISPOSITION_PAR_DEFAUT: Disposition = "disque";

/** La disposition réellement utilisée pour une valeur enregistrée, quelle qu'elle soit. */
export function dispositionEffective(valeur: unknown): Disposition {
  const d = DISPOSITIONS.find(x => x.id === valeur);
  return d && d.disponible ? d.id : DISPOSITION_PAR_DEFAUT;
}

/** Les dispositions qu'une interface peut proposer aujourd'hui : jamais une disposition à venir. */
export const dispositionsProposees = () => DISPOSITIONS.filter(d => d.disponible);
