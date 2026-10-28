import { asyncRasterToCells, loadImage } from "./convert";
import { filsAuto, fusionnerVoisins, poserConversion, reglerPixels, type PhotoSource, type ReglagesPhoto } from "./cadre";
import type { Pattern } from "./pattern";

/**
 * La photo d'un ouvrage, gardée avec lui (900 px au plus) : chaque nouveau format, chaque réglage
 * repart d'elle, au lieu d'étirer des points déjà comptés. Tout reste sur l'appareil.
 */
const MAX = 900;
const images = new Map<string, Promise<HTMLImageElement>>();
const charger = (src: string) => { let p = images.get(src); if (!p) { p = loadImage(src); images.set(src, p); if (images.size > 6) images.delete(images.keys().next().value!); } return p; };

export async function photoDe(img: HTMLImageElement | HTMLCanvasElement): Promise<string> {
  const iw = img instanceof HTMLImageElement ? img.naturalWidth || img.width : img.width, ih = img instanceof HTMLImageElement ? img.naturalHeight || img.height : img.height;
  const k = Math.min(1, MAX / Math.max(iw, ih)), c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(iw * k)); c.height = Math.max(1, Math.round(ih * k));
  const ctx = c.getContext("2d"); if (!ctx) throw new Error("Canvas indisponible");
  ctx.imageSmoothingQuality = "high"; ctx.drawImage(img, 0, 0, c.width, c.height);
  const webp = c.toDataURL("image/webp", .9);
  return webp.startsWith("data:image/webp") ? webp : c.toDataURL("image/jpeg", .9);
}

/** Les dimensions d'une photo en points, pour un côté le plus long donné. */
export function formatPhoto(iw: number, ih: number, cote = 120): [number, number] {
  const k = cote / Math.max(iw, ih);
  return [Math.max(8, Math.min(1000, Math.round(iw * k))), Math.max(8, Math.min(1000, Math.round(ih * k)))];
}

export async function convertirPhoto(base: Pattern, src: string, reglages: ReglagesPhoto, w: number, h: number): Promise<Pattern> {
  const img = await charger(src);
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  // Une résolution de travail juste suffisante : 4 pixels par point, sans dépasser la photo gardée.
  const k = Math.min(1, Math.max(w, h) * 4 / Math.max(iw, ih)), c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(iw * k)); c.height = Math.max(1, Math.round(ih * k));
  const ctx = c.getContext("2d", { willReadFrequently: true }); if (!ctx) throw new Error("Canvas indisponible");
  ctx.imageSmoothingQuality = "high"; ctx.drawImage(img, 0, 0, c.width, c.height);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  reglerPixels(data.data, c.width, c.height, reglages);
  ctx.putImageData(data, 0, 0);
  const r = await asyncRasterToCells(c, w, h, { maxColors: filsAuto(w, h), dropWhite: false, confetti: w * h < 20000, pixelArt: false });
  const palette = reglages.palette === "harmonieuse" ? fusionnerVoisins(r.cross, 9) : r.palette;
  const photo: PhotoSource = { src, reglages, empreinte: 0 };
  return poserConversion(base, w, h, r.cross, palette, photo);
}

/**
 * À l'import : si le fond a été laissé en toile nue et que le sujet n'occupe qu'une partie du cadre,
 * la photo gardée est recadrée sur le sujet (une petite marge autour). Le cadre colle alors à l'ouvrage.
 */
export async function recadrerSurSujet(src: string, p: Pattern): Promise<string | null> {
  let x0 = p.w, y0 = p.h, x1 = -1, y1 = -1;
  for (let i = 0; i < p.cross.length; i++) if (p.cross[i] >= 0) { const x = i % p.w, y = (i - x) / p.w; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null;
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  if (bw * bh > p.w * p.h * .72) return null;
  const img = await charger(src), iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  // les cases du motif couvrent la photo en « contain », centrée
  const k = Math.min(p.w / iw, p.h / ih), dx = (p.w - iw * k) / 2, dy = (p.h - ih * k) / 2, marge = Math.max(bw, bh) * .04;
  const sx = Math.max(0, (x0 - marge - dx) / k), sy = Math.max(0, (y0 - marge - dy) / k);
  const sw = Math.min(iw - sx, (bw + 2 * marge) / k), sh = Math.min(ih - sy, (bh + 2 * marge) / k);
  const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(sw)); c.height = Math.max(1, Math.round(sh));
  c.getContext("2d")?.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return photoDe(c);
}
