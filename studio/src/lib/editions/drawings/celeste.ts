import { Toile, circle, crescent, diff, grad, line, lit, path, ring, star, union, type Shape } from "../kit";

const GOLD = ["3823", "3822", "3821", "3820", "783"];
const NIGHT = ["3325", "334", "312", "311", "823"];

/** Petite étincelle à quatre branches. */
const sparkle = (cx: number, cy: number, r: number): Shape => union(line(cx - r, cy, cx + r, cy, 1), line(cx, cy - r, cx, cy + r, 1));

/** Lune de minuit — 90 × 100, débutant. */
export function luneDeMinuit(t: Toile) {
  const moon = crescent(42, 50, 30, 15, -9, 26);
  t.fill(moon, lit(36, 44, 34, GOLD, -.7, -.5));
  t.outline(moon, "783");
  // cratères discrets
  for (const [x, y, r] of [[22, 48, 2.6], [30, 66, 2], [21, 60, 1.5]] as const) t.fill(circle(x, y, r), "3821");
  // étoiles
  for (const [x, y, R] of [[68, 22, 8], [76, 66, 6], [56, 86, 4.5], [16, 14, 4.5]] as const) {
    const s = star(x, y, R, R * .45);
    t.fill(s, "3822"); t.outline(s, "3820");
  }
  for (const [x, y] of [[80, 42], [50, 12], [12, 84], [84, 92]] as const) t.fill(sparkle(x, y, 2), "3865");
  for (const [x, y] of [[62, 40], [36, 92], [8, 34], [86, 12], [70, 54]] as const) t.set(x, y, "3821");
}

/** Solstice — 110 × 112. Soleil aux rayons alternés. */
export function solstice(t: Toile) {
  const cx = 55, cy = 56;
  // grands rayons triangulaires
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI / 8, long = i % 2 === 0;
    const R = long ? 52 : 40, w = long ? .17 : .13;
    const tri: [number, number][] = [[cx + Math.cos(a - w) * 24, cy + Math.sin(a - w) * 24], [cx + Math.cos(a) * R, cy + Math.sin(a) * R], [cx + Math.cos(a + w) * 24, cy + Math.sin(a + w) * 24]];
    const ray: Shape = (x, y) => {
      let inside = false;
      for (let k = 0, j = 2; k < 3; j = k++) {
        const [ax, ay] = tri[k], [bx, by] = tri[j];
        if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
      }
      return inside;
    };
    t.fill(ray, long ? grad(cx, cy, cx + Math.cos(a) * R, cy + Math.sin(a) * R, ["742", "741", "740", "946"]) : grad(cx, cy, cx + Math.cos(a) * R, cy + Math.sin(a) * R, ["744", "743", "742"]));
  }
  // anneau et disque
  t.fill(circle(cx, cy, 27), "946");
  t.fill(circle(cx, cy, 24), lit(cx, cy, 28, ["745", "744", "743", "742", "741"]));
  t.fill(ring(cx, cy, 15, 17), "740");
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; t.fill(circle(cx + Math.cos(a) * 20.5, cy + Math.sin(a) * 20.5, 1.3), "946"); }
  t.fill(star(cx, cy, 9, 4, 8, -Math.PI / 2), "740");
  t.fill(circle(cx, cy, 3), "745");
  // petits points dans les coins
  for (const [x, y] of [[8, 8], [101, 8], [8, 103], [101, 103]] as const) t.fill(star(x, y, 4, 1.6, 4, 0), "741");
}

/** Constellation intime — 130 × 124. Médaillon de nuit relié point à point. */
export function constellationIntime(t: Toile) {
  const cx = 65, cy = 60, R = 52;
  const disc = circle(cx, cy, R);
  t.fill(disc, grad(cx, cy - R, cx, cy + R, [...NIGHT].reverse()));
  t.fill(ring(cx, cy, R, R + 3), "3821");
  t.fill(ring(cx, cy, R + 4.2, R + 5.4), "3822");
  // constellation (forme de petite casserole — étoiles inventées, librement inspirées)
  const pts: [number, number][] = [[34, 44], [46, 38], [58, 46], [70, 44], [80, 58], [96, 54], [100, 72], [82, 76]];
  t.fill(path(pts.slice(0, 6), 1), "3752");
  t.fill(path([pts[4], pts[7], pts[6], pts[5]], 1), "3752");
  pts.forEach(([x, y], i) => {
    const big = i === 3 || i === 6;
    t.fill(circle(x, y, big ? 3 : 2.2), "3865");
    if (big) t.fill(sparkle(x, y, 5), "3865");
  });
  // poussière d'étoiles
  for (let i = 0; i < 70; i++) {
    const a = i * 2.39996, r = Math.sqrt(i / 70) * (R - 4);
    const x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r);
    if (pts.some(([px, py]) => Math.hypot(px - x, py - y) < 6)) continue;
    t.set(x, y, i % 5 ? "3752" : "3822");
  }
  // petite lune dans le médaillon
  t.fill(crescent(44, 88, 9, 5, -3, 8), lit(42, 86, 10, GOLD));
  // rubans d'étoiles hors du médaillon
  for (const [x, y] of [[10, 112], [120, 112], [8, 10], [122, 10]] as const) { const s = star(x, y, 6, 2.6); t.fill(s, "3821"); t.outline(s, "3820"); }
  for (const [x, y] of [[24, 116], [106, 116], [65, 117]] as const) t.fill(sparkle(x, y, 2), "3822");
}

/** Le cercle des étoiles — 150 × 136, expert. Phases de lune et couronne d'étoiles. */
export function cercleDesEtoiles(t: Toile) {
  const cx = 75, cy = 72;
  // couronne d'étoiles
  for (let i = 0; i < 24; i++) {
    const a = i * Math.PI / 12 - Math.PI / 2, R = 60;
    const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R * .92;
    const big = i % 3 === 0;
    const s = big ? star(x, y, 6.5, 2.8, 5, a) : star(x, y, 3.2, 1.3, 4, a);
    t.fill(s, big ? "3821" : "3822");
    if (big) t.outline(s, "3820");
  }
  // phases de lune en arc
  const phases = 7;
  for (let i = 0; i < phases; i++) {
    const a = Math.PI + (i + .5) * Math.PI / phases;
    const x = cx + Math.cos(a) * 36, y = cy + 6 + Math.sin(a) * 30;
    const r = 7;
    const k = (i - (phases - 1) / 2) / ((phases - 1) / 2); // -1 … 1
    const lunePleine = circle(x, y, r);
    t.fill(lunePleine, "3799");
    const shadowShift = k * r * 2.1;
    const lumiere = Math.abs(k) < .01 ? lunePleine : diff(lunePleine, circle(x + shadowShift, y, r * 1.02));
    t.fill(lumiere, lit(x, y, r * 1.2, ["3865", "3866", "822", "644", "642"]));
    t.outline(lunePleine, "3787");
  }
  // grande lune centrale
  const big = circle(cx, cy + 22, 19);
  t.fill(big, lit(cx, cy + 22, 22, ["3865", "3866", "822", "644", "642", "640"]));
  for (const [x, y, r] of [[cx - 6, cy + 16, 3.5], [cx + 7, cy + 28, 2.8], [cx + 5, cy + 13, 1.8], [cx - 8, cy + 31, 2.2]] as const) {
    t.fill(circle(x, y, r), "644"); t.fill(diff(circle(x, y, r), circle(x + .9, y + .9, r - .6)), "640");
  }
  t.outline(big, "3787");
  // filets
  t.fill(ring(cx, cy + 22, 22, 23.2), "3820");
  for (const [x, y] of [[cx, cy - 22], [cx - 18, cy - 4], [cx + 18, cy - 4]] as const) t.fill(sparkle(x, y, 3), "3821");
  t.fill(line(cx - 30, cy + 50, cx + 30, cy + 50, 1), "3820");
  for (let i = -3; i <= 3; i++) t.fill(star(cx + i * 10, cy + 56, 2.4, 1, 4, 0), i % 2 ? "3822" : "3821");
}
