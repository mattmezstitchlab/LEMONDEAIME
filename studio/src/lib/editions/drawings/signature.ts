import { Toile, bezier, circle, diff, ellipse, grad, hash, inter, line, path, poly, rect, ring, star, stripes, union, type Code, type Shape } from "../kit";

/** Rond noir — 90 × 100. Le plein, travaillé en reflets. */
export function rondNoir(t: Toile) {
  const cx = 45, cy = 46, R = 34;
  t.fill(ellipse(cx + 3, cy + R + 6, 28, 3.2), "3072");
  t.fill(ellipse(cx + 3, cy + R + 6, 18, 2), "648");
  t.fill(circle(cx, cy, R), "310");
  // reflets concentriques très sombres
  t.fill(inter(ring(cx, cy, R - 7, R - 5.6), (x, y) => x - cx + (y - cy) < -10), "3799");
  t.fill(inter(ring(cx, cy, R - 3, R - 1.8), (x, y) => x - cx + (y - cy) < -22), "413");
  t.fill(inter(ring(cx, cy, R - 12, R - 10.8), (x, y) => x - cx + (y - cy) < 0 && y < cy), "3799");
  t.fill(ellipse(cx - 15, cy - 16, 5, 2.4, -.8), "317");
  t.fill(ellipse(cx - 16, cy - 17, 2.2, 1, -.8), "318");
  // la signature : un seul point rouge
  t.fill(circle(cx + 30, cy - 31, 2.2), "321");
  t.fill(line(14, 92, 76, 92, 1), (x) => (Math.floor(x) % 4 === 0 ? "413" : null));
}

/** Architecture du silence — 110 × 112. Arches successives en perspective. */
export function architectureDuSilence(t: Toile) {
  const cx = 55;
  const STONE: Code[] = ["3865", "3866", "822", "644", "642", "3782"];
  // fond : lumière au bout de la perspective
  t.fill(rect(4, 4, 102, 104), grad(cx, 30, cx, 108, ["3865", "3866", "822"]));
  // sol en damier convergent
  const horizon = 56;
  t.fill(poly([[4, 108], [106, 108], [cx + 9, horizon + 18], [cx - 9, horizon + 18]]), (x, y) => {
    const d = (y - (horizon + 18)) / (108 - (horizon + 18));
    const u = (x - cx) / (9 + d * 42);
    const v = Math.log(1 + d * 8) * 3;
    return (Math.floor(u * 3 + 10) + Math.floor(v)) % 2 ? "644" : "3866";
  });
  // arches : de la plus lointaine à la plus proche
  const arches = [
    { w: 18, h: 34, top: horizon - 18, thick: 4, tone: 2 },
    { w: 34, h: 56, top: horizon - 32, thick: 6, tone: 3 },
    { w: 56, h: 82, top: horizon - 46, thick: 8, tone: 4 },
    { w: 86, h: 104, top: 4, thick: 10, tone: 5 },
  ];
  for (const a of arches.slice().reverse()) {
    const left = cx - a.w / 2 - a.thick, right = cx + a.w / 2 + a.thick;
    const outer = union(rect(left, a.top + a.w / 2, right - left, a.h - a.w / 2), circle(cx, a.top + a.w / 2 + a.thick, a.w / 2 + a.thick));
    const opening = union(rect(cx - a.w / 2, a.top + a.w / 2 + a.thick, a.w, a.h), circle(cx, a.top + a.w / 2 + a.thick, a.w / 2));
    const frame = diff(inter(outer, rect(left, a.top, right - left, a.h + a.top < 108 ? a.h : 108 - a.top)), opening);
    t.fill(frame, (x) => STONE[Math.min(STONE.length - 1, a.tone + (x > cx ? 1 : 0)) - (x < cx - a.w / 2 - a.thick / 2 ? 1 : 0)]);
    t.outline(inter(outer, rect(left, a.top, right - left, a.h)), STONE[Math.min(5, a.tone + 1)]);
  }
  // fenêtre de lumière au fond
  t.fill(union(rect(cx - 4, horizon - 4, 8, 22), circle(cx, horizon - 4, 4)), "3823");
  t.fill(line(cx, horizon - 8, cx, horizon + 18, 1), "3865");
  // cadre extérieur fin
  t.outline(rect(1, 1, 108, 110), "3787");
}

/** Le fil invisible — 130 × 124. Un fil rouge qui serpente et se noue. */
export function filInvisible(t: Toile) {
  const pts = [
    ...bezier([6, 30], [40, 4], [52, 70], [30, 72], 60),
    ...bezier([30, 72], [8, 74], [22, 44], [48, 52], 50),
    ...bezier([48, 52], [76, 60], [62, 100], [84, 96], 60),
    ...bezier([84, 96], [104, 92], [96, 60], [86, 66], 40),
    ...bezier([86, 66], [76, 72], [92, 88], [104, 70], 40),
    ...bezier([104, 70], [114, 54], [100, 30], [112, 20], 50),
  ];
  // ombre portée très douce
  t.fill(path(pts.map(([x, y]) => [x + 1.4, y + 1.6] as [number, number]), 2.2), "3024");
  t.fill(path(pts, 2.4), (x, y) => (hash(x, y, 3) > .82 ? "498" : "321"));
  t.fill(path(pts.map(([x, y]) => [x - .6, y - .6] as [number, number]), .9), "3801");
  // nœuds
  for (const [x, y] of [[30, 72], [86, 66]] as const) { t.fill(circle(x, y, 3.4), "498"); t.fill(circle(x - .8, y - .8, 1.4), "3801"); }
  // aiguille au bout du fil
  const nx = 112, ny = 20;
  const needle = poly([[nx - 1.2, ny + 1], [nx + 13, ny - 15], [nx + 14.5, ny - 13.5], [nx + 1, ny + 2.2]]);
  t.fill(needle, "318");
  t.fill(line(nx + 1, ny, nx + 13, ny - 13, .8), "762");
  t.clear(ellipse(nx + 10.5, ny - 10.5, 1.5, .55, -Math.PI / 4));
  // début du fil : un petit point d'arrêt
  t.fill(circle(6, 30, 2.6), "321");
  // repères discrets en pointillé
  for (let x = 8; x < 124; x += 6) t.set(x, 116, "3024");
}

/** La géométrie des jours — 150 × 136. Une case, un jour, un motif. */
export function geometrieDesJours(t: Toile) {
  const COLS = 7, ROWS = 5, CW = 19, CH = 23, GAP = 2;
  const x0 = Math.round((150 - (COLS * CW + (COLS - 1) * GAP)) / 2), y0 = 10;
  const P: Code[] = ["3364", "3830", "729", "336", "3779", "3810", "3799", "3778", "3013", "3768"];
  const BG: Code[] = ["3865", "3866", "822", "3024", "3823"];
  const motifs: ((cx: number, cy: number, s: number) => [Shape, number][])[] = [
    (cx, cy, s) => [[circle(cx, cy, s * .38), 0]],
    (cx, cy, s) => [[rect(cx - s * .32, cy - s * .32, s * .64, s * .64), 0]],
    (cx, cy, s) => [[poly([[cx, cy - s * .4], [cx + s * .4, cy + s * .32], [cx - s * .4, cy + s * .32]]), 0]],
    (cx, cy, s) => [[poly([[cx, cy - s * .42], [cx + s * .36, cy], [cx, cy + s * .42], [cx - s * .36, cy]]), 0]],
    (cx, cy, s) => [[ring(cx, cy, s * .2, s * .4), 0]],
    (cx, cy, s) => [[union(line(cx - s * .38, cy, cx + s * .38, cy, 3), line(cx, cy - s * .38, cx, cy + s * .38, 3)), 0]],
    (cx, cy, s) => [[inter(circle(cx, cy, s * .4), (_, y) => y < cy), 0], [inter(circle(cx, cy, s * .4), (_, y) => y >= cy), 1]],
    (cx, cy, s) => [[star(cx, cy, s * .42, s * .18), 0]],
    (cx, cy, s) => [[inter(rect(cx - s * .38, cy - s * .38, s * .76, s * .76), (x, y) => (Math.floor(x - cx + 40) + Math.floor(y - cy + 40)) % 4 < 2), 0]],
    (cx, cy, s) => [[union(circle(cx - s * .2, cy - s * .2, s * .15), circle(cx + s * .2, cy - s * .2, s * .15), circle(cx - s * .2, cy + s * .2, s * .15), circle(cx + s * .2, cy + s * .2, s * .15)), 0]],
    (cx, cy, s) => [[poly([[cx - s * .4, cy + s * .35], [cx - s * .4, cy - s * .35], [cx + s * .4, cy + s * .35]]), 0], [poly([[cx + s * .4, cy - s * .35], [cx + s * .4, cy + s * .2], [cx - s * .25, cy - s * .35]]), 1]],
    (cx, cy, s) => [[inter(rect(cx - s * .38, cy - s * .38, s * .76, s * .76), (x) => Math.floor(x - cx + 40) % 3 === 0), 0]],
  ];
  let k = 0;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++, k++) {
    const x = x0 + c * (CW + GAP), y = y0 + r * (CH + GAP);
    const bg = BG[(c * 3 + r * 2) % BG.length];
    const cell = rect(x, y, CW, CH, 2);
    t.fill(cell, bg);
    const m = motifs[(k * 7 + r * 5) % motifs.length];
    const a = P[(k * 3) % P.length], b = P[(k * 3 + 4) % P.length];
    for (const [shape, which] of m(x + CW / 2, y + CH / 2 - 1.5, CW)) t.fill(inter(shape, cell), which ? b : a);
    // petit numéro du jour : des points en bas de case
    const day = k + 1;
    for (let d = 0; d < Math.min(day % 7 || 7, 7); d++) t.set(x + 3 + d * 2, y + CH - 3, "3799");
    t.outline(cell, "3790");
  }
  // frise basse
  t.fill(rect(x0, 10 + ROWS * (CH + GAP) + 2, COLS * CW + (COLS - 1) * GAP, 2), stripes(3, ["3830", "729", "3364", "336"]));
}

