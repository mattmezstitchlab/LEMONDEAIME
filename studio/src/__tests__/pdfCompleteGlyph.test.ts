import { describe, expect, it } from "vitest";
import { readCompleteGlyphChart } from "../lib/pdfGlyphChart";
import { assembleFromTileLayout, positionsPuzzle } from "../components/PdfPrep";
import { flossIndex } from "../lib/dmc";
import type { PdfHandle, RawItem } from "../lib/pdfimport";
import type { PdfBlock } from "../lib/pdfAnalysis";

const glyph = (str: string, x: number, y: number): RawItem => ({
  str, x, y, w: 9, size: 12, font: "CustomSymbolFont",
});

function syntheticFile(): PdfHandle {
  // Structure exacte d'une grille multipage 193 × 200, mais les points sont
  // fictifs et sans rapport avec la création protégée utilisée pour le diagnostic.
  const widths = [49, 53, 53, 38], heights = [68, 68, 64];
  const pages: RawItem[][] = Array.from({ length: 15 }, () => []);
  const chars = ["\uf021", "\uf022", "\uf024", "\uf025"];
  let page = 1;
  for (let row = 0; row < heights.length; row++) {
    for (let col = 0; col < widths.length; col++) {
      const tile: RawItem[] = [];
      for (let y = 0; y < heights[row]; y++) {
        for (let x = 0; x < widths[col]; x++) {
          const v = (x + y + col * 7 + row * 11) % 9;
          tile.push(glyph(v > 3 ? "\uf020" : chars[v], 70 + x * 12, 110 + y * 12));
        }
      }
      pages[page++] = tile;
    }
  }
  const legend: RawItem[] = [
    glyph("Instructions and Symbol Key for Design", 30, 15),
    glyph("193 x 200", 145, 54),
  ];
  [
    ["\uf021", "310 Black"],
    ["\uf022", "321 Red"],
    ["\uf024", "828 Sky blue"],
    ["\uf025", "3820 Yellow"],
  ].forEach(([symbol, code], i) => {
    legend.push(glyph(symbol, 95, 210 + 18 * i));
    legend.push(glyph(code, 160, 210 + 18 * i));
  });
  pages[13] = legend;
  return {
    pages: 15,
    rawText: async n => pages[n - 1],
    dims: async () => ({ w: 595, h: 842 }),
    text: async () => [],
    render: async () => { throw Error("Le mode glyphes n'a pas besoin du raster."); },
    destroy: () => {},
  };
}

describe("Import intégral d'un PDF multipage à police de symboles", () => {
  it("reconnaît 12 cartes et leur ordre exact de 4 colonnes × 3 rangées", async () => {
    const result = await readCompleteGlyphChart(syntheticFile());
    expect(result.ok, result.reason).toBe(true);
    expect(result.columns).toBe(4);
    expect(result.tiles).toHaveLength(12);
    expect(result.tiles.slice(0, 4).map(t => t.cols)).toEqual([49, 53, 53, 38]);
    expect(result.tiles.filter(t => t.page === 10)[0].rows).toBe(64);
    expect(result.width).toBe(193);
    expect(result.height).toBe(200);
    expect(result.mapped + result.blank + result.unresolved).toBe(193 * 200);
    expect(result.unresolved).toBe(0);
    expect(result.legendCount).toBe(4);
  });

  it("conserve les 38 600 positions et les codes DMC dans le puzzle de l'atelier", async () => {
    const glyphs = await readCompleteGlyphChart(syntheticFile());
    expect(glyphs.ok).toBe(true);
    const blocks: PdfBlock[] = glyphs.tiles.map(t => ({
      id: "page-" + t.page, page: t.page, cols: t.cols, rows: t.rows,
      ...t.bounds, label: "",
    }));
    const dims = { cols: 50, rows: 68 };
    const placement = positionsPuzzle(blocks, glyphs.columns, false, dims);
    const layout = blocks.map(b => ({ b, x: placement[b.id].x, y: placement[b.id].y, w: b.cols, h: b.rows }));
    const data = blocks.map(b => {
      const tile = glyphs.tiles.find(t => t.page === b.page)!;
      return { b, data: { cells: tile.cells, byColor: 0, byLegend: tile.mapped, unresolved: tile.unresolved } };
    });
    const result = assembleFromTileLayout(data, layout, "Synthétique");
    expect(result.pattern.w).toBe(193);
    expect(result.pattern.h).toBe(200);
    expect(result.scaled).toBe(false);
    expect(result.pattern.cross.length).toBe(38_600);
    expect(Array.from(result.pattern.cross).filter(v => v >= 0).length).toBe(glyphs.mapped);
    expect(result.pattern.palette).toContain(flossIndex("310"));
    expect(result.pattern.palette).toContain(flossIndex("828"));
    expect(result.pattern.palette).toContain(flossIndex("3820"));
  });

  it("refuse une légende absente sans attribuer arbitrairement les couleurs", async () => {
    const src = syntheticFile();
    const orig = src.rawText;
    src.rawText = async (n, w) => n === 14 ? [] : orig(n, w);
    const result = await readCompleteGlyphChart(src);
    expect(result.ok).toBe(false);
    expect(result.mapped).toBe(0);
  });
});
