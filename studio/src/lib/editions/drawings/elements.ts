import { Toile, circle, ellipse, lit, path, type Code } from "../kit";

/** Feuille en amande orientée, nervure centrale. ramp : clair → foncé. */
export function leaf(t: Toile, x: number, y: number, angle: number, len: number, ramp: Code[], vein?: Code) {
  const cx = x + Math.cos(angle) * len / 2, cy = y + Math.sin(angle) * len / 2;
  const s = ellipse(cx, cy, len / 2, Math.max(1.3, len / 4.2), angle);
  t.fill(s, lit(cx, cy, len / 1.6, ramp, -.6, -.7));
  if (vein && len >= 7) t.fill(path([[x + Math.cos(angle) * 1.5, y + Math.sin(angle) * 1.5], [x + Math.cos(angle) * (len - 2), y + Math.sin(angle) * (len - 2)]], .9), vein);
}

/** Fleur à n pétales ronds. */
export function flower(t: Toile, x: number, y: number, r: number, petals: Code[], heart: Code, n = 5, rot = -Math.PI / 2) {
  for (let i = 0; i < n; i++) {
    const a = rot + i * 2 * Math.PI / n;
    const px = x + Math.cos(a) * r * .62, py = y + Math.sin(a) * r * .62;
    t.fill(circle(px, py, r * .48), lit(px, py, r * .6, petals));
  }
  t.fill(circle(x, y, Math.max(1, r * .3)), heart);
}

/** Tige suivant des points, avec feuilles alternées. */
export function vine(t: Toile, pts: [number, number][], stem: Code, leaves: Code[], every = 7, len = 7, vein?: Code) {
  t.fill(path(pts, 1), stem);
  let acc = 0, side = 1;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    acc += Math.hypot(bx - ax, by - ay);
    if (acc >= every) {
      acc = 0; side = -side;
      const dir = Math.atan2(by - ay, bx - ax);
      leaf(t, bx, by, dir + side * 1.0, len, leaves, vein);
    }
  }
}

/** Petit cœur en pixels (7 × 6). */
export const SMALL_HEART = [" ## ## ", "#######", "#######", " ##### ", "  ###  ", "   #   "];
