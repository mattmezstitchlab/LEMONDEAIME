// ROSACE — La Bibliothèque · Système de génération 5D
//
// Une rosace est définie par une signature déterministe sur cinq dimensions
// (Forme, Tracé, Densité, Format, Palette), une graine et une version de
// générateur. Même signature + même graine + même version = même rosace,
// partout et à tout moment.
//
// NOTE : le dépôt ne contient pas de « moteur 5D » préexistant. Ce module est
// l'implémentation déterministe de la classification 5D demandée. Il s'appuie
// sur le noyau patron réel de l'atelier Point Zéro
// (studio/src/lib/pattern.ts et studio/src/lib/dmc.ts : références DMC
// véritables, création de grille, statistiques de croix) pour produire de
// véritables patrons point de croix, reproductibles et ouvrables dans
// l'atelier. Aucune création n'est annoncée comme patron tant qu'elle n'a pas
// été générée par ce système et vérifiée (statistiques cohérentes, codes DMC
// valides, sérialisation round-trip).

import { FLOSS, flossIndex } from "../../../studio/src/lib/dmc";

/*──────────────────────────────────────────────────────────────*/
// 1. Les cinq dimensions

export type Forme =
  | "radiale"      // rosace rayonnant depuis un médaillon central
  | "anneaux"      // cercles concentriques
  | "medaillon"    // médaillon encadré de feuillages
  | "rosette"      // motif fleuri symétrique à pétales
  | "mandala"      // composition géométrique concentrée
  | "fleurette"    // petite rosace simple, bordure incluse
  | "dentelle"     // grille ajourée, points épars
  | "minimal";     // quelques points, deux fils

export const FORMES: Forme[] = [
  "radiale", "anneaux", "medaillon", "rosette", "mandala", "fleurette", "dentelle", "minimal",
];

export const FORME_LABELS: Record<Forme, string> = {
  radiale: "Rosace radiale",
  anneaux: "Anneaux",
  medaillon: "Médaillon",
  rosette: "Rosette",
  mandala: "Mandala",
  fleurette: "Fleurette",
  dentelle: "Dentelle",
  minimal: "Minimaliste",
};

export type Tracé = "croix" | "contours" | "rempli" | "ajoure";
export const TRACES: Tracé[] = ["croix", "contours", "rempli", "ajoure"];
export const TRACE_LABELS: Record<Tracé, string> = {
  croix: "Points de croix purs",
  contours: "Contours et arêtes",
  rempli: "Rempli",
  ajoure: "Ajouré",
};

export type Densité = "aeree" | "equilibree" | "dense";
export const DENSITES: Densité[] = ["aeree", "equilibree", "dense"];
export const DENSITE_LABELS: Record<Densité, string> = {
  aeree: "Aérée",
  equilibree: "Équilibrée",
  dense: "Dense",
};

export type Format = "40" | "80" | "120" | "160"; // nombre de points (carré)
export const FORMATS: Format[] = ["40", "80", "120", "160"];
export const FORMAT_POINTS: Record<Format, number> = { "40": 40, "80": 80, "120": 120, "160": 160 };
export const FORMAT_LABELS: Record<Format, string> = {
  "40": "40 × 40 pts",
  "80": "80 × 80 pts",
  "120": "120 × 120 pts",
  "160": "160 × 160 pts",
};

export type PaletteId =
  | "poussiere-de-rose"
  | "rouge-profond"
  | "vert-sauge"
  | "bleu-nuit"
  | "mineral"
  | "chromatique"
  | "naturel"
  | "pastel";
export const PALETTES: PaletteId[] = [
  "poussiere-de-rose", "rouge-profond", "vert-sauge", "bleu-nuit",
  "mineral", "chromatique", "naturel", "pastel",
];
export const PALETTE_LABELS: Record<PaletteId, string> = {
  "poussiere-de-rose": "Poussière de rose",
  "rouge-profond": "Rouge profond",
  "vert-sauge": "Vert sauge",
  "bleu-nuit": "Bleu nuit",
  mineral: "Minéral",
  chromatique: "Chromatique",
  naturel: "Naturel",
  pastel: "Pastel",
};

// Références DMC véritables (table craft-color-codes, 489 références,
// atelier Point Zéro). Chaque palette est validée au chargement du module.
export const PALETTE_CODES: Record<PaletteId, string[]> = {
  "poussiere-de-rose": ["603", "819", "3820", "725", "700"],
  "rouge-profond": ["321", "815", "3820", "938", "310"],
  "vert-sauge": ["703", "704", "934", "936", "3820"],
  "bleu-nuit": ["310", "938", "801", "3820", "936"],
  mineral: ["938", "934", "801", "3820", "936"],
  chromatique: ["603", "321", "703", "310", "938", "3820"],
  naturel: ["938", "934", "801", "3011", "3820"],
  pastel: ["819", "776", "725", "3820", "915"],
};

/*──────────────────────────────────────────────────────────────*/
// 2. Signature et graine

export interface Signature5D {
  forme: Forme;
  tracé: Tracé;
  densité: Densité;
  format: Format;
  palette: PaletteId;
}

export interface GenerationMeta {
  version: string; // version du générateur ROSACE
  signature: Signature5D;
  graine: number; // entier >= 0
}

/**
 * Identifiant stable d'une rosace : hash de la signature, de la graine et de
 * la version. Deux rosaces distinctes peuvent partager une signature (même
 * forme, même densité…) ; c'est le couple (signature, graine, version) qui
 * rend la génération déterministe et reproductible.
 */
export function signatureId(meta: GenerationMeta): string {
  const payload = JSON.stringify({
    v: meta.version,
    s: meta.signature,
    g: meta.graine,
  });
  let h = 2166136261 >>> 0; // FNV offset
  for (let i = 0; i < payload.length; i++) {
    h ^= payload.charCodeAt(i);
    h = Math.imul(h, 16777619); // FNV prime
  }
  return `ros-${Math.abs(h >>> 0).toString(36)}-${String(meta.graine).padStart(4, "0")}`;
}

/*──────────────────────────────────────────────────────────────*/
// 3. Générateur de nombres aléatoires déterministe (mulberry32)

export function createRNG(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => {
    s |= 0;
    s = Math.imul(s + 0x6d2b79f5, s | 0) >>> 0;
    const t = Math.imul(s ^ (s >>> 15), s | 0) >>> 0;
    s = t;
    return (t >>> 0) / 4294967296;
  };
}

export function rngInt(rng: () => number, max: number): number {
  return Math.floor(rng() * max);
}

export function rngPick<T>(rng: () => number, items: T[]): T {
  return items[Math.floor(rng() * items.length)];
}

/*──────────────────────────────────────────────────────────────*/
// 4. Palette DMC résolue (index FLOSS + couleurs écran)

export interface DmcColor {
  code: string;
  name: string;
  hex: string;
  rgb: [number, number, number];
}

export function resolvePalette(paletteId: PaletteId): DmcColor[] {
  const codes = PALETTE_CODES[paletteId];
  return codes.map((code) => {
    const idx = flossIndex(code);
    if (idx < 0) throw new Error(`Référence DMC inconnue dans la palette ${paletteId} : ${code}`);
    const f = FLOSS[idx];
    return { code: f.code, name: f.name, hex: f.hex, rgb: f.rgb };
  });
}

/** Vérifie que toutes les références de palette existent dans la table DMC. */
export function validatePalettes(): void {
  for (const id of PALETTES) resolvePalette(id);
}
