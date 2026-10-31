/**
 * Les fils DMC rangés par familles de couleur, pour le Point (Fils → famille → nuances).
 * Le classement se fait sur la teinte, la saturation et la clarté (HSL) du fil : simple, stable, sans données à maintenir.
 * Dans chaque famille, les nuances vont du plus clair au plus foncé, comme sur un présentoir.
 */
import { FLOSS } from "./dmc";

export interface FamilleFils { id: string; nom: string; hex: string }
export const FAMILLES: FamilleFils[] = [
  { id: "blancs", nom: "Blancs et écrus", hex: "#f4efe1" },
  { id: "gris", nom: "Gris et noirs", hex: "#7c7c80" },
  { id: "rouges", nom: "Rouges", hex: "#c8102e" },
  { id: "roses", nom: "Roses", hex: "#e87ea1" },
  { id: "oranges", nom: "Oranges", hex: "#f08a24" },
  { id: "jaunes", nom: "Jaunes", hex: "#f2cd2e" },
  { id: "verts", nom: "Verts", hex: "#4f9a3c" },
  { id: "turquoises", nom: "Turquoises", hex: "#2aa5a0" },
  { id: "bleus", nom: "Bleus", hex: "#2f5fb3" },
  { id: "violets", nom: "Violets", hex: "#7b4fa8" },
  { id: "bruns", nom: "Bruns et beiges", hex: "#8a5a36" },
];

export function hsl(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return { h, s, l };
}

export function familleDe(hex: string): string {
  const { h, s, l } = hsl(hex);
  if (s < 0.14 || l > 0.93) return l > 0.78 ? "blancs" : "gris";
  if (l < 0.1) return "gris";
  // les bruns et beiges : des orangés ou jaunes sourds, ou foncés
  if (h >= 12 && h < 55 && (s < 0.45 || l < 0.36)) return l > 0.72 ? "blancs" : "bruns";
  if (h < 12 || h >= 345) return l > 0.66 ? "roses" : "rouges";
  if (h < 40) return "oranges";
  if (h < 68) return "jaunes";
  if (h < 165) return "verts";
  if (h < 195) return "turquoises";
  if (h < 255) return "bleus";
  if (h < 300) return "violets";
  return "roses";
}

let cache: Map<string, number[]> | null = null;
/** Pour chaque famille, les index des fils DMC, du plus clair au plus foncé. */
export function filsParFamille(): Map<string, number[]> {
  if (cache) return cache;
  const m = new Map<string, number[]>(FAMILLES.map(f => [f.id, []]));
  FLOSS.forEach((f, i) => { if (/^[0-9A-Za-z]/.test(f.code)) m.get(familleDe(f.hex))!.push(i); });
  for (const [, l] of m) l.sort((a, b) => hsl(FLOSS[b].hex).l - hsl(FLOSS[a].hex).l);
  cache = m;
  return m;
}
