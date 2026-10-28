import { describe, expect, it } from "vitest";
import { createPattern, ensurePalette, type Pattern, type Seg } from "../lib/pattern";
import { flossIndex } from "../lib/dmc";
import { drawShape } from "../lib/editing";
import {
  addLongTo,
  applyStrokeSegment,
  MIRROR_TOOLS,
  mirrorContexts,
  mirrorPoints,
  nodeOf,
  reflectPoint,
  symmetryAxes,
  type Node,
  type Pt,
  type StrokeCtx,
  type Symmetry,
  type Tool,
} from "../lib/stitch";

const RED = flossIndex("321");
const BLUE = flossIndex("3801");

/**
 * Joue un trait complet, exactement comme le canvas le fait : un contexte, ses
 * reflets, puis les échantillons. `p` est muté sur place, comme un brouillon.
 */
function stroke(p: Pattern, tool: Tool, from: Pt, to: Pt, sym: Symmetry, color = RED): boolean {
  // Comme dans l'atelier : le noeud français n'a pas de noeud précédent.
  const lastNode: Node | null = tool === "knot" ? null : nodeOf(p, from);
  const ctx: StrokeCtx = { tool, color, lastNode, fillDone: false, markMode: -1 };
  const mirrors = MIRROR_TOOLS.includes(tool) ? mirrorContexts(p, ctx, sym) : [];
  return applyStrokeSegment(p, ctx, mirrors, from, to, sym);
}

/** Segments identiques à l'orientation près. */
const sameSeg = (a: Seg, b: Seg) =>
  a.c === b.c && ((a.x1 === b.x1 && a.y1 === b.y1 && a.x2 === b.x2 && a.y2 === b.y2) ||
    (a.x1 === b.x2 && a.y1 === b.y2 && a.x2 === b.x1 && a.y2 === b.y1));

describe("Symétrie : géométrie des reflets", () => {
  it("liste les axes dans un ordre stable", () => {
    expect(symmetryAxes("none")).toEqual([]);
    expect(symmetryAxes(undefined)).toEqual([]);
    expect(symmetryAxes("x")).toEqual(["x"]);
    expect(symmetryAxes("y")).toEqual(["y"]);
    expect(symmetryAxes("both")).toEqual(["x", "y", "xy"]);
  });

  it("reflète autour du centre de la grille", () => {
    const p = { w: 10, h: 8 };
    expect(reflectPoint(p, { x: 2, y: 3 }, "x")).toEqual({ x: 8, y: 3 });
    expect(reflectPoint(p, { x: 2, y: 3 }, "y")).toEqual({ x: 2, y: 5 });
    expect(reflectPoint(p, { x: 2, y: 3 }, "xy")).toEqual({ x: 8, y: 5 });
    // Le reflet du reflet est le point de départ, y compris sur les demi-cases.
    const q = { x: 3.5, y: 2.25 };
    expect(reflectPoint(p, reflectPoint(p, q, "x"), "x")).toEqual(q);
    expect(reflectPoint(p, reflectPoint(p, q, "xy"), "xy")).toEqual(q);
  });

  it("donne trois reflets en symétrie double, sans le point d'origine", () => {
    const p = { w: 10, h: 10 };
    const all = mirrorPoints(p, { x: 1.5, y: 1.5 }, "both");
    expect(all).toEqual([
      { x: 8.5, y: 1.5 },
      { x: 1.5, y: 8.5 },
      { x: 8.5, y: 8.5 },
    ]);
    expect(mirrorPoints(p, { x: 1, y: 1 }, "none")).toEqual([]);
  });

  it("donne à chaque reflet son propre état de tracé", () => {
    const p = { w: 10, h: 10 };
    const ctx: StrokeCtx = { tool: "back", color: RED, lastNode: { x: 1, y: 1 }, fillDone: false, markMode: -1 };
    const mirrors = mirrorContexts(p, ctx, "both");
    expect(mirrors).toHaveLength(3);
    expect(mirrors.map((m) => m.lastNode)).toEqual([
      { x: 9, y: 1 },
      { x: 1, y: 9 },
      { x: 9, y: 9 },
    ]);
    // Le noeud français repart de rien, comme le contexte d'origine.
    expect(mirrorContexts(p, { ...ctx, tool: "knot", lastNode: null }, "both").every((m) => m.lastNode === null)).toBe(true);
    // Les contextes sont des copies : faire avancer un reflet ne bouge pas les autres.
    mirrors[0].fillDone = true;
    expect(ctx.fillDone).toBe(false);
    expect(mirrors[1].fillDone).toBe(false);
  });
});

describe("Symétrie : ce qui est reflété", () => {
  it("réserve la symétrie aux outils qui posent du fil", () => {
    const pose: Tool[] = ["cross", "half", "quarter", "threeQuarter", "petite", "bead", "erase", "fill", "knot", "back"];
    for (const t of pose) expect(MIRROR_TOOLS).toContain(t);
    // Refléter le suivi ferait mentir l'avancement : ces outils restent du côté
    // où l'on brode.
    const suivi: Tool[] = ["mark", "details", "block", "row", "park", "unpick", "note", "pick", "hand", "select", "lasso", "move"];
    for (const t of suivi) expect(MIRROR_TOOLS).not.toContain(t);
  });

  it("pose les croix des deux côtés, et des quatre en symétrie double", () => {
    const p = createPattern("Reflet", 10, 10, 14, 2);
    expect(stroke(p, "cross", { x: 1.5, y: 1.5 }, { x: 1.5, y: 1.5 }, "x")).toBe(true);
    expect(p.cross[1 * 10 + 1]).toBe(RED);
    expect(p.cross[1 * 10 + 8]).toBe(RED);

    const q = createPattern("Reflet", 10, 10, 14, 2);
    stroke(q, "cross", { x: 1.5, y: 1.5 }, { x: 1.5, y: 1.5 }, "both");
    for (const i of [1 * 10 + 1, 1 * 10 + 8, 8 * 10 + 1, 8 * 10 + 8]) expect(q.cross[i]).toBe(RED);
    expect(Array.from(q.cross).filter((v) => v === RED)).toHaveLength(4);

    const seul = createPattern("Reflet", 10, 10, 14, 2);
    stroke(seul, "cross", { x: 1.5, y: 1.5 }, { x: 1.5, y: 1.5 }, "none");
    expect(Array.from(seul.cross).filter((v) => v === RED)).toHaveLength(1);
  });

  it("retourne un quart de point dans le bon coin du reflet", () => {
    const p = createPattern("Quarts", 10, 10, 14, 2);
    // Coin haut-gauche de la case (1,1) ; son reflet horizontal est le coin
    // haut-droit de la case (8,1), pas le même coin.
    stroke(p, "quarter", { x: 1.25, y: 1.25 }, { x: 1.25, y: 1.25 }, "x");
    expect(p.q[0][1 * 10 + 1]).toBe(RED);
    expect(p.q[1][1 * 10 + 8]).toBe(RED);
    expect(p.q[0][1 * 10 + 8]).toBe(-1);
    expect(p.q[1][1 * 10 + 1]).toBe(-1);
  });

  it("remplit la zone reflétée, une seule fois par côté", () => {
    const p = createPattern("Remplissage", 10, 10, 14, 2);
    // Deux murs verticaux délimitent une zone à gauche et une à droite.
    for (let y = 0; y < 10; y++) {
      p.cross[y * 10 + 4] = BLUE;
      p.cross[y * 10 + 5] = BLUE;
    }
    ensurePalette(p, BLUE);
    expect(stroke(p, "fill", { x: 1.5, y: 1.5 }, { x: 1.5, y: 1.5 }, "x")).toBe(true);
    for (let y = 0; y < 10; y++) {
      for (const x of [0, 1, 2, 3]) expect(p.cross[y * 10 + x]).toBe(RED);
      for (const x of [6, 7, 8, 9]) expect(p.cross[y * 10 + x]).toBe(RED);
      expect(p.cross[y * 10 + 4]).toBe(BLUE);
    }
  });

  it("pose les noeuds français en miroir sans doublon", () => {
    const p = createPattern("Noeuds", 10, 10, 14, 2);
    stroke(p, "knot", { x: 1.5, y: 1.5 }, { x: 2.5, y: 1.5 }, "x");
    expect(p.knots.length).toBeGreaterThanOrEqual(4);
    expect(p.knots.length % 2).toBe(0);
    for (const k of p.knots) {
      // Jamais deux noeuds au même endroit…
      expect(p.knots.filter((o) => o.x === k.x && o.y === k.y)).toHaveLength(1);
      // …et chaque noeud a son reflet.
      expect(p.knots.some((o) => o.x === p.w - k.x && o.y === k.y)).toBe(true);
    }
    expect(p.knots.filter((k) => k.x < p.w / 2)).toHaveLength(p.knots.length / 2);
    // Repasser au même endroit ne rajoute rien : c'est ce qui permet de muter
    // un seul brouillon pendant tout le trait sans le recloner.
    const avant = p.knots.length;
    expect(stroke(p, "knot", { x: 1.5, y: 1.5 }, { x: 2.5, y: 1.5 }, "x")).toBe(false);
    expect(p.knots).toHaveLength(avant);
  });

  it("reflète un point arrière sans jamais traverser l'axe", () => {
    const p = createPattern("Arrière", 10, 10, 14, 2);
    stroke(p, "back", { x: 1, y: 1 }, { x: 4, y: 1 }, "x");
    expect(p.back.length).toBeGreaterThanOrEqual(4);
    const half = p.w / 2;
    for (const s of p.back) {
      // Un segment dont les extrémités sont de part et d'autre de l'axe serait
      // la signature d'un reflet qui repart du noeud réel.
      expect(s.x1 < half === s.x2 < half).toBe(true);
      const reflet: Seg = { x1: p.w - s.x1, y1: s.y1, x2: p.w - s.x2, y2: s.y2, c: s.c };
      expect(p.back.some((o) => sameSeg(o, reflet))).toBe(true);
    }
  });

  it("reflète une forme au relâchement", () => {
    const p = createPattern("Formes", 10, 10, 14, 2);
    const a = { x: 1.5, y: 1.5 }, b = { x: 1.5, y: 5.5 };
    let d = drawShape(p, "line", a, b, RED);
    for (const axis of symmetryAxes("x")) {
      d = drawShape(d, "line", reflectPoint(p, a, axis), reflectPoint(p, b, axis), RED);
    }
    for (let y = 1; y <= 5; y++) {
      expect(d.cross[y * 10 + 1]).toBe(RED);
      expect(d.cross[y * 10 + 8]).toBe(RED);
    }
  });

  it("reflète un lancé au relâchement", () => {
    const p = createPattern("Lancé", 10, 10, 14, 2);
    const a = nodeOf(p, { x: 1, y: 1 }), b = nodeOf(p, { x: 3, y: 4 });
    expect(addLongTo(p, a, b, RED)).toBe(true);
    expect(addLongTo(p, reflectPoint(p, a, "x"), reflectPoint(p, b, "x"), RED)).toBe(true);
    expect(p.long).toHaveLength(2);
    for (const s of p.long) {
      const reflet: Seg = { x1: p.w - s.x1, y1: s.y1, x2: p.w - s.x2, y2: s.y2, c: s.c };
      expect(p.long.some((o) => sameSeg(o, reflet))).toBe(true);
    }
  });

  it("ne reflète pas le surlignage d'avancement", () => {
    const p = createPattern("Suivi", 10, 10, 14, 2);
    p.cross[1 * 10 + 1] = RED;
    p.cross[1 * 10 + 8] = RED;
    ensurePalette(p, RED);
    expect(stroke(p, "mark", { x: 1.5, y: 1.5 }, { x: 1.5, y: 1.5 }, "x")).toBe(true);
    expect(p.done[1 * 10 + 1]).toBe(1);
    // La case symétrique n'est pas brodée : la marquer ferait mentir le suivi.
    expect(p.done[1 * 10 + 8]).toBe(0);
  });

  it("ne reflète pas une erreur à défaire", () => {
    const p = createPattern("À défaire", 10, 10, 14, 2);
    p.cross[1 * 10 + 1] = RED;
    p.cross[1 * 10 + 8] = RED;
    ensurePalette(p, RED);
    stroke(p, "unpick", { x: 1.5, y: 1.5 }, { x: 1.5, y: 1.5 }, "x");
    expect(p.mistakes).toEqual([1 * 10 + 1]);
  });
});

describe("Brouillon de trait", () => {
  it("signale un changement seulement quand le motif bouge", () => {
    const p = createPattern("Brouillon", 8, 8, 14, 2);
    expect(stroke(p, "cross", { x: 2.5, y: 2.5 }, { x: 2.5, y: 2.5 }, "none")).toBe(true);
    // Repasser sur la même case avec la même couleur : rien à propager, donc
    // rien à redescendre dans React ni à mettre en historique.
    expect(stroke(p, "cross", { x: 2.5, y: 2.5 }, { x: 2.5, y: 2.5 }, "none")).toBe(false);
    // La gomme sur une case vide non plus.
    expect(stroke(p, "erase", { x: 6.5, y: 6.5 }, { x: 6.5, y: 6.5 }, "none")).toBe(false);
    expect(stroke(p, "erase", { x: 2.5, y: 2.5 }, { x: 2.5, y: 2.5 }, "none")).toBe(true);
    expect(p.cross[2 * 8 + 2]).toBe(-1);
  });

  it("ne saute aucune case d'un trait rapide", () => {
    const p = createPattern("Glissé", 40, 4, 14, 2);
    stroke(p, "cross", { x: 0.5, y: 0.5 }, { x: 39.5, y: 0.5 }, "none");
    expect(Array.from(p.cross.subarray(0, 40)).every((v) => v === RED)).toBe(true);
  });

  it("ignore un échantillon hors de la grille", () => {
    const p = createPattern("Bords", 6, 6, 14, 2);
    expect(stroke(p, "cross", { x: -4, y: -4 }, { x: -4, y: -4 }, "none")).toBe(false);
    expect(stroke(p, "cross", { x: 99, y: 99 }, { x: 99, y: 99 }, "none")).toBe(false);
    expect(Array.from(p.cross).some((v) => v >= 0)).toBe(false);
  });
});
