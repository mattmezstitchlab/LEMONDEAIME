// @vitest-environment node
/**
 * L'onde : un contrat commun au film LUMIERE et au futur Disque Ripple.
 * - la géométrie polaire est celle de RIPPLECIRCLE (mêmes valeurs) ;
 * - les fronts naissent selon la cadence, s'éloignent à la vitesse donnée, s'atténuent ;
 * - une onde décorative ne peut JAMAIS être transmise comme une notification ;
 * - la partition du film est posée sur les repères mesurés, et le contact tombe sur un temps à 120 BPM.
 */
import { describe, expect, it } from "vitest";
import { ANNEAUX_PRINCIPAUX, angularDist, estCausale, fronts, hauteur, normDeg, polarXY, reperes, sens, transmettre, versAnneaux, type Onde, type OndeCausale } from "../lib/onde/contrat";
import { DUREE, EXTRAIT, ONDE_FILM, REPERES, TABLEAUX, pulsation, scene, tableauA, timeline } from "../film/lumiere/partition";

describe("Géométrie polaire (reprise de RIPPLECIRCLE)", () => {
  it("0° en haut, sens horaire", () => {
    const h = polarXY(500, 500, 100, 0), d = polarXY(500, 500, 100, 90);
    expect(h.x).toBeCloseTo(500); expect(h.y).toBeCloseTo(400); expect(d.x).toBeCloseTo(600); expect(d.y).toBeCloseTo(500);
    expect(normDeg(-30)).toBe(330); expect(angularDist(350, 10)).toBe(20);
  });
  it("les anneaux principaux sont des fractions du cadran Ripple (1000, centre 500)", () => {
    expect(ANNEAUX_PRINCIPAUX[0]).toBeCloseTo(488 / 500); expect(ANNEAUX_PRINCIPAUX.at(-1)).toBeCloseTo(148 / 500);
  });
});

describe("Fronts de l'onde", () => {
  const o: Onde = { ...ONDE_FILM, progression: { debut: 10, duree: 20, cadence: 1 } };
  it("rien avant le déclenchement ; un front par cadence ; rayon = rayon0 + vitesse × âge", () => {
    expect(fronts(o, 9.9)).toEqual([]);
    const f = fronts(o, 12.5); expect(f.map(x => x.k)).toEqual([0, 1, 2]);
    expect(f[0].rayon).toBeCloseTo(o.rayon + o.vitesse * 2.5);
  });
  it("l'intensité s'atténue avec l'âge", () => {
    expect(fronts(o, 13)[0].intensite).toBeLessThan(fronts(o, 11)[0].intensite);
  });
  it("la hauteur est maximale sur le front, nulle loin de lui", () => {
    const r = fronts(o, 12)[0].rayon;
    expect(Math.abs(hauteur(o, r, 12))).toBeGreaterThan(Math.abs(hauteur(o, r + 0.5, 12)) + 0.1);
  });
  it("versAnneaux : u = 0 laisse les fronts, u = 1 les pose sur les anneaux", () => {
    const rs = [0.1, 0.3, 0.5];
    expect(versAnneaux(rs, 0)).toEqual(rs);
    expect(versAnneaux(rs, 1)).toEqual([...ANNEAUX_PRINCIPAUX].sort((a, b) => a - b).slice(0, 3));
  });
  it("les repères se déploient dans le sens horaire", () => {
    const r = reperes(12, 0.5); expect(r.filter(x => x.visible === 1).length).toBe(6); expect(r[0].angle).toBe(0);
  });
});

describe("Une onde décorative ne transmet rien", () => {
  it("l'onde du film est décorative, rythmée par une donnée mesurée", () => {
    expect(estCausale(ONDE_FILM)).toBe(false);
    expect(sens(ONDE_FILM)).toEqual({ genre: "illustratif", raison: expect.stringContaining("attaque musicale mesurée") });
  });
  it("transmettre refuse une onde décorative même forcée par un transtypage", () => {
    const envoyes: unknown[] = [];
    expect(() => transmettre(ONDE_FILM as unknown as OndeCausale, e => envoyes.push(e))).toThrow(/aucune notification/);
    expect(envoyes).toEqual([]);
  });
  it("une onde causale porte un événement réel (id, source, horodatage) et peut être transmise", () => {
    const c: Onde = { ...ONDE_FILM, declencheur: { genre: "evenement", id: "moment-12", source: "Ripple · retard déclaré", horodatage: "2026-10-30T10:00:00Z" } };
    expect(estCausale(c)).toBe(true);
    const envoyes: unknown[] = []; transmettre(c as OndeCausale, e => envoyes.push(e)); expect(envoyes).toHaveLength(1);
    expect(sens(c)).toEqual({ genre: "donnee", source: "Ripple · retard déclaré · moment-12" });
  });
  it("un horodatage invalide n'est pas un événement", () => {
    expect(estCausale({ ...ONDE_FILM, declencheur: { genre: "evenement", id: "x", source: "y", horodatage: "bientôt" } })).toBe(false);
  });
});

describe("La partition du film", () => {
  it("44 s, de 03:04.25 à 03:48.25", () => { expect(DUREE).toBe(44); expect(EXTRAIT.debut).toBe(184.25); });
  it("le contact est le repère mesuré (03:18.255) et tombe sur un temps à 120 BPM", () => {
    expect(REPERES.contact.t).toBeCloseTo(14.005, 3);
    const p = pulsation(REPERES.contact.t); expect(p.phase).toBeCloseTo(0, 5);
    expect((REPERES.contact.musique - 0.005 - EXTRAIT.debut) % 0.5).toBeCloseTo(0, 3);   // 198.25 : sur la grille
  });
  it("l'ordre des repères est celui du récit", () => {
    const tl = timeline(); for (let i = 1; i < tl.length; i++) expect(tl[i].t).toBeGreaterThan(tl[i - 1].t);
  });
  it("six tableaux contigus qui couvrent tout le film", () => {
    expect(TABLEAUX).toHaveLength(6); expect(TABLEAUX[0].debut).toBe(0); expect(TABLEAUX.at(-1)!.fin).toBe(DUREE);
    for (let i = 1; i < 6; i++) expect(TABLEAUX[i].debut).toBe(TABLEAUX[i - 1].fin);
    expect(tableauA(REPERES.contact.t + 0.01).id).toBe("impact");
  });
  it("la goutte tombe pendant les aigus, est en vue juste avant le contact, disparaît après", () => {
    expect(scene(REPERES.contact.t - 0.05).perle.visible).toBe(1);
    expect(scene(REPERES.contact.t + 0.01).perle.visible).toBe(0);
    expect(scene(REPERES.chute.t + 0.5).perle.y).toBeGreaterThan(scene(REPERES.chute.t).perle.y);
  });
  it("le temps s'arrête pendant le creux mesuré (gel), pas avant ni après", () => {
    expect(scene(REPERES.suspension.t + 0.2).gel).toBe(1);
    expect(scene(REPERES.suspension.t - 0.1).gel).toBe(0); expect(scene(REPERES.chute.t + 0.1).gel).toBe(0);
  });
  it("le son : fondus de 2 s ; la fin est blanche ; le Point reste (repli complet)", () => {
    expect(scene(0).son).toBe(0); expect(scene(10).son).toBe(1); expect(scene(DUREE).son).toBe(0);
    expect(scene(DUREE).blanc).toBe(1); expect(scene(DUREE).repli).toBe(1);
  });
});
