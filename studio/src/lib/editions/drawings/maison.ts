import { Toile, bezier, circle, diff, ellipse, grad, inter, line, lit, path, poly, rect, ring, stripes, union, type Code } from "../kit";
import { flower, leaf } from "./elements";

/** La machine à écrire — 90 × 100. */
export function machineAEcrire(t: Toile) {
  // feuille
  t.fill(rect(24, 6, 42, 40), "B5200");
  t.fill(rect(64, 8, 2, 38), "3024");
  for (let y = 12; y < 34; y += 4) t.fill(rect(28, y, y === 28 ? 18 : 30 - ((y * 7) % 9), 1), "3024");
  // rouleau
  t.fill(rect(12, 40, 66, 7, 3), grad(0, 40, 0, 47, ["317", "310", "310"], false));
  t.fill(circle(10, 43.5, 4.5), "413");
  t.fill(circle(80, 43.5, 4.5), "413");
  t.fill(line(80, 40, 86, 30, 2), "413");
  // corps
  const body = union(poly([[12, 48], [78, 48], [86, 84], [4, 84]]), rect(4, 82, 82, 6, 2));
  t.fill(body, grad(0, 48, 0, 88, ["924", "924", "3799"], false));
  t.fill(rect(16, 50, 58, 4), "3799");
  t.fill(rect(40, 51, 10, 2), "321");
  // touches rondes en quinconce
  for (let r = 0; r < 4; r++) {
    const n = 8 - (r === 3 ? 4 : 0), y = 58 + r * 6.4, w = 64 + r * 4;
    for (let i = 0; i < n; i++) {
      const x = 45 - w / 2 + (i + .5) * (w / n) + (r % 2 ? 2 : 0);
      if (r === 3) { t.fill(rect(28, y - 1.5, 34, 3.2, 1.5), "3865"); break; }
      t.fill(circle(x, y, 2.3), "413");
      t.fill(circle(x, y - .4, 1.5), "3865");
    }
  }
  // ombre au sol
  t.fill(ellipse(45, 92, 40, 2.2), "3024");
}

/** L'atelier du dimanche — 110 × 112. */
export function atelierDuDimanche(t: Toile) {
  const SILVER: Code[] = ["415", "318"];
  // ciseaux : deux lames depuis un pivot, deux anneaux
  const px = 58, py = 56;
  t.fill(poly([[px - 2, py + 1], [92, 16], [94, 18], [px + 2, py + 3]]), grad(px, py, 93, 17, SILVER, false));
  t.fill(poly([[px - 1, py + 3], [97, 30], [98, 33], [px + 1, py + 6]]), grad(px, py, 97, 31, SILVER, false));
  t.fill(line(px, py + 2, 48, 64, 3), "321");
  t.fill(line(px, py + 3, 55, 70, 3), "321");
  for (const [x, y] of [[44, 68], [54, 76]] as const) t.fill(ring(x, y, 3.4, 7), lit(x, y, 9, ["3801", "321", "498"]));
  t.fill(circle(px, py + 2, 2), "318");
  // bobines
  const spool = (x: number, y: number, thread: Code[]) => {
    t.fill(rect(x - 8, y - 14, 16, 3, 1), "437");
    t.fill(rect(x - 8, y + 11, 16, 3, 1), "437");
    t.fill(rect(x - 6.5, y - 11, 13, 22), (xx, yy) => thread[(Math.floor(yy) % 3 === 0 ? 2 : 0) + (xx > x + 2 ? 1 : 0)] ?? thread[0]);
    t.fill(rect(x - 8, y - 14, 16, 1), "738");
  };
  spool(16, 30, ["3350", "3685", "3685"]);
  spool(34, 26, ["334", "336", "336"]);
  spool(20, 92, ["3364", "3362", "3362"]);
  // fil qui s'échappe
  t.fill(path(bezier([42, 26], [60, 20], [58, 2], [76, 6], 40), 1), "334");
  // pelote à épingles
  const pc = 74, pcy = 86;
  t.fill(ellipse(pc, pcy + 10, 18, 5), "3024");
  const cushion = ellipse(pc, pcy, 17, 13);
  t.fill(cushion, lit(pc, pcy, 18, ["3801", "321", "321", "498"]));
  for (const a of [-1.2, -.4, .4, 1.2]) t.fill(inter(path([[pc + Math.sin(a) * 4, pcy - 12], [pc + Math.sin(a) * 15, pcy + 8]], 1), cushion), "498");
  for (const a of [-2.2, -1.5, -.9]) leaf(t, pc, pcy - 12, a, 8, ["3364", "3362"]);
  // épingles
  for (const [x, y, c] of [[64, 76, "3822"], [78, 74, "B5200"], [86, 80, "336"], [70, 72, "3350"]] as const) {
    t.fill(line(x, y, x + 3, y + 7, 1), "318");
    t.fill(circle(x, y, 1.6), c);
  }
  // aiguille enfilée
  t.fill(line(60, 104, 96, 98, 1.2), "415");
  t.fill(path(bezier([96, 98], [104, 94], [106, 106], [92, 108], 20), 1), "3350");
  // mètre ruban
  t.fill(path(bezier([4, 70], [30, 64], [26, 82], [52, 80], 40), 3.2), "3822");
  for (let i = 0; i < 12; i++) { const [x, y] = bezier([4, 70], [30, 64], [26, 82], [52, 80], 12)[i]; t.set(Math.floor(x), Math.floor(y), "437"); }
}

/** La théière en porcelaine — 130 × 124. */
export function theiereEnPorcelaine(t: Toile) {
  const PORC: Code[] = ["B5200", "3865", "3756", "3753", "3752"];
  const BLUE: Code[] = ["3325", "334", "336", "823"];
  const cx = 52, cy = 66;
  // bec et anse
  t.fill(path(bezier([cx + 26, cy + 10], [cx + 38, cy + 4], [cx + 38, cy - 10], [cx + 48, cy - 18], 30), 6), lit(cx + 38, cy - 4, 18, PORC));
  t.fill(inter(ring(cx - 32, cy - 2, 9, 14), (x) => x < cx - 26), lit(cx - 32, cy - 2, 16, PORC));
  // panse
  const body = union(ellipse(cx, cy + 4, 34, 28), rect(cx - 26, cy + 24, 52, 8, 3));
  t.fill(body, lit(cx - 6, cy - 4, 40, PORC, -.6, -.6));
  t.outline(body, "3752");
  // frise de faïence
  const band = inter(body, (_, y) => y > cy - 2 && y < cy + 14);
  t.fill(inter(band, (_, y) => y < cy - .5 || y > cy + 12.5), "336");
  for (let i = -3; i <= 3; i++) {
    const fx = cx + i * 9.5, fy = cy + 6;
    if (!body(fx, fy)) continue;
    flower(t, fx, fy, 4.6, BLUE.slice(0, 3), "823", 4, Math.PI / 4);
  }
  t.fill(inter(body, (_, y) => y > cy + 25 && y < cy + 27), "336");
  // couvercle et bouton
  t.fill(ellipse(cx, cy - 24, 22, 5), lit(cx - 4, cy - 26, 22, PORC));
  t.fill(ellipse(cx, cy - 29, 13, 5), lit(cx - 3, cy - 30, 13, PORC));
  t.outline(union(ellipse(cx, cy - 24, 22, 5), ellipse(cx, cy - 29, 13, 5)), "3752");
  t.fill(circle(cx, cy - 35, 4), lit(cx - 1, cy - 36, 5, BLUE));
  t.fill(ring(cx, cy - 24, 0, .1), "336");
  t.fill(inter(ellipse(cx, cy - 24, 22, 5), (_, y) => y > cy - 21), "336");
  // tasse et soucoupe
  const ux = 104, uy = 98;
  t.fill(ellipse(ux, uy + 10, 22, 4.5), lit(ux - 4, uy + 8, 22, PORC));
  t.outline(ellipse(ux, uy + 10, 22, 4.5), "336");
  const cup = inter(ellipse(ux, uy - 2, 15, 15), (_, y) => y > uy - 8);
  t.fill(ring(ux + 16, uy, 3, 6), lit(ux + 16, uy, 7, PORC));
  t.fill(cup, lit(ux - 4, uy, 18, PORC));
  t.outline(cup, "3752");
  t.fill(ellipse(ux, uy - 8, 15, 3), "3828");
  t.fill(ellipse(ux, uy - 8.4, 12, 1.8), "869");
  t.fill(inter(cup, (_, y) => y > uy - 1 && y < uy + 2), "334");
  for (const fx of [ux - 8, ux, ux + 8]) t.set(fx, uy + 5, "336");
  // vapeur
  for (const dx of [-5, 3]) t.fill(path(bezier([ux + dx, uy - 14], [ux + dx - 5, uy - 22], [ux + dx + 5, uy - 26], [ux + dx, uy - 34], 24), 1), "3753");
  // napperon
  t.fill(rect(4, 112, 122, 3), stripes(2, ["336", "B5200"]));
  void diff;
}

/** Fenêtre sur la campagne — 150 × 136. */
export function fenetreSurLaCampagne(t: Toile) {
  const x0 = 26, y0 = 14, W = 98, H = 92;
  // ciel
  t.fill(rect(x0, y0, W, H), grad(0, y0, 0, y0 + 60, ["3756", "3753", "3752", "3755"].reverse().reverse()));
  // soleil pâle
  t.fill(circle(x0 + 76, y0 + 22, 8), "745");
  // collines en couches
  const hills: [number, number, number, Code[]][] = [
    [y0 + 48, 34, .07, ["3348", "3348", "3364"]],
    [y0 + 58, 22, .09, ["3364", "3364", "3363"]],
    [y0 + 70, 16, .05, ["3363", "3363", "3362"]],
  ];
  for (const [base, amp, f, ramp] of hills) t.fill(inter(rect(x0, y0, W, H), (x, y) => y > base - Math.sin((x - x0) * f + base) * amp * .3), grad(0, base - 10, 0, y0 + H, ramp));
  // champ de blé en rangs
  t.fill(inter(rect(x0, y0 + 74, W, 18), (x, y) => y > y0 + 74 + Math.sin(x * .05) * 2), stripes(2, ["3822", "3821", "3822", "729"], Math.PI / 2 + .3));
  // arbre et maison
  t.fill(rect(x0 + 24, y0 + 44, 2, 12), "3781");
  t.fill(union(circle(x0 + 25, y0 + 40, 7), circle(x0 + 20, y0 + 44, 5), circle(x0 + 30, y0 + 44, 5)), lit(x0 + 24, y0 + 40, 9, ["3364", "3363", "3362"]));
  t.fill(rect(x0 + 58, y0 + 50, 12, 9), "3865");
  t.fill(poly([[x0 + 56, y0 + 51], [x0 + 64, y0 + 44], [x0 + 72, y0 + 51]]), "3830");
  t.fill(rect(x0 + 62, y0 + 54, 3, 5), "3781");
  // oiseaux lointains
  t.fill(path([[x0 + 36, y0 + 14], [x0 + 38, y0 + 16], [x0 + 40, y0 + 13]], 1), "3799");
  t.fill(path([[x0 + 46, y0 + 20], [x0 + 48, y0 + 22], [x0 + 50, y0 + 19]], 1), "3799");
  // cadre et croisillons
  const frame = diff(rect(x0 - 4, y0 - 4, W + 8, H + 8), rect(x0, y0, W, H));
  t.fill(frame, "B5200");
  t.outline(rect(x0 - 4, y0 - 4, W + 8, H + 8), "3024");
  t.fill(rect(x0 + W / 2 - 1, y0, 2.2, H), "B5200");
  t.fill(rect(x0, y0 + 40, W, 2.2), "B5200");
  // rideaux
  for (const side of [-1, 1]) {
    const ox = side < 0 ? 4 : 146;
    const curtain = poly(side < 0 ? [[ox, 6], [ox + 30, 6], [ox + 22, 50], [ox + 10, 74], [ox + 16, 112], [ox, 112]] : [[ox, 6], [ox - 30, 6], [ox - 22, 50], [ox - 10, 74], [ox - 16, 112], [ox, 112]]);
    t.fill(curtain, stripes(3, ["3779", "3778", "3779", "B5200"], Math.PI / 2));
    t.outline(curtain, "356");
    t.fill(ellipse(side < 0 ? 16 : 134, 74, 7, 2.4), "3820");
  }
  t.fill(rect(2, 2, 146, 4, 2), "3790");
  // rebord et pot
  t.fill(rect(16, y0 + H + 4, 118, 6, 2), "3866");
  t.fill(rect(16, y0 + H + 9, 118, 2), "644");
  t.fill(poly([[64, y0 + H - 8], [86, y0 + H - 8], [83, y0 + H + 4], [67, y0 + H + 4]]), lit(74, y0 + H - 4, 12, ["3778", "3830", "355"]));
  for (const [a, l] of [[-2.0, 12], [-1.5, 14], [-1.1, 12], [-2.5, 9], [-.7, 9]] as const) leaf(t, 75, y0 + H - 8, a, l, ["3364", "3363", "3362"]);
  flower(t, 75, y0 + H - 22, 4, ["3326", "899", "3350"], "3820");
  void line; void ring;
}
