/**
 * Le Bureau éditorial (phase 3) : les sections couvrent toute la landing, la médiathèque du site déclare ses droits,
 * le cadrage est borné, et l'édition ne touche jamais l'objet d'origine.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { existsSync } from "node:fs";
import { act } from "react";
import { createRoot } from "react-dom/client";
import Edition from "../components/edition/Edition";
import { ORIGINE, srcOk, validerContenus } from "../components/edition/contenus";
import { cleSection, SELECTEUR_SECTIONS } from "../components/edition/useContenusPublies";
import { CATALOGUE_SITE } from "../bureau/catalogue";
import { ecrire, lire, SECTIONS } from "../bureau/sections";

describe("Les sections du Bureau", () => {
  it("chaque section pointe vers un vrai groupe de contenus, et toutes ensemble couvrent toute la landing", () => {
    for (const s of SECTIONS) expect(lire(ORIGINE, s.chemin), s.cle).toBeTruthy();
    const couvert = (c: string) => SECTIONS.some(s => c.startsWith(s.chemin.join(".")));
    const feuilles: string[] = [];
    const parcourir = (o: unknown, c: string[]) => { if (o && typeof o === "object" && !Array.isArray(o) && !("src" in o)) for (const [k, v] of Object.entries(o)) parcourir(v, [...c, k]); else feuilles.push(c.join(".")); };
    parcourir(ORIGINE, []);
    expect(feuilles.filter(f => !couvert(f))).toEqual([]);
  });
  it("écrire un champ ne modifie jamais l'origine ni le brouillon précédent", () => {
    const avant = JSON.stringify(ORIGINE);
    const b = ecrire(ORIGINE, ["histoire", "origine", "titre"], "Autre");
    const c = ecrire(b, ["histoire", "origine", "media", "cadrage", "mobile"], { x: 10, y: 90 });
    expect(JSON.stringify(ORIGINE)).toBe(avant);
    expect(lire(b, ["histoire", "origine", "media", "cadrage", "mobile"])).toEqual({ x: 50, y: 50 });
    expect(lire(c, ["histoire", "origine", "titre"])).toBe("Autre");
    expect(c.histoire.mulhouse).toBe(ORIGINE.histoire.mulhouse);
  });
  it("le cadrage : des nombres de 0 à 100, arrondis ; sinon le centre", () => {
    const c = (x: unknown, y: unknown) => validerContenus({ histoire: { origine: { media: { cadrage: { ordinateur: { x, y } } } } } });
    expect(c(12.345, 99).contenus.histoire.origine.media.cadrage.ordinateur).toEqual({ x: 12.3, y: 99 });
    for (const [x, y] of [[-1, 50], [50, 101], ["50", 50], [NaN, 2]]) { const r = c(x, y); expect(r.ecarts.length).toBeGreaterThan(0); }
    expect(c(-1, 50).contenus.histoire.origine.media.cadrage.ordinateur.x).toBe(50);
  });
  it("la médiathèque du site : des fichiers présents, des adresses admises, des droits déclarés, les reconstitutions annoncées", () => {
    for (const m of CATALOGUE_SITE) {
      expect(srcOk(m.src), m.src).toBe(true);
      expect(existsSync("public/" + m.src), m.src).toBe(true);
      expect(m.provenance.length).toBeGreaterThan(3);
      if (m.reconstitution) { expect(m.licence).toBe("reconstitution"); expect(m.legende).toMatch(/Reconstitution/); }
      const r = validerContenus({ histoire: { origine: { media: { ...ORIGINE.histoire.origine.media, src: m.src, alt: m.alt, legende: m.legende, licence: m.licence, reconstitution: m.reconstitution, provenance: m.provenance } } } });
      expect(r.ecarts, m.src).toEqual([]);
    }
  });
});

describe("L'aperçu en direct : chaque section du Bureau se retrouve dans la page", () => {
  const saved = { matchMedia: globalThis.matchMedia, getContext: HTMLCanvasElement.prototype.getContext };
  beforeAll(() => {
    (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    globalThis.matchMedia = ((q: string) => ({ matches: false, media: q, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })) as unknown as typeof globalThis.matchMedia;
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  });
  afterAll(() => { globalThis.matchMedia = saved.matchMedia; HTMLCanvasElement.prototype.getContext = saved.getContext; });
  it("toutes les clés de section existent dans l'édition rendue", async () => {
    const hote = document.createElement("div"); document.body.appendChild(hote); const root = createRoot(hote);
    await act(async () => { root.render(<Edition actions={{ ouvrir: vi.fn(), importer: vi.fn(), visite: vi.fn() }} />); });
    const cles = new Set([...document.querySelectorAll(SELECTEUR_SECTIONS)].map(cleSection));
    expect(SECTIONS.map(s => s.cle).filter(c => !cles.has(c))).toEqual([]);
    await act(async () => root.unmount()); hote.remove();
  });
});
