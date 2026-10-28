import { describe, expect, it } from "vitest";
import { MOTIF_PRESETS, getMotifPreset } from "../lib/motifPresets";
import { createPattern, fromObject, toObject } from "../lib/pattern";
import { attachSubject, changeSubject, duplicateSubject, recomposeSubjects, reorderSubject, removeSubject, sceneFromPattern } from "../lib/subjectEngine";

describe("Bibliothèque Framer de motifs réels", () => {
  it("fournit au moins seize motifs originaux avec de vraies croix DMC", () => {
    expect(MOTIF_PRESETS.length).toBeGreaterThanOrEqual(16);
    expect(new Set(MOTIF_PRESETS.map(p => p.id)).size).toBe(MOTIF_PRESETS.length);
    for (const item of MOTIF_PRESETS) {
      const motif = getMotifPreset(item.id);
      expect(motif, item.id).not.toBeNull();
      expect(motif!.w).toBeGreaterThan(0);
      expect(motif!.h).toBeGreaterThan(0);
      expect(Array.from(motif!.cross).some(i => i >= 0), item.id).toBe(true);
      expect(motif!.palette.length, item.id).toBeGreaterThan(0);
      expect(motif!.provenance?.author).toBe("POINTZERO");
      expect(fromObject(toObject(motif!))).not.toBeNull();
    }
  });
  it("n'invente pas de motif pour une référence inconnue", () => {
    expect(getMotifPreset("ref-inconnue")).toBeNull();
  });
  it("compose des sujets réels en conservant la superposition et le JSON", () => {
    const blank = createPattern("Composition", 100, 100);
    const raw = JSON.stringify(toObject(blank));
    const initial = { version: 1 as const, source: raw, backdrop: raw, layers: [], warnings: [] };
    const flower = getMotifPreset("fleur-rose")!;
    const leaf = getMotifPreset("feuille")!;
    const first = attachSubject(initial, flower, 30, 30);
    const second = attachSubject(first, leaf, 40, 42);
    const before = recomposeSubjects(second);
    expect(before.subjectScene?.layers).toHaveLength(2);
    const restored = fromObject(toObject(before));
    expect(restored?.subjectScene?.layers).toHaveLength(2);
    expect(Array.from(before.cross).filter(i => i >= 0).length).toBeGreaterThan(0);
    const id = second.layers[1].id;
    const moved = changeSubject(second, id, { x: 55, y: 50, scale: 1.5 });
    const updated = recomposeSubjects(moved);
    expect(updated.subjectScene?.layers[1].x).toBe(55);
    expect(updated.subjectScene?.layers[1].scale).toBe(1.5);
    const swapped = reorderSubject(moved, id, -1);
    expect(swapped.layers[0].id).toBe(id);
    const duplicated = duplicateSubject(swapped, id);
    expect(duplicated.layers).toHaveLength(3);
    const removed = recomposeSubjects(removeSubject(second, id));
    expect(removed.subjectScene?.layers).toHaveLength(1);
    expect(sceneFromPattern(removed)).not.toBeNull();
    expect(blank.cross.every(i => i === -1)).toBe(true);
  });
  it("refuse les décors non brodables au lieu de prétendre qu'ils sont des points", () => {
    const id = "frise-geometrique";
    const motif = getMotifPreset(id)!;
    expect(motif.reference).toBeUndefined();
    expect(motif.cross.length).toBe(motif.w * motif.h);
    expect(motif.cross.some(i => i >= 0)).toBe(true);
  });
});
