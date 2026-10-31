/**
 * .0NE — les CONTEXTES du Disque : un univers n'est pas une autre application à ouvrir, c'est un contexte dans lequel le même
 * Disque devient un autre outil. Le centre présente le contenu ; la couronne donne les actions ; le Point garde la continuité ;
 * la grille (ATLAS) permet de retrouver les univers.
 *
 * Chaque univers raccordé déclare ici (et nulle part ailleurs) : ses commandes (familles, actions réelles, sous-couronnes),
 * ses permissions, ses états et indicateurs, sa vue centrale, ses règles de retour, et s'il demande un espace plein écran.
 * Le Disque n'est jamais recopié : la page lit le contexte actif et le donne au même composant.
 */
import type { ReactNode } from "react";
import type { ModePoint } from "../point/modes";

/** L'état d'un contexte, gardé dans l'adresse (et l'historique) : l'univers, l'objet choisi, des filtres. */
export interface EtatContexte { u: string; o?: string; f?: Record<string, string> }

export interface OutilsContexte {
  /** changer d'objet ou de filtres dans le même univers (une entrée d'historique) */
  aller: (e: Partial<EtatContexte>, remplacer?: boolean) => void;
  /** changer d'univers (une entrée d'historique ; le contexte précédent reste joignable par « Retour ») */
  changerUnivers: (id: string) => void;
  /** ouvrir un espace plein écran (atelier, Terminal…) en gardant le chemin du retour vers ce contexte */
  deployer: (chemin: string) => void;
  /** dire quelque chose dans la zone réservée (jamais un déplacement du Disque) */
  dire: (texte: string) => void;
  /** agrandir le contenu du centre : le Disque se replie en Point */
  agrandir: (contenu: ReactNode, titre: string) => void;
  /** une question dans la zone réservée (ex. Rechercher) : un champ, jamais une autre page */
  demander: (question: string, valeur: string, surValeur: (v: string) => void) => void;
  mobile: boolean;
}

export interface Permissions { partager: boolean; modifier: boolean; supprimer: boolean }

export interface ContexteUnivers {
  id: string;
  /** les permissions effectives (jamais supposées : déclarées par le contexte) */
  permissions: Permissions;
  /** Le contexte, comme un composant : il rend le CENTRE (du contenu réel) et publie ses commandes pour la couronne
      (même langage que l'atelier : familles, sous-couronnes par `enfants`) et sa ligne d'état (zone réservée). */
  Composant: (p: { etat: EtatContexte; outils: OutilsContexte; publier: (commandes: ModePoint[], ligne?: string) => void }) => ReactNode;
}

/* ——— l'adresse : /one/univers?u=galerie&o=givre&f.palette=2 ——— */
export function lireEtat(search = window.location.search): EtatContexte {
  const q = new URLSearchParams(search), f: Record<string, string> = {};
  q.forEach((v, k) => { if (k.startsWith("f.") && /^[a-z0-9-]{1,40}$/.test(v)) f[k.slice(2)] = v; });
  const u = q.get("u"), o = q.get("o");
  return { u: u && /^[a-z0-9-]{1,40}$/.test(u) ? u : "accueil", o: o && /^[A-Za-z0-9._-]{1,80}$/.test(o) ? o : undefined, f: Object.keys(f).length ? f : undefined };
}
export function ecrireEtat(e: EtatContexte): string {
  const q = new URLSearchParams();
  if (e.u && e.u !== "accueil") q.set("u", e.u); if (e.o) q.set("o", e.o);
  for (const [k, v] of Object.entries(e.f ?? {})) if (v) q.set("f." + k, v);
  const s = q.toString(); return s ? "?" + s : "";
}

/* ——— le retour depuis un espace plein écran : le contexte .0NE est gardé pour la durée de l'onglet ——— */
const CLE_RETOUR = "one:contexte";
export interface Retour { adresse: string; nom: string }
export function memoriserRetour(r: Retour) { try { sessionStorage.setItem(CLE_RETOUR, JSON.stringify(r)); } catch { /* navigation privée */ } }
export function lireRetour(): Retour | null {
  try { const r = JSON.parse(sessionStorage.getItem(CLE_RETOUR) ?? "null"); return r && typeof r.adresse === "string" && r.adresse.startsWith("/") && typeof r.nom === "string" ? r : null; } catch { return null; }
}
