import { describe, expect, it } from "vitest";
import { anneau, approximatifs, dans, lirePeriode, nomPeriode, sansDate, vers } from "../lib/temps/echelles";
import type { Element } from "../lib/present/projets";

const AUJ = new Date(2026, 9, 30);
const e = (id: string, date: string | undefined, precision: Element["precision"]): Element => ({ id, projet: "p", titre: id, date, precision, source: "test", genre: "passe" });
const EL = [e("a", "2026-10-30T07:25", "minute"), e("b", "2026-10-30T01:08", "minute"), e("c", "2026-10-29T22:59", "minute"), e("d", "2026-10", "mois"), e("f", "2026", "annee"), e("g", undefined, "aucune")];

describe("le calendrier radial : des chiffres, des points, un cercle", () => {
  it("l'année : 12 mois, le compte d'éléments posés sur chacun", () => {
    const r = anneau({ echelle: "mois", cle: "2026-10" }, EL, AUJ);
    expect(r).toHaveLength(12); expect(r[9]).toMatchObject({ chiffre: "10", compte: 4, nom: "octobre 2026" });
  });
  it("le mois : les jours ; une date au mois près n'est jamais posée sur un jour", () => {
    const r = anneau({ echelle: "jour", cle: "2026-10-30" }, EL, AUJ);
    expect(r).toHaveLength(31); expect(r[29].compte).toBe(2); expect(r[28].compte).toBe(1);
    expect(approximatifs(EL, { echelle: "jour", cle: "2026-10-30" }).map(x => x.id)).toEqual(["d"]);
  });
  it("le jour : 24 heures ; puis les moments de l'heure, à la minute", () => {
    const h = anneau({ echelle: "heure", cle: "2026-10-30-h07" }, EL, AUJ);
    expect(h).toHaveLength(24); expect(h[7].compte).toBe(1); expect(h[1].compte).toBe(1);
    expect(anneau({ echelle: "moment", cle: "m-a" }, EL, AUJ, "moment").map(i => i.chiffre)).toEqual(["07:25"]);
  });
  it("la semaine : les semaines du mois, repérées par leur lundi", () => {
    const r = anneau({ echelle: "semaine", cle: "2026-10-26" }, EL, AUJ);
    expect(r.map(i => i.chiffre)).toEqual(["28", "5", "12", "19", "26"]); expect(r[4].compte).toBe(3);
    expect(dans(EL[0], { echelle: "semaine", cle: "2026-10-26" })).toBe(true);
  });
  it("descendre va là où sont les éléments ; les noms sont en français", () => {
    expect(vers({ echelle: "annee", cle: "2026" }, "mois", EL, AUJ)).toEqual({ echelle: "mois", cle: "2026-10" });
    expect(vers({ echelle: "mois", cle: "2026-10" }, "jour", EL, AUJ)).toEqual({ echelle: "jour", cle: "2026-10-29" });
    expect(vers({ echelle: "jour", cle: "2026-10-30" }, "heure", EL, AUJ)).toEqual({ echelle: "heure", cle: "2026-10-30-h01" });
    expect(nomPeriode({ echelle: "jour", cle: "2026-10-30" })).toBe("vendredi 30 octobre 2026");
    expect(nomPeriode({ echelle: "semaine", cle: "2026-10-26" })).toBe("semaine du 26 octobre 2026");
  });
  it("les éléments sans date ne sont sur aucune bague ; l'adresse est vérifiée", () => {
    expect(sansDate(EL).map(x => x.id)).toEqual(["g"]);
    expect(lirePeriode("jour", "2026-10-30")).toEqual({ echelle: "jour", cle: "2026-10-30" });
    expect(lirePeriode("jour", "2026-10")).toBeNull(); expect(lirePeriode("siecle", "21")).toBeNull();
  });
});
