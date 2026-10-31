/** La mémoire du Point : des chemins d'identifiants, retrouvés dans les commandes du moment ; rien sur l'ouvrage. */
import { beforeEach, describe, expect, it } from "vitest";
import { favoris, lireUsage, noterUsage, oublierUsage, resoudre } from "../lib/point/memoire";
import type { ModePoint } from "../lib/point/modes";

const f = (id: string, enfants?: ModePoint[]): ModePoint => ({ id, nom: id.toUpperCase(), aide: id, groupe: "metier", ouvrir: () => {}, ...(enfants ? { enfants: () => enfants } : {}) });
const racine = [f("a", [f("a1"), f("a2"), f("a3"), f("a4")]), f("b", [f("bb", [f("b1"), f("b2")])]), f("c")];
beforeEach(() => localStorage.clear());

describe("La mémoire du Point", () => {
  it("retrouve une commande par son chemin, et ignore ce qui a disparu ou n'est qu'une famille", () => {
    expect(resoudre(racine, ["b", "bb", "b2"])?.mode.id).toBe("b2");
    expect(resoudre(racine, ["b", "bb", "b2"])?.familles.map(x => x.id)).toEqual(["b", "bb"]);
    expect(resoudre(racine, ["b", "zz"])).toBeNull();
    expect(resoudre(racine, ["b", "bb"])).toBeNull();
  });
  it("les derniers choix d'abord, au plus trois d'une même famille, puis les plus utilisés", () => {
    for (const c of [["c"], ["c"], ["c"], ["b", "bb", "b1"], ["a", "a1"], ["a", "a2"], ["a", "a3"], ["a", "a4"]]) noterUsage("t", c);
    const l = favoris(lireUsage("t"), racine);
    expect(l.filter(x => x.genre === "recent").map(x => x.mode.id)).toEqual(["a4", "a3", "a2", "b1", "c"]);
    expect(l.find(x => x.mode.id === "c")?.n).toBe(3);
    noterUsage("t", ["disparu"]);
    expect(favoris(lireUsage("t"), racine).some(x => x.chemin[0] === "disparu")).toBe(false);
  });
  it("se garde par contexte, dans l'appareil seulement, et s'oublie", () => {
    noterUsage("broderie", ["c"]); noterUsage("image", ["a", "a1"]);
    expect(lireUsage("broderie").map(u => u.c)).toEqual([["c"]]);
    oublierUsage("broderie");
    expect(lireUsage("broderie")).toEqual([]); expect(lireUsage("image").length).toBe(1);
  });
});
