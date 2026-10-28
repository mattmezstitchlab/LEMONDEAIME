/**
 * Composeur de prompt pour la génération de motifs de broderie détaillés.
 *
 * La source générée est une ILLUSTRATION riche et lisse (pas un « point de croix »
 * déjà aplati) : c'est ensuite le dithering Floyd–Steinberg qui la transforme en
 * motif de point de croix avec de vrais dégradés. Plus la source est détaillée et
 * lisse, plus le motif final a de « détail réaliste ».
 */

export type StyleId = "description" | "reeliste" | "botanique" | "animalier" | "portrait" | "paysage" | "geometrique" | "minimal";
export type DetailId = "delicat" | "equilibre" | "tres";
export type FormatId = "carre" | "portrait" | "paysage";

export const STYLES: { id: StyleId; label: string; desc: string }[] = [
  { id: "description", label: "Ma description", desc: "" },
  { id: "reeliste", label: "Réaliste", desc: "photorealistic painterly illustration, highly detailed, lifelike, rich smooth color gradients, fine intricate detail, realistic textures, professional, maximum detail, smooth shading" },
  { id: "botanique", label: "Botanique", desc: "detailed botanical watercolor illustration, delicate detailed botanical art, smooth natural color gradients, rich color, elegant, detailed foliage and petals, smooth painterly" },
  { id: "animalier", label: "Animalier", desc: "detailed wildlife animal illustration, lifelike, fine fur and feather detail, natural rich colors, smooth gradients, professional wildlife art, highly detailed" },
  { id: "portrait", label: "Portrait", desc: "detailed portrait illustration, soft lifelike skin tones, smooth gradients, expressive, professional, fine facial detail, highly detailed, rich skin color" },
  { id: "paysage", label: "Paysage", desc: "detailed scenic landscape, layered depth, atmospheric perspective, smooth sky gradients, rich natural colors, scenic detail, highly detailed" },
  { id: "geometrique", label: "Géométrique", desc: "modern flat geometric illustration, clean bold shapes, harmonious palette, contemporary, crisp clean, smooth flat color" },
  { id: "minimal", label: "Minimal", desc: "minimal flat illustration, clean simple shapes, limited colors, elegant minimal, clean negative space, smooth flat color" },
];

export const DETAILS: { id: DetailId; label: string; desc: string; colors: number }[] = [
  { id: "delicat", label: "Délicat", desc: "clean simple shapes, limited smooth color transitions, elegant and simple, clean", colors: 24 },
  { id: "equilibre", label: "Équilibré", desc: "rich smooth color gradients, balanced fine detail, professional, smooth, clean", colors: 40 },
  { id: "tres", label: "Très détaillé", desc: "extremely detailed, maximum intricate detail, ultra detailed, fine smooth gradients, rich painterly detail, very rich color depth, high fidelity, very detailed, smooth", colors: 64 },
];

export const FORMATS: { id: FormatId; label: string; w: number; h: number }[] = [
  { id: "carre", label: "Carré", w: 1024, h: 1024 },
  { id: "portrait", label: "Portrait", w: 832, h: 1216 },
  { id: "paysage", label: "Paysage", w: 1216, h: 832 },
];

export interface PromptInput {
  subject: string;
  main: string;
  second: string;
  relation: string;
  style: StyleId;
  detail: DetailId;
  format: FormatId;
}

export function parseComposition(source: string) {
  const s = source.trim();
  const fr = /\b(.+?)\s+sur\s+(?:un|une|le|la|l['’])\s+(.+)/i.exec(s);
  const en = /\b(.+?)\s+(?:on top of|on)\s+(?:a|an|the)\s+(.+)/i.exec(s);
  const m = fr ?? en;
  if (!m) return { main: s, extra: "", relation: "" };
  return { main: m[2].trim(), extra: m[1].trim(), relation: "the smaller subject is clearly perched on top of the main subject, both fully visible" };
}

/**
 * Construit un prompt d'ILLUSTRATION source riche et lisse. Le dithering (pas le
 * prompt) transforme ensuite cette illustration en point de croix détaillé.
 */
export function buildPrompt(i: PromptInput): string {
  const style = STYLES.find((s) => s.id === i.style)?.desc ?? STYLES[0].desc;
  const detail = DETAILS.find((d) => d.id === i.detail)?.desc ?? DETAILS[1].desc;
  const main = (i.main || i.subject || "").trim();
  const second = (i.second || "").trim();
  const relation = (i.relation || "").trim();

  return [
    "Create a source illustration for a cross-stitch pattern.",
    `User description (preserve all subjects, colours, relationships, background and requested lettering): ${i.subject.trim()}`,
    main && main !== i.subject.trim() ? `User-specified main subject: ${main}.` : "",
    second ? `Also include: ${second}.` : "",
    relation ? `User-specified relationship: ${relation}.` : "",
    style ? `Optional visual style, subordinate to the user description: ${style}.` : "",
    `Detail preference, subordinate to the description: ${detail}.`,
    "Do not add a grid, simulated stitch texture or a watermark unless explicitly requested. Do not omit requested elements.",
  ].filter(Boolean).join(" ");
}

export function pollinationsUrl(prompt: string, w: number, h: number, seed: number): string {
  const p = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${p}?width=${w}&height=${h}&seed=${seed}&model=flux&nologo=true&enhance=false&safe=true`;
}

/** Hauteur de grille qui conserve l'aspect du format, arrondie à un nombre pair. */
export function gridHeightFor(base: number, format: FormatId): number {
  const f = FORMATS.find((f) => f.id === format) ?? FORMATS[0];
  const h = Math.round((base * f.h) / f.w / 2) * 2;
  return Math.max(20, Math.min(400, h));
}

/** Explicit colour limits are technical constraints, not image-provider hints. */
export function requestedColorLimit(text: string): number | null {
  const match = /\b(\d{1,3})\s*(?:couleurs?|colors?|fils?)\b/i.exec(text);
  if (!match) return null;
  const value = Number(match[1]);
  if (value < 1 || value > 64) throw new Error("Choisissez entre 1 et 64 couleurs pour ce studio.");
  return value;
}
