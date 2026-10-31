/** La photo gardée avec un ouvrage, et ses réglages (sans dépendance : lue aussi par pattern.ts). */
export type PaletteMode = "originale" | "harmonieuse" | "douce" | "ancienne" | "camaieu";
export const PALETTES: { id: PaletteMode; nom: string; phrase: string }[] = [
  { id: "originale", nom: "Originale", phrase: "Les couleurs de la photo, au fil DMC le plus proche." },
  { id: "harmonieuse", nom: "Harmonieuse", phrase: "Les teintes se rapprochent des deux ou trois couleurs dominantes ; les fils trop voisins fusionnent." },
  { id: "douce", nom: "Douce", phrase: "Des tons poudrés, plus clairs et moins saturés." },
  { id: "ancienne", nom: "Ancienne", phrase: "Comme un vieil ouvrage au soleil : sépia, rose fané, vert passé." },
  { id: "camaieu", nom: "Camaïeu", phrase: "Une seule teinte, en dégradé du clair au foncé." },
];
export interface ReglagesPhoto { auto: boolean; lumiere: number; contraste: number; saturation: number; palette: PaletteMode; fond: boolean }
export const REGLAGES_AUTO: ReglagesPhoto = { auto: true, lumiere: 0, contraste: 0, saturation: 0, palette: "originale", fond: true };
export interface PhotoSource { src: string; reglages: ReglagesPhoto; empreinte: number }

export function lireReglages(v: unknown): ReglagesPhoto {
  const o = (v && typeof v === "object" ? v : {}) as Partial<ReglagesPhoto>;
  const n = (x: unknown) => typeof x === "number" && Number.isFinite(x) ? Math.max(-100, Math.min(100, Math.round(x))) : 0;
  return { auto: o.auto !== false, lumiere: n(o.lumiere), contraste: n(o.contraste), saturation: n(o.saturation), palette: PALETTES.some(p => p.id === o.palette) ? o.palette as PaletteMode : "originale", fond: o.fond !== false };
}
export function lirePhoto(v: unknown): PhotoSource | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Partial<PhotoSource>;
  if (typeof o.src !== "string" || !/^data:image\/(png|jpeg|webp);base64,/.test(o.src) || o.src.length > 4_000_000) return undefined;
  return { src: o.src, reglages: lireReglages(o.reglages), empreinte: typeof o.empreinte === "number" ? o.empreinte : 0 };
}

