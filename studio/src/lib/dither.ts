import { FLOSS, labOf, nearestFloss } from "./dmc";

/**
 * Moteur de réalisme : quantifie une image vers la palette DMC.
 * - mode "dither" : diffusion d'erreur Floyd–Steinberg → dégradés lisses,
 *   c'est la technique qui donne le « détail réaliste » en point de croix.
 * - mode "flat"   : couleur la plus proche sans dithering (aplats nets).
 * Le nombre de couleurs est plafonné (top-N les plus utilisées) pour rester brodable.
 */

export interface DitherOptions {
  mode: "dither" | "flat";
  maxColors: number;
  dropWhite: boolean;
}

export interface DitherResult {
  cross: Int16Array;
  palette: number[];
}

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
const WHITE_CUT = 236;

export function imageToDmc(img: HTMLImageElement, w: number, h: number, o: DitherOptions): DitherResult {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, Math.round((w - dw) / 2), Math.round((h - dh) / 2), dw, dh);
  const data = ctx.getImageData(0, 0, w, h).data;

  const cross = o.mode === "dither" ? floydSteinberg(data, w, h, o) : nearestFlat(data, w, h, o);
  const palette = [...new Set(Array.from(cross).filter((v) => v >= 0))];
  return { cross, palette };
}

/** Rétroquantise vers les N couleurs les plus utilisées (préserve le dither). */
function capToTop(out: Int16Array, R: Float32Array, G: Float32Array, B: Float32Array, n: number): Int16Array {
  const use = new Int32Array(FLOSS.length);
  for (let i = 0; i < out.length; i++) if (out[i] >= 0) use[out[i]]++;
  const idxs: number[] = [];
  for (let i = 0; i < FLOSS.length; i++) if (use[i] > 0) idxs.push(i);
  if (idxs.length <= n) return out;
  idxs.sort((a, b) => use[b] - use[a]);
  const top = idxs.slice(0, n);
  const topSet = new Set(top);
  const labs = top.map((i) => FLOSS[i].lab);
  const out2 = out.slice();
  for (let i = 0; i < out2.length; i++) {
    if (out2[i] < 0 || topSet.has(out2[i])) continue;
    const lab = labOf([clamp255(R[i]), clamp255(G[i]), clamp255(B[i])]);
    let best = top[0];
    let bd = Infinity;
    for (let t = 0; t < top.length; t++) {
      const L = labs[t];
      const dl = L[0] - lab[0];
      const da = L[1] - lab[1];
      const db = L[2] - lab[2];
      const d = dl * dl + da * da + db * db;
      if (d < bd) {
        bd = d;
        best = top[t];
      }
    }
    out2[i] = best;
  }
  return out2;
}

/** Diffusion d'erreur Floyd–Steinberg vers la palette DMC (réaliste). */
function floydSteinberg(data: Uint8ClampedArray, w: number, h: number, o: DitherOptions): Int16Array {
  const R = new Float32Array(w * h);
  const G = new Float32Array(w * h);
  const B = new Float32Array(w * h);
  const skip = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    R[i] = data[i * 4];
    G[i] = data[i * 4 + 1];
    B[i] = data[i * 4 + 2];
    if (o.dropWhite && R[i] > WHITE_CUT && G[i] > WHITE_CUT && B[i] > WHITE_CUT) skip[i] = 1;
  }

  const out = new Int16Array(w * h).fill(-1);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const i = row + x;
      if (skip[i]) continue;
      const rr = clamp255(R[i]);
      const gg = clamp255(G[i]);
      const bb = clamp255(B[i]);
      const idx = nearestFloss(labOf([rr, gg, bb]));
      out[i] = idx;
      const er = R[i] - FLOSS[idx].rgb[0];
      const eg = G[i] - FLOSS[idx].rgb[1];
      const eb = B[i] - FLOSS[idx].rgb[2];
      if (x + 1 < w && !skip[i + 1]) {
        const j = i + 1;
        R[j] += (er * 7) / 16;
        G[j] += (eg * 7) / 16;
        B[j] += (eb * 7) / 16;
      }
      if (x > 0 && y + 1 < h && !skip[i + w - 1]) {
        const j = i + w - 1;
        R[j] += (er * 3) / 16;
        G[j] += (eg * 3) / 16;
        B[j] += (eb * 3) / 16;
      }
      if (y + 1 < h && !skip[i + w]) {
        const j = i + w;
        R[j] += (er * 5) / 16;
        G[j] += (eg * 5) / 16;
        B[j] += (eb * 5) / 16;
      }
      if (x + 1 < w && y + 1 < h && !skip[i + w + 1]) {
        const j = i + w + 1;
        R[j] += (er * 1) / 16;
        G[j] += (eg * 1) / 16;
        B[j] += (eb * 1) / 16;
      }
    }
  }
  return o.maxColors < FLOSS.length ? capToTop(out, R, G, B, o.maxColors) : out;
}

/** Couleur la plus proche, sans dithering (aplats). */
function nearestFlat(data: Uint8ClampedArray, w: number, h: number, o: DitherOptions): Int16Array {
  const out = new Int16Array(w * h).fill(-1);
  const R = new Float32Array(w * h);
  const G = new Float32Array(w * h);
  const B = new Float32Array(w * h);
  const use = new Int32Array(FLOSS.length);
  for (let i = 0; i < w * h; i++) {
    const o4 = i * 4;
    const r = data[o4];
    const g = data[o4 + 1];
    const b = data[o4 + 2];
    const a = data[o4 + 3];
    R[i] = r;
    G[i] = g;
    B[i] = b;
    if (a < 128 || (o.dropWhite && r > WHITE_CUT && g > WHITE_CUT && b > WHITE_CUT)) continue;
    const idx = nearestFloss(labOf([r, g, b]));
    out[i] = idx;
    use[idx]++;
  }
  return o.maxColors < FLOSS.length ? capToTop(out, R, G, B, o.maxColors) : out;
}
