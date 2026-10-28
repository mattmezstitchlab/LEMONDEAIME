import { flossIndex, labOf, nearestFloss } from "./dmc";
import { createPattern, ensurePalette, type Pattern } from "./pattern";
export interface Corner { x: number; y: number }
export type Corners = [Corner, Corner, Corner, Corner];
export interface SymbolGroup { id: number; preview: string; count: number; code: string; bits: Uint8Array }
export interface Recognition { w: number; h: number; groups: SymbolGroup[]; cells: Int16Array; mode: "symbols" | "colors" }

/** Projective homography: maps a rectified chart back to four user-calibrated corners. */
function homography(q: Corners): number[] {
  const uv = [[0, 0], [1, 0], [1, 1], [0, 1]], m: number[][] = [];
  uv.forEach(([u, v], i) => {
    const { x, y } = q[i];
    m.push([u, v, 1, 0, 0, 0, -u * x, -v * x, x]);
    m.push([0, 0, 0, u, v, 1, -u * y, -v * y, y]);
  });
  for (let c = 0; c < 8; c++) {
    let pivot = c; for (let r = c + 1; r < 8; r++) if (Math.abs(m[r][c]) > Math.abs(m[pivot][c])) pivot = r;
    [m[c], m[pivot]] = [m[pivot], m[c]];
    if (Math.abs(m[c][c]) < 1e-9) throw new Error("Les quatre coins ne forment pas un quadrilatère valide.");
    const scale = m[c][c]; for (let j = c; j <= 8; j++) m[c][j] /= scale;
    for (let r = 0; r < 8; r++) if (r !== c) { const f = m[r][c]; for (let j = c; j <= 8; j++) m[r][j] -= f * m[c][j]; }
  }
  return m.map((r) => r[8]);
}
export function rectify(source: HTMLCanvasElement, corners: Corners, cols: number, rows: number, cell = 16): HTMLCanvasElement {
  const out = document.createElement("canvas"); out.width = cols * cell; out.height = rows * cell;
  const dst = out.getContext("2d")!, ctx = source.getContext("2d")!, input = ctx.getImageData(0, 0, source.width, source.height), target = dst.createImageData(out.width, out.height);
  const a = homography(corners.map((q) => ({ x: q.x / 100 * source.width, y: q.y / 100 * source.height })) as Corners);
  for (let y = 0; y < out.height; y++) for (let x = 0; x < out.width; x++) {
    const u = (x + .5) / out.width, v = (y + .5) / out.height, den = a[6] * u + a[7] * v + 1;
    const sx = Math.round((a[0] * u + a[1] * v + a[2]) / den), sy = Math.round((a[3] * u + a[4] * v + a[5]) / den), j = (y * out.width + x) * 4;
    if (sx < 0 || sy < 0 || sx >= source.width || sy >= source.height) { target.data[j] = target.data[j + 1] = target.data[j + 2] = target.data[j + 3] = 255; continue; }
    const i = (sy * source.width + sx) * 4;
    target.data[j] = input.data[i]; target.data[j + 1] = input.data[i + 1]; target.data[j + 2] = input.data[i + 2]; target.data[j + 3] = 255;
  }
  dst.putImageData(target, 0, 0); return out;
}

export function detectGrid(source: HTMLCanvasElement): { corners: Corners; cols: number; rows: number } | null {
  const c = document.createElement("canvas"), factor = Math.min(1, 1000 / source.width);
  c.width = Math.round(source.width * factor); c.height = Math.round(source.height * factor);
  const ctx = c.getContext("2d")!; ctx.drawImage(source, 0, 0, c.width, c.height);
  const { data } = ctx.getImageData(0, 0, c.width, c.height), xs = new Float32Array(c.width), ys = new Float32Array(c.height);
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    const i = (y * c.width + x) * 4;
    if (data[i] + data[i + 1] + data[i + 2] < 480) { xs[x]++; ys[y]++; }
  }
  const peaks = (v: Float32Array, span: number) => {
    const threshold = Math.max(span * .32, Math.max(...v) * .6), result: number[] = [];
    for (let i = 0; i < v.length; i++) if (v[i] > threshold) { const start = i; while (i + 1 < v.length && v[i + 1] > threshold) i++; result.push((start + i) / 2); }
    return result;
  };
  const x = peaks(xs, c.height), y = peaks(ys, c.width);
  if (x.length < 5 || y.length < 5) return null;
  const left = x[0] / c.width * 100, right = x[x.length - 1] / c.width * 100, top = y[0] / c.height * 100, bottom = y[y.length - 1] / c.height * 100;
  return { corners: [{ x: left, y: top }, { x: right, y: top }, { x: right, y: bottom }, { x: left, y: bottom }], cols: x.length - 1, rows: y.length - 1 };
}

export async function recognizeChart(source: HTMLCanvasElement, corners: Corners, w: number, h: number, mode: "symbols" | "colors"): Promise<Recognition> {
  const cell = 16, out = rectify(source, corners, w, h, cell), ctx = out.getContext("2d")!, pixels = ctx.getImageData(0, 0, out.width, out.height).data;
  const groups: SymbolGroup[] = [], cells = new Int16Array(w * h).fill(-1), samples = new Map<number, number>();
  const thumbnail = (bits: Uint8Array) => {
    const t = document.createElement("canvas"); t.width = t.height = 12;
    const cc = t.getContext("2d")!; cc.fillStyle = "white"; cc.fillRect(0, 0, 12, 12); cc.fillStyle = "black";
    for (let i = 0; i < bits.length; i++) if (bits[i]) cc.fillRect(i % 12, Math.floor(i / 12), 1, 1);
    return t.toDataURL();
  };
  for (let r = 0; r < h; r++) {
    if (r % 10 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
    for (let c = 0; c < w; c++) {
      const bits = new Uint8Array(144); let ink = 0, red = 0, green = 0, blue = 0, n = 0;
      for (let y = 2; y < 14; y++) for (let x = 2; x < 14; x++) {
        const i = ((r * cell + y) * out.width + c * cell + x) * 4;
        if (pixels[i] + pixels[i + 1] + pixels[i + 2] < 330) { bits[(y - 2) * 12 + x - 2] = 1; ink++; }
        else { red += pixels[i]; green += pixels[i + 1]; blue += pixels[i + 2]; n++; }
      }
      if (mode === "colors") {
        if (!n) n = 1;
        const rgb: [number, number, number] = [red / n, green / n, blue / n];
        if (rgb.every((v) => v > 243)) continue;
        const key = (Math.round(rgb[0] / 4) << 12) | (Math.round(rgb[1] / 4) << 6) | Math.round(rgb[2] / 4);
        let idx = samples.get(key); if (idx === undefined) { idx = nearestFloss(labOf(rgb)); samples.set(key, idx); }
        cells[r * w + c] = idx; continue;
      }
      if (ink < 3) continue;
      let best = -1, bestDistance = 9;
      for (const group of groups) {
        let d = 0; for (let i = 0; i < bits.length; i++) if (bits[i] !== group.bits[i]) d++;
        if (d < bestDistance) { best = group.id; bestDistance = d; }
      }
      if (best < 0) {
        if (groups.length >= 504) throw new Error("Plus de 504 groupes détectés : vérifiez le cadrage et les dimensions.");
        best = groups.length; groups.push({ id: best, bits, preview: thumbnail(bits), count: 0, code: "" });
      }
      groups[best].count++; cells[r * w + c] = best;
    }
  }
  return { w, h, groups, cells, mode };
}

export function recognizedPattern(result: Recognition, name: string, count: Pattern["count"]): Pattern {
  const p = createPattern(name, result.w, result.h, count, 2);
  for (let i = 0; i < result.cells.length; i++) {
    const v = result.cells[i]; if (v < 0) continue;
    const idx = result.mode === "colors" ? v : flossIndex(result.groups[v].code);
    if (idx >= 0) { p.cross[i] = idx; ensurePalette(p, idx); }
  }
  return p;
}