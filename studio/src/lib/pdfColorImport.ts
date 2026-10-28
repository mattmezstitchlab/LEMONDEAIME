import { FLOSS, flossIndex, nearestFlossList } from "./dmc";
import { clonePattern, createPattern, ensurePalette, type Pattern } from "./pattern";
import { fitGrid } from "./pdfAnalysis";
import type { VectorResult } from "./pdfVector";

/**
 * Rebuild a real native Pattern from DMC-coded PDF vector cells, not from an
 * RGB quantization of its printed symbols. Coordinates remain absolute across
 * pages; missing cells remain EMPTY instead of being guessed.
 */
export function patternFromVector(result: VectorResult, name: string): Pattern | null {
  if (!result.ok || !result.bounds || !result.cells.size) return null;
  const { minC, minR, maxC, maxR } = result.bounds;
  const W = maxC - minC + 1, H = maxR - minR + 1;
  if (![W, H, minC, minR].every(Number.isSafeInteger) || W < 1 || H < 1 || W > 12000 || H > 12000 || W * H > 8_000_000) return null;
  const cells = new Int16Array(W * H).fill(-1);
  let mapped = 0;
  for (const [key, code] of result.cells) {
    const [x, y] = key.split(",").map(Number);
    const idx = flossIndex(code);
    if (idx < 0 || !Number.isInteger(x) || !Number.isInteger(y) || x < minC || x > maxC || y < minR || y > maxR) continue;
    cells[(y - minR) * W + x - minC] = idx;
    mapped++;
  }
  if (!mapped) return null;
  const fit = fitGrid(cells, W, H);
  const p = createPattern(name || "Patron PDF", fit.w, fit.h);
  p.cross = fit.cells;
  for (const idx of new Set(p.cross)) if (idx >= 0) ensurePalette(p, idx);
  return p;
}

/** Replace DMC colours simultaneously; a transposition A→B, B→A is safe. */
export function remapImportedPalette(p: Pattern, changes: Record<string, string>): Pattern {
  const out = clonePattern(p);
  const replacements = new Map<number, number>();
  for (const [fromCode, toCode] of Object.entries(changes)) {
    const from = flossIndex(fromCode.toUpperCase().trim());
    const to = flossIndex(toCode.toUpperCase().trim());
    if (from >= 0 && to >= 0 && from !== to) replacements.set(from, to);
  }
  if (!replacements.size) return out;
  const apply = (idx: number) => replacements.get(idx) ?? idx;
  for (const arr of [out.cross, out.fwd, out.bwd, ...out.q]) {
    for (let i = 0; i < arr.length; i++) if (arr[i] >= 0) arr[i] = apply(arr[i]);
  }
  out.back = out.back.map(s => ({ ...s, c: apply(s.c) }));
  out.long = out.long.map(s => ({ ...s, c: apply(s.c) }));
  out.knots = out.knots.map(s => ({ ...s, c: apply(s.c) }));
  out.special = out.special?.map(s => ({ ...s, c: apply(s.c) }));
  out.palette = [];
  out.symbolMap = {};
  const used = new Set([...out.cross, ...out.fwd, ...out.bwd, ...out.q.flatMap(arr => Array.from(arr)), ...out.back.map(s => s.c), ...out.long.map(s => s.c), ...out.knots.map(s => s.c), ...(out.special ?? []).map(s => s.c)]);
  for (const idx of used) if (idx >= 0 && FLOSS[idx]) ensurePalette(out, idx);
  return out;
}

export function closestDmcAlternatives(idx: number, count = 4) {
  const floss = FLOSS[idx];
  if (!floss) return [];
  return nearestFlossList(floss.lab, count + 1).filter(item => item.idx !== idx).slice(0, count);
}
