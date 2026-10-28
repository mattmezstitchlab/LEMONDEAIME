import palette from "craft-color-codes/data/json/dmc-floss.json";
import { deltaE2000 } from "./colorScience";

/**
 * Palette DMC Mouliné Spécial (art. 117).
 * Données : craft-color-codes par MakeBead, CC BY 4.0.
 * https://github.com/makebead/craft-color-codes
 *
 * Le fichier source contient 489 références cross-checkées. DMC ne publie pas
 * de table RGB officielle : les couleurs écran restent des approximations et
 * doivent être confirmées sur une carte physique avant un achat important.
 */

export interface Floss {
  code: string;
  name: string;
  hex: string;
  rgb: [number, number, number];
  lab: [number, number, number];
  blend?: { code: string; strands: number }[];
}

function srgbToLab(rgb: [number, number, number]): [number, number, number] {
  const lin = (v: number) => {
    const x = v / 255;
    return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  const R = lin(rgb[0]);
  const G = lin(rgb[1]);
  const B = lin(rgb[2]);
  const X = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
  const Y = R * 0.2126729 + G * 0.7151522 + B * 0.072175;
  const Z = (R * 0.0193339 + G * 0.119192 + B * 0.9503041) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(X);
  const fy = f(Y);
  const fz = f(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

const isNumeric = (code: string) => /^\d+$/.test(code);

export const FLOSS: Floss[] = palette.colors
  .map((f) => {
    const rgb: [number, number, number] = [f.rgb[0], f.rgb[1], f.rgb[2]];
    return { code: f.code, name: f.name, hex: f.hex, rgb, lab: srgbToLab(rgb) };
  })
  .sort((a, b) => {
    const na = isNumeric(a.code);
    const nb = isNumeric(b.code);
    if (na !== nb) return na ? 1 : -1;
    if (na && nb) return parseInt(a.code, 10) - parseInt(b.code, 10);
    return a.code.localeCompare(b.code);
  });

if (FLOSS.length !== palette.count) {
  throw new Error(`Palette DMC incomplète : ${FLOSS.length}/${palette.count}`);
}
export const BASE_FLOSS = FLOSS.slice();

const BY_CODE = new Map(FLOSS.map((f, i) => [f.code, i] as const));

export function flossIndex(code: string): number {
  const c = code.trim();
  const exact = BY_CODE.get(c) ?? FLOSS.findIndex((f) => f.code.toLowerCase() === c.toLowerCase());
  if (exact >= 0) return exact;
  const parts = /^mix:([^/]+)\/(\d)\+([^/]+)\/(\d)$/.exec(c);
  if (parts) return registerBlend(parts[1], parts[3], Number(parts[2]), Number(parts[4]));
  return -1;
}

export function registerBlend(aCode: string, bCode: string, a = 1, b = 1): number {
  const first = BASE_FLOSS.find((f) => f.code.toLowerCase() === aCode.toLowerCase()), second = BASE_FLOSS.find((f) => f.code.toLowerCase() === bCode.toLowerCase());
  if (!first || !second || a < 1 || b < 1 || a + b > 6) return -1;
  const code = `mix:${first.code}/${a}+${second.code}/${b}`, existing = FLOSS.findIndex((f) => f.code === code);
  if (existing >= 0) return existing;
  const rgb = first.rgb.map((v, i) => Math.round((v * a + second.rgb[i] * b) / (a + b))) as [number, number, number];
  const idx = FLOSS.length;
  FLOSS.push({ code, name: `${a} brin(s) ${first.code} + ${b} brin(s) ${second.code}`, rgb, hex: "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join(""), lab: srgbToLab(rgb), blend: [{ code: first.code, strands: a }, { code: second.code, strands: b }] });
  BY_CODE.set(code, idx); return idx;
}

export function labOf(rgb: [number, number, number]): [number, number, number] {
  return srgbToLab(rgb);
}

/**
 * Les `limit` fils DMC les plus proches par CIEDE2000, du plus petit écart au
 * plus grand. Le pool par défaut exclut les mélanges enregistrés en session :
 * on ne propose pas une recette comme substitution.
 */
export function nearestFlossList(
  lab: [number, number, number],
  limit = 3,
  pool?: number[],
): { idx: number; deltaE: number }[] {
  const indices = pool ?? BASE_FLOSS.map((_, i) => i);
  return indices
    .map((idx) => ({ idx, deltaE: deltaE2000(lab, FLOSS[idx].lab) }))
    .sort((a, b) => a.deltaE - b.deltaE)
    .slice(0, Math.max(0, limit));
}

/** Fil DMC le plus proche par CIEDE2000, éventuellement dans un sous-ensemble. */
export function nearestFloss(lab: [number, number, number], pool?: number[]): number {
  return nearestFlossList(lab, 1, pool)[0]?.idx ?? 0;
}

/** Couleur de contraste lisible sur une teinte de fil. */
export function contrastOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const linear = (v: number) => v / 255 <= .04045 ? v / 255 / 12.92 : ((v / 255 + .055) / 1.055) ** 2.4;
  const lum = .2126 * linear(r) + .7152 * linear(g) + .0722 * linear(b);
  return (lum + .05) / .05 > 1.05 / (lum + .05) ? "#1c1c1e" : "#ffffff";
}
/* Recherche d'un fil en français : les noms DMC sont en anglais ; « rouge », « vert foncé », « rose clair » ou « 310 » les trouvent.
   Chaque mot cherché doit correspondre (au code, au nom anglais ou à sa traduction) ; accents et majuscules sont ignorés. */
const FR: Record<string, string[]> = {
  rouge: ["red", "cranberry", "garnet", "raspberry", "carnation", "geranium", "alizarin"], rose: ["pink", "rose", "carnation", "blossom"], fuchsia: ["fuschia", "cyclamen"],
  bleu: ["blue", "cornflower", "wedgewood", "delft", "navy", "sky", "royal", "electric", "peacock", "blueberry"], marine: ["navy"], ciel: ["sky"],
  vert: ["green", "grn", "olive", "avocado", "emerald", "forest", "moss", "jade", "celadon", "fern", "pistachio", "kelly", "hunter", "pine", "parrot", "nile", "chartreuse", "apple", "sea"],
  jaune: ["yellow", "lemon", "canary", "straw", "mustard"], orange: ["orange", "tangerine", "pumpkin", "apricot", "spice", "burnt"],
  violet: ["violet", "purple", "lavender", "plum", "grape", "eggplant", "mauve"], lavande: ["lavender"], prune: ["plum"], mauve: ["mauve"], aubergine: ["eggplant"],
  brun: ["brown", "mocha", "mahogany", "beaver", "cocoa", "coffee", "hazelnut", "rosewood", "tawny"], marron: ["brown", "mocha", "mahogany", "cocoa", "coffee", "hazelnut"], chocolat: ["cocoa", "brown"],
  noir: ["black"], blanc: ["white", "snow", "ecru"], ecru: ["ecru"], creme: ["cream", "ecru"], gris: ["gray", "pewter", "steel", "ash", "tin", "driftwood"],
  beige: ["beige", "tan", "sand", "shell", "drab", "desert"], sable: ["sand"], or: ["gold", "golden", "topaz"], dore: ["gold", "golden"], cuivre: ["copper"],
  turquoise: ["turquoise", "aquamarine", "teal"], corail: ["coral"], saumon: ["salmon", "shrimp"], peche: ["peach", "melon"], kaki: ["khaki", "drab", "olive"], terracotta: ["terra", "cotta"],
  clair: ["light", "pale", "baby"], pale: ["pale", "light", "baby"], fonce: ["dark", "deep", "vd", "darkv"], vif: ["bright", "electric"], moyen: ["medium"], ancien: ["antique", "old"], tres: ["very", "ultra", "vy"],
};
/* « rouges », « foncée », « foncés » : on essaie le mot, puis sans sa marque de pluriel ou de féminin */
const traductions = (m: string) => FR[m] || FR[m.replace(/s$/, "")] || FR[m.replace(/e?s?$/, "")] || [];
const sansAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export function filCorrespond(f: Pick<Floss, "code" | "name">, recherche: string): boolean {
  const mots = sansAccents(recherche).split(/[^a-z0-9]+/).filter(Boolean);
  if (!mots.length) return true;
  const code = f.code.toLowerCase(), nom = sansAccents(f.name), motsNom = nom.split(/[^a-z0-9]+/);
  return mots.every(m => code.includes(m) || nom.includes(m) || traductions(m).some(en => motsNom.includes(en)));
}
