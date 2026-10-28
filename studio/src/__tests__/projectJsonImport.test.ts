import { describe, expect, it } from "vitest";
import { FLOSS, flossIndex } from "../lib/dmc";
import { readProjectFile } from "../lib/io";
import { createPattern, ensurePalette, toObject } from "../lib/pattern";

describe("Fichier .pointzero.json ouvert depuis l'accueil et l'atelier", () => {
  it("reconstruit 193 × 200 cases, 22 fils DMC et la provenance sans image ni changement de palette", async () => {
    const codes = [
      "157", "160", "307", "310", "372", "413", "415", "646", "677", "712", "725",
      "728", "782", "801", "828", "3033", "3078", "3756", "3820", "3823", "3861", "3866"
    ];
    const p = createPattern("Patron de test", 193, 200);
    p.provenance = { kind: "pdf", source: "exemple.pdf", author: "Auteur du PDF", license: "Usage personnel", personalOnly: true };
    codes.forEach((code, i) => {
      const idx = flossIndex(code);
      expect(idx).toBeGreaterThanOrEqual(0);
      ensurePalette(p, idx);
      p.cross[i * 200 + i] = idx;
    });
    const file = new File(
      [JSON.stringify(toObject(p))],
      "Patron-test.pointzero.json",
      { type: "application/json" }
    );
    const parsed = await readProjectFile(file);
    expect(parsed).not.toBeNull();
    expect(parsed?.w).toBe(193);
    expect(parsed?.h).toBe(200);
    expect(parsed?.cross.length).toBe(38_600);
    expect(parsed?.palette.map(idx => FLOSS[idx].code).sort()).toEqual(codes.slice().sort());
    expect(parsed?.provenance?.personalOnly).toBe(true);
    codes.forEach((code, i) => {
      expect(parsed?.cross[i * 200 + i]).toBe(flossIndex(code));
    });
  });

  it("refuse un JSON incomplet sans altérer la grille", async () => {
    const bad = new File(['{"name":"Projet incomplet","w":193,"h":200}'], "invalide.json");
    expect(await readProjectFile(bad)).toBeNull();
  });

  it("refuse un contenu non JSON, sans planter", async () => {
    const bad = new File(["ceci n'est pas un projet"], "texte.json");
    expect(await readProjectFile(bad)).toBeNull();
  });
});
