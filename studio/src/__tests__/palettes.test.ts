import { describe, expect, it } from "vitest";
import { createPattern, ensurePalette, type Pattern } from "../lib/pattern";
import { FLOSS, flossIndex, registerBlend } from "../lib/dmc";
import {
  equivalencesCsv,
  equivalents,
  equivalenceWarning,
  FAR_DELTA_E,
  loadPalette,
  nearestIn,
  PALETTE_CHOICES,
  paletteLabel,
  STATUS_LABEL,
  type PaletteId,
} from "../lib/palettes";
import { buildPdf } from "../lib/pdf";
import { pageCount, pdfText } from "./helpers";

/**
 * Correspondances multi-marques.
 *
 * Le motif ne change jamais de langue : il reste en DMC. Ce qui est testé ici,
 * c'est la table de correspondance — son honnêteté sur le statut de la donnée,
 * l'appariement par code quand la marque numérote comme DMC, et l'écart
 * perceptuel affiché tel quel.
 */

const RED = flossIndex("321");
const BLACK = flossIndex("310");

function motif(): Pattern {
  const p = createPattern("Grille d’essai", 8, 8, 14, 2);
  p.cross.fill(RED);
  p.cross[0] = BLACK;
  ensurePalette(p, RED);
  ensurePalette(p, BLACK);
  return p;
}

describe("Tables fabricant", () => {
  it("charge les six tables proposées, complètes et mises en cache", async () => {
    const expected: Record<PaletteId, { count: number; status: string }> = {
      "dmc-diamond": { count: 154, status: "cross-checked" },
      "perler-midi": { count: 103, status: "community" },
      "hama-midi": { count: 92, status: "community" },
      "artkal-s": { count: 199, status: "community" },
      "mard-291": { count: 291, status: "community" },
      nabbi: { count: 30, status: "community" },
    };
    for (const choice of PALETTE_CHOICES) {
      const palette = await loadPalette(choice.id);
      expect(palette.count, choice.id).toBe(expected[choice.id].count);
      expect(palette.colors, choice.id).toHaveLength(expected[choice.id].count);
      expect(palette.status, choice.id).toBe(expected[choice.id].status);
      expect(palette.sources.length, choice.id).toBeGreaterThan(0);
      // La licence varie selon la table : les mesures MakeBead sont en
      // CC BY 4.0, les tables de perles à repasser viennent de
      // maxcleme/beadcolors sous MIT. Ni l'une ni l'autre ne doit être
      // annoncée à la place de l'autre.
      expect(palette.license, choice.id).toMatch(/CC-BY-4\.0|MIT \(maxcleme\/beadcolors/);
      expect(equivalenceWarning(await equivalents(motif(), choice.id)), choice.id).toContain(palette.license);
      // La note de la source est conservée : c'est elle qui dit ce que vaut la mesure.
      expect(palette.notes.length, choice.id).toBeGreaterThan(20);
      expect(await loadPalette(choice.id), choice.id).toBe(palette);
    }
    // Chaque table a un triplet sRGB et un Lab calculé.
    const perler = await loadPalette("perler-midi");
    for (const c of perler.colors) {
      expect(c.rgb).toHaveLength(3);
      expect(c.lab).toHaveLength(3);
      expect(c.hex).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("ne propose que les marques annoncées dans l'interface", () => {
    expect(PALETTE_CHOICES.map((c) => c.id)).toEqual([
      "dmc-diamond",
      "perler-midi",
      "hama-midi",
      "artkal-s",
      "mard-291",
      "nabbi",
    ]);
    for (const c of PALETTE_CHOICES) {
      expect(c.label.length).toBeGreaterThan(3);
      expect(c.use.length).toBeGreaterThan(3);
    }
  });

  it("traduit les statuts sans les embellir", async () => {
    const perler = await loadPalette("perler-midi");
    expect(STATUS_LABEL[perler.status]).toBe("contributive");
    expect(paletteLabel(perler)).toContain("table contributive (103 références");
    expect(paletteLabel(perler)).toContain("licence MIT (maxcleme/beadcolors");
    expect(paletteLabel(await loadPalette("dmc-diamond"))).toContain("licence CC-BY-4.0");
    const diamond = await loadPalette("dmc-diamond");
    expect(STATUS_LABEL[diamond.status]).toBe("recoupée");
    // Un statut inconnu reste affiché tel quel plutôt que traduit au hasard.
    expect(STATUS_LABEL["invented-status"] ?? "invented-status").toBe("invented-status");
  });

  it("classe les plus proches par écart croissant", async () => {
    const perler = await loadPalette("perler-midi");
    const matches = nearestIn(perler, FLOSS[RED].lab, 3);
    expect(matches).toHaveLength(3);
    expect(matches[0].deltaE).toBeLessThanOrEqual(matches[1].deltaE);
    expect(matches[1].deltaE).toBeLessThanOrEqual(matches[2].deltaE);
    expect(nearestIn(perler, FLOSS[RED].lab, 1)).toHaveLength(1);
    // Une table de 103 couleurs ne peut pas contenir les 489 DMC : l'écart est réel.
    expect(matches[0].deltaE).toBeGreaterThan(0);
  });
});

describe("Table de correspondance d'un motif", () => {
  it("liste les fils vraiment brodés, et rien d'autre", async () => {
    const table = await equivalents(motif(), "perler-midi");
    expect(table.rows).toHaveLength(2);
    expect(table.rows.map((r) => r.code).sort()).toEqual(["310", "321"].sort());
    const red = table.rows.find((r) => r.code === "321")!;
    expect(red.cells).toBe(63);
    expect(red.matches).toHaveLength(3);
    expect(table.median).toBeGreaterThan(0);
    expect(table.worst).toBeGreaterThanOrEqual(table.median);
    expect(table.far.every((r) => r.matches[0].deltaE > FAR_DELTA_E)).toBe(true);
  });

  it("ignore les fils sans point", async () => {
    const p = motif();
    p.palette = [...p.palette, flossIndex("Blanc")];
    const table = await equivalents(p, "hama-midi");
    expect(table.rows.some((r) => r.code === "Blanc")).toBe(false);
  });

  it("en broderie diamant, un code commun est le même code, pas une approximation", async () => {
    // Motif d'une seule couleur : les 154 références diamant sont un
    // sous-ensemble des codes DMC, donc la médiane dépend de ce qu'on y met.
    const seul = createPattern("Diamant", 6, 6, 14, 2);
    seul.cross.fill(RED);
    ensurePalette(seul, RED);
    const table = await equivalents(seul, "dmc-diamond");
    const red = table.rows.find((r) => r.code === "321")!;
    expect(red.matches[0].sameCode).toBe(true);
    expect(red.matches[0].code).toBe("321");
    // Les deux tables publient la même valeur pour ce code.
    expect(red.matches[0].deltaE).toBeCloseTo(0, 6);
    // Les propositions suivantes restent des approximations par teinte.
    expect(red.matches.slice(1).every((m) => !m.sameCode)).toBe(true);
    expect(table.median).toBeCloseTo(0, 6);
    expect(equivalenceWarning(table)).toContain("portent déjà le même code");
  });

  it("en perles à repasser, aucune marque ne numérote comme DMC", async () => {
    const table = await equivalents(motif(), "perler-midi");
    expect(table.rows.every((r) => r.matches.every((m) => !m.sameCode))).toBe(true);
    expect(equivalenceWarning(table)).not.toContain("même code");
    expect(table.worst).toBeGreaterThan(0);
  });

  it("un mélange de deux fils est apparié par sa teinte, jamais par son code", async () => {
    const mix = registerBlend("321", "Blanc", 1, 2);
    const p = createPattern("Mélangé", 6, 6, 14, 2);
    p.cross.fill(mix);
    ensurePalette(p, mix);
    const table = await equivalents(p, "dmc-diamond");
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0].matches.every((m) => !m.sameCode)).toBe(true);
    expect(table.rows[0].matches.length).toBeGreaterThan(0);
  });

  it("l'avertissement dit la marque, le statut, l'écart et la limite", async () => {
    const table = await equivalents(motif(), "perler-midi");
    const text = equivalenceWarning(table);
    expect(text).toContain("Perler");
    expect(text).toContain("community");
    expect(text).toContain("contributive");
    expect(text).toContain("licence MIT (maxcleme/beadcolors");
    expect(text).toContain(table.median.toFixed(1));
    expect(text).toContain(table.worst.toFixed(1));
    expect(text).toContain("103 références contre 489");
    expect(text).toContain("n'est pas une équivalence garantie");
    expect(text).toContain("cartes physiques");
  });

  it("le CSV garde les conventions de la liste d'achats", async () => {
    const table = await equivalents(motif(), "perler-midi", 2);
    const csv = equivalencesCsv(table);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const lines = csv.replace(/^\uFEFF/, "").trim().split("\n");
    expect(lines).toHaveLength(1 + table.rows.length);
    expect(lines[0]).toBe('"DMC";"Nom DMC";"Elements";"Perler 1";"Ecart 1";"Meme code 1";"Perler 2";"Ecart 2";"Meme code 2"');
    for (const line of lines.slice(1)) {
      expect(line.split(";")).toHaveLength(3 + 2 * 3);
      expect(line).toContain('"non"');
    }
    // Un nom avec guillemets est échappé, pas cassé.
    const quoted = equivalencesCsv({
      ...table,
      rows: [{ ...table.rows[0], name: 'Rouge "vif"' }],
    });
    expect(quoted).toContain('"Rouge ""vif"""');
  });
});

describe("La correspondance s'imprime", () => {
  it("ajoute une page dédiée et un résumé en couverture", async () => {
    const p = motif();
    const table = await equivalents(p, "dmc-diamond");
    const [plain, withTable] = await Promise.all([
      pdfText(await buildPdf(p, { bw: true })),
      pdfText(await buildPdf(p, { bw: true, equivalences: table })),
    ]);
    expect(pageCount(withTable)).toBeGreaterThan(pageCount(plain));
    expect(withTable).toContain("Correspondances DMC");
    // Les parenthèses sont échappées dans le flux PDF : assertion sans elles.
    expect(withTable).toContain("même code");
    expect(withTable).toContain("Correspondances multi-marques");
    expect(withTable).toContain("n'est pas une équivalence garantie");
    expect(plain).not.toContain("Correspondances multi-marques");
    expect(plain).not.toContain("Vos fils DMC");
  });

  it("n'imprime rien si la table est vide", async () => {
    const p = motif();
    const table = await equivalents(p, "nabbi");
    const empty = { ...table, rows: [] };
    const [a, b] = await Promise.all([
      pdfText(await buildPdf(p, { bw: true })),
      pdfText(await buildPdf(p, { bw: true, equivalences: empty })),
    ]);
    expect(pageCount(a)).toBe(pageCount(b));
    expect(b).not.toContain("Correspondances multi-marques");
    expect(b).not.toContain("Vos fils DMC");
  });

  it("reste lisible en noir et blanc comme en couleur", async () => {
    const p = motif();
    const table = await equivalents(p, "perler-midi");
    for (const bw of [true, false]) {
      const text = await pdfText(await buildPdf(p, { bw, equivalences: table }));
      expect(text).toContain("Vos fils DMC et Perler");
      expect(text).toContain("delta E");
      // Aucun glyphe hors Latin-1 ne passe : la flèche et le delta grec sont
      // remplacés, pas imprimés en symbole parasite.
      expect(text).not.toContain("\u2192");
      expect(text).not.toContain("\u0394");
    }
  });
});
