/**
 * La carte vivante : UNE donnée structurée, plusieurs formes (ronde, carrée, verticale, page).
 * Chaque forme présente les mêmes données selon une disposition adaptée ; aucune donnée ne vit dans une forme.
 *
 * - Les modules sont facultatifs : un métier déclare ceux qu'il propose et leur ordre ; la personne décide de la
 *   visibilité de chacun (tout le monde, ses clients, elle seule). Un module sans données n'est jamais affiché.
 * - Les actions autorisées viennent d'une liste fermée, filtrée par le métier et par le rôle de la personne qui regarde :
 *   une carte ne peut pas inventer une action, ni la proposer à un rôle qui n'y a pas droit.
 * - Indépendante de la loupe du studio : aucune logique de lecture de grille n'est utilisée ici. Seul le vocabulaire
 *   visuel (ronde, carrée) est partagé.
 */
export type Format = "ronde" | "carree" | "verticale" | "page";
export const FORMATS: { id: Format; nom: string; aide: string }[] = [
  { id: "ronde", nom: "Ronde", aide: "l’essentiel, d’un coup d’œil" },
  { id: "carree", nom: "Carrée", aide: "une vignette de galerie" },
  { id: "verticale", nom: "Verticale", aide: "au format d’un téléphone" },
  { id: "page", nom: "Page", aide: "toute la carte, en pleine largeur" },
];

export type TypeModule = "identite" | "medias" | "description" | "localisation" | "tarifs" | "prestations" | "galerie" | "contact" | "disponibilites" | "actions";
export const NOMS_MODULES: Record<TypeModule, string> = {
  identite: "Identité", medias: "Médias", description: "Présentation", localisation: "Localisation", tarifs: "Tarifs",
  prestations: "Prestations", galerie: "Galerie", contact: "Contact", disponibilites: "Disponibilités", actions: "Actions",
};

/** Qui regarde la carte. */
export type Role = "visiteur" | "client" | "proprietaire";
export const ROLES: { id: Role; nom: string }[] = [
  { id: "visiteur", nom: "Visiteur" }, { id: "client", nom: "Client" }, { id: "proprietaire", nom: "Propriétaire" },
];
/** Qui peut voir un module : tout le monde, les clients (et la personne), la personne seule. */
export type Visibilite = "public" | "clients" | "prive";
const VOIT: Record<Role, Visibilite[]> = { visiteur: ["public"], client: ["public", "clients"], proprietaire: ["public", "clients", "prive"] };
/** Qui voit quoi : la règle de visibilité, partagée avec les fiches contextuelles (lib/fiche) pour n'exister qu'une fois. */
export const voit = (role: Role, v: Visibilite): boolean => VOIT[role].includes(v);

export type IdAction = "contacter" | "devis" | "reserver" | "enregistrer" | "partager" | "modifier";
export const ACTIONS: Record<IdAction, { nom: string; roles: Role[] }> = {
  contacter: { nom: "Contacter", roles: ["visiteur", "client"] },
  devis: { nom: "Demander un devis", roles: ["visiteur", "client"] },
  reserver: { nom: "Réserver", roles: ["client"] },
  enregistrer: { nom: "Enregistrer la carte", roles: ["visiteur", "client"] },
  partager: { nom: "Partager", roles: ["visiteur", "client", "proprietaire"] },
  modifier: { nom: "Modifier ma carte", roles: ["proprietaire"] },
};

/** Les métiers : les modules proposés, dans leur ordre, et les actions possibles. Un nouveau métier s'ajoute ici, sans autre code. */
export const METIERS: Record<string, { nom: string; modules: TypeModule[]; actions: IdAction[] }> = {
  brodeuse: { nom: "Brodeuse", modules: ["identite", "medias", "description", "prestations", "tarifs", "galerie", "disponibilites", "localisation", "contact", "actions"], actions: ["contacter", "devis", "reserver", "enregistrer", "partager", "modifier"] },
  photographe: { nom: "Photographe", modules: ["identite", "medias", "galerie", "description", "tarifs", "disponibilites", "localisation", "contact", "actions"], actions: ["contacter", "devis", "reserver", "partager", "modifier"] },
  musicien: { nom: "Musicien", modules: ["identite", "medias", "description", "prestations", "disponibilites", "tarifs", "contact", "actions"], actions: ["contacter", "devis", "partager", "modifier"] },
  lieu: { nom: "Lieu", modules: ["identite", "medias", "description", "localisation", "galerie", "tarifs", "contact", "actions"], actions: ["contacter", "devis", "enregistrer", "partager", "modifier"] },
};

export interface Media { genre: "image" | "video"; src: string; alt: string; credit: string; affiche?: string }
export interface Carte {
  id: string;
  /** une carte d'exemple : annoncée comme telle, sans données personnelles réelles */
  fictive: boolean;
  metier: keyof typeof METIERS;
  visibilite: Partial<Record<TypeModule, Visibilite>>;
  identite: { nom: string; activite: string; initiales: string };
  medias: Media[];
  description?: { titre: string; texte: string };
  localisation?: { ville: string; zone: string };
  tarifs?: { libelle: string; prix: string }[];
  prestations?: { nom: string; detail: string }[];
  galerie?: { src: string; alt: string }[];
  contact?: { canal: string; valeur: string }[];
  disponibilites?: { jour: string; creneaux: string[] }[];
  actions?: IdAction[];
  chiffres?: { valeur: string; libelle: string }[];
}

const aDesDonnees = (c: Carte, t: TypeModule): boolean => {
  if (t === "identite") return true;
  if (t === "actions") return actionsPour(c, "proprietaire").length > 0 || actionsPour(c, "client").length > 0 || actionsPour(c, "visiteur").length > 0;
  const v = (c as unknown as Record<string, unknown>)[t];
  return Array.isArray(v) ? v.length > 0 : !!v;
};

/** Les modules que voit un rôle, dans l'ordre du métier. L'identité est toujours publique. */
export function modulesVisibles(c: Carte, role: Role): TypeModule[] {
  const m = METIERS[c.metier]; if (!m) return ["identite"];
  return m.modules.filter(t => t === "identite" || (VOIT[role].includes(c.visibilite[t] ?? "public") && aDesDonnees(c, t)));
}

/** Les actions proposées à un rôle : déclarées par la carte, permises par le métier, autorisées pour ce rôle. Jamais d'autres. */
export function actionsPour(c: Carte, role: Role): IdAction[] {
  const m = METIERS[c.metier]; if (!m) return [];
  return (c.actions ?? []).filter(a => a in ACTIONS && m.actions.includes(a) && ACTIONS[a].roles.includes(role));
}

/**
 * La disposition d'une forme : ce qui va au recto, ce qui va au verso, et ce qui reste à voir en page.
 * Une forme compacte montre peu ; rien n'est perdu : la page montre tout ce que le rôle peut voir.
 */
const PLACES: Record<Exclude<Format, "page">, { recto: TypeModule[]; verso: TypeModule[]; max: number }> = {
  ronde: { recto: ["medias", "identite"], verso: ["description", "actions"], max: 2 },
  carree: { recto: ["medias", "identite"], verso: ["description", "prestations", "tarifs", "actions"], max: 3 },
  verticale: { recto: ["medias", "identite", "localisation"], verso: ["description", "prestations", "tarifs", "disponibilites", "contact", "actions"], max: 5 },
};
export function disposition(format: Format, visibles: TypeModule[]): { recto: TypeModule[]; verso: TypeModule[]; ailleurs: TypeModule[] } {
  if (format === "page") return { recto: visibles, verso: [], ailleurs: [] };
  const p = PLACES[format];
  const recto = p.recto.filter(t => visibles.includes(t));
  /* le verso suit l'ordre du métier parmi les places permises ; les actions restent toujours en bas */
  const candidats = visibles.filter(t => p.verso.includes(t) && t !== "actions");
  const verso = candidats.slice(0, visibles.includes("actions") ? p.max - 1 : p.max);
  if (visibles.includes("actions")) verso.push("actions");
  const ailleurs = visibles.filter(t => !recto.includes(t) && !verso.includes(t));
  return { recto, verso, ailleurs };
}
