import { describe, expect, it } from "vitest";
import { FLOSS, filCorrespond } from "../lib/dmc";

const trouve = (q: string) => FLOSS.filter(f => filCorrespond(f, q));
describe("Nuancier : recherche en français", () => {
  it("trouve les fils par couleur française, code ou nom anglais", () => {
    expect(trouve("rouge").length).toBeGreaterThan(10);
    expect(trouve("rouge").some(f => f.code === "321")).toBe(true);
    expect(trouve("Rouge").length).toBe(trouve("rouge").length);
    expect(trouve("vert").length).toBeGreaterThan(30);
    expect(trouve("bleu").some(f => /blue/i.test(f.name))).toBe(true);
    expect(trouve("310").some(f => f.code === "310")).toBe(true);
    expect(trouve("red").some(f => f.code === "321")).toBe(true);
    expect(trouve("")).toHaveLength(FLOSS.length);
  });
  it("combine les mots : « vert foncé » est plus étroit que « vert »", () => {
    const v = trouve("vert"), vf = trouve("vert foncé");
    expect(vf.length).toBeGreaterThan(0);
    expect(vf.length).toBeLessThan(v.length);
    expect(vf.every(f => v.includes(f))).toBe(true);
    expect(trouve("rouges").length).toBe(trouve("rouge").length);
    expect(trouve("doré").length).toBeGreaterThan(0);
  });
  it("ne trouve rien pour un mot inconnu", () => {
    expect(trouve("zzzz")).toHaveLength(0);
  });
});
describe("Nuancier : clair et foncé ne se mélangent pas", () => {
  it("« rouge foncé » ne propose aucun fil clair, « vert clair » aucun fil foncé", () => {
    expect(FLOSS.filter(f => filCorrespond(f, "rouge foncé")).some(f => /light|pale|baby/i.test(f.name))).toBe(false);
    expect(FLOSS.filter(f => filCorrespond(f, "vert clair")).some(f => /dark/i.test(f.name))).toBe(false);
  });
});
