import { describe, expect, it } from "vitest";
import { depuisTemps } from "../lib/present/atlas";

const fichier = (elements: object[]) => ({ format: "atlas-temps", version: 1, elements });
const c = { id: "c-1999-comines", genre: "chronologie", titre: "Première exposition, à Comines", date: "1999", precision: "annee", source: "chronologie publiée d’ATLAS, 1999 : déclaré par Matt", lien: "/chronologie" };
const a = { id: "app-2025-11-10-rainbow", genre: "application", titre: "Rainbow Synchronicity", date: "2025-11-10", precision: "jour", source: "Base44, date de création", lien: "/" };

describe("ATLAS dans le calendrier du Disque (lu en direct, jamais copié)", () => {
  it("chaque élément garde sa date, sa précision et sa source ; le projet dit ce qu'il contient", () => {
    const r = depuisTemps(fichier([c, a]))!;
    expect(r.elements).toEqual([
      { id: "atlas-c-1999-comines", projet: "atlas", titre: c.titre, date: "1999", precision: "annee", source: "ATLAS · " + c.source, genre: "passe" },
      { id: "atlas-app-2025-11-10-rainbow", projet: "atlas", titre: a.titre, date: "2025-11-10", precision: "jour", source: "ATLAS · " + a.source, genre: "passe" },
    ]);
    expect(r.projet).toMatchObject({ id: "atlas", titre: "ATLAS", genre: "site", etat: "1 entrée de la chronologie · 1 jour de création d’applications" });
    expect(r.projet.modifie).toBe(Date.UTC(2025, 10, 10));
    expect(r.projet.adresse).toMatch(/\/chronologie$/);
    expect(r.projet.intention).toBeUndefined(); expect(r.projet.echeance).toBeUndefined();   // rien d'inventé
  });
  it("un fichier inattendu, vide ou d'une autre version est refusé : ATLAS n'apparaît pas", () => {
    expect(depuisTemps(null)).toBeNull();
    expect(depuisTemps({ format: "autre", version: 1, elements: [c] })).toBeNull();
    expect(depuisTemps({ ...fichier([c]), version: 2 })).toBeNull();
    expect(depuisTemps(fichier([]))).toBeNull();
  });
  it("une date mal formée ou une précision inconnue est écartée, jamais devinée", () => {
    const r = depuisTemps(fichier([c, { ...a, date: "10 nov." }, { ...a, id: "x", precision: "minute" }]))!;
    expect(r.elements.map(e => e.id)).toEqual(["atlas-c-1999-comines"]);
  });
});
