/** Le suivi dans le cercle : les points restants de la couleur active, le dernier point coché, le prochain point à montrer. */
import { describe, expect, it } from "vitest";
import { createPattern } from "../lib/pattern";
import { dernierCoche, prochainPoint, restants } from "../lib/tambour/suivi";

function motif() {
  const p = createPattern("Essai", 6, 4);
  /* la couleur 5 : (0,0) (3,0) (5,3) en croix ; (2,2) en demi-point ; la couleur 7 : (1,1) */
  for (const [x, y] of [[0, 0], [3, 0], [5, 3]]) p.cross[y * 6 + x] = 5;
  p.fwd[2 * 6 + 2] = 5; p.cross[1 * 6 + 1] = 7;
  return p;
}
const cocher = (p: ReturnType<typeof motif>, x: number, y: number) => { const q = { ...p, done: p.done.slice() }; q.done[y * p.w + x] = 1; return q; };

describe("Le suivi de la couleur active", () => {
  it("les points restants : croix et demi-points de cette couleur, pas les autres ni les brodés", () => {
    const p = motif();
    expect(restants(p, 5)).toEqual([0, 3, 14, 23]);
    expect(restants(cocher(p, 3, 0), 5)).toEqual([0, 14, 23]);
    expect(restants(p, 7)).toEqual([7]);
  });
  it("sans point coché, le prochain est le premier dans l'ordre de lecture", () => {
    expect(prochainPoint(motif(), 5)).toEqual({ i: 0, x: 0, y: 0, reste: 4 });
  });
  it("après un point coché, on continue au plus près de la main", () => {
    const p = motif(), q = cocher(p, 5, 3);
    const d = dernierCoche(p, q, 5);
    expect(d).toBe(23);
    expect(prochainPoint(q, 5, d)).toMatchObject({ x: 2, y: 2, reste: 3 });
  });
  it("un point coché d'une autre couleur ne déplace pas le suivi ; la couleur terminée n'a plus de prochain point", () => {
    const p = motif();
    expect(dernierCoche(p, cocher(p, 1, 1), 5)).toBeNull();
    expect(dernierCoche(null, p, 5)).toBeNull();
    let q = p; for (const [x, y] of [[0, 0], [3, 0], [5, 3], [2, 2]]) q = cocher(q, x, y);
    expect(prochainPoint(q, 5)).toBeNull();
  });
});
