import { cellHasContent, ensurePalette, ornamentKey, type Knot, type Pattern, type Seg, type Special } from "./pattern";

export type Tool = "hand" | "cross" | "half" | "quarter" | "threeQuarter" | "petite" | "bead" | "back" | "knot" | "long" | "pick" | "fill" | "erase" | "mark" | "details" | "block" | "row" | "park" | "unpick" | "note" | "select" | "lasso" | "move" | "line" | "rect" | "ellipse";

export interface Pt {
  x: number;
  y: number;
}
export interface Node {
  x: number;
  y: number;
}

export interface StrokeCtx {
  tool: Tool;
  color: number;
  lastNode: Node | null;
  fillDone: boolean;
  /** Surligneur : 1 = marquer, 0 = démarquer, -1 = indéterminé (fixé au premier point touché). */
  markMode: -1 | 0 | 1;
  onlyActive?: boolean;
  annotation?: string;
  lookup?: Pattern;
  halfDirection?: "auto" | "forward" | "backward";
}

export type Symmetry = "none" | "x" | "y" | "both";
/** Axe de reflet : horizontal, vertical, ou les deux (le reflet central). */
export type Axis = "x" | "y" | "xy";

/**
 * Outils dont le tracé est reflété par la symétrie.
 *
 * La règle : la symétrie reflète ce qui pose du fil, pas ce qui suit
 * l'avancement. Surligner, cocher un bloc ou une ligne, garer un fil, poser une
 * annotation ou repérer une erreur restent du côté où l'on brode — refléter ces
 * marques ferait mentir le suivi. Les formes (ligne, rectangle, ellipse) et les
 * lancés sont reflétés au moment du relâchement, pas échantillon par
 * échantillon.
 */
export const MIRROR_TOOLS: Tool[] = [
  "cross", "half", "quarter", "threeQuarter", "petite", "bead",
  "erase", "fill", "knot", "back",
];

/** Axes de reflet, dans l'ordre où ils sont appliqués. */
export function symmetryAxes(sym: Symmetry | undefined): Axis[] {
  return sym === "x" ? ["x"] : sym === "y" ? ["y"] : sym === "both" ? ["x", "y", "xy"] : [];
}

/** Reflet d'un point sur un axe, dans une grille de w × h cases. */
export function reflectPoint(p: { w: number; h: number }, q: Pt, axis: Axis): Pt {
  return { x: axis === "y" ? q.x : p.w - q.x, y: axis === "x" ? q.y : p.h - q.y };
}

/** Tous les reflets d'un point, le point lui-même exclu. */
export function mirrorPoints(p: { w: number; h: number }, q: Pt, sym: Symmetry | undefined): Pt[] {
  return symmetryAxes(sym).map((axis) => reflectPoint(p, q, axis));
}

/**
 * Un contexte de tracé par reflet.
 *
 * Les outils à état gardent cet état dans `StrokeCtx` : l'arrière relie le
 * noeud précédent au noeud courant, le noeud français évite les doublons, le
 * remplissage ne passe qu'une fois par trait. Un reflet doit donc avoir le
 * sien, aligné sur le même axe — sinon le second reflet d'une symétrie double
 * repartirait du premier au lieu de son propre point d'origine.
 */
export function mirrorContexts(
  p: { w: number; h: number },
  ctx: StrokeCtx,
  sym: Symmetry | undefined,
): StrokeCtx[] {
  return symmetryAxes(sym).map((axis) => ({
    ...ctx,
    lastNode: ctx.lastNode ? reflectPoint(p, ctx.lastNode, axis) : null,
  }));
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Case sous le point (coin haut-gauche = trou 0). */
export function cellOf(p: Pattern, q: Pt) {
  return { c: clamp(Math.floor(q.x), 0, p.w - 1), r: clamp(Math.floor(q.y), 0, p.h - 1) };
}

/** Trou le plus proche (les arrière, lancés et noeuds se posent sur les trous). */
export function nodeOf(p: Pattern, q: Pt): Node {
  return { x: clamp(Math.round(q.x), 0, p.w), y: clamp(Math.round(q.y), 0, p.h) };
}

/** Échantillonne un tracé pour que le glissement ne saute aucune case. */
export function samplePath(a: Pt, b: Pt, step: number, fn: (q: Pt) => void) {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  const n = Math.max(1, Math.ceil(d / step));
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    fn({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
}

/** Demi-point : le côté touché détermine la diagonale (« / » ou « \ »). */
function dirAt(q: Pt, c: number, r: number): 0 | 1 {
  const fx = q.x - c;
  const fy = q.y - r;
  return Math.abs(fx + fy - 1) < Math.abs(fx - fy) ? 0 : 1;
}

/** Quart de point : quadrant touché. 0 = NW, 1 = NE, 2 = SE, 3 = SW. */
function quadAt(q: Pt, c: number, r: number): 0 | 1 | 2 | 3 {
  const fx = q.x - c;
  const fy = q.y - r;
  return fx < 0.5 ? (fy < 0.5 ? 0 : 3) : fy < 0.5 ? 1 : 2;
}

function paintCross(d: Pattern, i: number, color: number): boolean {
  const clean = d.fwd[i] < 0 && d.bwd[i] < 0 && d.q[0][i] < 0 && d.q[1][i] < 0 && d.q[2][i] < 0 && d.q[3][i] < 0;
  if (d.cross[i] === color && clean) return false;
  d.cross[i] = color;
  d.done[i] = 0;
  d.fwd[i] = -1;
  d.bwd[i] = -1;
  for (let k = 0; k < 4; k++) d.q[k][i] = -1;
  ensurePalette(d, color);
  return true;
}

/** Demi-point : remplace la croix, mais cohabite avec les quarts (trois-quarts de point). */
function paintHalf(d: Pattern, i: number, color: number, dir: 0 | 1): boolean {
  const arr = dir === 0 ? d.fwd : d.bwd;
  if (arr[i] === color && d.cross[i] < 0) return false;
  arr[i] = color;
  d.done[i] = 0;
  d.cross[i] = -1;
  ensurePalette(d, color);
  return true;
}

/** Quart de point : remplace la croix, cohabite avec les demi-points. */
function paintQuarter(d: Pattern, i: number, color: number, quad: 0 | 1 | 2 | 3): boolean {
  if (d.q[quad][i] === color && d.cross[i] < 0) return false;
  d.q[quad][i] = color;
  d.done[i] = 0;
  d.cross[i] = -1;
  ensurePalette(d, color);
  return true;
}

function clearCell(d: Pattern, i: number): boolean {
  const had = cellHasContent(d, i) || d.done[i] === 1;
  if (!had) return false;
  d.cross[i] = -1;
  d.fwd[i] = -1;
  d.bwd[i] = -1;
  for (let k = 0; k < 4; k++) d.q[k][i] = -1;
  d.done[i] = 0;
  d.mistakes = d.mistakes?.filter((v) => v !== i);
  return true;
}

const segDist = (q: Pt, s: Seg) => {
  const dx = s.x2 - s.x1;
  const dy = s.y2 - s.y1;
  const len = dx * dx + dy * dy;
  const t = len ? clamp(((q.x - s.x1) * dx + (q.y - s.y1) * dy) / len, 0, 1) : 0;
  return Math.hypot(q.x - (s.x1 + dx * t), q.y - (s.y1 + dy * t));
};

function eraseNear(d: Pattern, q: Pt, rad = 0.5): boolean {
  const back = d.back.filter((s) => segDist(q, s) > rad);
  const long = d.long.filter((s) => segDist(q, s) > rad);
  const knots: Knot[] = d.knots.filter((k) => Math.hypot(q.x - k.x, q.y - k.y) > rad);
  const special = (d.special ?? []).filter((k) => Math.hypot(q.x - k.x, q.y - k.y) > rad);
  const changed = back.length !== d.back.length || long.length !== d.long.length || knots.length !== d.knots.length || special.length !== (d.special?.length ?? 0);
  if (changed) {
    d.back = back;
    d.long = long;
    d.knots = knots;
    d.special = special;
  }
  return changed;
}

function addBackTo(d: Pattern, a: Node, b: Node, c: number): boolean {
  const same = (s: Seg) =>
    (s.x1 === a.x && s.y1 === a.y && s.x2 === b.x && s.y2 === b.y) ||
    (s.x1 === b.x && s.y1 === b.y && s.x2 === a.x && s.y2 === a.y);
  if (d.back.some((s) => s.c === c && same(s))) return false;
  d.back = [...d.back, { x1: a.x, y1: a.y, x2: b.x, y2: b.y, c }];
  ensurePalette(d, c);
  return true;
}

export function addLongTo(d: Pattern, a: Node, b: Node, c: number): boolean {
  if (a.x === b.x && a.y === b.y) return false;
  const same = (s: Seg) =>
    (s.x1 === a.x && s.y1 === a.y && s.x2 === b.x && s.y2 === b.y) ||
    (s.x1 === b.x && s.y1 === b.y && s.x2 === a.x && s.y2 === a.y);
  if (d.long.some((s) => s.c === c && same(s))) return false;
  d.long = [...d.long, { x1: a.x, y1: a.y, x2: b.x, y2: b.y, c }];
  ensurePalette(d, c);
  return true;
}

/**
 * Un trou ne porte qu'un noeud français : reposer le même ne change rien, une
 * autre couleur remplace la précédente. Sans la première garde, chaque re-tap
 * créait une entrée d'historique pour un motif inchangé.
 */
function addKnotTo(d: Pattern, n: Node, c: number): boolean {
  if (d.knots.some((k) => k.x === n.x && k.y === n.y && k.c === c)) return false;
  d.knots = [...d.knots.filter((k) => !(k.x === n.x && k.y === n.y)), { x: n.x, y: n.y, c }];
  ensurePalette(d, c);
  return true;
}

/** Remplissage par zone contiguë : ne touche que les croix identiques, sans demi ni quarts. */
function fillRegion(d: Pattern, q: Pt, color: number): boolean {
  const { c, r } = cellOf(d, q);
  const { w, h } = d;
  const start = r * w + c;
  const target = d.cross[start];
  if (target === color) return false;
  const free = (i: number) =>
    d.cross[i] === target && d.fwd[i] < 0 && d.bwd[i] < 0 && d.q[0][i] < 0 && d.q[1][i] < 0 && d.q[2][i] < 0 && d.q[3][i] < 0;
  if (!free(start)) return false;
  const seen = new Uint8Array(w * h);
  const stack = [start];
  seen[start] = 1;
  let count = 0;
  while (stack.length) {
    const i = stack.pop() as number;
    d.cross[i] = color;
    count++;
    const x = i % w;
    const y = (i - x) / w;
    const push = (j: number) => {
      if (!seen[j] && free(j)) {
        seen[j] = 1;
        stack.push(j);
      }
    };
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (y > 0) push(i - w);
    if (y < h - 1) push(i + w);
  }
  if (count > 0) ensurePalette(d, color);
  return count > 0;
}

/** Applique un échantillon de tracé au brouillon. Retourne true si le motif a changé. */
export function applySample(d: Pattern, s: StrokeCtx, q: Pt): boolean {
  if (q.x < 0 || q.y < 0 || q.x > d.w || q.y > d.h) return false;
  const marking = (i: number): boolean => {
    const source = s.lookup ?? d;
    if (!cellHasContent(source, i)) return false;
    if (s.onlyActive && ![source.cross[i], source.fwd[i], source.bwd[i], ...source.q.map((v) => v[i])].includes(s.color)) return false;
    if (s.markMode < 0) s.markMode = d.done[i] ? 0 : 1;
    if (d.done[i] === s.markMode) return false;
    d.done[i] = s.markMode;
    if (s.markMode) d.mistakes = d.mistakes?.filter((v) => v !== i);
    return true;
  };
  const markDetail = (kind: string, v: Seg | Knot | Special): boolean => {
    if (s.onlyActive && v.c !== s.color) return false;
    const key = ornamentKey(kind, v), found = (d.ornamentDone ?? []).includes(key);
    if (s.markMode < 0) s.markMode = found ? 0 : 1;
    if (found === !!s.markMode) return false;
    d.ornamentDone = s.markMode ? [...(d.ornamentDone ?? []), key] : d.ornamentDone?.filter((k) => k !== key);
    return true;
  };
  const detailsNear = (): boolean => {
    const p = s.lookup ?? d;
    const candidates = [
      ...p.back.map((v) => ({ kind: "back", v, distance: segDist(q, v) })),
      ...p.long.map((v) => ({ kind: "long", v, distance: segDist(q, v) })),
      ...p.knots.map((v) => ({ kind: "knot", v, distance: Math.hypot(q.x - v.x, q.y - v.y) })),
      ...(p.special ?? []).map((v) => ({ kind: v.kind, v, distance: Math.hypot(q.x - v.x, q.y - v.y) })),
    ].filter((v) => v.distance < .4 && (!s.onlyActive || v.v.c === s.color)).sort((a, b) => a.distance - b.distance);
    return candidates[0] ? markDetail(candidates[0].kind, candidates[0].v) : false;
  };
  switch (s.tool) {
    case "cross": {
      const { c, r } = cellOf(d, q);
      return paintCross(d, r * d.w + c, s.color);
    }
    case "half": {
      const { c, r } = cellOf(d, q);
      const direction = s.halfDirection === "forward" ? 0 : s.halfDirection === "backward" ? 1 : dirAt(q, c, r);
      return paintHalf(d, r * d.w + c, s.color, direction);
    }
    case "quarter": {
      const { c, r } = cellOf(d, q);
      return paintQuarter(d, r * d.w + c, s.color, quadAt(q, c, r));
    }
    case "threeQuarter": {
      const { c, r } = cellOf(d, q), i = r * d.w + c, quad = quadAt(q, c, r);
      const dir = quad === 0 || quad === 2 ? 0 : 1;
      const a = paintHalf(d, i, s.color, dir), b = paintQuarter(d, i, s.color, quad);
      return a || b;
    }
    case "petite":
    case "bead": {
      const { c, r } = cellOf(d, q), quad = quadAt(q, c, r);
      const x = s.tool === "petite" ? c + (quad === 0 || quad === 3 ? .25 : .75) : c + .5;
      const y = s.tool === "petite" ? r + (quad < 2 ? .25 : .75) : r + .5;
      if (d.special?.some((k) => k.x === x && k.y === y && k.kind === s.tool && k.c === s.color)) return false;
      d.special = [...(d.special ?? []).filter((k) => !(k.x === x && k.y === y && k.kind === s.tool)), { x, y, c: s.color, kind: s.tool }];
      ensurePalette(d, s.color); return true;
    }
    case "mark": {
      const { c, r } = cellOf(d, q);
      return cellHasContent(s.lookup ?? d, r * d.w + c) ? marking(r * d.w + c) : detailsNear();
    }
    case "details": return detailsNear();
    case "block":
    case "row": {
      const { c, r } = cellOf(d, q);
      const x0 = s.tool === "block" ? Math.floor(c / 10) * 10 : 0;
      const y0 = s.tool === "block" ? Math.floor(r / 10) * 10 : r;
      const x1 = s.tool === "block" ? Math.min(d.w, x0 + 10) : d.w;
      const y1 = s.tool === "block" ? Math.min(d.h, y0 + 10) : r + 1;
      if (s.markMode < 0) s.markMode = d.done[r * d.w + c] ? 0 : 1;
      let changed = false;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (marking(y * d.w + x)) changed = true;
      const inRegion = (x: number, y: number) => x >= x0 && y >= y0 && x < x1 && y < y1;
      const p = s.lookup ?? d;
      for (const v of p.back) if (inRegion(v.x1, v.y1) && inRegion(v.x2, v.y2)) if (markDetail("back", v)) changed = true;
      for (const v of p.long) if (inRegion(v.x1, v.y1) && inRegion(v.x2, v.y2)) if (markDetail("long", v)) changed = true;
      for (const v of p.knots) if (inRegion(v.x, v.y)) if (markDetail("knot", v)) changed = true;
      for (const v of p.special ?? []) if (inRegion(v.x, v.y)) if (markDetail(v.kind, v)) changed = true;
      return changed;
    }
    case "park": {
      if (s.fillDone) return false; s.fillDone = true;
      const { c, r } = cellOf(d, q), corner = quadAt(q, c, r);
      const old = d.parked ?? [], found = old.some((v) => v.x === c && v.y === r && v.corner === corner && v.c === s.color);
      d.parked = found ? old.filter((v) => !(v.x === c && v.y === r && v.corner === corner && v.c === s.color)) : [...old, { x: c, y: r, corner, c: s.color }];
      return true;
    }
    case "unpick": {
      const { c, r } = cellOf(d, q), i = r * d.w + c;
      if (!cellHasContent(d, i)) return false;
      const found = (d.mistakes ?? []).includes(i);
      if (s.markMode < 0) s.markMode = found ? 0 : 1;
      if (found === !!s.markMode) return false;
      d.mistakes = s.markMode ? [...(d.mistakes ?? []), i] : d.mistakes?.filter((v) => v !== i);
      return true;
    }
    case "note": {
      if (s.fillDone || !s.annotation?.trim()) return false; s.fillDone = true;
      const { c, r } = cellOf(d, q);
      d.annotations = [...(d.annotations ?? []), { x: c, y: r, text: s.annotation.trim().slice(0, 200) }];
      return true;
    }
    case "erase": {
      const { c, r } = cellOf(d, q);
      const a = clearCell(d, r * d.w + c);
      const b = eraseNear(d, q);
      return a || b;
    }
    case "back": {
      const n = nodeOf(d, q);
      const last = s.lastNode;
      if (!last) {
        s.lastNode = n;
        return false;
      }
      if (last.x === n.x && last.y === n.y) return false;
      s.lastNode = n;
      return addBackTo(d, last, n, s.color);
    }
    case "knot": {
      const n = { x: Math.round(q.x * 2) / 2, y: Math.round(q.y * 2) / 2 };
      const last = s.lastNode;
      if (last && last.x === n.x && last.y === n.y) return false;
      s.lastNode = n;
      return addKnotTo(d, n, s.color);
    }
    case "fill": {
      if (s.fillDone) return false;
      s.fillDone = true;
      return fillRegion(d, q, s.color);
    }
    default:
      return false;
  }
}

/**
 * Applique un segment de tracé au brouillon, reflets compris.
 *
 * `mirrors` doit contenir un contexte par axe, dans l'ordre de `symmetryAxes`
 * (voir `mirrorContexts`) : c'est ce qui permet à l'arrière-point et au noeud
 * français d'être reflétés sans que les reflets se marchent dessus.
 *
 * Retourne true si le motif a changé. Le brouillon est muté sur place.
 */
export function applyStrokeSegment(
  d: Pattern,
  ctx: StrokeCtx,
  mirrors: StrokeCtx[],
  from: Pt,
  to: Pt,
  sym: Symmetry | undefined,
  step = 0.2,
): boolean {
  const axes = symmetryAxes(sym);
  let changed = false;
  samplePath(from, to, step, (q) => {
    if (applySample(d, ctx, q)) changed = true;
    for (let k = 0; k < axes.length && k < mirrors.length; k++) {
      if (applySample(d, mirrors[k], reflectPoint(d, q, axes[k]))) changed = true;
    }
  });
  return changed;
}

/** Couleur sous le curseur (croix, puis demi, puis quarts). -1 si vide. */
export function pickAt(p: Pattern, q: Pt): number {
  const { c, r } = cellOf(p, q);
  const i = r * p.w + c;
  if (p.cross[i] >= 0) return p.cross[i];
  if (p.fwd[i] >= 0) return p.fwd[i];
  if (p.bwd[i] >= 0) return p.bwd[i];
  for (let k = 0; k < 4; k++) if (p.q[k][i] >= 0) return p.q[k][i];
  return -1;
}
