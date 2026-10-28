import { Toile, bezier, circle, ellipse, grad, inter, line, lit, path, poly, rect, ring, star, union, type Code } from "../kit";
import { flower, leaf } from "./elements";

/** Oiseau posé, vu de profil, tourné vers la droite. */
function perchedBird(t: Toile, cx: number, cy: number, s: number, c: {
  back: Code[]; belly: Code[]; breast?: Code[]; cap?: Code; cheek?: Code; mask?: Code; wing: Code[]; beak: Code; eye: Code; tail: Code;
}) {
  const body = ellipse(cx, cy, 13 * s, 10 * s, -.25);
  const head = circle(cx + 9 * s, cy - 8 * s, 7 * s);
  const tail = poly([[cx - 10 * s, cy + 1 * s], [cx - 24 * s, cy + 9 * s], [cx - 22 * s, cy + 12 * s], [cx - 8 * s, cy + 7 * s]]);
  t.fill(tail, c.tail);
  const whole = union(body, head);
  t.fill(whole, lit(cx, cy - 4 * s, 18 * s, c.back));
  // ventre
  t.fill(inter(whole, ellipse(cx + 3 * s, cy + 4 * s, 11 * s, 7 * s, -.2)), lit(cx + 3 * s, cy + 2 * s, 12 * s, c.belly));
  if (c.breast) t.fill(inter(whole, ellipse(cx + 9 * s, cy - 2 * s, 8 * s, 8 * s)), lit(cx + 9 * s, cy - 4 * s, 9 * s, c.breast));
  if (c.cap) t.fill(inter(head, (_x, y) => y < cy - 10 * s), c.cap);
  if (c.cheek) t.fill(ellipse(cx + 10 * s, cy - 7 * s, 4 * s, 3 * s), c.cheek);
  if (c.mask) t.fill(path([[cx + 4 * s, cy - 9 * s], [cx + 15 * s, cy - 9.5 * s]], 1.4 * s), c.mask);
  // aile
  const wing = ellipse(cx - 3 * s, cy - 1 * s, 10 * s, 5.5 * s, -.35);
  t.fill(wing, grad(cx - 3 * s, cy - 6 * s, cx - 3 * s, cy + 4 * s, c.wing, false));
  t.fill(path([[cx - 10 * s, cy + 2 * s], [cx + 4 * s, cy - 3 * s]], 1), c.wing[c.wing.length - 1]);
  // bec et œil
  t.fill(poly([[cx + 15 * s, cy - 10 * s], [cx + 20.5 * s, cy - 8.5 * s], [cx + 15 * s, cy - 7 * s]]), c.beak);
  t.fill(circle(cx + 11.5 * s, cy - 10 * s, 1.2 * s), c.eye);
  t.set(Math.floor(cx + 11 * s), Math.floor(cy - 10.6 * s), "3865");
  // pattes
  t.fill(line(cx + 1 * s, cy + 9 * s, cx + 0 * s, cy + 13 * s, 1), "3371");
  t.fill(line(cx + 5 * s, cy + 9 * s, cx + 5 * s, cy + 13 * s, 1), "3371");
}

/** Le rouge-gorge d'hiver — 90 × 100. */
export function rougeGorgeHiver(t: Toile) {
  // branche
  const branch = path([[2, 78], [30, 70], [60, 64], [88, 54]], 4.2);
  t.fill(branch, "3781");
  t.fill(path([[52, 66], [66, 78], [74, 82]], 2.2), "3781");
  // neige posée
  t.fill(inter(path([[2, 75.5], [30, 67.5], [60, 61.5], [88, 51.5]], 3.4), (x, y) => !branch(x, y + 1.5) || y < 70 - x * .25), "B5200");
  t.fill(path([[54, 64], [66, 75]], 1.4), "B5200");
  t.fill(path([[4, 77.5], [28, 71], [58, 65]], .9), "3753");
  // houx
  for (const [x, y, a] of [[18, 76, 2.1], [24, 78, 1.1], [70, 82, .6], [76, 80, 1.6]] as const) leaf(t, x, y, a, 9, ["3362", "3362", "3362"]);
  for (const [x, y] of [[21, 76], [23, 79], [73, 82]] as const) t.fill(circle(x, y, 1.8), "321");
  // l'oiseau
  perchedBird(t, 46, 50, 1.25, {
    back: ["3863", "3863", "3862"], belly: ["3865", "3865", "3753"], breast: ["721", "721", "720"],
    wing: ["3863", "3862"], beak: "3371", eye: "310", tail: "3862",
  });
  // flocons
  for (const [x, y, r] of [[12, 14, 3], [70, 12, 2.6], [82, 30, 2], [30, 26, 2], [10, 48, 2.2], [56, 90, 2.2], [20, 92, 1.6]] as const)
    t.fill(union(line(x - r, y, x + r, y, 1), line(x, y - r, x, y + r, 1), line(x - r * .7, y - r * .7, x + r * .7, y + r * .7, 1), line(x - r * .7, y + r * .7, x + r * .7, y - r * .7, 1)), "3753");
}

/** L'hirondelle libre — 110 × 112. */
export function hirondelleLibre(t: Toile) {
  const cx = 56, cy = 46;
  const NAVY: Code[] = ["336", "823", "939"];
  // ailes en flèche, rabattues vers l'arrière
  const wingL = poly([[cx - 4, cy - 4], [cx - 26, cy - 14], [cx - 52, cy - 6], [cx - 30, cy - 2], [cx - 8, cy + 8]]);
  const wingR = poly([[cx + 4, cy - 4], [cx + 26, cy - 14], [cx + 52, cy - 6], [cx + 30, cy - 2], [cx + 8, cy + 8]]);
  t.fill(wingL, grad(cx, cy - 6, cx - 52, cy - 6, NAVY));
  t.fill(wingR, grad(cx, cy - 6, cx + 52, cy - 6, NAVY));
  t.fill(path([[cx - 10, cy + 2], [cx - 30, cy - 3], [cx - 46, cy - 6]], 1), "3807");
  t.fill(path([[cx + 10, cy + 2], [cx + 30, cy - 3], [cx + 46, cy - 6]], 1), "3807");
  // queue fourchue
  t.fill(poly([[cx - 4, cy + 12], [cx - 13, cy + 40], [cx - 9, cy + 40], [cx, cy + 20], [cx + 9, cy + 40], [cx + 13, cy + 40], [cx + 4, cy + 12]]), "823");
  // corps
  const body = union(ellipse(cx, cy + 6, 7.5, 15), circle(cx, cy - 8, 7));
  t.fill(body, lit(cx - 2, cy, 14, NAVY));
  t.fill(inter(body, ellipse(cx, cy + 10, 5, 10)), "3865");
  t.fill(inter(body, ellipse(cx, cy - 2, 5.5, 4)), "321");
  t.fill(circle(cx - 3, cy - 10, 1.2), "3865");
  t.fill(circle(cx + 3, cy - 10, 1.2), "3865");
  t.fill(poly([[cx - 2, cy - 15], [cx + 2, cy - 15], [cx, cy - 18]]), "3371");
  // nuages
  for (const [x, y, w] of [[26, 92, 1], [84, 84, .8]] as const) {
    const c = union(ellipse(x, y, 18 * w, 6 * w), circle(x - 7 * w, y - 4 * w, 7 * w), circle(x + 5 * w, y - 6 * w, 8 * w));
    t.fill(c, grad(x, y - 14 * w, x, y + 6 * w, ["B5200", "3756", "3753", "3752"], false));
  }
  // petite hirondelle lointaine
  t.fill(path([[90, 106 - 90], [94, 106 - 88], [98, 106 - 91]], 1.2), "823");
  t.fill(path([[14, 12], [17, 14], [20, 11]], 1.2), "823");
}

/** La mésange du jardin — 130 × 124. */
export function mesangeDuJardin(t: Toile) {
  // branche de cerisier
  const BR: Code[] = ["3790", "3781", "838"];
  t.fill(path(bezier([2, 96], [40, 88], [80, 92], [128, 70], 50), 5), grad(0, 86, 0, 100, BR));
  t.fill(path(bezier([44, 92], [52, 110], [66, 114], [76, 118], 30), 3), "3781");
  t.fill(path(bezier([92, 84], [98, 70], [108, 62], [118, 58], 30), 2.6), "3781");
  // fleurs et boutons
  const BLOSSOM: Code[] = ["819", "3713", "761"];
  for (const [x, y, r] of [[18, 88, 7], [32, 98, 6], [100, 76, 7.5], [118, 56, 6], [76, 116, 5.5], [62, 84, 5], [120, 74, 5]] as const) flower(t, x, y, r, BLOSSOM, "3820");
  for (const [x, y] of [[8, 90], [110, 64], [88, 88], [56, 108]] as const) t.fill(ellipse(x, y, 2.4, 3.2), "761");
  for (const [x, y, a] of [[26, 92, -2.2], [92, 82, -1.4], [70, 112, .4], [110, 70, -2.6]] as const) leaf(t, x, y, a, 10, ["472", "3364", "3363"]);
  // la mésange
  const s = 2.2, cx = 64, cy = 60;
  perchedBird(t, cx, cy, s, {
    back: ["3348", "3053", "3052"], belly: ["727", "726", "725"], cap: "322", cheek: "B5200", mask: "823",
    wing: ["3755", "322", "312"], beak: "3371", eye: "310", tail: "322",
  });
  // barre alaire blanche
  t.fill(path([[cx - 18, cy - 2], [cx + 2, cy - 8]], 1.4), "B5200");
  // halo de printemps
  for (const [x, y] of [[20, 20], [104, 22], [40, 8], [118, 36], [10, 50]] as const) t.fill(star(x, y, 3, 1.2, 5), "3713");
}

/** Les oiseaux du matin — 150 × 136. */
export function oiseauxDuMatin(t: Toile) {
  const cx = 75, cy = 62;
  // soleil levant
  t.fill(circle(cx, cy, 46), grad(cx, cy - 46, cx, cy + 46, ["745", "744", "743", "742", "3854"]));
  t.fill(ring(cx, cy, 49, 50.4), "744");
  t.fill(ring(cx, cy, 53, 54.2), "745");
  // collines
  t.fill(inter(ellipse(40, 132, 70, 30), rect(0, 100, 150, 36)), grad(0, 102, 0, 136, ["3348", "3364", "3363"]));
  t.fill(inter(ellipse(118, 136, 60, 28), rect(0, 100, 150, 36)), grad(0, 108, 0, 136, ["3364", "3363", "3362"]));
  // fil électrique légèrement courbe
  const wire = bezier([0, 70], [50, 80], [100, 80], [150, 70], 80);
  t.fill(path(wire, 1), "3799");
  for (const x of [0, 149]) t.fill(rect(x - 1, 60, 2, 76), "3790");
  const yAt = (x: number) => { let best = wire[0]; for (const p of wire) if (Math.abs(p[0] - x) < Math.abs(best[0] - x)) best = p; return best[1]; };
  // trois oiseaux
  const birds: [number, number, Parameters<typeof perchedBird>[4]][] = [
    [28, 1, { back: ["3863", "3862", "3781"], belly: ["3865", "822", "644"], breast: ["3856", "722", "721"], wing: ["3862", "3781"], beak: "3371", eye: "310", tail: "3781" }],
    [75, 1.1, { back: ["3755", "334", "322"], belly: ["3865", "822", "644"], breast: ["3856", "722", "721"], wing: ["334", "322"], beak: "3371", eye: "310", tail: "322" }],
    [120, 1, { back: ["3348", "3364", "3363"], belly: ["727", "726", "725"], cap: "3799", cheek: "B5200", wing: ["3363", "3362"], beak: "3371", eye: "310", tail: "3363" }],
  ];
  for (const [x, s, colors] of birds) perchedBird(t, x, yAt(x) - 13 * s, s, colors);
  // petits nuages
  for (const [x, y] of [[22, 30], [128, 22]] as const) t.fill(union(ellipse(x, y, 11, 3.4), circle(x - 3, y - 2.6, 4), circle(x + 4, y - 3, 4.6)), "B5200");
  for (const [x, y] of [[16, 30], [124, 22]] as const) t.fill(path([[x - 4, y + 2], [x + 10, y + 2]], 1), "3753");
}

