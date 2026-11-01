// ROSACE — Catalogue des premières créations
//
// Huit rosaces, une par famille éditoriale. Chacune possède une signature 5D
// complète, une graine, une palette de véritables références DMC et un patron
// généré par le moteur 5D (générateur.ts). Les statistiques (croix, couleurs,
// mètres, écheveaux, difficulté, temps) sont calculées par le noyau patron de
// l'atelier Point Zéro, pas inventées.

import {
  genererRosace,
  generationMeta,
  rosaceId,
  type GeneratedRosace,
  type RosaceSpec,
} from "./generateur";
import {
  type Densité,
  type Format,
  type Forme,
  type PaletteId,
  type Tracé,
} from "./signature";

const VERSION = "1.0.0";

function spec(
  name: string,
  famille: string,
  familleLabel: string,
  forme: Forme,
  tracé: Tracé,
  densité: Densité,
  format: Format,
  palette: PaletteId,
  graine: number,
  description: string,
): RosaceSpec {
  const generation = generationMeta(forme, tracé, densité, format, palette, graine);
  return {
    id: rosaceId({ version: VERSION, signature: generation.signature, graine }),
    signature: generation.signature,
    name,
    famille,
    familleLabel,
    graine,
    version: VERSION,
    description,
  };
}

export const ROSACE_CATALOGUE: RosaceSpec[] = [
  spec(
    "Aubépine",
    "Florales",
    "Florales",
    "radiale",
    "croix",
    "equilibree",
    "80",
    "poussiere-de-rose",
    1101,
    "Douce rosace radiale aux pétales poudrés et au cœur doré. Une première rosace équilibrée, idéale pour découvrir le point de croix en rosace.",
  ),
  spec(
    "Cloître",
    "Géométriques",
    "Géométriques",
    "mandala",
    "contours",
    "aeree",
    "120",
    "mineral",
    2205,
    "Mandala géométrique aux losanges concentriques. Tracé aérien et rythme mathématique, tout en contours délicats.",
  ),
  spec(
    "Anneaux Dorés",
    "Anneaux",
    "Anneaux",
    "anneaux",
    "croix",
    "dense",
    "120",
    "mineral",
    3307,
    "Trois anneaux concentriques de motifs répétés, relevés d'un médaillon central. Riche et symétrique.",
  ),
  spec(
    "Dentelle de Velours",
    "Dentelles",
    "Dentelles",
    "dentelle",
    "ajoure",
    "aeree",
    "80",
    "naturel",
    4409,
    "Grille ajourée de croix isolées et de petits blocs éparses. Très peu de fil, beaucoup de lumière.",
  ),
  spec(
    "Minéral",
    "Minimalistes",
    "Minimalistes",
    "minimal",
    "croix",
    "aeree",
    "40",
    "mineral",
    5501,
    "Le minimum : un point central entouré de huit. Deux fils seulement, une grille de quarante points de côté.",
  ),
  spec(
    "Classique",
    "Classiques",
    "Classiques",
    "medaillon",
    "rempli",
    "equilibree",
    "80",
    "rouge-profond",
    6603,
    "Médaillon central rempli entouré de feuillages cardinaux. La rosace traditionnelle par excellence.",
  ),
  spec(
    "Orbite",
    "Contemporaines",
    "Contemporaines",
    "rosette",
    "contours",
    "dense",
    "120",
    "bleu-nuit",
    7703,
    "Rosette de huit pétales aux contours marqués, tige stylisée et anneau de points secondaires. Esprit contemporain.",
  ),
  spec(
    "Nuancier",
    "Collections chromatiques",
    "Collections chromatiques",
    "radiale",
    "rempli",
    "dense",
    "120",
    "chromatique",
    8807,
    "Rosace radiale aux six couleurs de la palette chromatique. Pétales pleins, anneau extérieur dense, centre contrasté.",
  ),
];

/** Génère les patrons réels du catalogue (déterministe). Vérifié par les tests. */
export function catalogue(): GeneratedRosace[] {
  return ROSACE_CATALOGUE.map((spec) => genererRosace(spec));
}

export function trouverRosace(id: string): GeneratedRosace | null {
  return catalogue().find((r) => r.spec.id === id) ?? null;
}

export function famillesDisponibles(): { id: string; label: string }[] {
  const vu = new Set<string>();
  const out: { id: string; label: string }[] = [];
  for (const s of ROSACE_CATALOGUE) {
    if (vu.has(s.famille)) continue;
    vu.add(s.famille);
    out.push({ id: s.famille, label: s.familleLabel });
  }
  return out;
}

export function palettesDisponibles(): { id: PaletteId; label: string }[] {
  return [
    { id: "poussiere-de-rose", label: "Poussière de rose" },
    { id: "rouge-profond", label: "Rouge profond" },
    { id: "vert-sauge", label: "Vert sauge" },
    { id: "bleu-nuit", label: "Bleu nuit" },
    { id: "mineral", label: "Minéral" },
    { id: "chromatique", label: "Chromatique" },
    { id: "naturel", label: "Naturel" },
    { id: "pastel", label: "Pastel" },
  ];
}
