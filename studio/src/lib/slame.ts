import { FLOSS, flossIndex } from "./dmc";
import { compositePattern, createPattern, ensurePalette, type Pattern } from "./pattern";

export type Point = { x: number; y: number };
export type ScaleName = "pentatonic" | "major" | "minor" | "dorian";
export type StitchKind = "cross" | "half" | "quarter" | "back" | "long" | "knot" | "silence";
export type ExpressionMood = "tender" | "joy" | "calm" | "sad";
export type MusicStep = {
  x: number; y: number; code: string | null; hex: string;
  kind: StitchKind; midi: number | null; velocity: number; duration: number;
};

const MODES: Record<ScaleName, number[]> = {
  pentatonic: [0, 2, 4, 7, 9],
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
};
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export function validPoint(p: Pattern, pt: Point): boolean {
  return Number.isInteger(pt.x) && Number.isInteger(pt.y) &&
    pt.x >= 0 && pt.y >= 0 && pt.x < p.w && pt.y < p.h;
}
export function rasterLine(a: Point, b: Point): Point[] {
  const points: Point[] = [];
  let x = a.x, y = a.y;
  const dx = Math.abs(b.x - x), dy = Math.abs(b.y - y);
  const sx = x < b.x ? 1 : -1, sy = y < b.y ? 1 : -1;
  let err = dx - dy;
  for (let k = 0; k <= dx + dy + 1; k++) {
    points.push({ x, y });
    if (x === b.x && y === b.y) break;
    const e = err * 2;
    if (e > -dy) { err -= dy; x += sx; }
    if (e < dx) { err += dx; y += sy; }
  }
  return points;
}
/** A -> B -> C ... ; les retours sur une case sont volontairement préservés. */
export function appendWaypoint(trail: Point[], next: Point): Point[] {
  if (!trail.length) return [next];
  const segment = rasterLine(trail[trail.length - 1], next);
  return trail.concat(segment.slice(1));
}
const distanceToSegment = (p: Point, x1: number, y1: number, x2: number, y2: number) => {
  const vx = x2 - x1, vy = y2 - y1, len2 = vx * vx + vy * vy;
  const t = len2 ? clamp(((p.x - x1) * vx + (p.y - y1) * vy) / len2, 0, 1) : 0;
  return Math.hypot(p.x - x1 - t * vx, p.y - y1 - t * vy);
};
export function stitchAt(p: Pattern, pt: Point): { idx: number; kind: StitchKind } | null {
  if (!validPoint(p, pt)) return null;
  const i = pt.y * p.w + pt.x;
  const base: [number, StitchKind][] = [
    [p.cross[i], "cross"], [p.fwd[i], "half"], [p.bwd[i], "half"],
    ...p.q.map(q => [q[i], "quarter"] as [number, StitchKind]),
  ];
  for (const [idx, kind] of base) if (idx >= 0 && FLOSS[idx]) return { idx, kind };
  for (const s of p.special ?? []) if (s.x === pt.x && s.y === pt.y && FLOSS[s.c]) return { idx: s.c, kind: "knot" };
  for (const k of p.knots) if (Math.abs(k.x - pt.x - .5) < .6 && Math.abs(k.y - pt.y - .5) < .6 && FLOSS[k.c]) return { idx: k.c, kind: "knot" };
  for (const [segments, kind] of [[p.back, "back"], [p.long, "long"]] as const) {
    for (const s of segments) {
      if (FLOSS[s.c] && distanceToSegment({ x: pt.x + .5, y: pt.y + .5 }, s.x1, s.y1, s.x2, s.y2) <= .47)
        return { idx: s.c, kind };
    }
  }
  return null;
}
const rgbHue = ([r, g, b]: number[]): number => {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return 0;
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};
/** Convention musicale AIME explicite : ce n'est pas une propriété physique de la couleur DMC. */
export function dmcToMidi(idx: number, scale: ScaleName, mood: ExpressionMood): number {
  const floss = FLOSS[idx];
  if (!floss) return 60;
  const [r, g, b] = floss.rgb;
  const hue = rgbHue([r, g, b]);
  const steps = MODES[scale];
  const degree = Math.min(steps.length - 1, Math.floor(hue / 360 * steps.length));
  const luminance = .2126 * r + .7152 * g + .0722 * b;
  const octave = luminance > 190 ? 12 : luminance < 75 ? -12 : 0;
  const tonic = mood === "sad" ? 57 : mood === "joy" ? 60 : mood === "calm" ? 55 : 60;
  return tonic + octave + steps[degree];
}
export function stepsForTrail(p: Pattern, trail: Point[], scale: ScaleName, mood: ExpressionMood): MusicStep[] {
  return trail.filter(pt => validPoint(p, pt)).map(pt => {
    const hit = stitchAt(p, pt);
    if (!hit) return { ...pt, code: null, hex: "#222731", kind: "silence", midi: null, velocity: 0, duration: 1 };
    const floss = FLOSS[hit.idx];
    const duration = hit.kind === "long" || hit.kind === "back" ? 1.25 : hit.kind === "knot" ? .3 : hit.kind === "half" ? .5 : hit.kind === "quarter" ? .25 : 1;
    return { ...pt, code: floss.code, hex: floss.hex, kind: hit.kind, midi: dmcToMidi(hit.idx, scale, mood), velocity: hit.kind === "knot" ? .85 : .43, duration };
  });
}
/** Lit le vrai motif comme une partition dans l'ordre des rangées alternées. */
export function motifTrail(p: Pattern, limit = 512): Point[] {
  const composite = compositePattern(p);
  const out: Point[] = [];
  for (let y = 0; y < composite.h && out.length < limit; y++) {
    for (let k = 0; k < composite.w && out.length < limit; k++) {
      const x = y % 2 ? composite.w - 1 - k : k;
      if (stitchAt(composite, { x, y })) out.push({ x, y });
    }
  }
  return out;
}
export function makeMusicDemo(): Pattern {
  const p = createPattern("MUSICBOX — motif de démonstration", 16, 16);
  const codes = ["321", "742", "3846", "368", "550", "798", "444"];
  const colors = codes.map(code => {
    const index = flossIndex(code);
    if (index >= 0) ensurePalette(p, index);
    return index;
  });
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    const cx = x - 7.5, cy = y - 7.5;
    const ring = Math.hypot(cx, cy);
    if ((ring > 3 && ring < 7.2) || (Math.abs(cx) < 2 && Math.abs(cy) < 2)) {
      const index = colors[(Math.floor((Math.atan2(cy, cx) + Math.PI) / (2 * Math.PI) * colors.length) + colors.length) % colors.length];
      if (index >= 0) p.cross[y * p.w + x] = index;
    }
  }
  p.back.push({ x1: 1, y1: 1, x2: 15, y2: 15, c: colors[0] });
  p.knots.push({ x: 8, y: 8, c: colors[2] });
  p.provenance = { kind: "demo", source: "SLÂME", author: "", license: "Motif d'exemple", personalOnly: false };
  return p;
}
