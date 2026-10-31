/* Le calcul du Tambour vivant : un seul worker pour toute la séance (pas un par image), le même calcul que l'import (quantizePixels). */
import { quantizePixels } from "../quantize";
import type { ConvertOptions } from "../convert";

self.onmessage = (e: MessageEvent<{ id: number; pixels: ArrayBuffer; w: number; h: number; opts: ConvertOptions }>) => {
  const { id, pixels, w, h, opts } = e.data;
  try { const r = quantizePixels(new Uint8ClampedArray(pixels), w, h, opts); self.postMessage({ id, cross: r.cross, palette: r.palette }, { transfer: [r.cross.buffer] }); }
  catch (err) { self.postMessage({ id, erreur: err instanceof Error ? err.message : "Conversion impossible" }); }
};
