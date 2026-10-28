/* Le programme canonique de démonstration : Camille & Gabriel, le motel du désert, 200 moments en dix étapes.
   Une seule source pour l'accueil, la page des 200 moments, les cinq lectures d'un moment et /musique. */
import donnees from '../data/programme.json';
import type { Moment as CleMusique } from './musique';
export * from './programme-outils.mjs';

export type Personne = { id: string; nom: string; role: string };
export type Etape = { id: string; nom: string; repere: string };
export type Voix = { id: string; nom: string; dmc: string; hex: string; familles: string[] };
export type Consignes = { besoins: string[]; taches: string[]; risques: string[]; repli: string[] };
export type MomentP = {
  n: number; id: string; titre: string; description: string; etape: string; debut: string; fin: string; duree: number; lieu: string;
  metiers: string[]; possibles: string[]; responsables: string[]; prerequis: string[]; tranche?: string; musique?: CleMusique; documents?: string[]; consignes?: Consignes;
};
export type Programme = {
  note: string;
  union: { nom: string; univers: string; lieu: string; jour: string; personnes: Personne[] };
  lieux: { id: string; nom: string }[]; etapes: Etape[]; familles: Record<string, string>;
  metiers: Record<string, { nom: string; famille: string }>; reseau: Record<string, string[]>; voix: Voix[]; moments: MomentP[];
};
export const PROGRAMME = donnees as unknown as Programme;
