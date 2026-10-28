import { quantizePixels } from "./quantize";
import type { ConvertOptions } from "./convert";

self.onmessage = (event: MessageEvent<{ pixels: ArrayBuffer; w: number; h: number; opts: ConvertOptions }>) => {
  const { pixels, w, h, opts } = event.data;
  try { self.postMessage({ ...quantizePixels(new Uint8ClampedArray(pixels), w, h, opts), scriptURL: self.location.href }); }
  catch (e) { self.postMessage({ error: e instanceof Error ? e.message : "Conversion impossible" }); }
};