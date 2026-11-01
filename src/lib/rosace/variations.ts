// ROSACE — Création de variations
//
// À partir d'une rosace existante, génère une nouvelle rosace modifiée sur
// une seule dimension (palette, densité, graine, aération, taille). Le modèle
// original n'est jamais modifié ; la variation reçoit sa propre signature,
// graine et identifiant, donc reste entièrement reproductible.

import { genererRosace, generationMeta, rosaceId, type GeneratedRosace } from "./generateur";
import {
  DENSITES,
  FORMATS,
  PALETTES,
  type Densité,
  type Format,
  type PaletteId,
  type Signature5D,
} from "./signature";

const VERSION = "1.0.0";

export type VariationKind =
  | "autre-palette"
  | "autre-densite"
  | "autre-graine"
  | "plus-aeree"
  | "plus-grande";

export const VARIATION_LABELS: Record<VariationKind, string> = {
  "autre-palette": "Même forme, autre palette de fils",
  "autre-densite": "Même palette, autre densité",
  "autre-graine": "Même signature, autre graine",
  "plus-aeree": "Version plus aérée",
  "plus-grande": "Version plus grande",
};

function suivant<T>(items: T[], valeur: T): T {
  const i = items.indexOf(valeur);
  return items[(i + 1) % items.length];
}

export function créerVariation(
  rosace: GeneratedRosace,
  kind: VariationKind,
): GeneratedRosace | null {
  const s: Signature5D = { ...rosace.spec.signature };
  let graine = rosace.spec.graine;

  switch (kind) {
    case "autre-palette":
      s.palette = suivant(PALETTES, s.palette) as PaletteId;
      break;
    case "autre-densite":
      s.densité = suivant(DENSITES, s.densité) as Densité;
      break;
    case "autre-graine":
      graine = (graine * 1103515245 + 12345) & 0x7fffffff;
      break;
    case "plus-aeree":
      s.densité = "aeree";
      break;
    case "plus-grande": {
      const f = suivant(FORMATS, s.format) as Format;
      // Ne pas surdimensionner démesurément : 160 reste le plafond.
      if (f === "40" && s.format !== "40") return null;
      s.format = f;
      break;
    }
  }

  const meta = generationMeta(s.forme, s.tracé, s.densité, s.format, s.palette, graine);
  const newSpec: import("./generateur").RosaceSpec = {
    ...rosace.spec,
    id: rosaceId({ version: VERSION, signature: meta.signature, graine: meta.graine }),
    signature: meta.signature,
    graine: meta.graine,
    name: `${rosace.spec.name} · Variation`,
    description: `Variation de « ${rosace.spec.name } » : ${VARIATION_LABELS[kind]}. Générée à partir du même motif, reproductible à l'identique.`,
  };
  return genererRosace(newSpec);
}
