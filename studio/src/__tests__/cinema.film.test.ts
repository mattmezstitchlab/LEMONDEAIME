import { describe, expect, it } from "vitest";
import { controlerFilm, verifierFilm, versMontage } from "../lib/cinema/film";
import { verifier, placer, plansA, filmDuMorceau } from "../lib/cinema/montage";
import { FILM_FLEUR_DONNEES, FLEUR_DU_CIEL, PREVIZ_IMPACT, FILM_FLEUR } from "../film/lumiere/montages";

describe("le film comme données (Disque CINÉMA)", () => {
  it("31 plans contigus, de 0 à 253 s, chaque repère verrouillé porté par un plan", () => {
    const r = verifierFilm(FILM_FLEUR_DONNEES, FLEUR_DU_CIEL);
    expect(r.erreurs).toEqual([]);
    expect(FILM_FLEUR_DONNEES.plans).toHaveLength(31);
  });
  it("le film traduit en montage garde l'impact à 03:18.255, à la milliseconde", () => {
    const c = controlerFilm(FILM_FLEUR_DONNEES, FLEUR_DU_CIEL);
    expect(c.ok).toBe(true);
    const imp = c.montage.synchro.find(s => s.repere.endsWith(":impact"))!;
    expect(imp.ecartMs).toBe(0);
    const p23 = placer(FILM_FLEUR).find(p => p.id === "P23")!;
    expect(p23.debutFilm).toBeCloseTo(198.25, 9);   // la coupe tombe sur l'image 4758 ; le repère sonne 5 ms plus tard, dans P23
  });
  it("la prévisualisation 03:14 → 03:26 : 12 s, le contact à 4,005 s, image n° 96 à 24 i/s", () => {
    const v = verifier(PREVIZ_IMPACT);
    expect(v.ok).toBe(true);
    expect(PREVIZ_IMPACT.plans.map(p => p.id)).toEqual(["P20", "P21", "P22", "P23", "P24"]);
    const t = filmDuMorceau(PREVIZ_IMPACT, "fleur-du-ciel", 198.255)!;
    expect(t).toBeCloseTo(4.005, 9);
    expect(Math.floor(t * 24)).toBe(96);
    expect(plansA(PREVIZ_IMPACT, t).at(-1)!.plan.id).toBe("P23");   // le lecteur joue le dernier plan actif
  });
  it("remplacer un plan = activer une autre version : durée et repères inchangés (non destructif)", () => {
    const f = structuredClone(FILM_FLEUR_DONNEES);
    const p17 = f.plans.find(p => p.id === "P17")!;
    expect(p17.active).toBe("substitution");
    expect(p17.versions.map(v => v.id)).toContain("tournage");
    p17.versions.find(v => v.id === "tournage")!.source = { genre: "video", url: "/prive/p17-mains.mp4", duree: 14 };
    p17.active = "tournage";
    const m = versMontage(f, FLEUR_DU_CIEL);
    expect(verifier(m).ok).toBe(true);
    expect(placer(m).find(p => p.id === "P17")!.duree).toBe(12);
    expect(p17.versions.find(v => v.id === "substitution")).toBeTruthy();
  });
  it("un repère déplacé hors de son plan est refusé", () => {
    const f = structuredClone(FILM_FLEUR_DONNEES);
    f.plans.find(p => p.id === "P23")!.debut = 198.3; f.plans.find(p => p.id === "P22")!.fin = 198.3;
    expect(verifierFilm(f, FLEUR_DU_CIEL).ok).toBe(false);
  });
});
