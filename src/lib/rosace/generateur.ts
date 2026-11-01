// ROSACE — Générateur de motifs à partir d'une signature 5D
//
// Chaque fonction dessine de véritables croix (indices FLOSS) sur une grille
// carrée. Le générateur est déterministe : même (signature, graine, version)
// produit rigoureusement le même patron. Les palettes et les codes DMC sont
// ceux de l'atelier Point Zéro (studio/src/lib/dmc.ts).

import {
  computeStats,
  createPattern,
  ensurePalette,
  type Count,
  type Pattern,
} from "../../../studio/src/lib/pattern";
import { flossIndex } from "../../../studio/src/lib/dmc";
import {
  createRNG,
  rngPick,
  type GenerationMeta,
  type PaletteId,
  type Signature5D,
  signatureId,
  PALETTE_CODES,
} from "./signature";

/*──────────────────────────────────────────────────────────────*/
// Types publics

export interface RosaceSpec {
  id: string;
  name: string;
  famille: string;
  familleLabel: string;
  signature: Signature5D;
  graine: number;
  version: string;
  description: string;
}

export interface GeneratedRosace {
  spec: RosaceSpec;
  pattern: Pattern;
  stats: ReturnType<typeof computeStats>;
}

export const GENERATEUR_VERSION = "1.0.0";

/*──────────────────────────────────────────────────────────────*/
// Outils de dessin sur la grille

function put(p: Pattern, x: number, y: number, idx: number): void {
  if (x < 0 || y < 0 || x >= p.w || y >= p.h) return;
  p.cross[y * p.w + x] = idx;
  ensurePalette(p, idx);
}

function cercle(
  p: Pattern,
  cx: number,
  cy: number,
  r: number,
  idx: number,
  options: { rempli?: boolean; epaisseur?: number } = {},
): void {
  const { rempli = true, epaisseur = 1 } = options;
  const rmin = rempli ? 0 : Math.max(0, r - epaisseur);
  const rmax = r + (rempli ? 0 : epaisseur * 0.6);
  const r2min = rmin * rmin;
  const r2max = rmax * rmax;
  for (let y = Math.max(0, Math.floor(cy - rmax)); y <= Math.min(p.h - 1, Math.ceil(cy + rmax)); y++) {
    for (let x = Math.max(0, Math.floor(cx - rmax)); x <= Math.min(p.w - 1, Math.ceil(cx + rmax)); x++) {
      const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      if (d2 >= r2min && d2 <= r2max) put(p, x, y, idx);
    }
  }
}

function ovale(
  p: Pattern,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  idx: number,
  options: { rempli?: boolean } = {},
): void {
  const { rempli = true } = options;
  for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(p.h - 1, Math.ceil(cy + ry)); y++) {
    for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(p.w - 1, Math.ceil(cx + rx)); x++) {
      const d2 = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (rempli ? d2 <= 1 : d2 > 0.72 && d2 <= 1.28) put(p, x, y, idx);
    }
  }
}

function ligne(p: Pattern, x1: number, y1: number, x2: number, y2: number, idx: number): void {
  const n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1)));
  for (let i = 0; i <= n; i++) {
    put(p, Math.round(x1 + ((x2 - x1) * i) / n), Math.round(y1 + ((y2 - y1) * i) / n), idx);
  }
}

function carre(
  p: Pattern,
  cx: number,
  cy: number,
  demi: number,
  idx: number,
  options: { rempli?: boolean } = {},
): void {
  const { rempli = true } = options;
  for (let y = cy - demi; y <= cy + demi; y++) {
    for (let x = cx - demi; x <= cx + demi; x++) {
      const dx = Math.abs(x - cx), dy = Math.abs(y - cy);
      if (rempli ? dx <= demi && dy <= demi : dx === demi || dy === demi) put(p, x, y, idx);
    }
  }
}

/*──────────────────────────────────────────────────────────────*/
// Factories par forme

function rosaceRadiale(p: Pattern, palette: number[], rng: () => number, s: Signature5D): void {
  const cx = p.w / 2;
  const cy = p.h / 2;
  const main = palette[0] ?? palette[palette.length - 1];
  const fonce = palette[Math.min(1, palette.length - 1)];
  const centre = palette[palette.length - 1];
  const accent = rngPick(rng, palette);

  const rayon = Math.min(p.w, p.h) * 0.42;
  const nbPetales = 12;
  // Médaillon central.
  cercle(p, cx, cy, rayon * 0.22, centre, { rempli: true });
  cercle(p, cx, cy, rayon * 0.22, main, { rempli: false, epaisseur: 1 });

  // Pétales rayonnants.
  for (let i = 0; i < nbPetales; i++) {
    const a = (i * 2 * Math.PI) / nbPetales;
    const ex = cx + Math.cos(a) * (rayon * 0.5);
    const ey = cy + Math.sin(a) * (rayon * 0.5);
    const rx = rayon * 0.17;
    const ry = rayon * 0.34;
    ovale(p, ex, ey, rx, ry, main, { rempli: true });
    ovale(p, ex, ey, rx * 0.5, ry * 0.45, fonce, { rempli: true });
  }

  // Anneau extérieur de petits points.
  const anneauRayon = rayon * 0.88;
  const pas = (2 * Math.PI) / (s.densité === "dense" ? 40 : s.densité === "equilibree" ? 28 : 20);
  for (let a = 0; a < 2 * Math.PI; a += pas) {
    const x = cx + Math.cos(a) * anneauRayon;
    const y = cy + Math.sin(a) * anneauRayon;
    put(p, Math.round(x), Math.round(y), accent);
  }

  // Feuilles entre les pétales (selon densité).
  if (s.densité !== "aeree") {
    for (let i = 0; i < nbPetales; i++) {
      const a = ((i + 0.5) * 2 * Math.PI) / nbPetales;
      const ex = cx + Math.cos(a) * (rayon * 0.62);
      const ey = cy + Math.sin(a) * (rayon * 0.62);
      ovale(p, ex, ey, rayon * 0.07, rayon * 0.14, palette[Math.min(2, palette.length - 1)], {
        rempli: true,
      });
    }
  }
}

function rosaceAnneaux(p: Pattern, palette: number[], rng: () => number, s: Signature5D): void {
  const cx = p.w / 2;
  const cy = p.h / 2;
  const rayonMax = Math.min(p.w, p.h) * 0.44;
  const anneaux = 3;
  const motifParAnneau = s.densité === "dense" ? 24 : s.densité === "equilibree" ? 16 : 10;

  for (let k = 0; k < anneaux; k++) {
    const r = (rayonMax / (anneaux + 1)) * (k + 1);
    const idx = palette[k % palette.length];
    const idx2 = rngPick(rng, palette);
    for (let i = 0; i < motifParAnneau; i++) {
      const a = (i * 2 * Math.PI) / motifParAnneau + (k % 2 ? Math.PI / motifParAnneau : 0);
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      const taille = k === 1 ? 2 : 1;
      for (let dy = -taille; dy <= taille; dy++) {
        for (let dx = -taille; dx <= taille; dx++) {
          if (Math.abs(dx) + Math.abs(dy) <= taille) put(p, Math.round(x + dx), Math.round(y + dy), idx);
        }
      }
      if (s.tracé !== "ajoure") {
        const x2 = cx + Math.cos(a + Math.PI / motifParAnneau) * r;
        const y2 = cy + Math.sin(a + Math.PI / motifParAnneau) * r;
        put(p, Math.round(x2), Math.round(y2), idx2);
      }
    }
  }
  cercle(p, cx, cy, rayonMax * 0.14, palette[palette.length - 1], { rempli: true });
}

function rosaceMedaillon(p: Pattern, palette: number[], rng: () => number, s: Signature5D): void {
  const cx = p.w / 2;
  const cy = p.h / 2;
  const main = palette[0];
  const fonce = palette[Math.min(1, palette.length - 1)];
  const rayon = Math.min(p.w, p.h) * 0.34;

  // Médaillon central rempli.
  const accent = rngPick(rng, palette);
  cercle(p, cx, cy, rayon * 0.5, main, { rempli: true });
  cercle(p, cx, cy, rayon * 0.5, fonce, { rempli: false, epaisseur: 1 });
  cercle(p, cx, cy, rayon * 0.16, accent, { rempli: true });

  // Quatre feuillages cardinaux autour du médaillon.
  for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) {
    const ex = cx + dx * (rayon * 0.78);
    const ey = cy + dy * (rayon * 0.78);
    const rx = rayon * 0.16;
    const ry = rayon * 0.34;
    ovale(p, ex, ey, rx, ry, palette[Math.min(2, palette.length - 1)], { rempli: true });
    ligne(p, ex - rx * 0.6, ey - ry * 0.6, ex + rx * 0.6, ey + ry * 0.6, accent);
  }

  // Contour carré extérieur délicat (selon densité).
  if (s.densité !== "aeree") {
    const marge = Math.min(p.w, p.h) * 0.08;
    const ext = Math.min(p.w, p.h) / 2 - marge;
    for (let t = 0; t < 4; t++) {
      const a = (t * Math.PI) / 2;
      const pas = s.densité === "dense" ? 2 : 3;
      for (let d = -ext; d <= ext; d += pas) {
        const x = cx + Math.cos(a) * d - Math.sin(a) * marge * 0.4;
        const y = cy + Math.sin(a) * d + Math.cos(a) * marge * 0.4;
        put(p, Math.round(x), Math.round(y), rngPick(rng, palette));
      }
    }
  }
}

function rosaceRosette(p: Pattern, palette: number[], rng: () => number, s: Signature5D): void {
  const cx = p.w / 2;
  const cy = p.h / 2;
  const main = palette[0];
  const fonce = palette[Math.min(1, palette.length - 1)];
  const rayon = Math.min(p.w, p.h) * 0.4;
  const nbPetales = 8;

  cercle(p, cx, cy, rayon * 0.13, centre(palette), { rempli: true });
  for (let i = 0; i < nbPetales; i++) {
    const a = (i * 2 * Math.PI) / nbPetales;
    const ex = cx + Math.cos(a) * (rayon * 0.52);
    const ey = cy + Math.sin(a) * (rayon * 0.52);
    ovale(p, ex, ey, rayon * 0.15, rayon * 0.26, main, { rempli: true });
    ovale(p, ex, ey, rayon * 0.07, rayon * 0.12, fonce, { rempli: true });
  }
  // Pétales secondaires plus petits (selon densité).
  if (s.densité === "dense") {
    for (let i = 0; i < nbPetales; i++) {
      const a = ((i + 0.5) * 2 * Math.PI) / nbPetales;
      const ex = cx + Math.cos(a) * (rayon * 0.72);
      const ey = cy + Math.sin(a) * (rayon * 0.72);
      ovale(p, ex, ey, rayon * 0.09, rayon * 0.16, rngPick(rng, palette), { rempli: true });
    }
  }
  // Tige stylisée verticale (toujours, discrète).
  ligne(p, cx, cy - rayon * 0.35, cx, cy + rayon * 0.35, rngPick(rng, palette));
}

function rosaceMandala(p: Pattern, palette: number[], rng: () => number, s: Signature5D): void {
  const cx = p.w / 2;
  const cy = p.h / 2;
  const rayon = Math.min(p.w, p.h) * 0.45;

  cercle(p, cx, cy, rayon * 0.08, palette[palette.length - 1], { rempli: true });
  // Premier anneau de losanges.
  const losanges = 16;
  for (let i = 0; i < losanges; i++) {
    const a = (i * 2 * Math.PI) / losanges;
    const ex = cx + Math.cos(a) * (rayon * 0.32);
    const ey = cy + Math.sin(a) * (rayon * 0.32);
    carre(p, ex, ey, 2, palette[i % palette.length], { rempli: true });
  }
  // Deuxième anneau de points.
  const pas = s.densité === "dense" ? 2 : s.densité === "equilibree" ? 3 : 5;
  for (let a = 0; a < 2 * Math.PI; a += pas) {
    const x = cx + Math.cos(a) * (rayon * 0.62);
    const y = cy + Math.sin(a) * (rayon * 0.62);
    put(p, Math.round(x), Math.round(y), palette[(Math.floor(a / pas)) % palette.length]);
  }
  // Contour extérieur fin.
  const contour = rngPick(rng, palette);
  if (s.tracé === "contours" || s.tracé === "ajoure") {
    cercle(p, cx, cy, rayon * 0.9, contour, { rempli: false, epaisseur: 1 });
  }
}

function rosaceFleurette(p: Pattern, palette: number[], rng: () => number, s: Signature5D): void {
  const cx = p.w / 2;
  const cy = p.h / 2;
  const main = palette[0];
  const rayon = Math.min(p.w, p.h) * 0.3;

  cercle(p, cx, cy, rayon * 0.16, centre(palette), { rempli: true });
  for (let i = 0; i < 5; i++) {
    const a = (i * 2 * Math.PI) / 5;
    const ex = cx + Math.cos(a) * (rayon * 0.5);
    const ey = cy + Math.sin(a) * (rayon * 0.5);
    ovale(p, ex, ey, rayon * 0.12, rayon * 0.2, main, { rempli: true });
  }
  // Tige et deux feuilles.
  const accent = rngPick(rng, palette);
  ligne(p, cx, cy + rayon * 0.2, cx, cy + rayon * 0.78, accent);
  ovale(p, cx - rayon * 0.45, cy + rayon * 0.5, rayon * 0.14, rayon * 0.22, palette[Math.min(2, palette.length - 1)], {
    rempli: true,
  });
  ovale(p, cx + rayon * 0.45, cy + rayon * 0.5, rayon * 0.14, rayon * 0.22, palette[Math.min(2, palette.length - 1)], {
    rempli: true,
  });
  // Contour discret.
  if (s.densité !== "aeree") {
    cercle(p, cx, cy, rayon * 0.95, accent, { rempli: false, epaisseur: 1 });
  }
}

function rosaceDentelle(p: Pattern, palette: number[], rng: () => number, s: Signature5D): void {
  const cx = p.w / 2;
  const cy = p.h / 2;
  const rayon = Math.min(p.w, p.h) * 0.45;
  const idx = palette[0];
  const idx2 = palette[Math.min(1, palette.length - 1)];

  // Croix isolées sur un cercle interne.
  const nPoints = s.densité === "dense" ? 36 : s.densité === "equilibree" ? 24 : 16;
  for (let i = 0; i < nPoints; i++) {
    const a = (i * 2 * Math.PI) / nPoints;
    const x = cx + Math.cos(a) * (rayon * 0.4);
    const y = cy + Math.sin(a) * (rayon * 0.4);
    put(p, Math.round(x), Math.round(y), idx);
  }
  // Petits blocs 2x2 espacés sur l'anneau extérieur.
  const pas = s.densité === "dense" ? 18 : s.densité === "equilibree" ? 24 : 36;
  for (let a = 0; a < 2 * Math.PI; a += pas) {
    const x = cx + Math.cos(a) * (rayon * 0.78);
    const y = cy + Math.sin(a) * (rayon * 0.78);
    put(p, Math.round(x), Math.round(y), idx2);
    put(p, Math.round(x + 1), Math.round(y), idx2);
    put(p, Math.round(x), Math.round(y + 1), idx2);
  }
  // Rond central ajouré.
  const central = rngPick(rng, palette);
  cercle(p, cx, cy, rayon * 0.12, central, { rempli: false, epaisseur: 1 });
}

function rosaceMinimal(p: Pattern, palette: number[], rng: () => number, s: Signature5D): void {
  const cx = p.w / 2;
  const cy = p.h / 2;
  const main = palette[0];
  const second = palette[Math.min(1, palette.length - 1)];
  const rayon = Math.min(p.w, p.h) * 0.35;

  put(p, cx, cy, main);
  const n = 8;
  const accent = rngPick(rng, palette);
  for (let i = 0; i < n; i++) {
    const a = (i * 2 * Math.PI) / n;
    const x = cx + Math.cos(a) * rayon;
    const y = cy + Math.sin(a) * rayon;
    put(p, Math.round(x), Math.round(y), second);
  }
  if (s.tracé === "contours" || s.densité !== "aeree") {
    cercle(p, cx, cy, rayon * 1.05, accent, { rempli: false, epaisseur: 1 });
  }
}

function centre(palette: number[]): number {
  return palette[Math.max(0, palette.length - 1)];
}

const DESSIN: Record<Signature5D["forme"], (p: Pattern, palette: number[], rng: () => number, s: Signature5D) => void> = {
  radiale: rosaceRadiale,
  anneaux: rosaceAnneaux,
  medaillon: rosaceMedaillon,
  rosette: rosaceRosette,
  mandala: rosaceMandala,
  fleurette: rosaceFleurette,
  dentelle: rosaceDentelle,
  minimal: rosaceMinimal,
};

/*──────────────────────────────────────────────────────────────*/
// Entrée : génération d'une rosace complète à partir de sa spécification

export function genererRosace(spec: RosaceSpec): GeneratedRosace {
  // L'identifiant de la rosace découle de sa signature, de sa graine et de la
  // version du générateur : il est donc stable et reproductible.
  const generation = {
    version: GENERATEUR_VERSION,
    signature: spec.signature,
    graine: spec.graine,
  };
  const resolvedSpec: RosaceSpec = { ...spec, id: rosaceId(generation) };
  const indices = PALETTE_CODES[resolvedSpec.signature.palette].map((code) =>
    ensurePaletteIndex(code),
  );
  const rng = createRNG(spec.graine);
  const n = FORMAT_POINTS(spec.signature.format);
  const p = createPattern(spec.name, n, n, (14 as Count), 2);

  p.provenance = {
    kind: "original",
    source: "ROSACE — La Bibliothèque · généré par le moteur 5D",
    author: "Atelier ROSACE",
    license: "Motif original génératif réutilisable",
    personalOnly: false,
  };
  p.notes = JSON.stringify({
    rosaceId: spec.id,
    signature: spec.signature,
    graine: spec.graine,
    version: GENERATEUR_VERSION,
    famille: spec.famille,
  });
  p.reference = `ROSACE-${spec.id}`;

  DESSIN[spec.signature.forme](p, indices, rng, spec.signature);

  return {
    spec: resolvedSpec,
    pattern: p,
    stats: computeStats(p),
  };
}

/** Résout un code DMC en index FLOSS, avec message explicite en cas d'erreur. */
function ensurePaletteIndex(code: string): number {
  const idx = flossIndex(code);
  if (idx < 0) throw new Error(`Code DMC introuvable dans la table de l'atelier : ${code}`);
  return idx;
}

/*──────────────────────────────────────────────────────────────*/
// Formats utilisés par le catalogue

export function FORMAT_POINTS(format: Signature5D["format"]): number {
  switch (format) {
    case "40":
      return 40;
    case "80":
      return 80;
    case "120":
      return 120;
    case "160":
      return 160;
  }
}

export function generationMeta(
  forme: Signature5D["forme"],
  tracé: Signature5D["tracé"],
  densité: Signature5D["densité"],
  format: Signature5D["format"],
  palette: PaletteId,
  graine: number,
): GenerationMeta {
  return {
    version: GENERATEUR_VERSION,
    signature: { forme, tracé, densité, format, palette },
    graine,
  };
}

export function rosaceId(meta: GenerationMeta): string {
  return signatureId(meta);
}
