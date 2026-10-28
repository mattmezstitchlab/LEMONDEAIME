import { nearestColors } from "./colorScience";
import { labOf } from "./dmc";

export { deltaELabel } from "./colorScience";

/**
 * Références de perles fabricant.
 *
 * Point Zéro dessine des perles depuis le début (outil « perle », tableau
 * `special`, suivi `ornamentDone`) mais ne pouvait pas les nommer : la
 * référence fabricant devait être recopiée à la main dans les notes.
 *
 * La table vient de `craft-color-codes` (déjà en dépendance pour le DMC),
 * palette Miyuki Delica 11/0 : 1 288 références, statut « measured ».
 * Chargée à la demande seulement — elle fait 149 ko et ne sert que si le
 * motif contient vraiment des perles.
 *
 * Honnêteté sur la donnée, d'après les notes de la source :
 * la couleur est la moyenne sRGB de la photo produit officielle Miyuki.
 * Comparée à deux jeux de données indépendants, la famille de couleur tombe
 * juste sur tous les codes mais la teinte diffère de 6 à 12 ΔE00 (médiane).
 * Autrement dit : c'est la bonne perle, la teinte est approchée. Les perles
 * métallisées, galvanisées, AB et silver-lined ne peuvent pas être une seule
 * couleur plate. Cet écart est affiché tel quel dans l'interface, jamais
 * présenté comme une correspondance exacte.
 */

export type Glass = "opaque" | "transparent" | "alabaster" | "silk" | string;

export interface Bead {
  code: string;
  name: string;
  hex: string;
  rgb: [number, number, number];
  lab: [number, number, number];
  glass?: Glass;
  discontinued: boolean;
}

export interface BeadMatch extends Bead {
  deltaE: number;
}

export interface BeadPalette {
  brand: string;
  product: string;
  count: number;
  status: string;
  /** Avertissement de la source sur la fidélité des teintes. À afficher. */
  notes: string;
  license: string;
  sources: { name: string; url: string }[];
  colors: Bead[];
  discontinuedCount: number;
}

/** Traduction des types de verre, pour l'affichage. */
export const GLASS_LABEL: Record<string, string> = {
  opaque: "Opaque",
  transparent: "Transparent",
  alabaster: "Albâtre",
  silk: "Soie",
};

let cache: BeadPalette | null = null;
let pending: Promise<BeadPalette> | null = null;

export function beadsLoaded(): boolean {
  return cache !== null;
}

/** Charge la palette une seule fois ; les appels suivants renvoient le cache. */
export function loadBeads(): Promise<BeadPalette> {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = import("craft-color-codes/data/json/miyuki-delica.json")
      .then((mod) => {
        const raw = mod.default;
        const colors: Bead[] = raw.colors.map((c) => ({
          code: c.code,
          name: c.name,
          hex: c.hex,
          // Le JSON est inféré en `number[]` : la table publie bien des
          // triplets sRGB, le type est repris ici.
          rgb: c.rgb as [number, number, number],
          lab: labOf(c.rgb as [number, number, number]),
          glass: c.glass,
          discontinued: c.discontinued === true,
        }));
        if (colors.length !== raw.count) {
          throw new Error(`Palette perles incomplète : ${colors.length}/${raw.count}`);
        }
        cache = {
          brand: raw.brand,
          product: raw.product,
          count: raw.count,
          status: raw.status,
          notes: raw.notes,
          license: raw.license,
          sources: raw.sources,
          colors,
          discontinuedCount: colors.filter((c) => c.discontinued).length,
        };
        return cache;
      })
      .catch((e) => {
        pending = null;
        throw e;
      });
  }
  return pending;
}

/**
 * Perles les plus proches d'une couleur, classées par CIEDE2000 — le même
 * écart perceptuel que pour les fils DMC. Les références discontinuées sont
 * exclues par défaut : on ne propose pas une perle introuvable.
 */
export function nearestBeads(
  lab: [number, number, number],
  beads: Bead[],
  limit = 3,
  includeDiscontinued = false,
): BeadMatch[] {
  return nearestColors(lab, beads, limit, includeDiscontinued);
}

/** Cherche une référence exacte par son code (« DB10 », « DB-0010 » et « 10 » fonctionnent). */
export function beadByCode(beads: Bead[], code: string): Bead | undefined {
  const key = code.trim().toUpperCase().replace(/^DB[-_]?/, "").replace(/^0+(?=\d)/, "");
  if (!key) return undefined;
  return beads.find((b) => b.code.toUpperCase().replace(/^DB[-_]?/, "").replace(/^0+(?=\d)/, "") === key);
}

