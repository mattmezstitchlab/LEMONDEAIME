import { describe, expect, it } from "vitest";
import { recommander, RIEN, type Projet } from "../lib/present/recommander";
import { epingler, ignorer } from "../lib/present/choix";
import { LUMIERE, LUMIERE_PLANS, JOURNAL_LUMIERE } from "../lib/present/projets";

const MAINTENANT = Date.parse("2026-10-30T09:00:00");
const J = 864e5;
const p = (id: string, o: Partial<Projet> = {}): Projet => ({ id, titre: id, genre: "ouvrage", ...o });

describe("le Présent : recommander", () => {
  it("l'épinglé passe devant tout", () => {
    const r = recommander([p("a", { avancement: 90, modifie: MAINTENANT }), p("b", { avancement: 10, modifie: MAINTENANT - 30 * J })], { epingle: "b" }, [], MAINTENANT);
    expect(r[0].projet.id).toBe("b"); expect(r[0].raisons[0].texte).toBe("épinglé par vous");
  });
  it("une échéance déclarée passe devant « presque terminé », la plus proche d'abord", () => {
    const r = recommander([p("a", { avancement: 95 }), p("b", { avancement: 20, echeance: { texte: "", source: "Matt", date: "2026-11-20" } }), p("c", { avancement: 20, echeance: { texte: "", source: "Matt", date: "2026-11-02" } })], {}, [], MAINTENANT);
    expect(r.map(x => x.projet.id)).toEqual(["c", "b", "a"]);
    expect(r[0].raisons.find(x => x.nature === "declaree")?.texte).toBe("échéance dans 3 jours");
  });
  it("le plus récent ne gagne jamais seul contre un ouvrage presque terminé", () => {
    const r = recommander([p("recent", { avancement: 30, modifie: MAINTENANT - 60_000 }), p("presque", { avancement: 85, modifie: MAINTENANT - 40 * J })], {}, [], MAINTENANT);
    expect(r[0].projet.id).toBe("presque");
  });
  it("un ouvrage à 0 % ou à 100 % n'est pas « à reprendre »", () => {
    expect(recommander([p("a", { avancement: 0, modifie: MAINTENANT }), p("b", { avancement: 100, modifie: MAINTENANT })], {}, [], MAINTENANT)).toEqual([]);
  });
  it("ignorer retire pendant 7 jours, puis le projet revient", () => {
    const c = ignorer({}, "a", MAINTENANT);
    expect(recommander([p("a", { avancement: 50 })], c, [], MAINTENANT + 6 * J)).toEqual([]);
    expect(recommander([p("a", { avancement: 50 })], c, [], MAINTENANT + 8 * J)).toHaveLength(1);
  });
  it("épingler deux fois désépingle ; ignorer un épinglé le désépingle", () => {
    expect(epingler(epingler({}, "a"), "a").epingle).toBeUndefined();
    expect(ignorer({ epingle: "a" }, "a", MAINTENANT).epingle).toBeUndefined();
  });
  it("rien de déclaré n'est jamais inventé : ce qui manque est dit", () => {
    const r = recommander([p("a", { avancement: 40, modifie: MAINTENANT - J })], {}, [], MAINTENANT);
    const textes = r[0].raisons.map(x => x.texte);
    expect(textes).toContain("aucune échéance renseignée"); expect(textes).toContain("prochaine action non renseignée");
    expect(r[0].raisons.filter(x => x.nature === "declaree")).toHaveLength(0);
  });
  it("un projet bloqué reste proposé, mais dit bloqué", () => {
    const r = recommander([p("a", { avancement: 40, bloque: [{ texte: "en attente du tissu", source: "Matt" }] })], {}, [], MAINTENANT);
    expect(r[0].bloque).toBe(true); expect(r[0].raisons.some(x => x.texte === "bloqué : en attente du tissu")).toBe(true);
  });
  it("les favoris départagent à rang égal seulement", () => {
    const r = recommander([p("a", { avancement: 40, univers: "x" }), p("b", { avancement: 40, univers: "broderie" })], {}, ["broderie"], MAINTENANT);
    expect(r[0].projet.id).toBe("b");
  });
  it("sans aucun projet : une phrase honnête", () => { expect(recommander([], {}, [], MAINTENANT)).toEqual([]); expect(RIEN).toMatch(/Je ne sais pas encore/); });
});

describe("LUMIERE, projet documenté", () => {
  it("lit ses 31 plans dans ses données, sans mesure d'avancement inventée", () => {
    expect(LUMIERE_PLANS.total).toBe(31); expect(LUMIERE.avancement).toBeUndefined();
    const r = recommander([LUMIERE], {}, [], MAINTENANT)[0];
    expect(r.raisons.some(x => x.texte === "avancement non mesuré" && x.nature === "manque")).toBe(true);
    expect(r.raisons.every(x => x.nature !== "declaree" || !!x.source)).toBe(true);
    expect(r.bloque).toBe(true);
  });
  it("son journal distingue les dates exactes et ce qui n'a pas de date", () => {
    expect(JOURNAL_LUMIERE.filter(e => e.precision === "minute").every(e => /^commit [0-9a-f]{7}$/.test(e.source))).toBe(true);
    expect(JOURNAL_LUMIERE.some(e => e.precision === "aucune" && !e.date)).toBe(true);
  });
});
