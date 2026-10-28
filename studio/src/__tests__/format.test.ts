import { describe, expect, it } from "vitest";
import {
  assignedSymbol,
  createPattern,
  ensurePalette,
  fromObject,
  toObject,
  type Pattern,
} from "../lib/pattern";
import { FLOSS, contrastOn, flossIndex, registerBlend } from "../lib/dmc";
import { fromOxs, toOxs } from "../lib/oxs";
import { patternToSvg } from "../lib/svg";
import { symbolMarkup } from "../lib/symbols";
import { beadByCode, deltaELabel, loadBeads, nearestBeads } from "../lib/beads";

const RED = flossIndex("321");
/** Symbole imposé par l'atelier : différent de `palette.indexOf(RED)` (= 0). */
const CUSTOM = 42;

/** Motif de référence, avec un peu de tout ce qui doit survivre à un aller-retour. */
function sample(): Pattern {
  const p = createPattern("Aller-retour", 12, 9, 14, 2);
  p.cross[0] = RED;
  p.fwd[1] = RED;
  p.bwd[2] = RED;
  p.q[3][3] = RED;
  p.done[0] = 1;
  ensurePalette(p, RED);
  p.back.push({ x1: 0, y1: 0, x2: 4, y2: 0, c: RED });
  p.long.push({ x1: 1, y1: 1, x2: 5, y2: 5, c: RED });
  p.knots.push({ x: 2.5, y: 2.5, c: RED });
  p.special = [
    { x: 3.5, y: 3.5, c: RED, kind: "bead" },
    { x: 4.25, y: 4.25, c: RED, kind: "petite" },
  ];
  p.mistakes = [7];
  p.parked = [{ x: 5, y: 5, corner: 2, c: RED }];
  p.annotations = [{ x: 6, y: 6, text: "Vérifier le sens du motif" }];
  p.ornamentDone = ["knot:DMC=321:2.5,2.5"];
  p.notes = "Consignes de la créatrice";
  p.folder = "Botanique";
  p.beadMap = { "321": "DB0361" };
  p.symbolMap = { ...p.symbolMap, "321": CUSTOM };
  p.provenance = {
    kind: "original",
    source: "Atelier",
    author: "Camille",
    license: "CC BY 4.0",
    personalOnly: true,
  };
  p.sessions = [{ date: "2026-10-13", seconds: 900, cells: 120 }];
  p.backStrands = 2;
  p.waste = 1.25;
  p.fabric = { type: "linen", over: 2, color: "#efe7d6", margin: 9, units: "in" };
  return p;
}

describe("Fichier projet : la table de codes fait foi, pas les indices", () => {
  it("conserve tout ce qui décrit le motif", () => {
    const p = sample();
    const restored = fromObject(toObject(p));
    expect(restored).not.toBeNull();
    const r = restored!;
    expect(r.w).toBe(12);
    expect(r.h).toBe(9);
    expect(FLOSS[r.cross[0]].code).toBe("321");
    expect(r.fwd[1]).toBe(r.cross[0]);
    expect(r.bwd[2]).toBe(r.cross[0]);
    expect(r.q[3][3]).toBe(r.cross[0]);
    expect(r.done[0]).toBe(1);
    expect(r.back).toEqual(p.back);
    expect(r.long).toEqual(p.long);
    expect(r.knots).toEqual(p.knots);
    expect(r.special).toEqual(p.special);
    expect(r.mistakes).toEqual([7]);
    expect(r.parked).toEqual(p.parked);
    expect(r.annotations).toEqual(p.annotations);
    expect(r.ornamentDone).toEqual(p.ornamentDone);
    expect(r.notes).toBe(p.notes);
    expect(r.folder).toBe(p.folder);
    expect(r.beadMap).toEqual({ "321": "DB0361" });
    expect(assignedSymbol(r, r.cross[0])).toBe(CUSTOM);
    expect(r.provenance).toEqual(p.provenance);
    expect(r.sessions).toEqual(p.sessions);
    expect(r.backStrands).toBe(2);
    expect(r.waste).toBe(1.25);
    expect(r.fabric).toEqual(p.fabric);
  });

  it("relit les bonnes couleurs même si la table est dans un autre ordre", () => {
    const p = sample();
    const blue = flossIndex("3801");
    p.cross[1] = blue;
    ensurePalette(p, blue);
    const o = toObject(p) as unknown as Record<string, unknown>;

    // On simule une version future où la palette n'est plus triée pareil :
    // la table est renversée, les indices remappés en conséquence.
    const codes = o.flossCodes as string[];
    const newCodes = [...codes].reverse();
    const remap = new Map<number, number>();
    codes.forEach((code, oldIndex) => remap.set(oldIndex, newCodes.indexOf(code)));
    const shift = (v: number) => (v < 0 ? -1 : remap.get(v) ?? -1);
    o.flossCodes = newCodes;
    for (const key of ["cross", "fwd", "bwd", "q0", "q1", "q2", "q3", "palette"]) {
      o[key] = (o[key] as number[]).map(shift);
    }

    const restored = fromObject(o);
    expect(restored).not.toBeNull();
    expect(FLOSS[restored!.cross[0]].code).toBe("321");
    expect(FLOSS[restored!.cross[1]].code).toBe("3801");
  });

  it("refuse un fichier sans table de codes plutôt que de deviner", () => {
    const o = toObject(sample()) as unknown as Record<string, unknown>;
    delete o.flossCodes;
    expect(fromObject(o)).toBeNull();
    expect(fromObject({ ...o, flossCodes: ["321", 7] })).toBeNull();
    expect(fromObject(null)).toBeNull();
  });

  it("refuse des dimensions ou des indices hors bornes", () => {
    const o = toObject(sample()) as unknown as Record<string, unknown>;
    const codes = o.flossCodes as string[];
    expect(fromObject({ ...o, w: 0 })).toBeNull();
    expect(fromObject({ ...o, w: 5000 })).toBeNull();
    expect(fromObject({ ...o, h: 12.5 })).toBeNull();
    expect(fromObject({ ...o, cross: (o.cross as number[]).map(() => codes.length + 3) })).toBeNull();
    expect(fromObject({ ...o, cross: (o.cross as number[]).slice(1) })).toBeNull();
    expect(fromObject({ ...o, back: [{ x1: 0, y1: 0, x2: 99, y2: 0, c: RED }] })).toBeNull();
    expect(fromObject({ ...o, special: [{ x: 1, y: 1, c: RED, kind: "strass" }] })).toBeNull();
    expect(fromObject({ ...o, parked: [{ x: 1, y: 1, corner: 9, c: RED }] })).toBeNull();
  });

  it("ignore un beadMap malformé au lieu de le recopier", () => {
    const o = toObject(sample()) as unknown as Record<string, unknown>;
    o.beadMap = { "321": 42 };
    expect(fromObject(o)!.beadMap).toBeUndefined();
    o.beadMap = ["DB0361"];
    expect(fromObject(o)!.beadMap).toBeUndefined();
    o.beadMap = { "321": "DB0361" };
    expect(fromObject(o)!.beadMap).toEqual({ "321": "DB0361" });
  });

  it("un mélange enregistré reste retrouvable par son code", () => {
    const mix = registerBlend("321", "Blanc", 1, 2);
    expect(mix).toBeGreaterThanOrEqual(0);
    expect(FLOSS[mix].code).toBe("mix:321/1+Blanc/2");
    const p = createPattern("Mélangé", 6, 6, 14, 2);
    p.cross[0] = mix;
    ensurePalette(p, mix);
    const restored = fromObject(toObject(p));
    expect(restored).not.toBeNull();
    expect(FLOSS[restored!.cross[0]].code).toBe(FLOSS[mix].code);
    expect(FLOSS[restored!.cross[0]].blend).toBeTruthy();
    // Le même mélange redemandé ne duplique pas la palette.
    expect(registerBlend("321", "Blanc", 1, 2)).toBe(mix);
    expect(FLOSS.filter((f) => f.code === FLOSS[mix].code)).toHaveLength(1);
    // Un mélange impossible est refusé, pas approximé.
    expect(registerBlend("321", "Blanc", 4, 4)).toBe(-1);
    expect(registerBlend("inexistant", "Blanc", 1, 1)).toBe(-1);
  });
});

describe("OXS", () => {
  it("fait l'aller-retour sur le coeur portable et les extensions", () => {
    const p = sample();
    const restored = fromOxs(toOxs(p));
    expect(FLOSS[restored.cross[0]].code).toBe("321");
    expect(restored.w).toBe(12);
    expect(restored.h).toBe(9);
    expect(restored.back).toHaveLength(1);
    expect(restored.long).toHaveLength(1);
    expect(restored.knots).toHaveLength(1);
    expect(restored.q[3][3]).toBeGreaterThanOrEqual(0);
    expect(restored.special).toHaveLength(2);
    expect(restored.notes).toBe(p.notes);
  });

  it("écrit le symbole de l'atelier, pas celui de la table", () => {
    const xml = toOxs(sample());
    expect(xml).toContain(`symbol="${CUSTOM}"`);
    expect(xml).toContain('number="DMC 321"');
    expect(xml).not.toContain(`symbol="${RED}"`);
  });

  it("relit le symbole choisi dans l'atelier au retour", () => {
    const restored = fromOxs(toOxs(sample()));
    expect(restored.palette).toContain(RED);
    // `assignedSymbol` attend l'indice du fil, pas sa position dans la palette.
    expect(assignedSymbol(restored, RED)).toBe(CUSTOM);
  });

  it("emporte les références de perle, et seulement celles de la palette", () => {
    const p = sample();
    p.beadMap = { "321": "DB0361", B5200: "DB0001" }; // B5200 n'est pas dans ce motif
    const xml = toOxs(p);
    expect(xml).toContain("DB0361");
    expect(xml).not.toContain("DB0001");
    expect(fromOxs(xml).beadMap).toEqual({ "321": "DB0361" });
  });

  it("une extension illisible ne détruit pas le coeur portable", () => {
    const xml = toOxs(sample()).replace(/<pointzero_extra>.*<\/pointzero_extra>/, "<pointzero_extra>pas du JSON</pointzero_extra>");
    expect(xml).toContain("pas du JSON");
    const restored = fromOxs(xml);
    expect(FLOSS[restored.cross[0]].code).toBe("321");
    expect(restored.back).toHaveLength(1);
    expect(restored.beadMap).toBeUndefined();
    expect(restored.knots).toHaveLength(0);
  });

  it("échappe le texte saisi", () => {
    const p = sample();
    p.name = 'Motif <piquant> & "guillemets"';
    p.notes = "a < b & c > d";
    const xml = toOxs(p);
    expect(xml).not.toContain("<piquant>");
    expect(xml).toContain("&lt;piquant&gt;");
    expect(fromOxs(xml).notes).toBe(p.notes);
  });

  it("refuse un document qui n'est pas une grille exploitable", () => {
    expect(() => fromOxs("<html><body>rien</body></html>")).toThrow();
    expect(() => fromOxs('<chart><properties chartwidth="99999" chartheight="1"/></chart>')).toThrow();
  });
});

describe("SVG", () => {
  it("produit un document vectoriel complet", () => {
    const { svg, symbolsOmitted, bytes } = patternToSvg(sample());
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
    expect(symbolsOmitted).toBe(false);
    expect(bytes).toBeGreaterThan(1000);
    expect(svg).toContain("<title>Aller-retour</title>");
    expect(svg).toContain("<desc>");
    expect(svg).toContain("321");
    // Noeuds français en cercles, perles en ellipses, annotation numérotée.
    expect(svg).toContain("<circle");
    expect(svg).toContain("<ellipse");
    expect(svg).toContain(">1</text>");
    // L'attribution des données couleur accompagne le fichier.
    expect(svg).toContain("craft-color-codes");
    expect(svg).toContain("CC BY 4.0");
  });

  it("dessine partout le symbole choisi dans l'atelier", () => {
    const p = sample();
    const { svg } = patternToSvg(p);
    const ink = contrastOn(FLOSS[RED].hex);
    const S = 12;
    // Dans la case (premier rendu) et dans la légende (second rendu).
    expect(svg).toContain(symbolMarkup(CUSTOM, S / 2, S / 2, S * 0.33, ink));
    expect(svg).toContain(symbolMarkup(CUSTOM, 0, 0, 1, "#141210"));
    expect(svg).toContain('data-floss="321"');
    // Le symbole par défaut de la table n'apparaît nulle part.
    expect(svg).not.toContain(symbolMarkup(0, 0, 0, 1, "#141210"));
  });

  it("emporte la référence de perle dans la légende", () => {
    const { svg } = patternToSvg(sample());
    expect(svg).toContain("DB0361");
  });

  it("échappe un nom de projet hostile", () => {
    const p = sample();
    p.name = '</title><script>alert("xss")</script>';
    const { svg } = patternToSvg(p);
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;/title&gt;");
  });

  it("en noir et blanc n'imprime aucun aplat de couleur", () => {
    const { svg } = patternToSvg(sample(), { bw: true, legend: false });
    expect(svg).not.toContain(FLOSS[RED].hex);
    expect(svg).toContain('fill="#ffffff"');
  });

  it("omet les symboles au-delà du seuil, et le dit", () => {
    const p = createPattern("Grand", 40, 40, 14, 2);
    p.cross.fill(RED);
    ensurePalette(p, RED);
    const { svg, symbolsOmitted } = patternToSvg(p, { symbolLimit: 100 });
    expect(symbolsOmitted).toBe(true);
    expect(svg).not.toContain('data-floss="321"');
    expect(svg).toContain("Symboles omis");
    expect(patternToSvg(p).symbolsOmitted).toBe(false);
  });
});

describe("Perles Miyuki Delica", () => {
  it("charge la table mesurée, une seule fois", async () => {
    const palette = await loadBeads();
    expect(palette.count).toBe(1288);
    expect(palette.colors).toHaveLength(1288);
    expect(palette.status).toBe("measured");
    expect(palette.discontinuedCount).toBe(76);
    // L'avertissement de la source sur la fidélité des teintes est conservé :
    // il doit être affiché, pas perdu au chargement.
    expect(palette.notes).toContain("approximate shade");
    expect(palette.sources.map((s) => s.url).join(" ")).toContain("miyuki-beads.co.jp");
    expect(palette.license.length).toBeGreaterThan(0);
    expect(await loadBeads()).toBe(palette);
  });

  it("classe les plus proches par CIEDE2000, sans les références arrêtées", async () => {
    const { colors } = await loadBeads();
    const matches = nearestBeads(FLOSS[RED].lab, colors, 3);
    expect(matches).toHaveLength(3);
    expect(matches.every((m) => !m.discontinued)).toBe(true);
    expect(matches[0].deltaE).toBeLessThanOrEqual(matches[1].deltaE);
    expect(matches[1].deltaE).toBeLessThanOrEqual(matches[2].deltaE);
    expect(matches[0].deltaE).toBeGreaterThan(0);
    // Un rouge DMC trouve un rouge Miyuki, pas un noir.
    expect(matches[0].lab[1]).toBeGreaterThan(0);
    // En demandant toute la table, les références arrêtées réapparaissent.
    expect(nearestBeads(FLOSS[RED].lab, colors, colors.length, true).some((m) => m.discontinued)).toBe(true);
  });

  it("retrouve une référence quelle que soit son écriture", async () => {
    const { colors } = await loadBeads();
    expect(beadByCode(colors, "DB0010")?.hex).toBe("#131313");
    for (const written of ["DB0010", "DB10", "DB-0010", "db0010", "10", " 10 "]) {
      expect(beadByCode(colors, written)?.code).toBe("DB0010");
    }
    expect(beadByCode(colors, "DB9999999")).toBeUndefined();
    expect(beadByCode(colors, "")).toBeUndefined();
    // DB0010 et DB0100 sont deux références distinctes.
    expect(beadByCode(colors, "DB100")?.code).toBe("DB0100");
  });

  it("ne survend jamais la fidélité de la teinte", () => {
    expect(deltaELabel(0.4)).toBe("identique à l'œil");
    expect(deltaELabel(2)).toBe("très proche");
    expect(deltaELabel(4)).toBe("proche");
    // L'écart médian documenté par la source (6 à 12 ΔE00) tombe ici :
    // c'est la bonne perle, la teinte est approchée.
    expect(deltaELabel(8)).toBe("teinte approchée");
    expect(deltaELabel(30)).toBe("teinte différente");
  });
});
