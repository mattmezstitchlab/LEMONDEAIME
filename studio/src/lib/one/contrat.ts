/**
 * .0NE — le contrat universel (phase 2). Des données sérialisables, sans React : le Bureau éditorial pourra les administrer.
 *
 * Ce qui est commun à tous les univers (et seulement cela) : l'interaction, le registre des commandes, la présentation
 * géométrique, le contenu central, les états (confort, notifications, accessibilité). Chaque univers garde son propre moteur ;
 * le Disque orchestre. Un univers n'est « disponible » que si son moteur est réellement raccordé (une ouverture vérifiable).
 *
 * Trois présentations d'un même objet : POINT (compact), DISQUE (couronne et centre), ÉTENDU (le contenu prend la place,
 * le Point reste accessible). On ne force jamais un contenu dense à tenir dans un cercle.
 */

export type StatutUnivers = "disponible" | "experimental" | "preparation";
export const NOMS_STATUTS: Record<StatutUnivers, string> = { disponible: "Disponible", experimental: "Expérimental", preparation: "En préparation" };

/** l'état éditorial (le Bureau) : distinct du statut technique. Enregistrer un univers n'autorise pas à le publier. */
export type Publication = "publie" | "brouillon";

/** ce que montre le centre du Disque */
export type TypeCentre = "ouvrage" | "dossiers" | "carte" | "media" | "programme" | "scene" | "oeuvre" | "creation" | "personne" | "produit" | "cadran" | "service" | "contexte";

/** les trois présentations d'un même objet ; le contenu choisit celle qui lui convient (un tableau dense : « etendu ») */
export type Presentation = "point" | "disque" | "etendu";

/** les pictogrammes sont nommés (pas de composant dans les données) ; l'interface les dessine */
export type Icone = "aiguille" | "anneaux" | "note" | "livre" | "palette" | "reseau" | "dossier" | "sac" | "horloge" | "lecture" | "carte"
  | "prise" | "fils" | "points" | "loupe" | "oeil" | "import" | "export" | "personnes" | "lumiere" | "son" | "regie" | "document" | "agenda"
  | "visite" | "outils" | "matiere" | "formats" | "galerie" | "nouveau" | "chercher" | "ranger" | "partager" | "categories" | "panier"
  | "jalons" | "cadrage" | "reglages" | "favoris" | "autorisations" | "raccourcis" | "plante" | "presentation" | "infos" | "terminal" | "git" | "historique" | "executer";

/** un média de présentation : toujours crédité ; une reconstitution est annoncée comme telle */
export interface MediaUnivers {
  src: string; alt: string; credit: string;
  licence: "domaine-public" | "capture-du-studio" | "reconstitution" | "autorisee";
  /** une variante pour le thème Nuit, si elle existe */
  nuit?: string;
}

/** une famille de commandes de la couronne (les commandes réelles vivent dans le registre du bloc, côté moteur) */
export interface FamilleUnivers { id: string; nom: string; icone: Icone }

/** comment on entre dans l'univers : une adresse réelle de l'application, ou rien (en préparation) */
export type Ouverture = { type: "route"; chemin: string } | { type: "aucune" };

export interface Univers {
  /** identifiant stable (jamais renommé : il sert aux favoris de la personne) */
  id: string;
  nom: string;
  /** une phrase, pour la mosaïque */
  phrase: string;
  description: string;
  icone: Icone;
  visuel?: MediaUnivers;
  centre: TypeCentre;
  familles: FamilleUnivers[];
  statut: StatutUnivers;
  ordre: number;
  ouverture: Ouverture;
  /** les modules communs utilisés (bureau, carte-vivante, galerie, indicateurs…) */
  modules: string[];
  /** la couleur propre à l'univers (contenu, jamais l'interface) */
  teinte: string;
  publication: Publication;
  /** un univers fictif, pour démontrer le registre : toujours annoncé comme tel */
  demonstration?: boolean;
  /** un site AIME qui existe hors de .0NE (dit comme tel, jamais présenté comme raccordé) */
  ailleurs?: { nom: string; chemin: string };
}

/** Les règles d'honnêteté du registre. Une entrée qui les enfreint n'est pas affichée. */
export function verifierUnivers(u: Univers): string[] {
  const e: string[] = [];
  if (!/^[a-z][a-z0-9-]{1,31}$/.test(u.id)) e.push("identifiant invalide");
  if (!u.nom.trim() || !u.phrase.trim()) e.push("nom et phrase obligatoires");
  if (u.statut === "disponible" && u.ouverture.type !== "route") e.push("« disponible » exige un moteur raccordé (une ouverture réelle)");
  if (u.statut === "preparation" && u.ouverture.type !== "aucune") e.push("« en préparation » ne s'ouvre pas encore");
  if (u.demonstration && u.statut !== "experimental") e.push("un univers de démonstration est toujours « expérimental »");
  if (u.visuel && (!u.visuel.credit.trim() || !u.visuel.alt.trim())) e.push("un visuel sans crédit ni description");
  if (u.visuel?.licence === "reconstitution" && !/reconstitution/i.test(u.visuel.credit)) e.push("une reconstitution doit être annoncée dans son crédit");
  if (!u.familles.length) e.push("au moins une famille de commandes");
  if (!/^#[0-9a-f]{6}$/i.test(u.teinte)) e.push("teinte invalide");
  return e;
}

/** Ce que la mosaïque publique montre : les univers publiés et conformes, dans leur ordre. */
export function universPublics(liste: Univers[]): Univers[] {
  const vus = new Set<string>();
  return liste.filter(u => { if (vus.has(u.id) || u.publication !== "publie" || verifierUnivers(u).length) return false; vus.add(u.id); return true; })
    .sort((a, b) => a.ordre - b.ordre || a.nom.localeCompare(b.nom, "fr"));
}

/** La présentation qui convient à un contenu : un cercle n'enferme jamais un contenu dense. */
export function presentationPour(centre: TypeCentre, largeur: number): Presentation {
  if (largeur < 600) return "etendu";                                  /* téléphone : le contenu d'abord, le Point à la demande */
  return centre === "programme" || centre === "service" ? "etendu" : "disque";   /* un programme, une configuration : trop denses pour un cercle */
}
