// @ts-nocheck
// ROSACE — Tests du moteur 5D et du transfert atelier
//
// Exécutoire avec `node --test` (Node 22 supprime les types TS nativement).
// Vérifie que les rosaces sont de véritables patrons Point Zéro :
// codes DMC valides, statistiques cohérentes, génération déterministe,
// sérialisation round-trip, variations reproductibles sans altérer l'original.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { FLOSS } from "../../studio/src/lib/dmc";
import {
  fromObject,
  toObject,
  computeStats,
} from "../../studio/src/lib/pattern";
import {
  genererRosace,
  GENERATEUR_VERSION,
  type GeneratedRosace,
} from "../../src/lib/rosace/generateur";
import { catalogue, trouverRosace } from "../../src/lib/rosace/catalogue";
import { créerVariation, type VariationKind } from "../../src/lib/rosace/variations";
import {
  PALETTES,
  PALETTE_CODES,
  type Signature5D,
  signatureId,
  validatePalettes,
} from "../../src/lib/rosace/signature";
import { difficulté, estimerTemps } from "../../src/lib/rosace/stats";

function rosaceNom(nom: string): GeneratedRosace {
  const r = catalogue().find((r) => r.spec.name === nom);
  assert.ok(r, `rosace "${nom}" introuvable`);
  return r;
}

describe("ROSACE · catalogue", () => {
  test("huit rosaces, une par famille éditoriale", (t) => {
    const specs = catalogue().map((r) => r.spec);
    const familles = new Set(specs.map((s) => s.famille));
    assert.strictEqual(specs.length, 8);
    for (const f of [
      "Florales", "Géométriques", "Anneaux", "Dentelles", "Minimalistes",
      "Classiques", "Contemporaines", "Collections chromatiques",
    ]) {
      assert.ok(familles.has(f), `famille manquante : ${f}`);
    }
  });

  test("toutes les références DMC des palettes existent dans la table de l'atelier", () => {
    validatePalettes();
    for (const palette of PALETTES) {
      for (const code of PALETTE_CODES[palette]) {
        let found = false;
        for (const f of FLOSS) {
          if (f.code === code) { found = true; break; }
        }
        assert.ok(found, `DMC ${code} absent de la table atelier`);
      }
    }
  });

  test("chaque rosace génère un patron cohérent (dimensions, croix, couleurs)", () => {
    for (const r of catalogue()) {
      const p = r.pattern;
      const stats = r.stats;
      assert.ok(p.w === p.h && p.w > 0 && p.w <= 160);
      assert.strictEqual(p.cross.length, p.w * p.h);
      for (const idx of p.cross) {
        assert.ok(idx === -1 || (idx >= 0 && idx < FLOSS.length));
      }
      const croixTotales = stats.rows.reduce((n, row) => n + row.cross, 0);
      assert.strictEqual(stats.totals.cross, croixTotales);
      assert.ok(stats.totals.colors >= 1);
      assert.ok(stats.totals.cross > 0);
      assert.ok(p.notes && p.reference);
    }
  });

  test("la génération est déterministe : même spécification, même patron", () => {
    for (const spec of catalogue().map((r) => r.spec)) {
      const a = genererRosace(spec);
      const b = genererRosace(spec);
      assert.deepStrictEqual(Array.from(a.pattern.cross), Array.from(b.pattern.cross));
      assert.deepStrictEqual(Array.from(a.pattern.palette), Array.from(b.pattern.palette));
      assert.strictEqual(a.stats.totals.cross, b.stats.totals.cross);
    }
  });

  test("une autre graine donne un identifiant de rosace différent", () => {
    const base = rosaceNom("Aubépine").spec;
    const autre = genererRosace({ ...base, graine: base.graine + 1 });
    assert.notStrictEqual(autre.spec.id, base.id);
  });
});

describe("ROSACE · signature", () => {
  test("signatureId est stable et incorpore la graine", () => {
    const meta: Signature5D = {
      forme: "radiale", tracé: "croix", densité: "equilibree", format: "80", palette: "poussiere-de-rose",
    };
    const a = signatureId({ version: GENERATEUR_VERSION, signature: meta, graine: 7 });
    const b = signatureId({ version: GENERATEUR_VERSION, signature: meta, graine: 7 });
    const c = signatureId({ version: GENERATEUR_VERSION, signature: meta, graine: 8 });
    assert.strictEqual(a, b);
    assert.notStrictEqual(a, c);
    assert.ok(a.startsWith("ros-"));
  });
});

describe("ROSACE · statistiques (modèle atelier)", () => {
  test("difficulté bornée et critères documentés", () => {
    for (const r of catalogue()) {
      const d = difficulté(r.pattern, r.spec.signature);
      assert.ok(["debutant", "intermediaire", "expert"].includes(d.niveau));
      assert.ok(d.score >= 0);
      assert.ok(d.critères.length >= 3);
    }
  });

  test("estimation du temps cohérente avec le nombre de croix", () => {
    for (const r of catalogue()) {
      const t = estimerTemps(r.stats.totals.cross);
      assert.strictEqual(t.secondes, Math.round(r.stats.totals.cross * 45));
      assert.ok(t.texte.length > 0);
    }
  });
});

describe("ROSACE · variations", () => {
  test("chaque variation crée une rosace distincte, sans modifier l'originale", () => {
    const original = rosaceNom("Aubépine");
    const croixAvant = Array.from(original.pattern.cross);
    const kinds: VariationKind[] = [
      "autre-palette", "autre-densite", "autre-graine", "plus-aeree", "plus-grande",
    ];
    for (const kind of kinds) {
      const variation = créerVariation(original, kind);
      assert.ok(variation, `variation ${kind} manquante`);
      assert.notStrictEqual(variation.spec.id, original.spec.id);
      if (kind === "autre-graine") {
        // Même signature, seule la graine change.
        assert.notStrictEqual(variation.spec.graine, original.spec.graine);
        assert.deepStrictEqual(variation.spec.signature, original.spec.signature);
      } else {
        assert.notDeepStrictEqual(variation.spec.signature, original.spec.signature);
      }
      // L'originale est intacte.
      assert.deepStrictEqual(Array.from(original.pattern.cross), croixAvant);
    }
  });

  test("une variation plus grande a bien plus de points", () => {
    const original = rosaceNom("Minéral"); // format 40
    const grande = créerVariation(original, "plus-grande");
    assert.ok(grande);
    assert.ok(grande.pattern.w > original.pattern.w);
  });
});

describe("ROSACE · sérialisation atelier (transfert)", () => {
  test("le patron sérialise et se restaure à l'identique (format Point Zéro v3)", () => {
    const r = rosaceNom("Aubépine");
    const sérialisé = JSON.stringify(toObject(r.pattern));
    const restauré = fromObject(JSON.parse(sérialisé));
    assert.ok(restauré);
    assert.deepStrictEqual(Array.from(restauré.cross), Array.from(r.pattern.cross));
    assert.strictEqual(restauré.w, r.pattern.w);
    assert.strictEqual(restauré.h, r.pattern.h);
    assert.deepStrictEqual(Array.from(restauré.palette), Array.from(r.pattern.palette));
  });
});
