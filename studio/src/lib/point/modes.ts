/**
 * Le Point, contrôleur universel : le noyau.
 * Un seul Point, un anneau de modes. Le noyau ne sait rien de la broderie : chaque contexte déclare ses modes.
 * Primitives de la grammaire circulaire employées ici : Centre (le Point), Anneau (les modes), Secteur (un mode),
 * Repère radial (le haut : Confort, toujours), Marque (un mode actif), Onde (l'annonce d'un changement), Poignée (tirer le Point).
 */
import type { ReactNode } from "react";

export type GroupeMode = "acces" | "socle" | "metier" | "creation";

export interface ModePoint {
  id: string;
  /** un point lumineux (lib/point/indicateurs) : l'état attaché à cette commande, ou hérité d'un sous-menu ; posé par la couche visuelle, jamais par le registre */
  indicateur?: { etat: string; mot: string; libelle: string; herite: boolean; id?: string };
  /** le mot du secteur, court */
  nom: string;
  /** ce que le mode fait, une phrase : dite au lecteur d'écran avec le nom */
  aide: string;
  groupe: GroupeMode;
  /** le mode est en cours (loupe ouverte, réglage actif…) : une marque sur le secteur, et le mot « actif » */
  actif?: boolean;
  /** un pictogramme (svg) : montré dans l'arc compact, où il n'y a pas la place du mot ; le mot reste dit et affiché au focus */
  icone?: ReactNode;
  /** le mode annonce lui-même ce qui change (une phrase plus précise que « Mode … activé ») */
  annonceEnPropre?: boolean;
  /**
   * Navigation progressive : un mode qui a des enfants est une famille. Le choisir remplace les choix de l'anneau
   * par ses sous-outils (on revient avec « Retour », Échap ou le centre). `ouvrir` n'est alors pas appelé.
   */
  enfants?: () => ModePoint[];
  /** une couleur : le choix est montré en pastille (fils, nuances) ; le mot reste dit et affiché au centre */
  couleur?: string;
  /** une valeur courte (« +20 », « 50 % », « 16:9 ») : le choix est montré en pastille à valeur, comme une couleur ; le nom reste dit */
  valeur?: string;
  /** le menu reste ouvert après ce choix (une bascule qu'on veut voir changer : Symboles, Grille) */
  resteOuvert?: boolean;
  /** dans le Disque (scène) : après ce choix, la couronne revient au premier cercle (le choix a changé ce que montre le centre) */
  revientAuPoint?: boolean;
  ouvrir: () => void;
}

/* ——— Navigation progressive ——— */
export const RETOUR = "__retour", ORIGINE = "__origine", SUITE = "__suite", FAVORIS = "__favoris";
/** Au-delà de `parPage` choix, une famille se lit par pages : « Suivantes » ajoute la page d'après (les nuances DMC). */
export function paginer(items: ModePoint[], page: number, parPage = 16, allerA: (p: number) => void = () => {}): ModePoint[] {
  if (items.length <= parPage) return items;
  const pages = Math.ceil(items.length / parPage), p = ((page % pages) + pages) % pages;
  return [...items.slice(p * parPage, p * parPage + parPage),
    { id: SUITE, nom: `Suivantes (${p + 1}/${pages})`, aide: `page ${p + 2 > pages ? 1 : p + 2} sur ${pages}`, groupe: "socle", resteOuvert: true, ouvrir: () => allerA(p + 1) }];
}
/** Les choix d'un niveau : Retour en tête (à la place du repère), Point Zéro dès le deuxième niveau, puis les enfants. */
export function niveau(enfants: ModePoint[], profondeur: number, parent: string, actions: { retour: () => void; origine: () => void }): ModePoint[] {
  if (profondeur === 0) return enfants;
  const tete: ModePoint[] = [{ id: RETOUR, nom: "Retour", aide: `revenir avant ${parent}`, groupe: "socle", resteOuvert: true, ouvrir: actions.retour }];
  if (profondeur >= 2) tete.push({ id: ORIGINE, nom: "Point Zéro", aide: "revenir au premier cercle du Point", groupe: "socle", resteOuvert: true, ouvrir: actions.origine });
  return [...tete, ...enfants];
}

const RANG: Record<GroupeMode, number> = { acces: 0, socle: 1, metier: 2, creation: 3 };
export const GROUPES: Record<GroupeMode, string> = { acces: "Réglage d’accès", socle: "Commun", metier: "Métier", creation: "Création" };

/**
 * L'ordre de l'anneau, dans le sens des aiguilles d'une montre depuis le haut :
 * le réglage d'accès d'abord (toujours à la même place), puis le socle, le métier, la création.
 * Dans un groupe, l'ordre de déclaration est gardé. Il faut exactement un mode d'accès.
 */
export function anneau(modes: ModePoint[]): ModePoint[] {
  const acces = modes.filter(m => m.groupe === "acces");
  if (acces.length !== 1) throw new Error("Le Point demande exactement un mode d’accès (Confort), toujours en premier.");
  const ids = new Set<string>();
  for (const m of modes) { if (ids.has(m.id)) throw new Error(`Mode en double : ${m.id}`); ids.add(m.id); }
  return modes.map((m, i) => ({ m, i })).sort((a, b) => RANG[a.m.groupe] - RANG[b.m.groupe] || a.i - b.i).map(x => x.m);
}

/** L'angle d'un secteur, en degrés, 0 = en haut, sens des aiguilles d'une montre. */
export const angleDe = (i: number, n: number) => (360 * i) / n;

/** La position du centre d'un secteur, dans un carré de côté `cote`, à `rayon` du centre. */
export function positionDe(i: number, n: number, rayon: number, cote: number) {
  const a = ((angleDe(i, n) - 90) * Math.PI) / 180;
  return { x: cote / 2 + rayon * Math.cos(a), y: cote / 2 + rayon * Math.sin(a) };
}

/** Tourner dans l'anneau : on boucle. */
export const tourner = (i: number, n: number, pas: number) => ((i + pas) % n + n) % n;

/**
 * La Poignée : le secteur vers lequel on a tiré le Point, ou null si le geste est trop court (c'est alors un simple clic).
 * dx, dy en pixels écran (y vers le bas). `decalage` : l'angle du centre du secteur 0 (ex. −45 pour quatre quarts en diagonale).
 */
export function secteurVise(dx: number, dy: number, n: number, seuil = 28, decalage = 0): number | null {
  if (Math.hypot(dx, dy) < seuil || n < 1) return null;
  const deg = (Math.atan2(dx, -dy) * 180) / Math.PI - decalage; // 0 en haut, sens horaire ; decalage : où est centré le secteur 0
  const part = 360 / n;
  return Math.round((((deg % 360) + 360) % 360) / part) % n;
}

/** Le nom accessible d'un secteur : son nom, « actif » s'il l'est, puis ce qu'il fait. */
export const nomAccessible = (m: ModePoint) => `${m.nom}${m.actif ? ", actif" : ""} : ${m.aide}${m.indicateur && m.indicateur.etat !== "repos" ? (m.indicateur.herite ? `. À voir dans ce sous-menu, ${m.indicateur.mot} : ` : `. ${m.indicateur.mot} : `) + m.indicateur.libelle : ""}`;

/**
 * Où ouvrir l'anneau et les panneaux du Point : dans la boîte de dialogue modale qui le contient (le compositeur),
 * sinon au niveau de la page. Ainsi aucun dock ne les rogne, et un lecteur d'écran les trouve dans la zone active.
 */
export function hotePortail(depuis: Element | null): Element {
  return depuis?.closest('[role="dialog"][aria-modal="true"]') ?? document.body;
}

/* ——— Présentation selon le support : un seul Point, trois façons d'ouvrir ses modes ——— */

/** anneau : le cercle complet (ordinateur) ; panneau : une grille compacte juste au-dessus du Point (téléphone) ;
 * arc : un quart de cercle collé au Point (au choix) ; liste : chaque mode écrit en entier (au choix). */
export type Presentation = "anneau" | "panneau" | "arc" | "liste";
export type ChoixPresentation = "auto" | "arc" | "liste";
export const PRESENTATION_CLE = "pointzero:point:presentation";
export const LARGEUR_TELEPHONE = 720;

export function lirePresentation(): ChoixPresentation {
  try { const v = localStorage.getItem(PRESENTATION_CLE); return v === "arc" || v === "liste" ? v : "auto"; } catch { return "auto"; }
}
export function ecrirePresentation(v: ChoixPresentation): boolean {
  try { if (v === "auto") localStorage.removeItem(PRESENTATION_CLE); else localStorage.setItem(PRESENTATION_CLE, v); return true; } catch { return false; }
}
/** Automatique : l'anneau quand l'écran est large, le panneau compact sur téléphone (ou en zoom fort, qui rétrécit la largeur utile). */
export function presentationPour(choix: ChoixPresentation, largeur: number): Presentation {
  if (choix !== "auto") return choix;
  return largeur < LARGEUR_TELEPHONE ? "panneau" : "anneau";
}

/** Le panneau compact : posé juste au-dessus du Point, sur toute la largeur utile, jamais hors de l'écran. */
export function placePanneau(haut: number, hauteurEcran: number, marge = 8) {
  return { left: marge, right: marge, bottom: Math.max(marge, hauteurEcran - haut + marge) };
}

/**
 * L'arc compact : un quart de cercle autour du Point, ouvert vers le haut et vers le côté où il y a de la place.
 * Les boutons sont espacés d'au moins `pas` px le long de l'arc ; le rayon grandit avec le nombre de modes.
 */
export function dispositionArc(n: number, cx: number, cy: number, largeur: number, pas = 54, bouton = 48) {
  const sens = cx < largeur / 2 ? 1 : -1; // 1 : l'arc s'ouvre vers la droite
  /* de la verticale jusqu'à 30° au-dessus de l'horizontale : la dernière pastille reste au-dessus du dock, sans couvrir ses boutons */
  const ouverture = 60;
  const rayon = Math.max(96, Math.ceil(((n - 1) * pas) / ((ouverture * Math.PI) / 180)));
  const angles = Array.from({ length: n }, (_, i) => -90 + (n > 1 ? (ouverture * i) / (n - 1) : ouverture / 2) * sens);
  const points = angles.map(a => { const t = (a * Math.PI) / 180; return { x: cx + rayon * Math.cos(t), y: cy + rayon * Math.sin(t) }; });
  const marge = bouton / 2 + 8;
  const boite = { left: Math.min(cx, ...points.map(p => p.x)) - marge, top: Math.min(cy, ...points.map(p => p.y)) - marge,
    right: Math.max(cx, ...points.map(p => p.x)) + marge, bottom: Math.max(cy, ...points.map(p => p.y)) + marge };
  return { sens, rayon, angles, points, boite, centre: { x: cx, y: cy } };
}
