import { clonePattern, compositePattern, createPattern, ensurePalette, fromObject, makeId, toObject, type Pattern, type Seg } from "./pattern";
import { samplePath, type Pt } from "./stitch";

export interface Selection { x: number; y: number; w: number; h: number; polygon?: Pt[] }
const inside = (x: number, y: number, s: Selection): boolean => {
  if (x < s.x || y < s.y || x >= s.x + s.w || y >= s.y + s.h) return false;
  if (!s.polygon?.length) return true;
  let yes = false;
  for (let i = 0, j = s.polygon.length - 1; i < s.polygon.length; j = i++) {
    const a = s.polygon[i], b = s.polygon[j];
    if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) yes = !yes;
  }
  return yes;
};

export function boundedSelection(p: Pattern, a: Pt, b: Pt, polygon?: Pt[]): Selection {
  const x = Math.max(0, Math.min(p.w - 1, Math.floor(Math.min(a.x, b.x))));
  const y = Math.max(0, Math.min(p.h - 1, Math.floor(Math.min(a.y, b.y))));
  return { x, y, w: Math.max(1, Math.min(p.w - x, Math.ceil(Math.max(a.x, b.x)) - x)), h: Math.max(1, Math.min(p.h - y, Math.ceil(Math.max(a.y, b.y)) - y)), polygon };
}

export function clearSelection(p: Pattern, s: Selection): Pattern {
  const d = clonePattern(p);
  for (let y = s.y; y < s.y + s.h; y++) for (let x = s.x; x < s.x + s.w; x++) {
    if (!inside(x + .5, y + .5, s)) continue;
    const i = y * d.w + x;
    d.cross[i] = d.fwd[i] = d.bwd[i] = -1;
    d.q.forEach((q) => { q[i] = -1; }); d.done[i] = 0;
  }
  const keep = (v: Seg) => !(inside(v.x1, v.y1, s) && inside(v.x2, v.y2, s));
  d.back = d.back.filter(keep); d.long = d.long.filter(keep);
  d.knots = d.knots.filter((k) => !inside(k.x, k.y, s));
  d.special = d.special?.filter((k) => !inside(k.x, k.y, s));
  return d;
}

export function extractSelection(p: Pattern, s: Selection): Pattern {
  const out = createPattern("Sélection", s.w, s.h, p.count, p.strands);
  out.palette = p.palette.slice(); out.symbolMap = { ...p.symbolMap };
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
    if (!inside(x + s.x + .5, y + s.y + .5, s)) continue;
    const i = (y + s.y) * p.w + x + s.x, j = y * s.w + x;
    out.cross[j] = p.cross[i]; out.fwd[j] = p.fwd[i]; out.bwd[j] = p.bwd[i];
    out.q.forEach((q, k) => { q[j] = p.q[k][i]; }); out.done[j] = p.done[i];
  }
  const segments = (list: Seg[]) => list.filter((v) => inside(v.x1, v.y1, s) && inside(v.x2, v.y2, s)).map((v) => ({ ...v, x1: v.x1 - s.x, y1: v.y1 - s.y, x2: v.x2 - s.x, y2: v.y2 - s.y }));
  out.back = segments(p.back); out.long = segments(p.long);
  out.knots = p.knots.filter((k) => inside(k.x, k.y, s)).map((k) => ({ ...k, x: k.x - s.x, y: k.y - s.y }));
  out.special = p.special?.filter((k) => inside(k.x, k.y, s)).map((k) => ({ ...k, x: k.x - s.x, y: k.y - s.y }));
  return out;
}

export function pasteSelection(p: Pattern, part: Pattern, x0: number, y0: number): Pattern {
  const d = clonePattern(p);
  for (let y = 0; y < part.h; y++) for (let x = 0; x < part.w; x++) {
    const xx = x0 + x, yy = y0 + y;
    if (xx < 0 || xx >= p.w || yy < 0 || yy >= p.h) continue;
    const a = y * part.w + x, b = yy * p.w + xx;
    if (part.cross[a] >= 0) d.cross[b] = part.cross[a];
    if (part.fwd[a] >= 0) d.fwd[b] = part.fwd[a];
    if (part.bwd[a] >= 0) d.bwd[b] = part.bwd[a];
    for (let k = 0; k < 4; k++) if (part.q[k][a] >= 0) d.q[k][b] = part.q[k][a];
    if (part.done[a]) d.done[b] = 1;
  }
  part.palette.forEach((c) => ensurePalette(d, c));
  const segs = (arr: Seg[]) => arr.map((s) => ({ ...s, x1: s.x1 + x0, x2: s.x2 + x0, y1: s.y1 + y0, y2: s.y2 + y0 })).filter((s) => s.x1 >= 0 && s.x2 >= 0 && s.y1 >= 0 && s.y2 >= 0 && s.x1 <= p.w && s.x2 <= p.w && s.y1 <= p.h && s.y2 <= p.h);
  d.back.push(...segs(part.back)); d.long.push(...segs(part.long));
  d.knots.push(...part.knots.map((k) => ({ ...k, x: k.x + x0, y: k.y + y0 })).filter((k) => k.x >= 0 && k.y >= 0 && k.x <= p.w && k.y <= p.h));
  d.special = [...(d.special ?? []), ...(part.special ?? []).map((k) => ({ ...k, x: k.x + x0, y: k.y + y0 }))];
  return d;
}

export function transformPart(p: Pattern, op: "rotate" | "flipX" | "flipY"): Pattern {
  const rot = op === "rotate", w = rot ? p.h : p.w, h = rot ? p.w : p.h;
  const d = createPattern(p.name, w, h, p.count, p.strands);
  d.palette = p.palette.slice(); d.symbolMap = { ...p.symbolMap };
  const point = (x: number, y: number) => rot ? { x: p.h - y, y: x } : op === "flipX" ? { x: p.w - x, y } : { x, y: p.h - y };
  const qmap = rot ? [1, 2, 3, 0] : op === "flipX" ? [1, 0, 3, 2] : [3, 2, 1, 0];
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    const q = point(x + .5, y + .5), i = y * p.w + x, j = Math.floor(q.y) * w + Math.floor(q.x);
    d.cross[j] = p.cross[i]; d.fwd[j] = p.bwd[i]; d.bwd[j] = p.fwd[i]; d.done[j] = p.done[i];
    for (let k = 0; k < 4; k++) d.q[qmap[k]][j] = p.q[k][i];
  }
  const segs = (arr: Seg[]) => arr.map((s) => { const a = point(s.x1, s.y1), b = point(s.x2, s.y2); return { ...s, x1: a.x, y1: a.y, x2: b.x, y2: b.y }; });
  d.back = segs(p.back); d.long = segs(p.long);
  d.knots = p.knots.map((k) => ({ ...k, ...point(k.x, k.y) }));
  d.special = p.special?.map((k) => ({ ...k, ...point(k.x, k.y) }));
  return d;
}

export function replaceColor(p: Pattern, from: number, to: number): Pattern {
  const d = clonePattern(p);
  for (const arr of [d.cross, d.fwd, d.bwd, ...d.q]) for (let i = 0; i < arr.length; i++) if (arr[i] === from) arr[i] = to;
  d.back = d.back.map((s) => ({ ...s, c: s.c === from ? to : s.c })); d.long = d.long.map((s) => ({ ...s, c: s.c === from ? to : s.c }));
  d.knots = d.knots.map((s) => ({ ...s, c: s.c === from ? to : s.c }));
  d.special = d.special?.map((s) => ({ ...s, c: s.c === from ? to : s.c }));
  ensurePalette(d, to); return d;
}

export function resizePattern(p: Pattern, w: number, h: number, center = true): Pattern {
  p = compositePattern(p);
  const base = createPattern(p.name, Math.max(1, Math.min(1000, w)), Math.max(1, Math.min(1000, h)), p.count, p.strands);
  const dx = center ? Math.floor((w - p.w) / 2) : 0, dy = center ? Math.floor((h - p.h) / 2) : 0;
  const d = pasteSelection(base, p, dx, dy);
  return { ...p, ...d, id: p.id, fabric: p.fabric, provenance: p.provenance, notes: p.notes, supplies: p.supplies, layers: [], mistakes: [], parked: [] };
}

export function drawShape(p: Pattern, type: "line" | "rect" | "ellipse", a: Pt, b: Pt, color: number): Pattern {
  const d = clonePattern(p);
  const put = (v: Pt) => {
    const x = Math.floor(v.x), y = Math.floor(v.y);
    if (x < 0 || y < 0 || x >= d.w || y >= d.h) return;
    const i = y * d.w + x; d.cross[i] = color; d.fwd[i] = d.bwd[i] = -1; d.q.forEach((q) => { q[i] = -1; });
  };
  if (type === "line") { put(a); samplePath(a, b, .2, put); }
  else if (type === "rect") {
    const lo = { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y) }, hi = { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y) };
    samplePath(lo, { x: hi.x, y: lo.y }, .2, put); samplePath({ x: hi.x, y: lo.y }, hi, .2, put);
    samplePath(hi, { x: lo.x, y: hi.y }, .2, put); samplePath({ x: lo.x, y: hi.y }, lo, .2, put);
  } else {
    const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, rx = Math.abs(a.x - b.x) / 2, ry = Math.abs(a.y - b.y) / 2;
    const n = Math.max(12, Math.ceil(Math.PI * (rx + ry) * 6));
    for (let k = 0; k <= n; k++) { const t = k / n * Math.PI * 2; put({ x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) }); }
  }
  ensurePalette(d, color); return d;
}

const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"], B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"], D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"], F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01111", "10000", "10000", "10111", "10001", "10001", "01111"], H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["111", "010", "010", "010", "010", "010", "111"], J: ["00111", "00010", "00010", "00010", "10010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"], L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10001", "10001", "10001", "10001"], N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"], P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"], R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"], T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"], V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10001", "10101", "11011", "10001"], X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"], Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"], "1": ["010", "110", "010", "010", "010", "010", "111"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"], "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["10010", "10010", "10010", "11111", "00010", "00010", "00010"], "5": ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"], "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"], "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  "!": ["1", "1", "1", "1", "1", "0", "1"], ".": ["0", "0", "0", "0", "0", "0", "1"], "-": ["000", "000", "000", "111", "000", "000", "000"],
};
export function stampText(p: Pattern, text: string, x: number, y: number, color: number, scale = 1): Pattern {
  const d = clonePattern(p); let cx = x;
  for (const ch of text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()) {
    const glyph = FONT[ch]; if (!glyph) { cx += 4 * scale; continue; }
    glyph.forEach((line, yy) => [...line].forEach((v, xx) => {
      if (v !== "1") return;
      for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
        const px = cx + xx * scale + sx, py = y + yy * scale + sy;
        if (px >= 0 && py >= 0 && px < d.w && py < d.h) d.cross[py * d.w + px] = color;
      }
    })); cx += (glyph[0].length + 1) * scale;
  }
  ensurePalette(d, color); return d;
}

export function switchLayer(p: Pattern, id: string): Pattern {
  const layers = p.layers?.map((l) => l.id === p.activeLayer ? { ...l, snapshot: JSON.stringify(toObject({ ...p, layers: [], activeLayer: undefined })) } : l) ?? [];
  const target = layers.find((l) => l.id === id); if (!target) return p;
  const loaded = target.snapshot ? fromObject(JSON.parse(target.snapshot)) : createPattern(p.name, p.w, p.h, p.count, p.strands);
  if (!loaded) return p;
  return { ...p, cross: loaded.cross, fwd: loaded.fwd, bwd: loaded.bwd, q: loaded.q, back: loaded.back, long: loaded.long, knots: loaded.knots, special: loaded.special, activeLayer: id, layers };
}

export function addLayer(p: Pattern): Pattern {
  const id = makeId();
  let d = clonePattern(p);
  if (!d.layers?.length) { const first = makeId(); d.layers = [{ id: first, name: "Motif", visible: true, locked: false, snapshot: null }]; d.activeLayer = first; }
  d.layers!.push({ id, name: `Calque ${d.layers!.length + 1}`, visible: true, locked: false, snapshot: null });
  return switchLayer(d, id);
}