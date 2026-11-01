/**
 * La fiche contextuelle : UNE forme pour tous les univers, des DONNÉES et des RÈGLES propres à chacun.
 *
 * Ce qui est commun (et seulement cela) : la forme d'une information (avec d'où elle vient), d'une relation (avec sa
 * raison), d'une action (avec ce qu'elle modifie), et la façon de choisir ce qu'une personne a le droit de voir.
 * Ce qui reste à chaque domaine : ses données, ses permissions, ses règles métier. Un domaine s'ajoute en déclarant
 * un `Domaine` (lib/fiche/registre.ts) ; aucune ligne d'interface n'est écrite pour lui.
 *
 * Les six thèmes de SYST'AIME servent de squelette :
 *  - visuel      → l'aperçu et l'état (glyphe + trait, jamais la couleur seule) ; les jetons sont ceux d'aime.css ;
 *  - interaction → UNE liste d'actions, montrée en boutons dans la fiche ET en commandes dans la couronne du Disque ;
 *  - données     → chaque information dit sa source ; ce qui manque est dit, jamais inventé ;
 *  - relations   → chaque relation dit sa nature et sa raison ; seules les relations réelles sont navigables ;
 *  - restitution → deux présentations d'une même fiche (disque : l'essentiel ; étendu : tout) ;
 *  - mémoire     → la version de la source, et pour chaque action : ce qu'elle écrit, où, et si elle se défait.
 *
 * Ni RIPPLE ni jumeau numérique ne sont branchés : la fiche en prépare seulement la place (source, version, relations,
 * effet d'une action). Un fichier sans React, sans accès au navigateur : il se teste seul.
 */
import { voit, type Role, type Visibilite } from "../carte/carte";

export type { Role, Visibilite };

/** D'où vient une information : le code, l'appareil de la personne, un calcul, ou un serveur. */
export type Lieu = "code" | "appareil" | "calcul" | "serveur";
export interface Source { id: string; libelle: string; lieu: Lieu; detail?: string }

/** Comment l'information a été obtenue. « manquant » : la fiche le dit, avec la raison. */
export type Statut = "lu" | "calcule" | "declare" | "manquant";
export const NOMS_STATUTS_FAIT: Record<Statut, string> = { lu: "Lu", calcule: "Calculé", declare: "Déclaré", manquant: "Non renseigné" };
/** Un signe pour chaque statut : la couleur n'est jamais seule à porter le sens. */
export const GLYPHES_FAIT: Record<Statut, string> = { lu: "✓", calcule: "≈", declare: "✎", manquant: "○" };

export interface Fait {
  cle: string;
  libelle: string;
  /** null quand l'information manque (alors `manque` dit pourquoi) */
  valeur: string | null;
  statut: Statut;
  /** l'identifiant d'une source de la fiche */
  source: string;
  manque?: string;
  /** qui peut voir cette information ; « public » par défaut */
  visibilite?: Visibilite;
}

export type Apercu =
  | { genre: "couleur"; hex: string; texte: string; alt: string }
  | { genre: "image"; src: string; alt: string; credit: string };

export interface Relation {
  domaine: string;
  id: string;
  libelle: string;
  nature: string;
  /** pourquoi cette relation existe, d'après les données */
  raison: string;
  mesure?: string;
  /** vrai seulement si l'élément relié peut être ouvert ici (sinon la relation est un texte) */
  navigable: boolean;
}

export interface Resultat { ok: boolean; message: string; verification?: string }

export interface Action {
  id: string;
  nom: string;
  aide: string;
  /** ce que l'action modifie : null si elle ne modifie rien */
  effet: { quoi: string; ou: string; reversible: boolean } | null;
  /** les rôles autorisés (liste fermée, déclarée par le domaine) */
  roles: Role[];
  /** exécute l'action et RELIT le résultat à sa source : le message dit ce qui a vraiment été constaté */
  executer: () => Resultat;
}

export type EtatFiche = "complete" | "partielle";

export interface Fiche {
  domaine: string;
  id: string;
  surtitre: string;
  titre: string;
  sous?: string;
  apercu?: Apercu;
  faits: Fait[];
  relations: Relation[];
  sources: Source[];
  /** ce que cette fiche ne prouve pas */
  limites: string[];
  actions: Action[];
  /** la version de la source affichée (jamais « la dernière » sans le dire) */
  version: { libelle: string; source: string };
}

/** Ce que ce rôle voit d'une fiche : les informations privées disparaissent, avec leurs sources devenues inutiles. */
export function pourRole(f: Fiche, role: Role): Fiche {
  const faits = f.faits.filter(x => voit(role, x.visibilite ?? "public"));
  const utiles = new Set([...faits.map(x => x.source), f.version.source]);
  return {
    ...f, faits,
    sources: f.sources.filter(s => utiles.has(s.id)),
    actions: f.actions.filter(a => a.roles.includes(role)),
  };
}

/** Une fiche est « partielle » dès qu'une information manque : on le dit, on ne le cache pas. */
export const etatDe = (f: Fiche): EtatFiche => f.faits.some(x => x.statut === "manquant") ? "partielle" : "complete";

/** Contrôle de cohérence : une fiche ne cite que des sources déclarées, et ce qui manque dit pourquoi. */
export function verifierFiche(f: Fiche): string[] {
  const e: string[] = [], ids = new Set(f.sources.map(s => s.id));
  if (ids.size !== f.sources.length) e.push("sources en double");
  if (!ids.has(f.version.source)) e.push("la version cite une source inconnue : " + f.version.source);
  const cles = new Set<string>();
  for (const x of f.faits) {
    if (cles.has(x.cle)) e.push("information en double : " + x.cle); cles.add(x.cle);
    if (!ids.has(x.source)) e.push(`« ${x.libelle} » cite une source inconnue : ${x.source}`);
    if (x.statut === "manquant" ? x.valeur !== null || !x.manque : x.valeur === null || x.valeur === "") e.push(`« ${x.libelle} » : valeur et statut incohérents`);
  }
  const acts = new Set<string>();
  for (const a of f.actions) { if (acts.has(a.id)) e.push("action en double : " + a.id); acts.add(a.id); if (!a.roles.length) e.push(`l'action « ${a.nom} » n'est permise à personne`); }
  if (!f.limites.length) e.push("une fiche dit ce qu'elle ne prouve pas : limites vides");
  return e;
}
