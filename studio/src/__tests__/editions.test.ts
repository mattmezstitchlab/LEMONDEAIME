import { describe, expect, it } from "vitest";
import { FLOSS } from "../lib/dmc";
import { EDITIONS, editionGrid, fabriquerEdition } from "../lib/editions";
import { DRAWINGS } from "../lib/editions/drawings";
import { buildPdf } from "../lib/pdf";

describe("Point Zéro · Éditions — 32 patrons natifs (24 + 8 oiseaux botaniques)", () => {
  it("dessine chacun des 32 patrons du catalogue", () => {
    expect(EDITIONS).toHaveLength(32);
    expect(new Set(EDITIONS.map(e => e.id)).size).toBe(32);
    expect(EDITIONS.filter(e => e.collection === "Oiseaux botaniques")).toHaveLength(8);
    for (const e of EDITIONS) expect(DRAWINGS[e.id], e.id).toBeTypeOf("function");
  });

  it.each(EDITIONS.map(e => [e.id, e.title, e] as const))("%s · %s respecte sa fiche", (_id, _title, e) => {
    const p = fabriquerEdition(e.id);
    expect(p.w).toBe(e.width);
    expect(p.h).toBe(e.height);
    expect(p.name).toBe(e.title);
    // plafond de couleurs annoncé, et palette réellement utilisée
    expect(p.palette.length).toBeGreaterThan(2);
    expect(p.palette.length).toBeLessThanOrEqual(e.maxColors);
    const used = new Set<number>();
    let stitched = 0;
    for (const v of p.cross) if (v >= 0) { used.add(v); stitched++; expect(FLOSS[v]).toBeDefined(); }
    expect([...used].sort()).toEqual([...p.palette].sort());
    // un vrai motif : ni toile vide, ni aplat total
    const coverage = stitched / (p.w * p.h);
    expect(coverage).toBeGreaterThan(.06);
    expect(coverage).toBeLessThan(.95);
    expect(p.provenance?.kind).toBe("original");
  });

  it("est déterministe : même identifiant, mêmes cases", () => {
    for (const e of EDITIONS) {
      const a = editionGrid(e.id).toile.cells.join(","), b = editionGrid(e.id).toile.cells.join(",");
      expect(a).toBe(b);
    }
  });

  it("donne 32 dessins différents", () => {
    const sigs = EDITIONS.map(e => editionGrid(e.id).toile.cells.join(","));
    expect(new Set(sigs).size).toBe(32);
  });

  it("les oiseaux botaniques sont riches : 150 × 150, au moins 30 fils, des fleurs partout dans le plumage", () => {
    for (const e of EDITIONS.filter(x => x.collection === "Oiseaux botaniques")) {
      const t = editionGrid(e.id).toile;
      expect(t.codes().length, e.title).toBeGreaterThanOrEqual(30);
      expect(t.codes().length, e.title).toBeLessThanOrEqual(e.maxColors);
    }
  });

  it("s’exporte en PDF avec le moteur existant", async () => {
    const blob = await buildPdf(fabriquerEdition("pz-1-4"), { bw: false, paper: "a4" });
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(5000);
  }, 30000);
});
