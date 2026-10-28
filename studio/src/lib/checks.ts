import { BASE_FLOSS, FLOSS, flossIndex } from "./dmc";
import { deltaE2000 } from "./colorScience";
import { computeStats, createPattern, ensurePalette, fabricInfo, fromObject, toObject } from "./pattern";
import { drawShape, extractSelection, pasteSelection, transformPart } from "./editing";
import { applySample, type StrokeCtx } from "./stitch";
import { fromOxs, toOxs } from "./oxs";
import { SYMBOLS } from "./symbols";
export interface CheckResult { name: string; ok: boolean; detail: string }
export function runChecks(): CheckResult[] {
  const out: CheckResult[] = [];
  const test = (name: string, fn: () => void) => { try { fn(); out.push({ name, ok: true, detail: "Vérification exécutée sur cet appareil" }); } catch (e) { out.push({ name, ok: false, detail: e instanceof Error ? e.message : "Échec" }); } };
  const assert = (v: boolean, m: string) => { if (!v) throw new Error(m); };
  const red = flossIndex("321"), p = createPattern("Test", 70, 70, 14, 2);
  test("489 références DMC documentées, sans doublon", () => assert(BASE_FLOSS.length === 489 && new Set(BASE_FLOSS.map((v) => v.code)).size === 489, "Table couleur incohérente"));
  test("CIEDE2000 : paire de référence Sharma 2005", () => assert(Math.abs(deltaE2000([50, 2.6772, -79.7751], [50, 0, -82.7485]) - 2.0425) < .0001, "Écart CIEDE2000 incorrect"));
  test("504 symboles vectoriels structurellement distincts", () => assert(new Set(SYMBOLS.map((v) => JSON.stringify(v))).size === 504, "Collision de définition"));
  test("Aida 14 : 70 points = 12,7 cm", () => assert(Math.abs(fabricInfo(p).fw - 12.7) < .0001, "Dimensions incorrectes"));
  test("Lin 28 sur 2 = Aida 14", () => { const linen = { ...p, count: 28 as const, fabric: { type: "linen" as const, over: 2 as const, color: "#ffffff", margin: 7.5, units: "cm" as const } }; assert(fabricInfo(linen).fw === fabricInfo(p).fw, "Comptage sur 2 incorrect"); });
  test("Écheveau : 8 m à 6 brins = 48 m simples", () => {
    const d = createPattern("Fil", 10, 10, 14, 2); d.cross.fill(red); ensurePalette(d, red);
    const expected = 100 * 2 * 14 * (2.54 / 14) * 1.15 / 100;
    assert(Math.abs(computeStats(d).totals.meters - expected) < .00001, "Longueur cumulée des brins incorrecte");
    assert(Math.abs(computeStats(d).totals.skeins - Math.ceil(expected / 48)) < .00001, "Capacité 8m × 6 brins incorrecte");
  });
  test("Bloc 10 × 10 : seules les cases brodables", () => { const d = createPattern("Bloc", 20, 20); d.cross[0] = red; d.cross[11] = red; const ctx: StrokeCtx = { tool: "block", color: red, lastNode: null, fillDone: false, markMode: -1, onlyActive: true }; applySample(d, ctx, { x: .5, y: .5 }); assert(d.done.reduce((n, v) => n + v, 0) === 1, "Le bloc marque hors de ses limites"); });
  test("Parking et point à défaire ne modifient pas le patron", () => {
    const d = createPattern("Suivi", 5, 5); d.cross[0] = red;
    for (const tool of ["park", "unpick"] as const) applySample(d, { tool, color: red, lastNode: null, fillDone: false, markMode: -1 }, { x: .1, y: .1 });
    assert(d.cross[0] === red && d.parked?.length === 1 && d.mistakes?.length === 1, "Le suivi modifie la création");
  });
  test("Contours et perles : suivi séparé des croix", () => {
    const d = createPattern("Détails", 5, 5); d.back.push({ x1: 0, y1: 0, x2: 2, y2: 0, c: red }); d.special = [{ x: 3.5, y: 3.5, c: red, kind: "bead" }]; ensurePalette(d, red);
    const context = (): StrokeCtx => ({ tool: "details", color: red, lastNode: null, fillDone: false, markMode: -1 });
    applySample(d, context(), { x: 1, y: .1 }); applySample(d, context(), { x: 3.5, y: 3.5 });
    const t = computeStats(d).totals; assert(t.units === 2 && t.doneUnits === 2 && t.cross === 0, "Progression des détails incorrecte");
  });
  test("JSON : conservation par code DMC", () => { p.cross[0] = red; ensurePalette(p, red); const restored = fromObject(toObject(p)); assert(!!restored && FLOSS[restored.cross[0]].code === "321", "Code de fil perdu"); });
  test("Sélection, copie et rotation", () => { const d = drawShape(p, "line", { x: 2, y: 2 }, { x: 5, y: 2 }, red), part = extractSelection(d, { x: 2, y: 2, w: 4, h: 1 }), rotated = transformPart(part, "rotate"), pasted = pasteSelection(createPattern("Vide", 10, 10), rotated, 1, 1); assert(rotated.w === 1 && rotated.h === 4 && pasted.cross[11] === red, "Transformation incorrecte"); });
  test("OXS : aller-retour croix, arrière et quarts", () => { const d = createPattern("OXS", 10, 10); d.cross[0] = red; d.q[0][1] = red; d.back.push({ x1: 0, y1: 0, x2: 2, y2: 2, c: red }); ensurePalette(d, red); const restored = fromOxs(toOxs(d)); assert(restored.cross[0] === red && restored.q[0][1] === red && restored.back.length === 1, "Données OXS perdues"); });
  return out;
}