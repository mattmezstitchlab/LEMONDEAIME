// @vitest-environment node
/**
 * Le moteur de montage : les repères musicaux sont immuables ; insérer, remplacer, redimensionner ne déplacent jamais
 * l'impact de « La Fleur du Ciel » (03:18.255 du WAV original) sans le dire.
 */
import { describe, expect, it } from "vitest";
import { dureeMontage, filmDuRepere, inserer, musiqueA, placer, plansA, redimensionner, remplacer, verifier, type Montage, type Plan } from "../lib/cinema/montage";
import { ANIMATIQUE, CHAPITRE_FLEUR, COURT_METRAGE, FLEUR_DU_CIEL } from "../film/lumiere/montages";
import { REPERES } from "../film/lumiere/partition";

const IMPACT = "fleur-du-ciel:impact";
const planVide = (id: string, duree: number): Plan => ({ id, titre: id, chapitre: "x", piste: "video", source: { genre: "image", url: "/x.png" }, duree, statut: "provisoire", provenance: { auteur: "test", droits: "proprietaire" } });

describe("Le repère canonique", () => {
  it("l'impact est à 198,255 s du WAV original, verrouillé", () => {
    expect(FLEUR_DU_CIEL.reperes.impact).toMatchObject({ temps: 198.255, verrouille: true });
  });
  it("les trois versions sont synchronisées à 0 ms près sur tous leurs points verrouillés", () => {
    for (const m of [ANIMATIQUE, CHAPITRE_FLEUR, COURT_METRAGE]) {
      const r = verifier(m); expect(r.ok, m.id + JSON.stringify(r.synchro.filter(s => !s.ok))).toBe(true);
      expect(r.synchro.length).toBeGreaterThan(0); expect(r.synchro.every(s => s.ecartMs === 0)).toBe(true);
    }
  });
  it("l'animatique reste identique à la version validée (le contact à 14,005 s du film)", () => {
    expect(filmDuRepere(ANIMATIQUE, IMPACT)).toBeCloseTo(REPERES.contact.t, 9); expect(dureeMontage(ANIMATIQUE)).toBe(44);
  });
  it("le chapitre complet dure 4 min 13 et l'impact y tombe à 198,255 s du film", () => {
    expect(dureeMontage(CHAPITRE_FLEUR)).toBeCloseTo(253, 9); expect(filmDuRepere(CHAPITRE_FLEUR, IMPACT)).toBeCloseTo(198.255, 9);
  });
  it("de 03:14.25 à 03:46.25, le chapitre montre exactement les images de l'animatique", () => {
    for (const t of [10.5, 12.1, 13.99, 14.005, 20, 33, 41.9]) {
      const a = plansA(ANIMATIQUE, t)[0].tNarratif!, c = plansA(CHAPITRE_FLEUR, t + 184.25)[0].tNarratif!;
      expect(c).toBeCloseTo(a, 6);
    }
  });
  it("exemple de Matt : un extrait qui commence à 03:04.255 fait sonner l'impact 14 s après son début", () => {
    const m: Montage = { ...ANIMATIQUE, musique: [{ id: "x", morceau: FLEUR_DU_CIEL.id, debut: 184.255, fin: 228.255, position: 0 }] };
    expect(filmDuRepere(m, IMPACT)).toBeCloseTo(14, 9);
    expect(musiqueA(m, 14)[0]).toMatchObject({ tempsExtrait: 14, tempsMorceau: 198.255 });
  });
});

describe("Éditer sans casser", () => {
  it("insérer une scène AVANT l'impact allonge le film sans décaler l'impact par rapport à l'image", () => {
    const m = inserer(CHAPITRE_FLEUR, planVide("nouvelle-scene", 30), "c-traversee");
    expect(dureeMontage(m)).toBeCloseTo(283, 9);
    const r = verifier(m); expect(r.ok).toBe(true);
    expect(filmDuRepere(m, IMPACT)).toBeCloseTo(228.255, 9);                            // le film s'allonge…
    expect(placer(m).find(p => p.id === "c-impact")!.debutFilm).toBeCloseTo(228.255, 9);   // …et l'image suit la musique
  });
  it("insérer dans l'animatique (un seul clip) : la musique est scindée, rien ne dérive", () => {
    const m = inserer(ANIMATIQUE, planVide("respiration", 5), "a-suspension");
    expect(verifier(m).ok).toBe(true); expect(m.musique).toHaveLength(2);
  });
  it("remplacer un plan par une vidéo (ex. Manus) : même place ; le média est aligné sur l'impact ; l'ancien plan reste dans l'historique", () => {
    const m = remplacer(CHAPITRE_FLEUR, "c-impact", { genre: "video", url: "/manus/goutte.mp4", duree: 10, synchroMedia: 3.2 }, "plan Manus de la goutte", "2026-10-30T02:00:00Z");
    const p = placer(m).find(x => x.id === "c-impact")!;
    expect(p.debutFilm).toBeCloseTo(198.255, 9); expect(p.media!.debut).toBeCloseTo(3.2, 9);
    expect(plansA(m, 198.255)[0].tMedia).toBeCloseTo(3.2, 9);                              // l'image Manus du contact tombe sur l'impact
    expect(p.historique![0].source.genre).toBe("procedural"); expect(verifier(m).ok).toBe(true);
  });
  it("un média trop court est signalé (jamais masqué)", () => {
    const m = remplacer(CHAPITRE_FLEUR, "c-impact", { genre: "video", url: "/x.mp4", duree: 2, synchroMedia: 1 }, "test");
    expect(verifier(m).avertissements[0]).toMatch(/ne couvre pas/);
  });
  it("allonger un plan avant l'impact est REFUSÉ (l'image se décalerait), sauf si la musique suit", () => {
    expect(redimensionner(CHAPITRE_FLEUR, "c-traversee", 100)).toEqual({ refus: expect.stringMatching(/décalerait l'impact/) });
    const r = redimensionner(CHAPITRE_FLEUR, "c-traversee", 100, true);
    expect("montage" in r && verifier(r.montage).ok).toBe(true);
  });
});

describe("Versions longues", () => {
  it("le court métrage proposé dure 30:00.12 (11 morceaux), seul « La Fleur du Ciel » a ses images", () => {
    expect(dureeMontage(COURT_METRAGE)).toBeCloseTo(1800.12, 2); expect(COURT_METRAGE.chapitres).toHaveLength(11);
    expect(filmDuRepere(COURT_METRAGE, IMPACT)).toBeCloseTo(198.255 + 254.84 + 97.4 + 117 + 102.96 + 159.64 + 219.88, 6);
    expect(verifier(COURT_METRAGE).ok).toBe(true);
  });
  it("l'architecture tient une heure et plus (24 chapitres), vérifiée en quelques millisecondes", () => {
    let m: Montage = { ...COURT_METRAGE };
    for (let i = 0; i < 13; i++) m = inserer(m, planVide("ext" + i, 140), null);
    const t0 = performance.now(), r = verifier(m);
    expect(dureeMontage(m)).toBeGreaterThan(3600); expect(r.ok).toBe(true); expect(performance.now() - t0).toBeLessThan(50);
  });
  it("droits : la musique reste « à vérifier » : rien n'est publiable tant que ce n'est pas levé", () => {
    expect(verifier(CHAPITRE_FLEUR).publiable).toBe(false);
  });
});
