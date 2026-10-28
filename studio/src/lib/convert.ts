import { quantizePixels } from "./quantize";
export { quantizePixels, removeConfetti } from "./quantize";
import { createPattern, type Pattern } from "./pattern";

export function loadImage(src: string | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = typeof src === "string" ? src : URL.createObjectURL(src);
    img.onload = () => {
      if (typeof src !== "string") URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => { if (typeof src !== "string") URL.revokeObjectURL(url); reject(new Error("Image illisible")); };
    img.src = url;
  });
}

/** Image distante (générateur IA) : CORS anonyme + délai, pour rester convertible en grille. */
export function loadRemoteImage(url: string, timeoutMs = 120000): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const timer = window.setTimeout(() => {
      img.removeAttribute("src");
      reject(new Error("Délai dépassé : réessayez, éventuellement avec une autre graine."));
    }, timeoutMs);
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("Image distante illisible (réseau, CORS ou service indisponible)."));
    };
    img.src = url;
  });
}

export interface ConvertOptions {
  /** Nombre maximal de fils DMC différents dans le motif. */
  maxColors: number;
  /** Ignore le fond blanc (laisse la toile nue). */
  dropWhite: boolean;
  /** Supprime les confettis (points isolés d'une seule case). */
  confetti?: boolean;
  pixelArt?: boolean;
}

type Raster = HTMLImageElement | HTMLCanvasElement;

const srcSize = (s: Raster) =>
  s instanceof HTMLCanvasElement ? { w: s.width, h: s.height } : { w: s.naturalWidth, h: s.naturalHeight };

/**
 * Convertit une image ou un canevas (page PDF rendue) en grille DMC :
 * réduction progressive, cadrage « contain », moyenne par case, fil DMC le plus
 * proche en CIELAB, réduction au nombre de couleurs demandé, puis anti-confetti.
 */
function rasterData(input: Raster, w: number, h: number, pixelArt = false): Uint8ClampedArray {
  const dims = srcSize(input);
  let source: HTMLCanvasElement = document.createElement("canvas");
  source.width = dims.w;
  source.height = dims.h;
  source.getContext("2d")?.drawImage(input, 0, 0);

  const scale = Math.min(w / dims.w, h / dims.h);
  const dw = Math.max(1, Math.round(dims.w * scale));
  const dh = Math.max(1, Math.round(dims.h * scale));
  while (!pixelArt && source.width > dw * 2) {
    const next = document.createElement("canvas");
    next.width = Math.max(dw, Math.floor(source.width / 2));
    next.height = Math.max(dh, Math.floor(source.height / 2));
    next.getContext("2d")?.drawImage(source, 0, 0, next.width, next.height);
    source = next;
  }

  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible");
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = !pixelArt;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, Math.floor((w - dw) / 2), Math.floor((h - dh) / 2), dw, dh);

  const data = ctx.getImageData(0, 0, w, h).data;
  return data;
}

export function rasterToCells(input: Raster, w: number, h: number, opts: ConvertOptions) {
  return quantizePixels(rasterData(input, w, h, opts.pixelArt), w, h, opts);
}

/** Keep expensive perceptual matching off the UI thread on iPad and desktop. */
export async function asyncRasterToCells(input: Raster, w: number, h: number, opts: ConvertOptions): Promise<{ cross: Int16Array; palette: number[] }> {
  const pixels = rasterData(input, w, h, opts.pixelArt);
  if (typeof Worker === "undefined") { await new Promise((r) => setTimeout(r, 0)); return quantizePixels(pixels, w, h, opts); }
  const backup = pixels.slice();
  try {
    return await new Promise((resolve, reject) => {
      const worker = new Worker(new URL("./conversion.worker.ts", import.meta.url), { type: "module" });
      worker.onmessage = (event: MessageEvent<{ cross?: Int16Array; palette?: number[]; error?: string; scriptURL?: string }>) => {
        worker.terminate();
        if (event.data.scriptURL && "serviceWorker" in navigator) {
          const url = event.data.scriptURL;
          void navigator.serviceWorker.ready.then((registration) => registration.active?.postMessage({ type: "CACHE_ASSET", url })).catch(() => undefined);
        }
        if (event.data.error) reject(new Error(event.data.error));
        else resolve({ cross: event.data.cross ?? new Int16Array(w * h).fill(-1), palette: event.data.palette ?? [] });
      };
      worker.onerror = () => { worker.terminate(); reject(new Error("Le calcul en arrière-plan est indisponible")); };
      worker.postMessage({ pixels: pixels.buffer, w, h, opts }, [pixels.buffer]);
    });
  } catch {
    await new Promise((r) => setTimeout(r, 0));
    return quantizePixels(backup, w, h, opts);
  }
}

export function imageToCells(img: HTMLImageElement, w: number, h: number, opts: ConvertOptions) {
  return rasterToCells(img, w, h, opts);
}

export interface Template {
  name: string;
  src: string;
  size: number;
  maxColors: number;
  dropWhite: boolean;
}

export const TEMPLATES: Record<"roses" | "papillon", Template> = {
  roses: { name: "Roses de Damas", src: "images/grille-roses.png", size: 80, maxColors: 14, dropWhite: false },
  papillon: { name: "Papillon", src: "images/papillon.png", size: 60, maxColors: 10, dropWhite: true },
};

export async function buildTemplate(key: keyof typeof TEMPLATES): Promise<Pattern> {
  const t = TEMPLATES[key];
  const img = await loadImage(t.src);
  const { cross, palette } = await asyncRasterToCells(img, t.size, t.size, { maxColors: t.maxColors, dropWhite: t.dropWhite });
  const p = createPattern(t.name, t.size, t.size, 14, 2);
  p.cross = cross;
  p.palette = palette;
  return p;
}

/** Dimensions : largeur choisie, hauteur selon le ratio, nombre pair (point zéro central). */
export function sizeFromRatio(srcW: number, srcH: number, width: number) {
  const ratio = srcH / srcW;
  const h = Math.min(200, Math.max(20, Math.round((width * ratio) / 2) * 2));
  return { w: width, h };
}
