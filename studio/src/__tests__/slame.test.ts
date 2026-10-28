import { describe, expect, it } from "vitest";
import { createPattern } from "../lib/pattern";
import { FLOSS } from "../lib/dmc";
import { appendWaypoint, makeMusicDemo, motifTrail, rasterLine, stepsForTrail, stitchAt } from "../lib/slame";

describe("SLÂME : le fil de la musique", () => {
  it("trace A -> B -> C et préserve les retours", () => {
    const path = appendWaypoint(appendWaypoint([], { x: 0, y: 0 }), { x: 3, y: 3 });
    const back = appendWaypoint(path, { x: 0, y: 0 });
    expect(path).toHaveLength(4);
    expect(back[back.length - 1]).toEqual({ x: 0, y: 0 });
    expect(back.length).toBeGreaterThan(path.length);
    expect(rasterLine({ x: 0, y: 0 }, { x: 0, y: 0 })).toHaveLength(1);
  });
  it("traduit les vraies couleurs et les blancs en notes / silences", () => {
    const p = createPattern("Essai", 3, 3);
    p.cross[0] = FLOSS.findIndex(f => f.code === "321");
    const events = stepsForTrail(p, [{ x: 0, y: 0 }, { x: 1, y: 0 }], "pentatonic", "tender");
    expect(events[0].code).toBe("321");
    expect(events[0].midi).not.toBeNull();
    expect(events[1].kind).toBe("silence");
    expect(events[1].midi).toBeNull();
  });
  it("interprète les points arrière et les noeuds sans toucher au motif", () => {
    const p = createPattern("Contour", 4, 4);
    const idx = FLOSS.findIndex(f => f.code === "321");
    p.back.push({ x1: 0, y1: 0, x2: 4, y2: 4, c: idx });
    expect(stitchAt(p, { x: 1, y: 1 })?.kind).toBe("back");
    const sample = makeMusicDemo();
    expect(motifTrail(sample).length).toBeGreaterThan(10);
    expect(sample.cross.length).toBe(256);
  });
});