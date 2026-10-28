import { describe, expect, it } from "vitest";
import { assembleFromTileLayout, positionsPuzzle } from "../components/PdfPrep";
import type { PdfBlock } from "../lib/pdfAnalysis";
import { flossIndex } from "../lib/dmc";

const block = (id: string, cols: number, rows: number): PdfBlock => ({
  id, page: 1, x0: 0, y0: 0, x1: 90, y1: 90, cols, rows, label: "",
});

describe("Puzzle du PDF : aucune zone perdue", () => {
  it("aligne les blocs différents sans chevauchement horizontal ou vertical", () => {
    const a = block("a", 50, 40), b = block("b", 35, 80), c = block("c", 25, 20), d = block("d", 20, 20);
    const pos = positionsPuzzle([a, b, c, d], 2, false, { cols: 40, rows: 50 });
    expect(pos.a).toEqual({ x: 0, y: 0 });
    expect(pos.b).toEqual({ x: 50, y: 0 });
    expect(pos.c).toEqual({ x: 0, y: 80 });
    expect(pos.d).toEqual({ x: 25, y: 80 });
  });

  it("reste réordonnable sans changer le contenu des cartes", () => {
    const a = block("a", 50, 40), b = block("b", 25, 25);
    const original = positionsPuzzle([a, b], 2, false, { cols: 30, rows: 30 });
    const moved = positionsPuzzle([b, a], 2, false, { cols: 30, rows: 30 });
    expect(original.b.x).toBe(50);
    expect(moved.a.x).toBe(25);
  });

  it("conserve la dernière page au-delà de 1000 cases sans la replier sur la bordure", () => {
    const first = block("page1", 980, 10);
    const last = block("page2", 40, 10);
    const black = flossIndex("310"), red = flossIndex("321");
    const data = [
      { b: first, data: { cells: new Int16Array(first.cols * first.rows).fill(black), byColor: 1, byLegend: 0, unresolved: 0 } },
      { b: last, data: { cells: new Int16Array(last.cols * last.rows).fill(red), byColor: 1, byLegend: 0, unresolved: 0 } },
    ];
    const layout = [
      { b: first, x: 0, y: 0, w: 980, h: 10 },
      { b: last, x: 980, y: 0, w: 40, h: 10 },
    ];
    const result = assembleFromTileLayout(data, layout, "Deux pages");
    expect(result.scaled).toBe(true);
    expect(result.fitW).toBe(1000);
    const lastRowColors = Array.from(result.pattern.cross.slice(960, 1000));
    expect(lastRowColors).toContain(red);
    expect(result.pattern.cross[0]).toBe(black);
  });

  it("si les tailles sont uniformisées, remplit la zone et garde les couleurs", () => {
    const b = block("carte", 2, 2);
    const red = flossIndex("321");
    const assembled = assembleFromTileLayout([
      { b, data: { cells: new Int16Array([red, red, red, red]), byColor: 4, byLegend: 0, unresolved: 0 } },
    ], [{ b, x: 0, y: 0, w: 4, h: 4 }], "Uniformisée");
    expect(assembled.pattern.w).toBe(4);
    expect([...assembled.pattern.cross].every(v => v === red)).toBe(true);
  });
});
