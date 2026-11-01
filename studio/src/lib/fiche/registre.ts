/**
 * Le registre des domaines de la fiche contextuelle. Un domaine = son identifiant, un nom, et UNE fonction qui lit
 * ses sources réelles et rend une fiche (ou rien). Il n'y a pas d'autre extension : pas de composant à écrire.
 *
 * L'élément choisi tient dans une adresse courte « <domaine>-<identifiant> » (ex. « dmc-310 »), compatible avec l'état
 * des contextes du Disque (lib/one/contextes.ts : /one/univers?u=broderie&o=dmc-310) : la sélection s'envoie et se retrouve.
 */
import { pourRole, type Fiche, type Role } from "./fiche";

export interface Domaine {
  id: string;
  nom: string;
  /** lit les sources réelles et rend la fiche COMPLÈTE ; null si l'élément n'existe pas dans ce domaine.
      Ce que chaque rôle en voit est décidé ici, une fois, par `pourRole` : un domaine ne filtre rien lui-même. */
  resoudre(id: string): Fiche | null;
}

const domaines = new Map<string, Domaine>();
const ID = /^[a-z][a-z0-9]{1,23}$/;

/** Déclarer un domaine. Refuse un identifiant invalide ou déjà pris (la raison est rendue). */
export function declarerDomaine(d: Domaine): string | null {
  if (!ID.test(d.id)) return "identifiant de domaine invalide";
  if (domaines.has(d.id)) return "domaine déjà déclaré";
  domaines.set(d.id, d);
  return null;
}
export const domaineDe = (id: string): Domaine | undefined => domaines.get(id);
export const tousLesDomaines = (): Domaine[] => [...domaines.values()];
/** pour les tests : retirer un domaine déclaré par un test */
export function oublierDomaine(id: string): void { domaines.delete(id); }

export const adresse = (domaine: string, id: string): string => `${domaine}-${id}`;
/** « dmc-310 » → { domaine: "dmc", id: "310" } ; tout le reste est refusé */
export function lireAdresse(a: string | undefined | null): { domaine: string; id: string } | null {
  const m = /^([a-z][a-z0-9]{1,23})-([A-Za-z0-9._-]{1,76})$/.exec(a ?? "");
  return m ? { domaine: m[1], id: m[2] } : null;
}

/** Résoudre une adresse : la fiche, ou une raison honnête (domaine inconnu, élément absent). */
export function resoudre(a: string | undefined | null, role: Role): { ok: true; fiche: Fiche } | { ok: false; raison: string } {
  const l = lireAdresse(a);
  if (!l) return { ok: false, raison: "Cette adresse n'est pas celle d'un élément." };
  const d = domaines.get(l.domaine);
  if (!d) return { ok: false, raison: `Aucun domaine « ${l.domaine} » n'est raccordé aux fiches.` };
  const f = d.resoudre(l.id);
  return f ? { ok: true, fiche: pourRole(f, role) } : { ok: false, raison: `${d.nom} : « ${l.id} » n'existe pas.` };
}
