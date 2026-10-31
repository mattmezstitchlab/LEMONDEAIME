/**
 * Les destinations réelles du parcours AIME — une seule source, pour ne plus se perdre entre les prototypes.
 *
 *   Film LUMIERE → Première rencontre (préférences) → Accueil de choix → Disque .0NE  |  Cube ATLAS
 *
 * ATLAS est une application indépendante (dépôt mattmezstitchlab/Atlas-de-pique-de-coeur), déployée à part :
 * on y va par un lien sortant, sans rien copier ici (ni chronologie, ni projets, ni éditeur, ni modules, ni mosaïque).
 * Adresse : atlas.lemondeaime.com (31/10/2026), ATLAS étant un projet de Le Monde AIME ; son calendrier est lu par le Disque (lib/present/atlas.ts).
 */
import { PROTOTYPES } from "./site";

const S = import.meta.env.BASE_URL;   // /studio/

/** L'adresse d'ATLAS. Une version de test peut la remplacer à la construction (VITE_ATLAS_URL), jamais à l'exécution. */
export const ATLAS_URL: string = import.meta.env.VITE_ATLAS_URL || "https://atlas.lemondeaime.com/";

export const DESTINATIONS = {
  film: S + "one/lumiere",
  rencontre: S + "one/premiere-rencontre",
  /** la Première rencontre, même quand les préférences sont déjà enregistrées (pour les modifier) */
  reglages: S + "one/premiere-rencontre?modifier",
  /** l'accueil de choix (le Disque ou le Cube) n'existe que sur les aperçus privés ; sur lemondeaime.com, on continue vers .0NE */
  accueil: PROTOTYPES ? S + "accueil" : S + "one/univers",
  one: S + "one/univers",
  explorer: S + "explorer",
  atlas: ATLAS_URL,
} as const;
