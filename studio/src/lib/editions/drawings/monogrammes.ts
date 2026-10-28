import { Toile, bezier, circle, ellipse, line, rect, ring, stripes, text, textWidth, type Code } from "../kit";
import { GLYPHS } from "../glyphs";
import { SMALL_HEART, flower, leaf, vine } from "./elements";

const SAGE: Code[] = ["3364", "3363", "3362"];
const ROSE: Code[] = ["3326", "899", "3350"];

const glyphSize = (g: string[]) => [Math.max(...g.map(r => r.length)), g.length] as const;

/** L'initiale botanique — 90 × 100. */
export function initialeBotanique(t: Toile) {
  const g = GLYPHS.A, [gw, gh] = glyphSize(g);
  const x0 = Math.round((90 - gw) / 2), y0 = 20;
  // ombre douce de la lettre
  t.stamp(g, x0 + 2, y0 + 2, "3024");
  t.stamp(g, x0, y0, "3362");
  // liseré clair à gauche des pleins
  for (let y = y0; y < y0 + gh; y++) for (let x = x0; x < x0 + gw; x++) if (t.get(x, y) && t.get(x, y) !== "3024" && (!t.get(x - 1, y) || t.get(x - 1, y) === "3024")) t.set(x, y, "3364");
  // liane qui s'enroule
  const left = bezier([10, 92], [2, 60], [26, 46], [16, 18], 50);
  const right = bezier([80, 94], [92, 70], [62, 58], [76, 30], 50);
  vine(t, left, "3362", SAGE, 6, 7);
  vine(t, right, "3362", SAGE, 6, 7);
  flower(t, 16, 16, 6, ROSE, "3822");
  flower(t, 77, 28, 5, ROSE, "3822");
  flower(t, 50, 88, 5, ROSE, "3822");
  flower(t, 30, 90, 3.6, ROSE, "3822");
  leaf(t, 44, 88, Math.PI + .3, 8, SAGE);
  leaf(t, 56, 88, -.3, 8, SAGE);
  for (const [x, y] of [[40, 10], [62, 8], [84, 50], [6, 40]] as const) t.fill(circle(x, y, 1.3), "3326");
}

/** L'alphabet atelier — 110 × 112. Abécédaire façon marquoir. */
export function alphabetAtelier(t: Toile) {
  // cadre : bande de croix alternées
  t.fill(rect(2, 2, 106, 108), (x, y) => {
    const edge = x < 7 || y < 7 || x > 103 || y > 105;
    if (!edge) return null;
    return (Math.floor(x) + Math.floor(y)) % 4 === 0 ? "3350" : (Math.floor(x) + Math.floor(y)) % 4 === 2 ? "3362" : null;
  });
  t.outline(rect(1, 1, 108, 110), "3362");
  t.outline(rect(8, 8, 94, 96), "3363");
  const rows = ["ABCDEFG", "HIJKLMN", "OPQRSTU", "VWXYZ"];
  const COLORS: Code[] = ["3350", "3362", "336", "3830"];
  rows.forEach((row, r) => {
    const w = textWidth(row, 2, 1) + (r === 3 ? 20 : 0);
    let x = Math.round((110 - w) / 2);
    const y = 14 + r * 20;
    [...row].forEach((ch, i) => { text(t, ch, x, y, COLORS[(r + i) % COLORS.length], 2, 1); x += 12; });
  });
  // dernière ligne : esperluette et deux cœurs
  t.stamp(SMALL_HEART, 78, 78, "3350");
  t.stamp(SMALL_HEART, 87, 78, "3326");
  // frise du bas
  t.fill(rect(12, 96, 86, 4), stripes(2, ["3364", "3865"], Math.PI / 4));
  t.fill(rect(12, 92, 86, 1), "3363");
}

/** Les deux initiales — 130 × 124. M & L dans une couronne. */
export function deuxInitiales(t: Toile) {
  const cx = 65, cy = 62;
  // couronne de feuilles
  for (let i = 0; i < 46; i++) {
    const a = i * 2 * Math.PI / 46;
    if (Math.abs(a - Math.PI / 2) < .35) continue; // ouverture en bas pour le ruban
    const x = cx + Math.cos(a) * 54, y = cy + Math.sin(a) * 52;
    leaf(t, x, y, a + Math.PI / 2 + (i % 2 ? .7 : -.7), 9, SAGE);
  }
  t.fill(ring(cx, cy, 52.3, 53.6), "3362");
  for (const a of [-.4, -1.2, -2, -2.8, 3.4, 4.3]) flower(t, cx + Math.cos(a) * 54, cy + Math.sin(a) * 52, 4.4, ROSE, "3822");
  // ruban
  t.fill(ellipse(cx - 7, cy + 54, 7, 3.2, -.3), "3350");
  t.fill(ellipse(cx + 7, cy + 54, 7, 3.2, .3), "3350");
  t.fill(circle(cx, cy + 54, 2.6), "815");
  t.fill(line(cx - 2, cy + 56, cx - 9, cy + 66, 2.4), "3350");
  t.fill(line(cx + 2, cy + 56, cx + 9, cy + 66, 2.4), "3350");
  // initiales décalées
  const M = GLYPHS.M, L = GLYPHS.L;
  t.stamp(M, 16, 22, "336");
  t.stamp(L, 78, 56, "3350");
  const snap = t.cells.slice();
  const at = (x: number, y: number) => (x < 0 || x >= t.w ? null : snap[y * t.w + x]);
  for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) {
    const c = at(x, y);
    if ((c === "336" || c === "3350") && at(x - 1, y) !== c) t.set(x, y, c === "336" ? "334" : "3326");
  }
  // esperluette entre les deux lettres
  text(t, "&", 58, 64, "3820", 3);
}

/** La date précieuse — 150 × 136. */
export function datePrecieuse(t: Toile) {
  const cx = 75;
  // demi-couronne fleurie au-dessus
  const arc = Array.from({ length: 61 }, (_, i) => { const a = Math.PI + i * Math.PI / 60; return [cx + Math.cos(a) * 62, 70 + Math.sin(a) * 60] as [number, number]; });
  vine(t, arc, "3362", SAGE, 5, 8);
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI + (i + .5) * Math.PI / 9.5;
    const x = cx + Math.cos(a) * 62, y = 70 + Math.sin(a) * 60;
    flower(t, x, y, i % 2 ? 4.5 : 6, i % 3 === 0 ? ["3865", "3866", "822", "644"] : i % 3 === 1 ? ROSE : ["745", "744", "743", "742"], i % 3 === 0 ? "3822" : "3820");
  }
  // titre
  const title = "LE JOUR";
  text(t, title, Math.round(cx - textWidth(title, 1, 2) / 2), 56, "3363", 1, 2);
  // date
  const date = "14·06·2026";
  const w = textWidth(date, 2, 1);
  text(t, date, Math.round(cx - w / 2), 80, "3350", 2, 1);
  // filets
  t.fill(line(cx - 44, 100, cx + 44, 100, 1), "3363");
  t.fill(line(cx - 30, 103, cx + 30, 103, 1), "3364");
  // deux cœurs entrelacés
  t.stamp(SMALL_HEART, cx - 13, 108, "3350", 2);
  t.stamp(SMALL_HEART, cx - 1, 110, "3326", 2);
  // feuilles basses
  for (const s of [-1, 1]) {
    leaf(t, cx + s * 22, 118, s > 0 ? -.2 : Math.PI + .2, 12, SAGE);
    leaf(t, cx + s * 34, 120, s > 0 ? .25 : Math.PI - .25, 10, SAGE);
    flower(t, cx + s * 46, 120, 4, ROSE, "3822");
  }
  // bordure pointillée
  for (let x = 8; x < 142; x += 3) { t.set(x, 131, "3364"); }
}
