/**
 * Les contenus éditoriaux de l'édition (la landing sous le héros) : textes, images, légendes, crédits, sources.
 * Phase 1 du Bureau éditorial : ils sortent du code, sans rien changer à l'écran.
 *
 * - ORIGINE (contenus.origine.json) est le texte actuel. Il sert de secours : un champ absent ou invalide d'une version publiée retombe toujours dessus.
 * - ORIGINE est aussi le schéma : une version publiée ne peut ni ajouter un champ, ni changer la forme d'un champ,
 *   ni la longueur d'une liste. Seuls des textes, des adresses d'images vérifiées et des drapeaux sont acceptés ; jamais de code.
 * - Les paramètres des moteurs (colonnes de la broderie, seuils du défilement, recette 5D) ne sont pas ici : ils restent dans le code.
 *
 * Mise en forme permise dans les textes : *italique*. Dans un titre, « & » est dessiné plus léger, estompé (socle AIME).
 * Gabarits : {reponse} dans les réactions de l'Orbe, {n} dans les phrases qui comptent.
 * La validation (validation.mjs) est la même dans le navigateur et sur le serveur (/api/contenus).
 */
import { createContext, useContext } from "react";
import origine from "./contenus.origine.json";
import { GALERIE } from "../../lib/site";
import { valider, type Ecart } from "./validation.mjs";
export { LIMITES, srcOk, urlOk, type Ecart } from "./validation.mjs";

export type Licence = "domaine-public" | "reconstitution" | "capture" | "autorise";
export interface Media {
  /** chemin sous le site (images/…) ou adresse https du stockage de médias */
  src: string;
  alt: string;
  legende: string;
  licence: Licence;
  /** une image générée ou recomposée : la légende doit le dire */
  reconstitution: boolean;
  /** provenance (musée, numéro d'inventaire, page) ; vide si sans objet */
  provenance: string;
  /** les grands fonds : le point qui reste visible au recadrage, sur ordinateur et sur mobile (en %) */
  cadrage?: { ordinateur: { x: number; y: number }; mobile: { x: number; y: number } };
}
export interface TexteScene { kicker: string; titre: string; sous: string; corps: string }

/* le site Point Zéro (broderie seule) : la Galerie des Vivants n'y existe pas, la landing ne l'annonce pas */
export const ORIGINE: typeof origine = !GALERIE ? JSON.parse(JSON.stringify(origine).split(", bientôt à exposer à la Galerie des Vivants.").join(".")) : origine;
export type Contenus = typeof ORIGINE;

/** Fond une version publiée sur ORIGINE : tout champ absent ou invalide garde le texte d'origine ; les écarts sont listés. */
export function validerContenus(brut: unknown): { contenus: Contenus; ecarts: Ecart[] } { return valider(ORIGINE, brut); }

/** L'adresse servie d'un média : un fichier du site est servi sous la base du studio. */
export const adresse = (src: string) => /^https:/.test(src) ? src : import.meta.env.BASE_URL + src;
/** Un gabarit : {reponse}, {n}. */
export const remplir = (gabarit: string, valeurs: Record<string, string | number>) => gabarit.replace(/\{(\w+)\}/g, (m, k) => k in valeurs ? String(valeurs[k]) : m);

/* Le contexte : la partie publique ne lira que la version publiée (phase 2) ; sans elle, l'origine. */
export const ContexteContenus = createContext<Contenus>(ORIGINE);
export const useContenus = () => useContext(ContexteContenus);
