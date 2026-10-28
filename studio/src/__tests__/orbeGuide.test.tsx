/**
 * L'orbe qui guide : à la première ouverture de l'atelier, elle présente chaque outil des deux docks, de bout en bout.
 * jsdom n'a pas de mise en page : ici on vérifie le parcours (cibles, sous-docks ouverts, clavier, mémoire) ;
 * le déplacement de l'orbe à l'écran est vérifié dans un vrai navigateur (tests/e2e/orbe.py).
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import App from "../App";
import { ETAPES, VISITE_CLE } from "../components/OrbeGuide";

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
async function ouvrirAtelier() {
  window.history.replaceState(null, "", "/atelier");
  container = document.createElement("div"); document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(<App />); });
  await attendre();
}
const bulle = () => container?.querySelector<HTMLElement>('[role="dialog"][aria-labelledby="og-titre"]');
const titre = () => bulle()?.querySelector("#og-titre")?.textContent;
const bouton = (texte: string) => [...(container?.querySelectorAll<HTMLButtonElement>("button") ?? [])].find(b => b.textContent === texte);
const cliquer = async (el: Element | null | undefined) => { expect(el).toBeTruthy(); await act(async () => { el!.dispatchEvent(new MouseEvent("click", { bubbles: true })); }); await attendre(); };
const touche = async (key: string) => { await act(async () => { bulle()!.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })); }); await attendre(); };
const dockHaut = () => container?.querySelector('nav[aria-label="Dock des outils du studio de broderie"]');

beforeEach(() => { localStorage.clear(); });
afterEach(async () => { await act(async () => root?.unmount()); root = null; container?.remove(); container = null; localStorage.clear(); window.history.replaceState(null, "", "/"); });

describe("L'orbe qui guide", () => {
  it("chaque étape vise un outil qui existe dans les docks", () => {
    const cibles = new Set(ETAPES.map(e => e.cible));
    expect([...cibles].sort()).toEqual(["broder", "cercle", "chercher", "dessiner", "fils", "historique", "lectures", "loupe", "orbe", "outil-back", "outil-cross", "outil-fill", "outil-half", "outils", "ouvrage", "partager", "point-zero", "profil", "symboles", "tout-voir", "zoom"].sort());
    expect(ETAPES[0].dock).toBe("haut");
    expect(ETAPES[ETAPES.length - 1].dock).toBe("bas");
    expect(ETAPES.findIndex(e => e.dock === "bas")).toBe(ETAPES.filter(e => e.dock !== "bas").length); // tout le haut, puis tout le bas
  });

  it("s'ouvre dès la première ouverture de l'atelier et parcourt les deux docks de bout en bout", async () => {
    await ouvrirAtelier();
    expect(titre()).toBe("Bonjour, je suis Le Point");
    expect(bulle()?.textContent).toContain(`1 / ${ETAPES.length}`);
    for (const e of ETAPES) if (!e.cible.startsWith("outil-")) expect(container?.querySelector(`[data-guide="${e.cible}"]`), e.cible).toBeTruthy();
    const vus: string[] = [titre()!];
    for (let k = 1; k < ETAPES.length; k++) {
      await cliquer(bouton("Suivant"));
      vus.push(titre()!);
      const e = ETAPES[k];
      expect(container?.querySelector(`[data-guide="${e.cible}"]`), e.titre).toBeTruthy();
      if (e.chemin === "dessiner") expect(dockHaut()?.querySelector('button[aria-label="Croix"]')).toBeTruthy();
      if (e.geste) { expect(dockHaut()?.querySelector(".dg-case"), e.titre).toBeTruthy(); expect(document.querySelector(".og-geste path")?.getAttribute("d"), e.titre).toBeTruthy(); }
      if (e.chemin === "broder") expect(dockHaut()?.querySelector('button[aria-label="Marquer"]')).toBeTruthy();
    }
    expect(vus).toEqual(ETAPES.map(e => e.titre));
    expect(bouton("Suivant")).toBeUndefined();
    await cliquer(bouton("Commencer à broder"));
    expect(bulle()).toBeFalsy();
    expect(localStorage.getItem(VISITE_CLE)).toBe("vue");
    expect(dockHaut()?.querySelector('[data-guide="dessiner"]')).toBeTruthy(); // le dock revient à ses verbes
  });

  it("au clavier : → avance, ← recule, Échap ferme et ne revient plus", async () => {
    await ouvrirAtelier();
    expect(document.activeElement?.textContent).toBe("Suivant");
    await touche("ArrowRight"); await touche("ArrowRight");
    expect(titre()).toBe(ETAPES[2].titre);
    await touche("ArrowLeft");
    expect(titre()).toBe(ETAPES[1].titre);
    await touche("Escape");
    expect(bulle()).toBeFalsy();
    expect(localStorage.getItem(VISITE_CLE)).toBe("vue");
    await act(async () => root?.unmount()); container?.remove();
    await ouvrirAtelier();
    expect(bulle()).toBeFalsy();
  });

  it("« Passer la visite » la ferme ; le menu de l'orbe la relance", async () => {
    await ouvrirAtelier();
    await cliquer(bouton("Passer la visite"));
    expect(bulle()).toBeFalsy();
    await cliquer(container?.querySelector("#pzs-brand"));
    await cliquer(bouton("Revoir la visite avec Le Point"));
    expect(titre()).toBe("Bonjour, je suis Le Point");
  });

  it("la visite de l'atelier ne passe pas devant l'accueil", async () => {
    for (const chemin of ["/", "/boutique", "/buro"]) {
      window.history.replaceState(null, "", chemin);
      container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
      await act(async () => { root!.render(<App />); }); await attendre();
      expect(bulle(), chemin).toBeFalsy();
      await act(async () => root?.unmount()); container.remove(); root = null; container = null;
    }
  });
});
