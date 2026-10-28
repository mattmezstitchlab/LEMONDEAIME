/**
 * Intégration de l'atelier unique.
 * jsdom ne rend pas le trait Canvas : ici nous vérifions navigation, outils,
 * absence du guide et continuité des parcours. Le rendu réel exige une recette navigateur.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import App from "../App";
import { createPattern, ensurePalette } from "../lib/pattern";
import { flossIndex } from "../lib/dmc";
import { loadStored, saveStored } from "../lib/store";

// Navigation tests isolate persistence; failure handling is covered by unifiedImport.
vi.mock("../lib/library", async importOriginal => ({...await importOriginal<typeof import("../lib/library")>(),saveLibrary:vi.fn().mockResolvedValue(undefined)}));
const saved = {
  matchMedia: globalThis.matchMedia,
  ResizeObserver: globalThis.ResizeObserver,
  getContext: HTMLCanvasElement.prototype.getContext,
};
beforeAll(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.matchMedia = ((query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  })) as unknown as typeof globalThis.matchMedia;
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver;
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});
afterAll(() => {
  globalThis.matchMedia = saved.matchMedia;
  globalThis.ResizeObserver = saved.ResizeObserver;
  HTMLCanvasElement.prototype.getContext = saved.getContext;
});
let root: Root | null = null;
let container: HTMLElement | null = null;
async function mount(publicHome=false) {
  // Legacy atelier regression tests now use the explicit studio deep link.
  // The domain root now opens the cross-stitch welcome.
  const requested=localStorage.getItem("pointzero:workspace");
  if(!publicHome&&requested&&!window.location.search){
    window.history.replaceState(null,"","/?studio="+encodeURIComponent(requested));
  }
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(<App />); });
  return container;
}
async function click(el: Element | null | undefined) {
  expect(el, "commande de l'atelier présente").toBeTruthy();
  await act(async () => { el!.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
}
// Les deux docks (charte UniO) : en haut, faire ; en bas, se repérer.
const nav = () => container?.querySelector('nav[aria-label="Dock des outils du studio de broderie"]');
const bottom = () => container?.querySelector('nav[aria-label="Se repérer dans le studio"]');
const category = (name: string) => [...(nav()?.querySelectorAll("button") ?? [])].find((b) => b.textContent?.replace(/\d+$/, "") === name || b.getAttribute("aria-label") === name);
const inBottom = (name: string) => [...(bottom()?.querySelectorAll("button") ?? [])].find((b) => b.textContent === name || b.getAttribute("aria-label") === name);
const inspector = () => container?.querySelector('[aria-label="Inspecteur de broderie"]');
async function brandMenu(item: string) {
  await click(container?.querySelector("#pzs-brand"));
  await click([...(container?.querySelectorAll("#pzs-menu button") ?? [])].find(b => b.textContent === item));
}
const dialog = (name: string) => container?.querySelector(`[role="dialog"][aria-label="${name}"]`);
const button = (label: string) => container?.querySelector(`button[aria-label="${label}"]`);
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("pointzero:workspace","embroidery");
  localStorage.setItem("pointzero:visite-docks:v1","vue"); // la visite de l'orbe a ses propres tests (orbeGuide.test.tsx)
  window.history.replaceState(null, "", "/");
});
afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  container?.remove();
  container = null;
  localStorage.clear();
});
describe("POINTZERO : atelier unique sans assistant", () => {
  it("range le studio entre deux docks, la grille en plein écran", async () => {
    await mount();
    expect(nav()).toBeTruthy();
    expect(bottom()).toBeTruthy();
    expect(container?.querySelector('canvas[role="application"]')).toBeTruthy();
    expect(container?.querySelector('.pz-embroidery-header')).toBeNull();
    expect(container?.querySelector('[aria-label="Bibliothèque et outils de broderie"]')).toBeNull();
    expect(inspector()?.hasAttribute("hidden")).toBe(true);
    expect(container?.querySelector('[aria-label="Fils du motif"]')).toBeNull();
    expect(["Dessiner","Broder","Fils","Partager"].every(name => category(name))).toBe(true);
    expect(category("Créer")).toBeUndefined();
    expect(category("Dessiner")?.getAttribute("aria-pressed")).toBe("true");
    expect(inBottom("Tout voir")).toBeTruthy();
    expect(inBottom("Revenir au BurO")).toBeUndefined();
  });
  it("range les fils DMC dans le dock du bas, avec leurs filtres", async () => {
    await mount();
    await click(category("Fils"));
    const rail=container?.querySelector('[aria-label="Fils du motif"]');
    expect(rail?.closest(".pzs-bottom")).toBeTruthy();
    expect(rail?.querySelector('[aria-label="Filtres des fils DMC"]')).toBeTruthy();
    const used=[...(rail?.querySelectorAll("button")??[])].find(x=>x.textContent?.includes("Utilisés"));
    await click(used);
    expect(used?.getAttribute("aria-pressed")).toBe("true");
    await click(button("Ajouter ou rechercher un fil DMC"));
    expect(dialog("Nuancier DMC")?.classList.contains("is-open")).toBe(true);
    await click(button("Remonter d’un niveau"));
    expect(container?.querySelector('[aria-label="Fils du motif"]')).toBeNull();
  });
  it("change le dock du bas depuis son cercle : Progression, puis retour aux repères", async () => {
    await mount();
    const cercle = () => bottom()?.querySelector(".pzs-cercle") as HTMLButtonElement | null;
    await click(cercle());
    expect(cercle()?.getAttribute("aria-expanded")).toBe("true");
    await click(inBottom("Progression"));
    expect(bottom()?.textContent).toContain("Rien à broder");
    expect(inBottom("Tout voir")).toBeUndefined();
    await click(cercle());
    await click(inBottom("Repères"));
    expect(inBottom("Tout voir")).toBeTruthy();
  });
  it("cherche dans la grille depuis la loupe du dock du haut, et invite depuis le rond du profil", async () => {
    await mount();
    await click(button("Chercher un fil, un outil ou une fonction de la grille"));
    const champ = container?.querySelector<HTMLInputElement>("#pzs-cherche");
    expect(champ).toBeTruthy();
    await act(async () => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!; set.call(champ, "gomme"); champ!.dispatchEvent(new Event("input", { bubbles: true })); });
    const res = [...(container?.querySelectorAll(".pzs-resultats button") ?? [])].find(b => b.textContent?.startsWith("Gomme"));
    expect(res).toBeTruthy();
    await click(res);
    expect(container?.querySelector("#pzs-cherche")).toBeNull();
    expect(category("Gomme")?.getAttribute("aria-pressed")).toBe("true");
    await click(button("Mes ouvrages, et inviter quelqu’un à rejoindre la grille"));
    expect([...(container?.querySelectorAll(".pzs-bloc button") ?? [])].some(b => b.textContent === "+ Inviter à rejoindre la grille")).toBe(true);
    expect(container?.querySelector(".pzs-bloc .pzs-depot")).toBeTruthy();
  });
  it("ouvre et ferme le panneau Calques sans masquer la grille", async () => {
    await mount();
    await click(category("Dessiner"));
    await click(category("Calques"));
    expect(inspector()?.hasAttribute("hidden")).toBe(false);
    expect(container?.querySelector('canvas[role="application"]')).toBeTruthy();
    await click(button("Fermer le panneau"));
    expect(inspector()?.hasAttribute("hidden")).toBe(true);
  });

  it("revient à l’accueil spécialisé et reprend le suivi sans remplacer le motif", async () => {
    const existing = createPattern("Ouvrage à préserver", 20, 20);
    const red = flossIndex("321");
    existing.cross[4] = red;
    existing.done[4] = 1;
    ensurePalette(existing, red);
    expect(saveStored(existing)).toBe(true);
    await mount();
    const before = container?.querySelector('canvas[role="application"]')?.getAttribute("aria-label");
    await brandMenu("Accueil Point Zéro");
    expect(container?.querySelector("h1")?.textContent).toBe("Point Zéro");
    expect(window.location.pathname).toBe("/");
    const resume = [...(container?.querySelectorAll("button") ?? [])].find(b => b.textContent?.includes("Continuer à broder"));
    await click(resume);
    expect(container?.querySelector('canvas[role="application"]')?.getAttribute("aria-label")).toBe(before);
    expect(localStorage.getItem("pointzero:workspace")).toBe("embroidery");
    expect(category("Broder")?.getAttribute("aria-pressed")).toBe("true");
    await act(async () => window.dispatchEvent(new Event("pagehide")));
    const restored = loadStored()!;
    expect(restored.name).toBe(existing.name);
    expect(restored.cross[4]).toBe(red);
    expect(restored.done[4]).toBe(1);
    expect(restored.w).toBe(20);
  });

  it("change les trois affichages sans altérer points, palette ni suivi", async () => {
    const p = createPattern("Patron protégé", 20, 20);
    const red = flossIndex("321"); p.cross[5] = red; p.done[5] = 1; ensurePalette(p, red);
    expect(saveStored(p)).toBe(true);
    await mount();
    await click(container?.querySelector("#pzs-brand"));
    const levelBar = container!.querySelector<HTMLElement>('[aria-label="Affichage du studio"]')!;
    expect(levelBar.getAttribute("role")).toBe("group");
    const labels: Record<string,string> = { beginner: "Débutant", expert: "Expert", intermediate: "Intermédiaire" };
    for (const level of ["beginner", "expert", "intermediate"]) {
      const levelButton = [...levelBar.querySelectorAll("button")].find(b => b.textContent === labels[level])!;
      await click(levelButton);
      expect(levelButton.getAttribute("aria-pressed")).toBe("true");
      expect(localStorage.getItem("pointzero:interface-level")).toBe(level);
      expect(container!.textContent).toContain("Patron protégé");
      await act(async () => window.dispatchEvent(new Event("pagehide")));
      const after = loadStored()!;
      expect(after.cross).toEqual(p.cross); expect(after.done).toEqual(p.done); expect(after.palette).toEqual(p.palette);
    }
  });

  it("conserve l’outil actif et rend les autres accessibles en Débutant", async () => {
    await mount();
    await click(category("Dessiner"));
    await click(category("Plus d’outils"));
    await click(category("Quart"));
    expect(category("Quart")?.getAttribute("aria-pressed")).toBe("true");
    await click(container?.querySelector("#pzs-brand"));
    await click([...container!.querySelectorAll('[aria-label="Affichage du studio"] button')].find(b => b.textContent === "Débutant"));
    await click(container?.querySelector("#pzs-brand"));
    expect(category("Quart")?.getAttribute("aria-pressed")).toBe("true");
    await click(button("Remonter d’un niveau"));
    expect(category("Remplir")).toBeUndefined();
    expect(category("Croix")).toBeTruthy();
    expect(category("Plus d’outils")).toBeTruthy();
  });

  it("centralise la navigation et protège le redimensionnement", async () => {
    await mount();
    await click(category("Dessiner"));
    await click(category("Calques"));
    const sections=container!.querySelector(".pz-embroidery-right nav");
    expect([...sections!.querySelectorAll("button")].map(b=>b.textContent)).toEqual(["Calques","Motifs","Réglages"]);
    await click(category("Réglages du dessin"));
    expect(container!.textContent).toContain("Redimensionner la grille");
    const confirm=vi.spyOn(window,"confirm").mockReturnValue(false);
    await click([...container!.querySelectorAll("button")].find(b=>b.textContent==="Redimensionner"));
    expect(confirm).toHaveBeenCalled();
  });

  it("relie le dock du bas au zoom et au recentrage, et le dock du haut à l’import et à l’export", async () => {
    await mount();
    const send=vi.spyOn(window,"dispatchEvent");
    await click(inBottom("Loupe : doubler le zoom de la zone visible"));
    expect(send).toHaveBeenCalledWith(expect.objectContaining({detail:{action:"magnify"}}));
    await click(inBottom("Zoomer"));
    expect(send).toHaveBeenCalledWith(expect.objectContaining({detail:{action:"zoomIn"}}));
    await click(inBottom("Dézoomer"));
    expect(send).toHaveBeenCalledWith(expect.objectContaining({detail:{action:"zoomOut"}}));
    await click(inBottom("Tout voir"));
    await click(category("Partager"));
    await click(category("Exporter"));
    expect(container!.textContent).toContain("PDF");
  });

  it("ouvre directement la préparation depuis l’accueil spécialisé", async () => {
    await mount(true);
    const prepare = [...(container?.querySelectorAll("button") ?? [])].find(b => b.textContent?.includes("Préparer mes fils"));
    await click(prepare);
    expect(inspector()?.hasAttribute("hidden")).toBe(false);
    expect(inspector()?.textContent).toContain("Fils & toile");
    expect(window.location.pathname+window.location.search).toBe("/atelier");
  });

  it("ouvre directement la grille et la bibliothèque de motifs, sans écran d'accueil", async () => {
    const view = await mount();
    expect(view.querySelector('canvas[role="application"]')).toBeTruthy();
    await click(category("Dessiner"));
    await click(category("Motifs"));
    expect(view.querySelector('[aria-label="Bibliothèque de motifs"]')).toBeTruthy();
    expect(view.querySelector('button[aria-label="Ajouter Fleur rose"]')).toBeTruthy();
    expect(view.querySelector('[aria-label="Créer un nouveau motif"]')).toBeNull();
  });
  it("ne montre ni guide, ni démarrage automatique, même si l'ancien état subsiste", async () => {
    localStorage.setItem("point-zero:coach", JSON.stringify({ seen: false, dismissed: false }));
    await mount();
    expect(container?.querySelector(".coach-in")).toBeNull();
    expect(button("Guide de l'atelier")).toBeNull();
    expect(container?.querySelector('[data-coach="on"]')).toBeNull();
  });
  it("Dessiner conserve la grille centrale sans ouvrir le grand panneau de réglages", async () => {
    await mount();
    await click(category("Dessiner"));
    expect(dialog("Composer")?.classList.contains("is-open")).toBeFalsy();
    expect(inspector()?.hasAttribute("hidden")).toBe(true);
    expect(container?.querySelector('canvas[role="application"]')).toBeTruthy();
  });
  it("ajoute un motif DMC par clic et ouvre ses propriétés minimales", async () => {
    await mount();
    await click(category("Dessiner"));
    await click(category("Motifs"));
    await click(container?.querySelector('button[aria-label="Ajouter Fleur rose"]'));
    expect(container?.querySelector('[aria-label="Propriétés du motif"]')).toBeTruthy();
    expect(container?.querySelector('[aria-label="Taille du motif"]')).toBeTruthy();
    expect(container?.querySelector('[aria-label="Calques de composition"]')).toBeTruthy();
    expect(button("Annuler")?.hasAttribute("disabled")).toBe(false);
  });
  it("réunit fils, toile et profil dans le même panneau", async () => {
    await mount();
    await click(category("Fils"));
    await click(category("Fils et toile"));
    expect(inspector()?.querySelector(".pz-embroidery-inline")).toBeTruthy();
    expect(inspector()?.textContent).toContain("Mon profil brodeuse");
    expect(inspector()?.textContent).toContain("Modifier la toile");
    expect(dialog("Fils & toile")?.classList.contains("is-open")).toBeFalsy();
  });
  it("donne accès au suivi Broder sans changer de page", async () => {
    await mount();
    await click(category("Broder"));
    expect(category("Marquer")).toBeTruthy();
    expect(nav()?.querySelector('button[aria-label^="Fil actif"]')).toBeTruthy();
    await click(category("Suivi"));
    expect(inspector()?.querySelector(".pz-embroidery-inline")).toBeTruthy();
    expect(inspector()?.textContent).toContain("Journal du projet");
    expect(dialog("Broder")?.classList.contains("is-open")).toBeFalsy();
    expect(window.location.hash).toBe("");
  });
  it("garde le BurO et les Réglages dans le menu Point Zéro, et Exporter dans Partager", async () => {
    await mount();
    await click(container?.querySelector("#pzs-brand"));
    const items=[...(container?.querySelectorAll("#pzs-menu button")??[])].map(b=>b.textContent);
    expect(items).toContain("BurO");
    expect(items).toContain("Réglages et aide");
    await click([...(container?.querySelectorAll("#pzs-menu button")??[])].find(b=>b.textContent==="Réglages et aide"));
    expect(inspector()?.textContent).toContain("Confort et accessibilité");
    expect(dialog("Réglages & aide")?.classList.contains("is-open")).toBeFalsy();
    await click(category("Partager"));
    expect(category("Exporter")).toBeTruthy();
  });
  it("ouvre le BurO : créer, importer et retrouver ses projets, avec des lieux en bas", async () => {
    await mount();
    await brandMenu("BurO");
    expect(window.location.pathname).toBe("/buro");
    expect(container?.querySelector("h1")?.textContent).toBe("BurO");
    const top = () => container?.querySelector('nav[aria-label="Dock des actions du BurO"]');
    const inTop = (name: string) => [...(top()?.querySelectorAll("button") ?? [])].find(b => b.textContent?.replace(/\d+$/, "") === name);
    expect(["Créer","Rejoindre","Échanger"].every(name => inTop(name))).toBe(true);
    const places = [...(container?.querySelectorAll('nav[aria-label="Lieux du BurO"] button') ?? [])].map(b => b.textContent?.replace(/\s*\d+$/, ""));
    expect(places).toEqual(["Projets","Partagés avec moi","Archives"]);
    await click(inTop("Créer"));
    expect(["Grille vierge","Importer","Générer"].every(name => inTop(name))).toBe(true);
    const picker = container!.querySelector<HTMLInputElement>('input[aria-label="Importer une image, un PDF ou un projet dans le BurO"]')!;
    expect(picker.accept).toContain(".pdf"); expect(picker.accept).toContain(".oxs"); expect(picker.accept).toContain(".json"); expect(picker.accept).toContain("image/png");
    const choose = vi.spyOn(picker, "click"); await click(inTop("Importer")); expect(choose).toHaveBeenCalled();
    await click(button("Remonter d’un niveau"));
    await click([...(container?.querySelectorAll('nav[aria-label="Lieux du BurO"] button') ?? [])].find(b => b.textContent?.startsWith("Partagés")));
    expect(container?.textContent).toContain("Regarder un ouvrage en direct");
    await click([...(container?.querySelectorAll("button") ?? [])].find(b => b.textContent === "Continuer →") ?? [...(container?.querySelectorAll("#buro-brand") ?? [])][0]);
  });
  it("choisit la visibilité du projet dans Partager, avec son orbe et son mot", async () => {
    await mount();
    await click(category("Partager"));
    expect(category("Visibilité · Privé")).toBeTruthy();
    await click(category("Visibilité · Privé"));
    await click(category("Restreint"));
    expect(category("Restreint")?.getAttribute("aria-pressed")).toBe("true");
    expect(JSON.stringify(JSON.parse(localStorage.getItem("pointzero:visibilite") ?? "{}"))).toContain("restreint");
    expect(bottom()?.textContent).toContain("Restreint");
  });
  it("réutilise un seul panneau pour Fils, Suivi et Réglages, sans feuilles superposées", async () => {
    await mount();
    await click(category("Fils"));
    await click(category("Fils et toile"));
    expect(inspector()?.textContent).toContain("Mon profil brodeuse");
    await click(button("Remonter d’un niveau"));
    await click(category("Broder"));
    await click(category("Suivi"));
    expect(inspector()?.textContent).toContain("Journal du projet");
    await brandMenu("Réglages et aide");
    expect(inspector()?.textContent).toContain("Confort et accessibilité");
    expect(container?.querySelectorAll(".pz-embroidery-inline")).toHaveLength(1);
  });
  it("garde les réglages techniques du dessin dans le panneau noir, à la demande", async () => {
    await mount();
    expect(inspector()?.querySelector('[aria-label="Outils de broderie"]')).toBeNull();
    await click(category("Dessiner"));
    await click(category("Réglages du dessin"));
    expect(inspector()?.querySelector(".pz-embroidery-inline")).toBeTruthy();
    expect(inspector()?.textContent).toContain("Texte (lettres en croix)");
    expect(inspector()?.textContent).toContain("Symétrie du dessin");
    expect(dialog("Composer")?.classList.contains("is-open")).toBeFalsy();
  });
  it("remonte d’un niveau avec Échap dans le dock", async () => {
    await mount();
    await click(category("Dessiner"));
    await click(category("Plus d’outils"));
    await act(async () => { nav()!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect(category("Plus d’outils")).toBeTruthy();
    await act(async () => { nav()!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect(category("Partager")).toBeTruthy();
  });
  it("ne propose plus de page ni de catégorie SLÂME", async () => {
    await mount();
    expect(category("Musique & parole")).toBeUndefined();
    expect(container?.textContent).not.toContain("Retour à la grille");
    expect(window.location.hash).toBe("");
  });
  it("redirige les anciens fragments vers la page atelier unique", async () => {
    window.history.replaceState(null, "", "/#slame");
    await mount();
    expect(window.location.hash).toBe("");
    expect(nav()).toBeTruthy();
  });
});
