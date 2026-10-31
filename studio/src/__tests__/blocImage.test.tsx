/**
 * Le même Point pour une autre création : le bloc Image. Ses commandes viennent du registre ; le noyau ne change pas.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import EssaiImage, { filtreCss, rectCadrage } from "../essais/EssaiImage";
import { commandesImage, REGLAGES_NEUTRES, type ContexteImage } from "../components/blocs/image";
import { commandesDuBloc, typeBloc } from "../lib/point/registre";

const ctx = (): ContexteImage => ({ cadrage: "original", recadrer: vi.fn(), reglages: REGLAGES_NEUTRES, regler: vi.fn(), reinitialiser: vi.fn(), echelle: 100, redimensionner: vi.fn(),
  taille: e => ({ w: 960 * e / 100, h: 640 * e / 100 }), vue: "ajuste", afficher: vi.fn(), tiers: false, basculerTiers: vi.fn(), fond: "clair", choisirFond: vi.fn(), exporter: vi.fn(), importer: vi.fn() });

describe("Le type de bloc « image »", () => {
  it("est enregistré à côté de la broderie, sans Confort ni commande de broderie", () => {
    expect(typeBloc("image")?.nom).toBe("Image");
    const ids = commandesDuBloc("image", ctx()).map(m => m.id);
    expect(ids).toEqual(["affichage", "recadrer", "couleurs", "dimensions", "exporter", "importer"]);
    const tout = JSON.stringify(commandesImage(ctx()).flatMap(function f(m): string[] { return [m.id, ...(m.enfants ? m.enfants().flatMap(f) : [])]; }));
    expect(tout).not.toMatch(/dmc|fils|points|broder|patron|symboles/i);
  });
  it("des choix en valeurs (16:9, +20, 50 %), chacun branché sur sa vraie action", () => {
    const c = ctx(), l = commandesImage(c), f = (id: string) => l.find(m => m.id === id)!;
    const cadres = f("recadrer").enfants!();
    expect(cadres.map(m => m.valeur)).toEqual(["Orig.", "1:1", "4:3", "16:9", "3:4"]);
    cadres.find(m => m.id === "cadre-16x9")!.ouvrir(); expect(c.recadrer).toHaveBeenCalledWith("16:9");
    const lum = f("couleurs").enfants!().find(m => m.id === "luminosite")!.enfants!();
    expect(lum.map(m => m.valeur)).toEqual(["−40", "−20", "0", "+20", "+40"]);
    lum[3].ouvrir(); expect(c.regler).toHaveBeenCalledWith({ luminosite: 20 });
    f("dimensions").enfants!().find(m => m.id === "echelle-50")!.ouvrir(); expect(c.redimensionner).toHaveBeenCalledWith(50);
    expect(f("dimensions").enfants!().find(m => m.id === "echelle-50")!.aide).toBe("480 × 320 px");
    f("exporter").enfants!().find(m => m.id === "export-png")!.ouvrir(); expect(c.exporter).toHaveBeenCalledWith("png");
  });
  it("recadre au centre et règle les couleurs par un filtre", () => {
    expect(rectCadrage(960, 640, "16:9")).toEqual({ x: 0, y: 50, w: 960, h: 540 });
    expect(rectCadrage(960, 640, "1:1")).toEqual({ x: 160, y: 0, w: 640, h: 640 });
    expect(rectCadrage(960, 640, "3:4")).toEqual({ x: 240, y: 0, w: 480, h: 640 });
    expect(filtreCss({ ...REGLAGES_NEUTRES, luminosite: 20, nb: true })).toBe("brightness(1.2) contrast(1) saturate(1) grayscale(1)");
  });
});

const saved = { matchMedia: globalThis.matchMedia, getContext: HTMLCanvasElement.prototype.getContext };
beforeAll(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.matchMedia = ((q: string) => ({ matches: false, media: q, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })) as unknown as typeof globalThis.matchMedia;
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});
afterAll(() => { globalThis.matchMedia = saved.matchMedia; HTMLCanvasElement.prototype.getContext = saved.getContext; });
let root: Root | null = null, hote: HTMLElement | null = null;
const attendre = () => act(async () => { for (let k = 0; k < 4; k++) await new Promise(r => requestAnimationFrame(() => r(null))); });
const cliquer = async (el: Element | null | undefined) => { expect(el).toBeTruthy(); await act(async () => { el!.dispatchEvent(new MouseEvent("click", { bubbles: true })); }); await attendre(); };
const mode = (id: string) => document.querySelector<HTMLButtonElement>(`[data-presentation] [data-mode="${id}"]`);
const etat = () => document.querySelector("[data-essai=etat]")!.textContent!;
beforeEach(() => localStorage.clear());
afterEach(async () => { await act(async () => root?.unmount()); root = null; hote?.remove(); hote = null; localStorage.clear(); });

describe("L'essai : un bloc Image dans un Cadre, piloté par le même Point", () => {
  it("le Point n'apparaît qu'une fois l'image sélectionnée ; Confort d'abord, puis les outils de l'image", async () => {
    hote = document.createElement("div"); document.body.appendChild(hote); root = createRoot(hote);
    await act(async () => { root!.render(<EssaiImage />); }); await attendre();
    expect(document.querySelector(".lp-point")).toBeNull();
    await cliquer(document.querySelector(".ei-cadre"));
    expect(document.querySelectorAll(".lp-point").length).toBe(1);
    expect(document.querySelector(".lp-contexte")?.getAttribute("data-contexte")).toBe("bloc-image");
    await cliquer(document.querySelector(".lp-point"));
    expect([...document.querySelectorAll<HTMLElement>("[data-presentation] [role=menuitem]")].map(e => e.dataset.mode)).toEqual(["confort", "affichage", "recadrer", "couleurs", "dimensions", "exporter", "importer"]);
    await cliquer(mode("recadrer")); await cliquer(mode("cadre-16x9"));
    expect(etat()).toMatch(/960 × 540 px · recadrée 16:9/);
    expect(mode("cadre-16x9")!.getAttribute("aria-label")).toMatch(/^Panoramique 16:9, actif/);
    await cliquer(mode("__retour")); await cliquer(mode("couleurs")); await cliquer(mode("luminosite")); await cliquer(mode("luminosite-20"));
    expect(etat()).toMatch(/luminosité \+20/);
    expect(mode("__origine")).toBeTruthy(); await cliquer(mode("__origine"));
    await cliquer(mode("dimensions")); await cliquer(mode("echelle-50"));
    expect(etat()).toMatch(/480 × 270 px/);
    await cliquer(mode("__retour")); await cliquer(mode("affichage")); await cliquer(mode("tiers"));
    expect(document.querySelector(".ei-tiers")).toBeTruthy();
    await cliquer(mode("fond")); await cliquer(mode("fond-damier"));
    expect(document.querySelector(".ei-cadre")!.className).toMatch(/ei-fond-damier/);
    /* les Favoris de l'image sont les siens : une autre clé que ceux de la broderie */
    await act(async () => { document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); }); await attendre();
    await act(async () => { document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); }); await attendre();
    await act(async () => { document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); }); await attendre();
    await cliquer(document.querySelector(".lp-point"));
    await cliquer(mode("__favoris"));
    const favs = [...document.querySelectorAll<HTMLElement>("[data-presentation] [role=menuitem]")].map(e => e.dataset.mode);
    expect(favs).toContain("fav-recadrer~cadre-16x9"); expect(favs).toContain("fav-couleurs~luminosite~luminosite-20");
    expect(Object.keys(localStorage).filter(k => k.startsWith("pointzero:point:usage:"))).toEqual(["pointzero:point:usage:bloc-image"]);
  });
});
