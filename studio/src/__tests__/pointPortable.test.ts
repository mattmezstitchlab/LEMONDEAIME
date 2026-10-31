/**
 * Le Point est transversal : son graphe d'imports ne doit atteindre aucun module de broderie, du 5D ni d'un studio.
 * Ce test lit les fichiers sources (pas de mise en page) et suit chaque import relatif depuis components/point/Point.tsx.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";

const RACINE = resolve(__dirname, "..");
function graphe(depart: string) {
  const vus = new Set<string>(), externes = new Set<string>();
  const pile = [depart];
  while (pile.length) {
    const f = pile.pop()!; if (vus.has(f)) continue; vus.add(f);
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(/(?:import|export)\s[^"']*?from\s*["']([^"']+)["']|import\s*["']([^"']+)["']/g)) {
      const spec = m[1] ?? m[2];
      if (!spec.startsWith(".")) { externes.add(spec.split("/")[0]); continue; }
      const base = resolve(dirname(f), spec);
      const cand = [base, base + ".ts", base + ".tsx", base + "/index.ts"].find(c => existsSync(c) && !c.endsWith("/"));
      if (cand && /\.(tsx?)$/.test(cand)) pile.push(cand); else if (cand) vus.add(cand);
    }
  }
  return { fichiers: [...vus].map(f => relative(RACINE, f)).sort(), externes: [...externes].sort() };
}

describe("Le Point est portable", () => {
  const { fichiers, externes } = graphe(resolve(RACINE, "components/point/Point.tsx"));
  it("n'emporte que React : aucune bibliothèque d'icônes, aucun service", () => {
    expect(externes).toEqual(["react", "react-dom"]);
  });
  it("n'atteint aucun module de broderie, du moteur 5D ni d'un studio", () => {
    const interdits = /dmc|pattern|stitch|motif5d|cadre|canvas|pdf|oxs|floss|broderie|Studio|Docks|Composer|library|aimeSync/i;
    expect(fichiers.filter(f => interdits.test(f))).toEqual([]);
  });
  it("les points lumineux (indicateurs) restent portables : aucun import, sinon les types du Point", async () => {
    const { readFileSync } = await import("node:fs"); const { join } = await import("node:path");
    const src = readFileSync(join(__dirname, "../lib/point/indicateurs.ts"), "utf8");
    expect([...src.matchAll(/from "([^"]+)"/g)].map(m => m[1])).toEqual(["./modes"]);
  });
  it("tient en dix fichiers connus (la mémoire des habitudes et les profils compris)", () => {
    expect(fichiers).toEqual([
      "components/point/LePoint.css", "components/point/LePoint.tsx", "components/point/PanneauConfort.tsx", "components/point/Point.tsx",
      "lib/accessibilityCore.ts", "lib/point/confort.ts", "lib/point/memoire.ts", "lib/point/modes.ts", "lib/point/profils.ts", "lib/storageSafety.ts",
    ]);
  });
});
