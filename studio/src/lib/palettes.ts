import { deltaE2000, deltaELabel, nearestColors } from "./colorScience";
import { FLOSS, labOf } from "./dmc";
import { computeStats, type Pattern } from "./pattern";

/**
 * Correspondances multi-marques.
 *
 * Un patron pensé en DMC se brode aussi en broderie diamant (codes DMC, mais
 * 154 références au lieu de 489) ou en perles à repasser, où les marques ont
 * leurs propres numéros. Plutôt que de convertir le motif — le modèle reste en
 * DMC, c'est sa langue — l'atelier produit une table de correspondance : pour
 * chaque fil du motif, les références les plus proches de la marque choisie,
 * avec l'écart perceptuel.
 *
 * Honnêteté sur la donnée : chaque table porte le statut publié par la source
 * (`measured`, `cross-checked`, `community`, `official`, `approximate`,
 * `generated`) et il est affiché tel quel. Une table « community » n'a pas la
 * même valeur qu'une table « cross-checked », et une correspondance à 8 ΔE00
 * n'est pas une équivalence. Les références arrêtées sont exclues des
 * propositions par défaut : on ne recommande pas un produit introuvable.
 */

export type PaletteId = "dmc-diamond" | "perler-midi" | "hama-midi" | "artkal-s" | "mard-291" | "nabbi";

export interface PaletteColor {
  code: string;
  name: string;
  hex: string;
  rgb: [number, number, number];
  lab: [number, number, number];
  /** Type de verre ou finition, quand la marque en publie un. */
  finish?: string;
  discontinued: boolean;
}

export interface CraftPalette {
  id: PaletteId;
  brand: string;
  product: string;
  craft: string;
  count: number;
  /** Statut publié par la source. À afficher, pas à lisser. */
  status: string;
  notes: string;
  license: string;
  sources: { name: string; url: string }[];
  colors: PaletteColor[];
  discontinuedCount: number;
}

/** Choix proposés dans l'atelier, avec ce à quoi chacun sert vraiment. */
export interface PaletteChoice {
  id: PaletteId;
  label: string;
  use: string;
}

export const PALETTE_CHOICES: PaletteChoice[] = [
  { id: "dmc-diamond", label: "DMC Diamond Painting", use: "Broderie diamant, codes DMC (154 strass)" },
  { id: "perler-midi", label: "Perler Midi 5 mm", use: "Perles à repasser (103 couleurs)" },
  { id: "hama-midi", label: "Hama Midi 5 mm", use: "Perles à repasser (92 couleurs)" },
  { id: "artkal-s", label: "Artkal S 5 mm", use: "Perles à repasser, large gamme (199 couleurs)" },
  { id: "mard-291", label: "MARD Midi 5 mm", use: "Perles à repasser (291 couleurs)" },
  { id: "nabbi", label: "Nabbi BioBeads", use: "Perles à repasser biosourcées (30 couleurs)" },
];

/** Traduction des statuts publiés par la source. */
export const STATUS_LABEL: Record<string, string> = {
  measured: "mesurée",
  "cross-checked": "recoupée",
  community: "contributive",
  official: "officielle",
  approximate: "approximative",
  generated: "générée",
};

/** Au-delà, la correspondance n'est plus une substitution mais un choix à la main. */
export const FAR_DELTA_E = 12;

type RawPalette = {
  id: string;
  brand: string;
  product: string;
  craft: string;
  count: number;
  status: string;
  notes: string;
  license: string;
  sources: { name: string; url: string }[];
  colors: { code: string; name: string; hex: string; rgb: number[]; glass?: string; finish?: string; discontinued?: boolean }[];
};

/**
 * Chargements explicites, un par table.
 *
 * Un `import(\`.../${id}.json\`)` ferait embarquer les quinze tables du paquet
 * par Vite ; ici seules les six proposées sont connues du bundler.
 */
const LOADERS: Record<PaletteId, () => Promise<{ default: RawPalette }>> = {
  "dmc-diamond": () => import("craft-color-codes/data/json/dmc-diamond.json"),
  "perler-midi": () => import("craft-color-codes/data/json/perler-midi.json"),
  "hama-midi": () => import("craft-color-codes/data/json/hama-midi.json"),
  "artkal-s": () => import("craft-color-codes/data/json/artkal-s.json"),
  "mard-291": () => import("craft-color-codes/data/json/mard-291.json"),
  nabbi: () => import("craft-color-codes/data/json/nabbi.json"),
};

const cache = new Map<PaletteId, CraftPalette>();
const pending = new Map<PaletteId, Promise<CraftPalette>>();

/** Traduit une table brute et vérifie qu'elle est complète. */
function toPalette(id: PaletteId, raw: RawPalette): CraftPalette {
  const colors: PaletteColor[] = raw.colors.map((c) => {
    // Le JSON est inféré en `number[]` : les tables publient des triplets sRGB.
    const rgb = c.rgb as [number, number, number];
    return {
      code: c.code,
      name: c.name,
      hex: c.hex,
      rgb,
      lab: labOf(rgb),
      finish: c.finish ?? c.glass,
      discontinued: c.discontinued === true,
    };
  });
  if (colors.length !== raw.count) {
    throw new Error(`Table ${id} incomplète : ${colors.length}/${raw.count}`);
  }
  return {
    id,
    brand: raw.brand,
    product: raw.product,
    craft: raw.craft,
    count: raw.count,
    status: raw.status,
    notes: raw.notes,
    license: raw.license,
    sources: raw.sources,
    colors,
    discontinuedCount: colors.filter((c) => c.discontinued).length,
  };
}

/** Charge une table une seule fois ; les appels suivants renvoient le cache. */
export function loadPalette(id: PaletteId): Promise<CraftPalette> {
  const hit = cache.get(id);
  if (hit) return Promise.resolve(hit);
  const running = pending.get(id);
  if (running) return running;
  const task = LOADERS[id]()
    .then((mod) => {
      const palette = toPalette(id, mod.default);
      cache.set(id, palette);
      pending.delete(id);
      return palette;
    })
    .catch((e) => {
      pending.delete(id);
      throw e;
    });
  pending.set(id, task);
  return task;
}

/** Références les plus proches d'une couleur dans une table fabricant. */
export function nearestIn(
  palette: CraftPalette,
  lab: [number, number, number],
  limit = 3,
  includeDiscontinued = false,
) {
  return nearestColors(lab, palette.colors, limit, includeDiscontinued);
}

export interface PaletteMatch {
  code: string;
  name: string;
  hex: string;
  finish?: string;
  deltaE: number;
  discontinued: boolean;
  /**
   * La marque numérote avec les codes DMC : ce n'est plus une approximation de
   * teinte mais la même référence. Vrai pour la broderie diamant, faux pour les
   * perles à repasser qui ont leurs propres numéros.
   */
  sameCode: boolean;
}

export interface Equivalence {
  /** Index dans la table DMC. */
  idx: number;
  code: string;
  name: string;
  hex: string;
  /** Éléments brodés de cette couleur dans le motif. */
  cells: number;
  matches: PaletteMatch[];
}

export interface EquivalenceTable {
  palette: CraftPalette;
  rows: Equivalence[];
  /** Écart du meilleur appariement, médian sur le motif. */
  median: number;
  /** Le pire écart du motif : c'est lui qui décide si la conversion tient. */
  worst: number;
  /** Couleurs dont le meilleur appariement dépasse `FAR_DELTA_E`. */
  far: Equivalence[];
}

const median = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * Table de correspondance d'un motif vers une marque.
 *
 * Les fils sans point ne sont pas listés : la table suit ce qui est vraiment à
 * acheter. Le mélange de deux DMC est apparié sur sa couleur calculée, comme
 * partout ailleurs dans l'atelier.
 */
export async function equivalents(p: Pattern, id: PaletteId, limit = 3): Promise<EquivalenceTable> {
  const palette = await loadPalette(id);
  const byCode = new Map(palette.colors.map((c) => [c.code.trim().toLowerCase(), c]));
  const { rows } = computeStats(p);
  const out: Equivalence[] = rows
    .filter((r) => r.cells > 0)
    .map((r) => {
      const floss = FLOSS[r.idx];
      // Un mélange de deux fils n'a pas de code chez le fabricant : il ne peut
      // être apparié que par sa teinte calculée.
      const same = floss.blend ? undefined : byCode.get(floss.code.trim().toLowerCase());
      const head: PaletteMatch[] = same
        ? [{ ...same, deltaE: deltaE2000(floss.lab, same.lab), sameCode: true }]
        : [];
      const rest = nearestIn(palette, floss.lab, limit)
        .filter((m) => m.code !== same?.code)
        .map((m): PaletteMatch => ({ ...m, sameCode: false }));
      return {
        idx: r.idx,
        code: r.code,
        name: r.name,
        hex: r.hex,
        cells: r.cells,
        matches: [...head, ...rest].slice(0, Math.max(1, limit)),
      };
    });
  const best = out.map((r) => r.matches[0]?.deltaE ?? Infinity).filter((d) => Number.isFinite(d));
  return {
    palette,
    rows: out,
    median: median(best),
    worst: best.length ? Math.max(...best) : 0,
    far: out.filter((r) => (r.matches[0]?.deltaE ?? Infinity) > FAR_DELTA_E),
  };
}

/** Libellé honnête d'une table : marque, produit, statut publié. */
export function paletteLabel(palette: CraftPalette): string {
  return `${palette.brand} ${palette.product} — table ${STATUS_LABEL[palette.status] ?? palette.status} (${palette.count} références, licence ${palette.license})`;
}

/**
 * Avertissement à afficher avec une table de correspondance.
 *
 * Il dit ce que la donnée est, et ce que la conversion n'est pas : une
 * correspondance n'est pas une équivalence garantie, et le nombre de couleurs
 * de la marque cible borne le résultat.
 */
export function equivalenceWarning(table: EquivalenceTable): string {
  const { palette } = table;
  const shared = table.rows.filter((r) => r.matches[0]?.sameCode).length;
  const base = `Correspondance par CIEDE2000 entre vos fils DMC et ${palette.brand} ${palette.product}, table « ${palette.status} » (${STATUS_LABEL[palette.status] ?? palette.status}) de craft-color-codes, licence ${palette.license}. Écart médian ${table.median.toFixed(1)} ΔE00, le plus mauvais ${table.worst.toFixed(1)} (${deltaELabel(table.worst)}).`;
  const codes = shared
    ? ` ${shared} couleur(s) sur ${table.rows.length} portent déjà le même code chez ${palette.brand} : ce sont les mêmes références, pas des approximations.`
    : "";
  const ratio = ` ${palette.count} références contre 489 chez DMC : plusieurs fils peuvent tomber sur la même référence, et des nuances proches disparaissent.`;
  const far = table.far.length
    ? ` ${table.far.length} couleur(s) sans correspondance acceptable au-delà de ${FAR_DELTA_E} ΔE00 : à choisir à la main.`
    : "";
  return `${base}${codes}${ratio}${far} Une correspondance n'est pas une équivalence garantie : à valider sur les cartes physiques des deux marques.`;
}

/** CSV de la table, mêmes conventions que la liste d'achats (BOM, point-virgule). */
export function equivalencesCsv(table: EquivalenceTable): string {
  const { palette } = table;
  const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const depth = Math.max(1, ...table.rows.map((r) => r.matches.length));
  const head = ["DMC", "Nom DMC", "Elements", ...Array.from({ length: depth }, (_, i) => [
    `${palette.brand} ${i + 1}`,
    `Ecart ${i + 1}`,
    `Meme code ${i + 1}`,
  ]).flat()];
  const lines = table.rows.map((r) =>
    [
      cell(r.code),
      cell(r.name),
      cell(r.cells),
      ...r.matches.flatMap((m) => [cell(m.code), cell(m.deltaE.toFixed(2)), cell(m.sameCode ? "oui" : "non")]),
    ].join(";"),
  );
  return `\uFEFF${head.map(cell).join(";")}\n${lines.join("\n")}\n`;
}
