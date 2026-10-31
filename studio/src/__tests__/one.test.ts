/** .0NE — le contrat des univers, le registre, la source unique de préférences. */
import { beforeEach, describe, expect, it } from "vitest";
import { presentationPour, universPublics, verifierUnivers, type Univers } from "../lib/one/contrat";
import { enregistrerUnivers, tousLesUnivers, UNIVERS, UNIVERS_DEMONSTRATION } from "../lib/one/univers";
import { BESOINS, CLE_ONE, ecrireOne, lireOne, proposerPourBesoins } from "../lib/one/preferences";
import { ACCESS_KEY, readPrefs } from "../lib/accessibilityCore";
import { enveloppe } from "../lib/tambour/disque";

const base: Univers = { ...UNIVERS_DEMONSTRATION, id: "essai-x", nom: "Essai", demonstration: false };

describe("Le contrat des univers : des statuts honnêtes", () => {
  it("le registre livré respecte le contrat, sans doublon", () => {
    for (const u of UNIVERS) expect(verifierUnivers(u), u.id).toEqual([]);
    expect(new Set(UNIVERS.map(u => u.id)).size).toBe(UNIVERS.length);
  });
  it("« disponible » exige un moteur raccordé ; « en préparation » ne s'ouvre pas ; une démonstration reste expérimentale", () => {
    expect(verifierUnivers({ ...base, statut: "disponible", ouverture: { type: "aucune" } })).toContain("« disponible » exige un moteur raccordé (une ouverture réelle)");
    expect(verifierUnivers({ ...base, statut: "preparation", ouverture: { type: "route", chemin: "x" } }).length).toBe(1);
    expect(verifierUnivers({ ...base, demonstration: true, statut: "disponible" })).toContain("un univers de démonstration est toujours « expérimental »");
    expect(verifierUnivers({ ...base, visuel: { src: "a.webp", alt: "a", credit: "Image", licence: "reconstitution" } })).toContain("une reconstitution doit être annoncée dans son crédit");
  });
  it("la mosaïque publique : publiés, conformes, dans l'ordre ; un brouillon n'apparaît pas", () => {
    const l = universPublics([{ ...base, id: "bb", ordre: 2 }, { ...base, id: "aa", ordre: 1 }, { ...base, id: "cc", ordre: 0, publication: "brouillon" }, { ...base, id: "dd", ordre: 3, familles: [] }]);
    expect(l.map(u => u.id)).toEqual(["aa", "bb"]);
  });
  it("ajouter un univers au registre lui donne sa place, sans autre code ; un identifiant pris est refusé", () => {
    const avant = universPublics(tousLesUnivers()).length;
    expect(enregistrerUnivers(UNIVERS_DEMONSTRATION)).toEqual([]);
    expect(universPublics(tousLesUnivers()).length).toBe(avant + 1);
    expect(enregistrerUnivers(UNIVERS_DEMONSTRATION)).toEqual(["identifiant déjà pris"]);
    expect(enregistrerUnivers({ ...base, id: "faux", statut: "disponible", ouverture: { type: "aucune" } }).length).toBeGreaterThan(0);
  });
  it("un contenu dense ne tient jamais dans un cercle ; sur téléphone, le contenu d'abord", () => {
    expect(presentationPour("programme", 1440)).toBe("etendu");
    expect(presentationPour("ouvrage", 1440)).toBe("disque");
    expect(presentationPour("ouvrage", 390)).toBe("etendu");
  });
});

describe("Une source unique de préférences", () => {
  beforeEach(() => localStorage.clear());
  it("l'affichage est celui du Confort de POINT ZÉRO (même clé), le reste vit sous la clé .0NE ; tout est relu après rechargement", () => {
    const p = lireOne();
    expect(p.synchronisation).toBe("locale");
    ecrireOne({ ...p, affichage: { ...p.affichage, fontScale: 1.25 }, interaction: { ...p.interaction, cibles: "grandes" }, favoris: ["broderie", "culture"] });
    expect(JSON.parse(localStorage.getItem(ACCESS_KEY)!).fontScale).toBe(1.25);
    expect(readPrefs().fontScale).toBe(1.25);
    const brut = JSON.parse(localStorage.getItem(CLE_ONE)!);
    expect(brut.affichage).toBeUndefined();          /* aucune copie de l'affichage */
    expect(lireOne()).toMatchObject({ interaction: { cibles: "grandes" }, favoris: ["broderie", "culture"] });
    expect(document.documentElement.dataset.oneCibles).toBe("grandes");
    expect(document.documentElement.style.getPropertyValue("--one-cible")).toBe("1.2");
  });
  it("un enregistrement abîmé revient aux valeurs par défaut, champ par champ", () => {
    localStorage.setItem(CLE_ONE, JSON.stringify({ version: 1, interaction: { cibles: "énormes" }, favoris: ["broderie", "<script>"], besoins: ["sla", "fatigue"] }));
    const p = lireOne();
    expect(p.interaction.cibles).toBe("standard");
    expect(p.favoris).toEqual(["broderie"]);
    expect(p.besoins).toEqual(["fatigue"]);          /* seuls des besoins concrets connus ; jamais un diagnostic */
  });
  it("des besoins concrets proposent des réglages ; aucun ne nomme une maladie", () => {
    const p = proposerPourBesoins(lireOne(), ["pointage-alternatif", "lecture-difficile"]);
    expect(p).toMatchObject({ interaction: { cibles: "tres-grandes", validation: "confirmer" }, presentation: "liste", affichage: { fontScale: 1.25 } });
    for (const b of BESOINS) expect(b.phrase + b.propose).not.toMatch(/SLA|sclérose|handicap|maladie|diagnostic/i);
  });
  it("la taille des commandes entre dans la géométrie du Disque (tout reste dans la couronne)", () => {
    expect(enveloppe("dessous", 1, 1.4).rond).toBeGreaterThan(enveloppe("dessous", 1, 1).rond);
    expect(enveloppe("cartouche", 1, 1.2).l).toBe(53);
  });
});
