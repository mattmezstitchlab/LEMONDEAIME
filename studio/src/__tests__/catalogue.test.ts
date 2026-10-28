import { describe, expect, it } from "vitest";
import { CATALOGUE, fabriquerPatron } from "../lib/catalogue";
import { FLOSS } from "../lib/dmc";
import { computeStats } from "../lib/pattern";
import { buildPdf } from "../lib/pdf";

describe("catalogue de patrons vendables", () => {
  it("propose des fiches uniques avec des prix indicatifs et une catégorie", () => {
    expect(CATALOGUE.length).toBeGreaterThanOrEqual(8);
    expect(new Set(CATALOGUE.map(p => p.id)).size).toBe(CATALOGUE.length);
    for (const item of CATALOGUE) {
      expect(item.prixCents).toBeGreaterThan(0);
      expect(item.taille[0]).toBeGreaterThan(8);
      expect(item.theme.length).toBeGreaterThan(0);
    }
  });
  it.each(CATALOGUE.map(p => [p.id]))("%s est un vrai projet de point de croix DMC complet", (id) => {
    const p = fabriquerPatron(id);
    expect(p.cross.length).toBe(p.w * p.h);
    expect(p.palette.length).toBeGreaterThan(1);
    expect(p.palette.every(idx => Boolean(FLOSS[idx]))).toBe(true);
    expect(Array.from(p.cross).filter(idx => idx >= 0).length).toBeGreaterThan(70);
    expect(p.provenance?.kind).toBe("original");
    expect(p.provenance?.personalOnly).toBe(true);
    const { totals } = computeStats(p);
    expect(totals).toBeDefined();
  });
  it("produit bien les PDF couleur et symboles à partir du même patron", async () => {
    const pattern = fabriquerPatron("bouquet-champetre");
    const couleur = await buildPdf(pattern, { bw: false, paper: "a4" });
    const symboles = await buildPdf(pattern, { bw: true, paper: "a4" });
    expect(couleur.type).toBe("application/pdf");
    expect(symboles.type).toBe("application/pdf");
    expect(couleur.size).toBeGreaterThan(5000);
    expect(symboles.size).toBeGreaterThan(5000);
  });
  it("n'expose aucun patron inexistant", () => {
    expect(() => fabriquerPatron("inconnu")).toThrow("Patron introuvable");
  });
});
