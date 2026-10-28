import { Toile, bezier, circle, crescent, diff, ellipse, grad, inter, line, lit, path, poly, rect, star, stripes, union, type Code, type Shape } from "../kit";
import { flower, leaf } from "./elements";

const GOLD: Code[] = ["3823", "3822", "3821", "3820", "783"];

/** Tête de chat simple : disque + deux oreilles. */
const catHead = (cx: number, cy: number, r: number, earTilt = 0): Shape => union(
  circle(cx, cy, r),
  poly([[cx - r * .95, cy - r * .2], [cx - r * .75 - earTilt, cy - r * 1.35], [cx - r * .15, cy - r * .8]]),
  poly([[cx + r * .95, cy - r * .2], [cx + r * .75 + earTilt, cy - r * 1.35], [cx + r * .15, cy - r * .8]]),
);

/** Le chat à la fenêtre — 90 × 100. */
export function chatALaFenetre(t: Toile) {
  const win = union(rect(14, 30, 62, 56), circle(45, 30, 31));
  const inner = union(rect(18, 30, 54, 54), circle(45, 30, 27));
  t.fill(win, "3790");
  t.fill(inner, grad(45, 4, 45, 84, ["823", "311", "312"], true));
  // lune et étoiles dans la vitre
  t.fill(crescent(60, 22, 7, 3.5, -2, 6), "3822");
  for (const [x, y] of [[28, 18], [36, 10], [52, 40], [66, 48], [24, 44]] as const) t.set(x, y, "3865");
  t.fill(star(33, 30, 2.6, 1, 4, 0), "3865");
  // croisillons
  t.fill(rect(44, 4, 2, 80), "3790");
  t.fill(rect(18, 44, 54, 2), "3790");
  // rebord
  t.fill(rect(8, 84, 74, 5, 1), "3790");
  t.fill(rect(8, 84, 74, 1.5), "3782");
  // pot de fleur à gauche
  t.fill(poly([[17, 70], [31, 70], [29, 84], [19, 84]]), "3830");
  t.fill(rect(16, 68, 16, 3), "3830");
  t.fill(rect(16, 68, 16, 1.2), "3790");
  for (const [a, l] of [[-2.2, 10], [-1.6, 12], [-1.0, 10], [-2.6, 8], [-.6, 8]] as const) leaf(t, 24, 68, a, l, ["3363", "3363", "3362"]);
  // le chat, de dos, assis sur le rebord
  const body = union(ellipse(56, 72, 14, 13), ellipse(56, 82, 15, 6));
  const head = catHead(56, 52, 9.5, 1);
  const tail = path(bezier([68, 82], [80, 84], [80, 92], [72, 96], 30), 3.2);
  const cat = union(body, head, tail, rect(48, 56, 16, 10));
  t.fill(cat, "310");
  // liseré de lune sur le contour droit
  t.fill(inter(diff(cat, (x, y) => cat(x + 1.3, y + .6)), (x) => x > 56), "413");
  t.fill(poly([[60, 45], [63, 39], [62, 46]]), "413");
  // fils de reflets sur le rebord
  for (let x = 10; x < 80; x += 7) t.set(x, 87, "3782");
}

/** Chat noir, nuit claire — 110 × 112. */
export function chatNoirNuitClaire(t: Toile) {
  const moon = crescent(52, 54, 44, 20, -16, 38);
  t.fill(moon, lit(44, 48, 50, GOLD, -.7, -.4));
  t.outline(moon, "783");
  // chat roulé en boule dans le creux, en bas à droite de la courbe
  const cx = 46, cy = 82;
  const body = ellipse(cx, cy, 20, 10.5, -.18);
  const head = catHead(cx + 17, cy - 9, 8, 1);
  const tail = path(bezier([cx - 18, cy + 2], [cx - 26, cy + 14], [cx - 2, cy + 16], [cx + 8, cy + 10], 30), 3.4);
  const cat = union(body, head, tail);
  t.fill(cat, "310");
  t.fill(inter(diff(cat, (x, y) => cat(x + 1.2, y + 1.2)), (_x, y) => y < cy + 2), "3799");
  // yeux fermés
  t.fill(path([[cx + 12.5, cy - 9], [cx + 14, cy - 8], [cx + 15.5, cy - 9]], .8), "413");
  t.fill(path([[cx + 18.5, cy - 9], [cx + 20, cy - 8], [cx + 21.5, cy - 9]], .8), "413");
  t.set(cx + 17, cy - 6, "3354");
  // étoiles
  const stars: [number, number, number][] = [[88, 18, 7], [98, 50, 4.5], [80, 96, 5], [18, 16, 4], [100, 82, 3.4], [60, 8, 3.4]];
  for (const [x, y, r] of stars) { const s = star(x, y, r, r * .42); t.fill(s, "3822"); t.outline(s, "3821"); }
  for (const [x, y] of [[74, 34], [94, 66], [12, 98], [30, 104], [104, 104], [8, 40]] as const) t.fill(union(line(x - 1.5, y, x + 1.5, y, 1), line(x, y - 1.5, x, y + 1.5, 1)), "3865");
  // petits nuages
  for (const [x, y] of [[84, 70], [16, 66]] as const) {
    const cloud = union(ellipse(x, y, 8, 3), circle(x - 3, y - 2, 3.4), circle(x + 3, y - 2.6, 4));
    t.fill(cloud, grad(x, y - 6, x, y + 3, ["3865", "3753", "3752"], false));
  }
}

/** Le félin de velours — 130 × 124. Portrait de chat tigré. */
export function felinDeVelours(t: Toile) {
  const cx = 65, cy = 70;
  const FUR: Code[] = ["738", "437", "436", "435", "434", "433"];
  const head = union(
    ellipse(cx, cy, 44, 36),
    ellipse(cx - 24, cy + 14, 24, 20), ellipse(cx + 24, cy + 14, 24, 20), // joues
    poly([[cx - 42, cy - 8], [cx - 36, cy - 56], [cx - 10, cy - 32]]),
    poly([[cx + 42, cy - 8], [cx + 36, cy - 56], [cx + 10, cy - 32]]),
  );
  t.fill(head, lit(cx - 6, cy - 6, 58, FUR, -.5, -.8, -.05));
  // intérieur des oreilles
  t.fill(poly([[cx - 36, cy - 14], [cx - 34, cy - 46], [cx - 16, cy - 30]]), grad(cx - 34, cy - 46, cx - 26, cy - 18, ["3779", "3778", "436"], false));
  t.fill(poly([[cx + 36, cy - 14], [cx + 34, cy - 46], [cx + 16, cy - 30]]), grad(cx + 34, cy - 46, cx + 26, cy - 18, ["3779", "3778", "436"], false));
  // rayures du front (le « M ») et des joues
  const stripe = (pts: [number, number][], w: number) => t.fill(inter(path(pts, w), head), "801");
  stripe([[cx, cy - 34], [cx, cy - 18]], 2.4);
  stripe([[cx - 8, cy - 33], [cx - 6, cy - 20]], 2);
  stripe([[cx + 8, cy - 33], [cx + 6, cy - 20]], 2);
  stripe([[cx - 17, cy - 30], [cx - 13, cy - 21]], 1.8);
  stripe([[cx + 17, cy - 30], [cx + 13, cy - 21]], 1.8);
  for (const s of [-1, 1]) {
    stripe([[cx + s * 46, cy + 4], [cx + s * 30, cy + 8]], 2);
    stripe([[cx + s * 46, cy + 12], [cx + s * 31, cy + 14]], 2);
    stripe([[cx + s * 42, cy + 22], [cx + s * 30, cy + 20]], 1.8);
    stripe([[cx + s * 40, cy - 14], [cx + s * 30, cy - 10]], 1.8);
  }
  // museau clair
  const muzzle = union(ellipse(cx - 9, cy + 18, 12, 10), ellipse(cx + 9, cy + 18, 12, 10), ellipse(cx, cy + 6, 7, 12));
  t.fill(muzzle, lit(cx, cy + 10, 20, ["3865", "3866", "822"], -.4, -.8));
  t.fill(ellipse(cx, cy + 32, 9, 5), "3866");
  // yeux en amande
  for (const s of [-1, 1]) {
    const ex = cx + s * 19, ey = cy - 6;
    const eye = ellipse(ex, ey, 9.5, 6.2, s * .12);
    t.fill(ellipse(ex, ey, 11, 7.6, s * .12), "3371");
    t.fill(eye, lit(ex, ey + 2, 9, ["3348", "989", "987"], 0, .8));
    t.fill(ellipse(ex, ey, 1.6, 5.6), "310");
    t.fill(circle(ex - 3.2, ey - 2.6, 1.3), "3865");
  }
  // truffe et bouche
  t.fill(poly([[cx - 5.5, cy + 9], [cx + 5.5, cy + 9], [cx, cy + 15]]), grad(cx, cy + 9, cx, cy + 15, ["3779", "3778", "356"], false));
  t.fill(path([[cx, cy + 15], [cx, cy + 19]], 1), "3371");
  t.fill(path([[cx, cy + 19], [cx - 4, cy + 22], [cx - 8, cy + 21]], 1), "3371");
  t.fill(path([[cx, cy + 19], [cx + 4, cy + 22], [cx + 8, cy + 21]], 1), "3371");
  // moustaches
  for (const s of [-1, 1]) for (const [dy, len] of [[-1, 30], [3, 32], [7, 28]] as const)
    t.fill(path([[cx + s * 16, cy + 18 + dy * .5], [cx + s * (16 + len), cy + 14 + dy * 1.4]], .9), (x) => (Math.abs(x - cx) > 46 ? "644" : "3865"));
  // collier
  t.fill(inter(ellipse(cx, cy + 44, 30, 6), (_x, y) => y > cy + 40), "3350");
  t.fill(circle(cx, cy + 50, 3.4), lit(cx, cy + 50, 4, GOLD));
}

/** Deux chats, un dimanche — 150 × 136. */
export function deuxChatsUnDimanche(t: Toile) {
  // coussin rayé
  const cushion = union(rect(10, 92, 108, 30, 10), ellipse(64, 92, 54, 7));
  t.fill(cushion, stripes(4, ["3768", "928", "3768", "3865"], Math.PI / 2));
  t.fill(inter(cushion, (_, y) => y > 112), stripes(4, ["924", "3768", "924", "928"], Math.PI / 2));
  t.outline(cushion, "924");
  for (const x of [16, 112]) t.fill(circle(x, 120, 3), "3820");
  // chat roux (à gauche), assis
  const ORANGE: Code[] = ["3856", "722", "721", "720", "3776"];
  const GREY: Code[] = ["762", "415", "318", "413"];
  const sitting = (cx: number, base: number, scale: number, ramp: Code[], earTilt: number) => {
    const body = union(ellipse(cx, base - 20 * scale, 17 * scale, 22 * scale), ellipse(cx, base - 6 * scale, 20 * scale, 8 * scale));
    const head = catHead(cx, base - 46 * scale, 13 * scale, earTilt);
    const all = union(body, head);
    t.fill(all, lit(cx - 4, base - 30 * scale, 34 * scale, ramp, -.6, -.6));
    t.fill(ellipse(cx, base - 22 * scale, 8 * scale, 13 * scale), ramp[0]);
    // yeux fermés, satisfaits
    for (const s of [-1, 1]) t.fill(path([[cx + s * 7 * scale - 2.5, base - 47 * scale], [cx + s * 7 * scale, base - 45 * scale], [cx + s * 7 * scale + 2.5, base - 47 * scale]], .9), "3371");
    t.fill(poly([[cx - 1.8, base - 41 * scale], [cx + 1.8, base - 41 * scale], [cx, base - 39 * scale]]), "3354");
    // pattes avant
    t.fill(ellipse(cx - 6 * scale, base - 1, 4.5 * scale, 2.6 * scale), ramp[0]);
    t.fill(ellipse(cx + 6 * scale, base - 1, 4.5 * scale, 2.6 * scale), ramp[0]);
    t.outline(all, ramp[ramp.length - 1]);
    return all;
  };
  // queues
  t.fill(path(bezier([30, 98], [8, 98], [10, 76], [20, 70], 30), 5), "721");
  t.fill(path(bezier([98, 98], [120, 98], [112, 70], [104, 66], 30), 5), "318");
  sitting(40, 100, 1, ORANGE, 1);
  sitting(86, 100, .92, GREY, 2);
  // rayures du roux
  t.fill(path([[37, 41], [40, 45], [43, 41]], 1.2), "720");
  // bouquet à droite
  t.fill(poly([[126, 104], [142, 104], [140, 122], [128, 122]]), lit(134, 112, 12, ["3325", "334", "322", "312"]));
  t.fill(rect(124, 120, 20, 2), "312");
  for (const [x, y, a] of [[134, 82, -1.6], [128, 86, -2.1], [140, 86, -1.1]] as const) t.fill(line(134, 104, x, y, 1), "3363"), leaf(t, (134 + x) / 2, (104 + y) / 2, a + .8, 7, ["3363", "3362"]);
  flower(t, 134, 80, 6, ["3326", "899", "3350"], "3822");
  flower(t, 126, 86, 5, ["3326", "899", "3350"], "3822");
  flower(t, 142, 87, 5, ["745", "744", "743"], "3820");
  // petit cœur entre les deux chats
  t.fill(union(circle(62, 50, 2.2), circle(66, 50, 2.2), poly([[60, 51], [68, 51], [64, 56]])), "3350");
}
