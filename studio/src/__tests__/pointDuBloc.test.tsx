/**
 * Un bloc → un Point → un menu radial contextuel : le registre des types de blocs, la place du Point sur le bord du bloc,
 * puis l'essai dans l'atelier (outils de broderie réellement branchés, retour au dock).
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import App from "../App";
import AccessibilityShell from "../components/AccessibilityShell";
import { commandesDuBloc, enregistrerTypeBloc, ESSAI_BLOC_CLE, placePointDuBloc, typeBloc } from "../lib/point/registre";
import "../components/blocs/broderie";

describe("Le registre des types de blocs", () => {
  it("un type déclare ses commandes ; Confort n'y figure jamais (le Point l'apporte)", () => {
    enregistrerTypeBloc<{ n: number }>({ id: "essai-photo", nom: "Photo", commandes: c => [
      { id: "recadrer", nom: "Recadrage", aide: "a", groupe: "metier", ouvrir: () => {} },
      { id: "lumiere", nom: "Lumière", aide: "b", groupe: "metier", actif: c.n > 0, ouvrir: () => {} }] });
    expect(commandesDuBloc("essai-photo", { n: 1 }).map(m => m.id)).toEqual(["recadrer", "lumiere"]);
    expect(commandesDuBloc("inconnu", {})).toEqual([]);
    expect(() => enregistrerTypeBloc({ id: "essai-photo", nom: "x", commandes: () => [] })).toThrow(/déjà/);
    enregistrerTypeBloc({ id: "essai-faux", nom: "x", commandes: () => [{ id: "confort", nom: "Confort", aide: "", groupe: "acces", ouvrir: () => {} }] });
    expect(() => commandesDuBloc("essai-faux", {})).toThrow(/Confort/);
  });
  it("la broderie est enregistrée avec des commandes métier, sans Confort", () => {
    expect(typeBloc("broderie")?.nom).toBe("Broderie");
  });
  it("le Point se pose au bord droit du bloc, sinon dessous, toujours dans l'écran", () => {
    expect(placePointDuBloc({ x: 400, y: 200, w: 600, h: 400 }, { w: 1440, h: 900 })).toEqual({ left: 1010, top: 377, bord: "droite" });
    const t = placePointDuBloc({ x: 40, y: 290, w: 310, h: 310 }, { w: 390, h: 844 });
    expect(t.bord).toBe("dessous"); expect(t.left).toBe(304); expect(t.left + 46).toBeLessThanOrEqual(380); // sous le coin droit
    const bas = placePointDuBloc({ x: 0, y: 500, w: 390, h: 600 }, { w: 390, h: 844 });
    expect(bas.top + 46).toBeLessThanOrEqual(834);
  });
});

vi.mock("../lib/library", async importOriginal => ({ ...await importOriginal<typeof import("../lib/library")>(), saveLibrary: vi.fn().mockResolvedValue(undefined) }));
const saved = { matchMedia: globalThis.matchMedia, ResizeObserver: globalThis.ResizeObserver, getContext: HTMLCanvasElement.prototype.getContext };
beforeAll(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.matchMedia = ((query: string) => ({ matches: false, media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })) as unknown as typeof globalThis.matchMedia;
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof globalThis.ResizeObserver;
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});
afterAll(() => { globalThis.matchMedia = saved.matchMedia; globalThis.ResizeObserver = saved.ResizeObserver; HTMLCanvasElement.prototype.getContext = saved.getContext; });
let root: Root | null = null, container: HTMLElement | null = null;
const attendre = () => act(async () => { for (let k = 0; k < 4; k++) await new Promise(r => requestAnimationFrame(() => r(null))); });
const cliquer = async (el: Element | null | undefined) => { expect(el).toBeTruthy(); await act(async () => { el!.dispatchEvent(new MouseEvent("click", { bubbles: true })); }); await attendre(); };
async function ouvrir() {
  window.history.replaceState(null, "", "/atelier");
  localStorage.setItem("pointzero:visite-docks:v1", "vue");
  container = document.createElement("div"); document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(<AccessibilityShell><App /></AccessibilityShell>); });
  await attendre();
}
const secteurs = () => [...document.querySelectorAll<HTMLButtonElement>('[data-presentation] [role="menuitem"]')];
beforeEach(() => localStorage.clear());
afterEach(async () => { await act(async () => root?.unmount()); root = null; container?.remove(); container = null; localStorage.clear(); });

describe("L'essai : les outils sur le bloc", () => {
  it("se choisit dans le menu AIME, remplace le dock du bas par le Point du bloc, et se défait", async () => {
    await ouvrir();
    expect(container!.querySelector(".pzs-bottom")).toBeTruthy();
    await cliquer(container!.querySelector("#pzs-brand"));
    await cliquer([...container!.querySelectorAll("#pzs-bloc button")].find(b => b.textContent === "Essai : les outils sur le bloc"));
    expect(localStorage.getItem(ESSAI_BLOC_CLE)).toBe("1");
    expect(container!.querySelector(".pzs-bottom")).toBeNull();
    expect(document.querySelectorAll(".lp-point").length).toBe(1);
    expect(document.querySelector(".lp-contexte")?.getAttribute("data-contexte")).toBe("bloc-broderie");
    await cliquer(container!.querySelector("#pzs-brand"));
    await cliquer([...container!.querySelectorAll("#pzs-bloc button")].find(b => b.textContent === "Revenir au dock du bas"));
    expect(container!.querySelector(".pzs-bottom")).toBeTruthy();
    expect(localStorage.getItem(ESSAI_BLOC_CLE)).toBeNull();
  });
  const mode = (id: string) => secteurs().find(s => s.dataset.mode === id);
  const touche = async (key: string) => { await act(async () => { (document.activeElement ?? document.body).dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })); }); await attendre(); };
  it("le premier cercle : Confort d'abord, puis les familles et les fonctions de la broderie", async () => {
    localStorage.setItem(ESSAI_BLOC_CLE, "1");
    await ouvrir();
    await cliquer(document.querySelector(".lp-point"));
    expect(secteurs().map(s => s.dataset.mode)).toEqual(["confort", "loupe", "guide", "points", "broder", "fils", "affichage", "importer", "exporter", "dock-classique"]);
    expect(mode("points")!.getAttribute("aria-haspopup")).toBe("menu");
    expect(mode("points")!.getAttribute("aria-label")).toMatch(/famille/);
    await cliquer(mode("loupe"));
    expect(container!.querySelector(".pzs-loupe-dock")).toBeTruthy();
  });
  it("parcours 1 : Point → Points → Croix, Demi-point, Point arrière, Gomme → l'outil réel est choisi", async () => {
    localStorage.setItem(ESSAI_BLOC_CLE, "1");
    await ouvrir();
    await cliquer(document.querySelector(".lp-point"));
    await cliquer(mode("points"));
    expect(secteurs().map(s => s.dataset.mode).slice(0, 6)).toEqual(["__retour", "o-cross", "o-half", "o-back", "o-erase", "plus-outils"]);
    expect(document.activeElement?.getAttribute("data-mode")).toBe("o-cross");
    for (const [id, nom] of [["o-half", "Demi-point"], ["o-back", "Point arrière"], ["o-erase", "Gomme"], ["o-cross", "Croix"]]) {
      if (!mode(id)) { await cliquer(document.querySelector(".lp-point")); await cliquer(mode("points")); }
      await cliquer(mode(id));
      expect(secteurs().length).toBe(0); // une feuille ferme le menu
      await cliquer(document.querySelector(".lp-point"));
      await cliquer(mode("points"));
      expect(mode(id)!.getAttribute("aria-label")).toMatch(new RegExp("^" + nom + ", actif"));
      await touche("Escape"); await touche("Escape");
    }
    /* deuxième niveau : Plus d'outils, puis Point Zéro ramène au premier cercle */
    await cliquer(document.querySelector(".lp-point"));
    await cliquer(mode("points")); await cliquer(mode("plus-outils"));
    expect(mode("__origine")).toBeTruthy(); expect(mode("o-fill")).toBeTruthy();
    await cliquer(mode("__origine"));
    expect(mode("points")).toBeTruthy();
  });
  it("au clavier : Échap remonte d'un niveau, puis ferme ; Retour fait de même", async () => {
    localStorage.setItem(ESSAI_BLOC_CLE, "1");
    await ouvrir();
    await cliquer(document.querySelector(".lp-point"));
    await cliquer(mode("points"));
    await touche("Escape");
    expect(mode("points")).toBeTruthy();
    expect(document.activeElement?.getAttribute("data-mode")).toBe("points");
    await cliquer(mode("affichage"));
    await cliquer(mode("__retour"));
    expect(mode("affichage")).toBeTruthy();
    await touche("Escape");
    expect(secteurs().length).toBe(0);
  });
  it("parcours 2 : Point → Fils → une famille → une nuance DMC → le fil réel devient le fil actif", async () => {
    localStorage.setItem(ESSAI_BLOC_CLE, "1");
    await ouvrir();
    await cliquer(document.querySelector(".lp-point"));
    await cliquer(mode("fils"));
    expect(mode("famille-rouges")!.style.getPropertyValue("--lp-teinte")).toBeTruthy();
    await cliquer(mode("famille-rouges"));
    const nuances = secteurs().filter(s => s.dataset.mode!.startsWith("dmc-"));
    expect(nuances.length).toBeGreaterThan(5);
    expect(mode("__suite")).toBeTruthy(); // plus de 16 rouges : une page suivante
    expect(document.querySelectorAll(".lp-interieur").length + document.querySelectorAll(".lp-compact-fil").length).toBeGreaterThan(0);
    const choisi = nuances[2].dataset.mode!;
    await cliquer(nuances[2]);
    expect(secteurs().length).toBe(0);
    await cliquer(document.querySelector(".lp-point"));
    await cliquer(mode("fils")); await cliquer(mode("famille-rouges"));
    expect(mode(choisi)!.getAttribute("aria-label")).toMatch(/actif/);
  });
  it("parcours 3 : Point → Affichage → Symboles, À plat, Réaliste, Patron, Grille ; le menu reste ouvert pour voir l'effet", async () => {
    localStorage.setItem(ESSAI_BLOC_CLE, "1");
    await ouvrir();
    await cliquer(document.querySelector(".lp-point"));
    await cliquer(mode("affichage"));
    expect(secteurs().map(s => s.dataset.mode)).toEqual(["__retour", "symboles", "vue-flat", "vue-real", "vue-pattern", "tout-voir", "grille"]);
    await cliquer(mode("symboles"));
    expect(mode("symboles")!.getAttribute("aria-label")).toMatch(/^Symboles, actif/);
    for (const v of ["vue-pattern", "vue-flat", "vue-real"]) { await cliquer(mode(v)); expect(mode(v)!.getAttribute("aria-label")).toMatch(/actif/); }
    await cliquer(mode("grille"));
    expect(localStorage.getItem("pointzero:grille")).toBe("masquee");
    expect(mode("grille")!.textContent).toMatch(/masquée/);
    await cliquer(mode("grille"));
    expect(localStorage.getItem("pointzero:grille")).toBe("visible");
  });
  it("Favoris : le dernier outil, le dernier fil et le dernier affichage reviennent en deux gestes ; « Oublier » les efface", async () => {
    localStorage.setItem(ESSAI_BLOC_CLE, "1");
    await ouvrir();
    await cliquer(document.querySelector(".lp-point"));
    expect(mode("__favoris")).toBeUndefined(); // rien de retenu : le premier cercle reste tel quel
    await cliquer(mode("points")); await cliquer(mode("o-back"));
    await cliquer(document.querySelector(".lp-point")); await cliquer(mode("fils")); await cliquer(mode("famille-rouges"));
    const nuance = secteurs().find(x => x.dataset.mode!.startsWith("dmc-"))!.dataset.mode!; await cliquer(mode(nuance));
    await cliquer(document.querySelector(".lp-point")); await cliquer(mode("affichage")); await cliquer(mode("vue-pattern")); await touche("Escape"); await touche("Escape");
    await cliquer(document.querySelector(".lp-point")); await cliquer(mode("points")); await cliquer(mode("o-cross"));
    await cliquer(document.querySelector(".lp-point"));
    expect(mode("__favoris")).toBeTruthy();
    await cliquer(mode("__favoris"));
    const ids = secteurs().map(x => x.dataset.mode);
    expect(ids).toEqual(["__retour", "fav-points~o-cross", "fav-affichage~vue-pattern", `fav-fils~famille-rouges~${nuance}`, "fav-points~o-back", "__favoris-effacer"]);
    expect(mode(`fav-fils~famille-rouges~${nuance}`)!.style.getPropertyValue("--lp-teinte")).toBeTruthy(); // le fil reste une couleur
    await cliquer(mode("fav-points~o-back"));
    await cliquer(document.querySelector(".lp-point")); await cliquer(mode("points"));
    expect(mode("o-back")!.getAttribute("aria-label")).toMatch(/^Point arrière, actif/); // la vraie action
    await touche("Escape"); await cliquer(mode("__favoris")); await cliquer(mode("__favoris-effacer"));
    await cliquer(document.querySelector(".lp-point"));
    expect(mode("__favoris")).toBeUndefined();
    expect(Object.keys(localStorage).filter(k => k.startsWith("pointzero:point:usage:"))).toEqual([]);
    expect(Object.keys(localStorage).some(k => /ouvrage|library/i.test(k) && localStorage.getItem(k)?.includes("o-back"))).toBe(false);
  });
  it("Broder, Importer, Exporter et le retour au dock du bas sont de vraies actions", async () => {
    localStorage.setItem(ESSAI_BLOC_CLE, "1");
    await ouvrir();
    await cliquer(document.querySelector(".lp-point"));
    await cliquer(mode("broder"));
    await cliquer(mode("b-mark"));
    await cliquer(document.querySelector(".lp-point")); await cliquer(mode("broder"));
    expect(mode("b-mark")!.getAttribute("aria-label")).toMatch(/^Marquer, actif/);
    await touche("Escape"); await touche("Escape");
    const input = container!.querySelector<HTMLInputElement>('input[type="file"][aria-label^="Importer une image"]')!;
    const clic = vi.spyOn(input, "click");
    await cliquer(document.querySelector(".lp-point")); await cliquer(mode("importer"));
    expect(secteurs().map(x => x.dataset.mode)).toEqual(["__retour", "imp-image", "imp-pdf", "imp-projet", "imp-ouvrages", "imp-rosace"]);
    await cliquer(mode("imp-pdf"));
    expect(clic).toHaveBeenCalled(); expect(input.accept).toMatch(/pdf/); expect(input.accept).not.toMatch(/image/);
    await cliquer(document.querySelector(".lp-point")); await cliquer(mode("exporter"));
    expect(secteurs().map(x => x.dataset.mode)).toEqual(["__retour", "exp-patron", "exp-projet", "exp-partager"]);
    await touche("Escape"); await cliquer(mode("guide"));
    expect(secteurs().map(x => x.dataset.mode)).toEqual(["__retour", "guide-visite", "guide-chercher", "guide-suggestions", "guide-aide"]);
    await touche("Escape"); await touche("Escape");
    await cliquer(document.querySelector(".lp-point")); await cliquer(mode("dock-classique"));
    expect(container!.querySelector(".pzs-bottom")).toBeTruthy();
    expect(localStorage.getItem(ESSAI_BLOC_CLE)).toBeNull();
  });
});

describe("Le Point du bloc évite ce qu'il couvrirait", () => {
  it("descend sous un obstacle, sinon passe à sa gauche, et reste dans l'écran", async () => {
    const { eviterObstacles } = await import("../lib/point/registre");
    const ecran = { w: 320, h: 740 };
    const p = { left: 234, top: 520, bord: "dessous" };
    expect(eviterObstacles(p, [{ left: 0, top: 0, right: 10, bottom: 10 }], ecran)).toBe(p);
    const pilule = { left: 80, top: 478, right: 240, bottom: 566 };
    expect(eviterObstacles(p, [pilule], ecran)).toEqual({ left: 234, top: 576, bord: "dessous" });
    const bas = eviterObstacles({ left: 234, top: 520 }, [{ left: 80, top: 478, right: 240, bottom: 720 }], ecran);
    expect(bas.left + 46).toBeLessThanOrEqual(80);
  });
});
