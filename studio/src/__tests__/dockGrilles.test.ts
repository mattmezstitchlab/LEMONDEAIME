import { describe, expect, it } from "vitest";
import { casesParFil } from "../components/DockGrilles";
import { createPattern, TOILE_DEFAUT, fromObject, toObject } from "../lib/pattern";

describe("Les fils qui scintillent : où chaque fil est brodé", () => {
  it("range les cases par fil et cadre le motif brodé", () => {
    const p = createPattern("t", 20, 10, 14, 2);
    p.cross[2 * 20 + 3] = 5; p.cross[7 * 20 + 15] = 5; p.cross[4 * 20 + 9] = 8;
    const { parFil, cadre } = casesParFil(p);
    expect(parFil.get(5)).toEqual([2 * 20 + 3, 7 * 20 + 15]);
    expect(parFil.get(8)).toEqual([4 * 20 + 9]);
    expect(cadre).toEqual({ x0: 3, y0: 2, x1: 15, y1: 7 });
  });
  it("une grille vide n'a ni fil ni cadre", () => {
    const { parFil, cadre } = casesParFil(createPattern("v", 8, 8, 14, 2));
    expect(parFil.size).toBe(0); expect(cadre).toBeNull();
  });
});
describe("La toile gris clair", () => {
  it("une nouvelle grille est gris clair, et l'ancien crème par défaut se relit en gris clair", () => {
    const p = createPattern("t", 4, 4, 14, 2);
    expect(p.fabric?.color).toBe(TOILE_DEFAUT);
    const o = toObject(p) as { fabric: { color: string } };
    o.fabric.color = "#f7f2e8";
    expect(fromObject(o)!.fabric?.color).toBe(TOILE_DEFAUT);
    o.fabric.color = "#203040";
    expect(fromObject(o)!.fabric?.color).toBe("#203040");
  });
});
