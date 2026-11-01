/**
 * Les actions d'une fiche : UNE seule liste, UN seul chemin d'exécution.
 * Les boutons de la fiche et les commandes de la couronne du Disque (Le Point) appellent la même fonction ; il n'existe
 * pas de second système de commandes. Le rôle est revérifié ici, au moment d'agir, et jamais seulement à l'affichage.
 */
import type { ModePoint } from "../point/modes";
import type { Action, Fiche, Resultat, Role } from "./fiche";

/* un petit signal : quand une action a agi, tout ce qui montre cette fiche la relit à sa source */
const abonnes = new Set<() => void>();
export function suivreFiches(f: () => void): () => void { abonnes.add(f); return () => { abonnes.delete(f); }; }
export function signalerFiches(): void { abonnes.forEach(f => f()); }

/** Exécuter une action : permission revérifiée, erreur dite, résultat relu à la source (voir Action.executer), puis signal. */
export function executerAction(a: Action, role: Role): Resultat {
  if (!a.roles.includes(role)) return { ok: false, message: `« ${a.nom} » n'est pas permis à ce rôle.` };
  let r: Resultat;
  try { r = a.executer(); } catch (e) { r = { ok: false, message: e instanceof Error ? e.message : "L'action a échoué." }; }
  if (r.ok) signalerFiches();
  return r;
}

/** Ce qu'une action modifie, en une phrase (pour l'afficher avant d'agir, et pour la couronne). */
export const effetEnPhrase = (a: Action): string =>
  a.effet ? `${a.effet.quoi} (${a.effet.ou}${a.effet.reversible ? " ; se défait" : " ; ne se défait pas"})` : "ne modifie rien";

/** Les actions permises à ce rôle, sous la forme de commandes du Point : mêmes noms, mêmes effets dits. */
export function commandesDeFiche(f: Fiche, role: Role, apres: (a: Action, r: Resultat) => void): ModePoint[] {
  return f.actions.filter(a => a.roles.includes(role)).map(a => ({
    id: `fc-${f.domaine}-${a.id}`, nom: a.nom, groupe: "metier" as const,
    aide: `${a.aide} — ${effetEnPhrase(a)}`,
    ouvrir: () => apres(a, executerAction(a, role)),
  }));
}
