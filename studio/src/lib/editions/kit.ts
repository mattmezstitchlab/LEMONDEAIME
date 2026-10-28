/**
 * Kit de dessin des patrons Point Zéro · Éditions.
 *
 * Une toile = une grille de codes DMC (ou vide = tissu non brodé).
 * Les formes sont des prédicats échantillonnés au centre de chaque case ;
 * les « peintures » sont un code DMC ou une fonction (x, y) → code.
 * Tout est déterministe : même identifiant, même patron, case pour case.
 */
export type Code = string;
export type Shape = (x: number, y: number) => boolean;
export type Paint = Code | ((x: number, y: number) => Code | null);

export class Toile {
  readonly cells: (Code | null)[];
  constructor(readonly w: number, readonly h: number) {
    this.cells = new Array(w * h).fill(null);
  }
  get(x: number, y: number): Code | null {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    return this.cells[y * this.w + x];
  }
  set(x: number, y: number, c: Code | null) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.cells[y * this.w + x] = c;
  }
  /** Remplit toutes les cases dont le centre est dans la forme. */
  fill(shape: Shape, paint: Paint) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const cx = x + .5, cy = y + .5;
      if (!shape(cx, cy)) continue;
      const c = typeof paint === "string" ? paint : paint(cx, cy);
      if (c !== null) this.cells[y * this.w + x] = c;
    }
  }
  /** Contour intérieur d'une forme (cases dans la forme touchant l'extérieur). */
  outline(shape: Shape, code: Code, diagonal = false) {
    const inside = (x: number, y: number) => shape(x + .5, y + .5);
    const n4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const n8 = [...n4, [1, 1], [1, -1], [-1, 1], [-1, -1]];
    const marks: number[] = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (!inside(x, y)) continue;
      if ((diagonal ? n8 : n4).some(([dx, dy]) => !inside(x + dx, y + dy))) marks.push(y * this.w + x);
    }
    for (const i of marks) this.cells[i] = code;
  }
  /** Remplace un code par un autre dans une zone (ou partout). */
  recolor(from: Code, to: Code, where: Shape = () => true) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++)
      if (this.cells[y * this.w + x] === from && where(x + .5, y + .5)) this.cells[y * this.w + x] = to;
  }
  /** Efface (rend au tissu). */
  clear(shape: Shape) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (shape(x + .5, y + .5)) this.cells[y * this.w + x] = null;
  }
  /** Pose un bitmap (lignes de caractères, « # » = case brodée). */
  stamp(rows: string[], x0: number, y0: number, paint: Paint, scale = 1) {
    rows.forEach((row, ry) => [...row].forEach((ch, rx) => {
      if (ch === " " || ch === ".") return;
      for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
        const x = x0 + rx * scale + sx, y = y0 + ry * scale + sy;
        const c = typeof paint === "string" ? paint : paint(x + .5, y + .5);
        if (c !== null) this.set(x, y, c);
      }
    }));
  }
  /** Retire les cases isolées (« confettis ») d'une couleur donnée ou de toutes. */
  tidy(minNeighbours = 1) {
    const copy = this.cells.slice();
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const c = copy[y * this.w + x];
      if (c === null) continue;
      let same = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < this.w && yy < this.h && copy[yy * this.w + xx] === c) same++;
      }
      if (same < minNeighbours) {
        // adopte la couleur voisine majoritaire, ou le tissu
        const counts = new Map<Code | null, number>();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const xx = x + dx, yy = y + dy;
          const v = xx >= 0 && yy >= 0 && xx < this.w && yy < this.h ? copy[yy * this.w + xx] : null;
          counts.set(v, (counts.get(v) ?? 0) + 1);
        }
        let best: Code | null = null, n = -1;
        for (const [k, v] of counts) if (v > n) { best = k; n = v; }
        this.cells[y * this.w + x] = best;
      }
    }
  }
  codes(): Code[] { return [...new Set(this.cells.filter((c): c is Code => c !== null))]; }
}

/* ── Formes ─────────────────────────────────────────────── */
export const circle = (cx: number, cy: number, r: number): Shape => (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
export const ellipse = (cx: number, cy: number, rx: number, ry: number, rot = 0): Shape => {
  const c = Math.cos(rot), s = Math.sin(rot);
  return (x, y) => { const dx = x - cx, dy = y - cy; const u = dx * c + dy * s, v = -dx * s + dy * c; return (u / rx) ** 2 + (v / ry) ** 2 <= 1; };
};
export const rect = (x0: number, y0: number, w: number, h: number, r = 0): Shape => (x, y) => {
  if (x < x0 || y < y0 || x > x0 + w || y > y0 + h) return false;
  if (r <= 0) return true;
  const qx = Math.max(x0 + r - x, 0, x - (x0 + w - r)), qy = Math.max(y0 + r - y, 0, y - (y0 + h - r));
  return qx * qx + qy * qy <= r * r;
};
export const poly = (pts: [number, number][]): Shape => (x, y) => {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[j];
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside;
};
export const ring = (cx: number, cy: number, r1: number, r2: number): Shape => (x, y) => { const d = (x - cx) ** 2 + (y - cy) ** 2; return d <= r2 * r2 && d >= r1 * r1; };
const segDist = (x: number, y: number, ax: number, ay: number, bx: number, by: number) => {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
  const t = l === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l));
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
};
/** Trait épais entre deux points. */
export const line = (ax: number, ay: number, bx: number, by: number, width = 1): Shape => (x, y) => segDist(x, y, ax, ay, bx, by) <= width / 2;
/** Trait épais suivant une polyligne. */
export const path = (pts: [number, number][], width = 1): Shape => (x, y) => {
  for (let i = 1; i < pts.length; i++) if (segDist(x, y, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]) <= width / 2) return true;
  return false;
};
/** Points d'une courbe de Bézier cubique. */
export const bezier = (p0: [number, number], p1: [number, number], p2: [number, number], p3: [number, number], n = 40): [number, number][] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, u = 1 - t;
    return [u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0], u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1]];
  });
export const star = (cx: number, cy: number, R: number, r: number, n = 5, rot = -Math.PI / 2): Shape =>
  poly(Array.from({ length: n * 2 }, (_, i) => { const a = rot + i * Math.PI / n, d = i % 2 ? r : R; return [cx + Math.cos(a) * d, cy + Math.sin(a) * d] as [number, number]; }));
export const heart = (cx: number, cy: number, s: number): Shape => (x, y) => {
  const X = (x - cx) / s, Y = (cy - y) / s + .25;
  return (X * X + Y * Y - 1) ** 3 - X * X * Y ** 3 <= 0;
};
/** Croissant : disque moins disque décalé. */
export const crescent = (cx: number, cy: number, r: number, ox: number, oy: number, r2 = r): Shape => diff(circle(cx, cy, r), circle(cx + ox, cy + oy, r2));
export const union = (...s: Shape[]): Shape => (x, y) => s.some(f => f(x, y));
export const diff = (a: Shape, ...b: Shape[]): Shape => (x, y) => a(x, y) && !b.some(f => f(x, y));
export const inter = (...s: Shape[]): Shape => (x, y) => s.every(f => f(x, y));
export const mirrorX = (s: Shape, axis: number): Shape => (x, y) => s(x, y) || s(2 * axis - x, y);
export const shift = (s: Shape, dx: number, dy: number): Shape => (x, y) => s(x - dx, y - dy);

/* ── Peintures ──────────────────────────────────────────── */
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
/** Choisit dans une rampe (du clair au foncé) selon t ∈ [0,1], avec tramage ordonné doux. */
export function pickRamp(ramp: Code[], t: number, x: number, y: number, dither = true): Code {
  const v = Math.max(0, Math.min(.9999, t)) * ramp.length;
  if (!dither) return ramp[Math.floor(v)];
  const i = Math.floor(v), f = v - i;
  const th = (BAYER[Math.floor(y) & 3][Math.floor(x) & 3] + .5) / 16;
  // tramage seulement dans une bande étroite autour des transitions, pour éviter les confettis
  const edge = f > .78 && i < ramp.length - 1 && th < (f - .78) / .22 * .6;
  return ramp[edge ? i + 1 : i];
}
/** Volume sphérique : lumière venant d'en haut à gauche. ramp du clair au foncé. */
export const lit = (cx: number, cy: number, r: number, ramp: Code[], lx = -.55, ly = -.65, bias = 0): Paint => (x, y) => {
  const nx = (x - cx) / r, ny = (y - cy) / r;
  const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
  const L = Math.hypot(lx, ly, .6);
  const d = (nx * lx + ny * ly + nz * .6) / L; // -1..1
  return pickRamp(ramp, (1 - d) / 1.6 + bias, x, y);
};
/** Dégradé linéaire entre deux points. */
export const grad = (ax: number, ay: number, bx: number, by: number, ramp: Code[], dither = true): Paint => (x, y) => {
  const dx = bx - ax, dy = by - ay;
  const t = ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy);
  return pickRamp(ramp, t, x, y, dither);
};
/** Rayures. */
export const stripes = (period: number, codes: Code[], angle = 0, offset = 0): Paint => (x, y) => {
  const u = x * Math.cos(angle) + y * Math.sin(angle) + offset;
  return codes[Math.floor(((u % (period * codes.length)) + period * codes.length) % (period * codes.length) / period)];
};
/** Damier. */
export const checker = (size: number, a: Code, b: Code): Paint => (x, y) => (Math.floor(x / size) + Math.floor(y / size)) % 2 ? b : a;
/** Bruit déterministe (hachage), pour des textures douces. */
export const hash = (x: number, y: number, seed = 1) => {
  let h = Math.floor(x) * 374761393 + Math.floor(y) * 668265263 + seed * 2147483647;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

/* ── Polices bitmap originales ──────────────────────────── */
/** Capitales 5×7 dessinées pour Point Zéro (abécédaires, dates). */
export const FONT5: Record<string, string[]> = {
  A: [" ### ", "#   #", "#   #", "#####", "#   #", "#   #", "#   #"],
  B: ["#### ", "#   #", "#   #", "#### ", "#   #", "#   #", "#### "],
  C: [" ####", "#    ", "#    ", "#    ", "#    ", "#    ", " ####"],
  D: ["#### ", "#   #", "#   #", "#   #", "#   #", "#   #", "#### "],
  E: ["#####", "#    ", "#    ", "#### ", "#    ", "#    ", "#####"],
  F: ["#####", "#    ", "#    ", "#### ", "#    ", "#    ", "#    "],
  G: [" ####", "#    ", "#    ", "#  ##", "#   #", "#   #", " ### "],
  H: ["#   #", "#   #", "#   #", "#####", "#   #", "#   #", "#   #"],
  I: ["#####", "  #  ", "  #  ", "  #  ", "  #  ", "  #  ", "#####"],
  J: ["  ###", "    #", "    #", "    #", "    #", "#   #", " ### "],
  K: ["#   #", "#  # ", "# #  ", "##   ", "# #  ", "#  # ", "#   #"],
  L: ["#    ", "#    ", "#    ", "#    ", "#    ", "#    ", "#####"],
  M: ["#   #", "## ##", "# # #", "# # #", "#   #", "#   #", "#   #"],
  N: ["#   #", "##  #", "# # #", "#  ##", "#   #", "#   #", "#   #"],
  O: [" ### ", "#   #", "#   #", "#   #", "#   #", "#   #", " ### "],
  P: ["#### ", "#   #", "#   #", "#### ", "#    ", "#    ", "#    "],
  Q: [" ### ", "#   #", "#   #", "#   #", "# # #", "#  # ", " ## #"],
  R: ["#### ", "#   #", "#   #", "#### ", "# #  ", "#  # ", "#   #"],
  S: [" ####", "#    ", "#    ", " ### ", "    #", "    #", "#### "],
  T: ["#####", "  #  ", "  #  ", "  #  ", "  #  ", "  #  ", "  #  "],
  U: ["#   #", "#   #", "#   #", "#   #", "#   #", "#   #", " ### "],
  V: ["#   #", "#   #", "#   #", "#   #", "#   #", " # # ", "  #  "],
  W: ["#   #", "#   #", "#   #", "# # #", "# # #", "## ##", "#   #"],
  X: ["#   #", "#   #", " # # ", "  #  ", " # # ", "#   #", "#   #"],
  Y: ["#   #", "#   #", " # # ", "  #  ", "  #  ", "  #  ", "  #  "],
  Z: ["#####", "    #", "   # ", "  #  ", " #   ", "#    ", "#####"],
  "0": [" ### ", "#   #", "#  ##", "# # #", "##  #", "#   #", " ### "],
  "1": ["  #  ", " ##  ", "  #  ", "  #  ", "  #  ", "  #  ", " ### "],
  "2": [" ### ", "#   #", "    #", "   # ", "  #  ", " #   ", "#####"],
  "3": ["#### ", "    #", "    #", " ### ", "    #", "    #", "#### "],
  "4": ["   # ", "  ## ", " # # ", "#  # ", "#####", "   # ", "   # "],
  "5": ["#####", "#    ", "#### ", "    #", "    #", "#   #", " ### "],
  "6": [" ### ", "#    ", "#    ", "#### ", "#   #", "#   #", " ### "],
  "7": ["#####", "    #", "   # ", "  #  ", "  #  ", "  #  ", "  #  "],
  "8": [" ### ", "#   #", "#   #", " ### ", "#   #", "#   #", " ### "],
  "9": [" ### ", "#   #", "#   #", " ####", "    #", "    #", " ### "],
  "·": ["     ", "     ", "     ", "  #  ", "     ", "     ", "     "],
  "&": [" ##  ", "#  # ", "#  # ", " ##  ", "# # #", "#  # ", " ## #"],
  " ": ["     ", "     ", "     ", "     ", "     ", "     ", "     "],
};
/** Écrit un texte en police 5×7 ; renvoie la largeur occupée. */
export function text(t: Toile, s: string, x0: number, y0: number, paint: Paint, scale = 1, gap = 1): number {
  let x = x0;
  for (const ch of s.toUpperCase()) {
    const g = FONT5[ch] ?? FONT5[" "];
    t.stamp(g, x, y0, paint, scale);
    x += (5 + gap) * scale;
  }
  return x - x0 - gap * scale;
}
export const textWidth = (s: string, scale = 1, gap = 1) => s.length * (5 + gap) * scale - gap * scale;
