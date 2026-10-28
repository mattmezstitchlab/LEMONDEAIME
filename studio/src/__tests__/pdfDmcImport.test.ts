import { describe, expect, it } from "vitest";
import { FLOSS, flossIndex } from "../lib/dmc";
import { createPattern, ensurePalette } from "../lib/pattern";
import { closestDmcAlternatives, patternFromVector, remapImportedPalette } from "../lib/pdfColorImport";
import { codeOfText, readVectorChart, type VectorResult } from "../lib/pdfVector";
import type { PdfHandle, RawItem } from "../lib/pdfimport";

function fakeVector(): VectorResult {
  const cells = new Map<string, string>();
  for (let y = 20; y < 32; y++) for (let x = 10; x < 22; x++) {
    if (x === 20 && y === 30) continue;
    cells.set(x + "," + y, x % 2 ? "310" : "321");
  }
  return {
    ok: true, reason: "", cells,
    bounds: { minC: 10, maxC: 21, minR: 20, maxR: 31 },
    pages: [], legendChars: 2, legendPairs: 2,
    unmapped: { "?": 1 }, conflicts: 0,
  };
}


describe("Lecture réelle des symboles d'un PDF vectoriel", () => {
  it("lit DMC #310 et 321 Blue sans confondre les numéros d'axes", () => {
    expect(codeOfText("DMC #310")).toBe("310");
    expect(codeOfText("321 Red")).toBe("321");
    expect(codeOfText("DMC: 321 Rouge")).toBe("321");
    expect(codeOfText("Symbol 999")).toBe("");
    expect(codeOfText("hello")).toBe("");
  });

  it("associe les glyphes d'une grille à la légende et crée un vrai patron coloré", async () => {
    const item = (str: string, x: number, y: number, w = 10): RawItem => ({
      str, x, y, w, size: 10, font: "TestFont",
    });
    const axis: RawItem[] = [
      item("0", 250, 150), item("5", 300, 150), item("10", 350, 150, 10),
      item("0", 150, 255), item("5", 150, 305), item("10", 150, 355, 10),
    ];
    const grid: RawItem[] = [];
    for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) {
      grid.push(item(x % 2 ? "#" : "*", 250 + x * 10, 255 + y * 10));
    }
    const legend = [
      item("*", 100, 100), item("DMC #321", 138, 100, 70),
      item("#", 100, 125), item("DMC: 310 Black", 138, 125, 100),
    ];
    const handle: PdfHandle = {
      pages: 2,
      dims: async () => ({ w: 1000, h: 1000 }),
      rawText: async page => page === 1 ? [...axis, ...grid] : legend,
      text: async () => [],
      render: async () => { throw new Error("Image rendering not required for vector data"); },
      destroy: () => {},
    };
    const result = await readVectorChart(handle, new Map([[1, [{ x0: 20, y0: 20, x1: 80, y1: 80 }]]]));
    expect(result.ok).toBe(true);
    expect(result.legendChars).toBe(2);
    expect(result.cells.size).toBe(121);
    const restored = patternFromVector(result, "Motif vectoriel");
    expect(restored).not.toBeNull();
    expect(restored!.w).toBe(11);
    expect(restored!.h).toBe(11);
    expect(restored!.cross[0]).toBe(flossIndex("321"));
    expect(restored!.cross[1]).toBe(flossIndex("310"));
  });
});

describe("Import PDF - rétablissement des références DMC", () => {
  it("transforme réellement les cellules vectorielles DMC en grille native avec leurs couleurs exactes", () => {
    const p = patternFromVector(fakeVector(), "Grille importée");
    expect(p).not.toBeNull();
    expect(p!.w).toBe(12);
    expect(p!.h).toBe(12);
    expect(p!.name).toBe("Grille importée");
    expect(p!.cross[0]).toBe(flossIndex("321"));
    expect(p!.cross[1]).toBe(flossIndex("310"));
    expect(p!.cross[(30 - 20) * 12 + (20 - 10)]).toBe(-1);
    expect(p!.palette.map(idx => FLOSS[idx].code).sort()).toEqual(["310", "321"]);
  });

  it("refuse les résultats incomplets et les dimensions incohérentes", () => {
    expect(patternFromVector({ ...fakeVector(), ok: false }, "x")).toBeNull();
    expect(patternFromVector({ ...fakeVector(), bounds: { minC: 0, minR: 0, maxC: 999999, maxR: 999999 } }, "x")).toBeNull();
  });

  it("propose des couleurs voisines sans remplacer le code source à la place de la personne", () => {
    const red = flossIndex("321");
    const matches = closestDmcAlternatives(red, 3);
    expect(matches).toHaveLength(3);
    expect(matches.every(r => r.idx !== red && r.deltaE >= 0)).toBe(true);
  });

  it("remplace simultanément les couleurs, sans les mélanger ni modifier l'original", () => {
    const p = createPattern("Echange", 3, 2);
    const red = flossIndex("321"), black = flossIndex("310");
    ensurePalette(p, red); ensurePalette(p, black);
    p.cross[0] = red;
    p.cross[1] = black;
    p.fwd[3] = black;
    p.knots.push({ x: 1, y: 1, c: red });
    const revised = remapImportedPalette(p, { "321": "310", "310": "321" });
    expect(revised.cross[0]).toBe(black);
    expect(revised.cross[1]).toBe(red);
    expect(revised.fwd[3]).toBe(red);
    expect(revised.knots[0].c).toBe(black);
    expect(p.cross[0]).toBe(red);
    expect(p.cross[1]).toBe(black);
    const invalid = remapImportedPalette(p, { "321": "XXXX" });
    expect(invalid.cross[0]).toBe(red);
  });
});
