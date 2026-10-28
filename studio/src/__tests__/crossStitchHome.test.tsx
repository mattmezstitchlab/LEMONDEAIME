import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import CrossStitchHome from "../components/CrossStitchHome";
import { entryStudio, publicPathFor } from "../lib/entryNavigation";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;
let host: HTMLDivElement | undefined;
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = undefined;
  localStorage.clear();
  vi.restoreAllMocks();
});
function mount(extra: { onBuro?: () => void; onShare?: () => void; onVisite?: () => void } = {}) {
  const onOpen = vi.fn(), onImport = vi.fn();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root!.render(<CrossStitchHome projectName="Roses de famille" onOpen={onOpen} onImport={onImport} {...extra}/>));
  return { view: host, onOpen, onImport };
}
describe("Point Zéro spécialisé", () => {
  it("ouvre la racine spécialisée et conserve les destinations historiques", () => {
    expect(entryStudio("", "", "/")).toBe("stitch-home");
    expect(publicPathFor("stitch-home")).toBe("/");
    expect(entryStudio("", "", "/aime")).toBe("stitch-home");
    expect(entryStudio("?studio=embroidery", "", "/atelier")).toBe("embroidery");
    expect(entryStudio("", "", "/atelier")).toBe("embroidery");
    expect(publicPathFor("embroidery")).toBe("/atelier");
  });
  it("ne crée ni ne remplace de données à l’ouverture", () => {
    localStorage.setItem("ouvrage", "données existantes");
    const write = vi.spyOn(Storage.prototype, "setItem");
    const { view, onOpen } = mount();
    expect(view.querySelectorAll("h1")).toHaveLength(1);
    expect(view.textContent).toContain("Roses de famille");
    expect(view.textContent).toContain("son effacement supprime les projets locaux");
    expect(view.querySelector("iframe")).toBeNull();
    expect(view.textContent).toContain("Le puzzle PDF");
    expect(view.querySelector("h1")?.textContent).toBe("Point Zéro");
    expect(view.textContent).toContain("pas une capture d’écran");
    expect(view.querySelectorAll("h1")).toHaveLength(1);
    expect(write).not.toHaveBeenCalled();
    expect(onOpen).not.toHaveBeenCalled();
    expect(localStorage.getItem("ouvrage")).toBe("données existantes");
  });
  it("relie chaque action à son intention, sans catalogue d’univers généralistes", () => {
    const { view, onOpen } = mount();
    const actions = [
      ["Mes ouvrages", "library"], ["Créer mon patron", "create"],
      ["Préparer mes fils", "prepare"], ["Continuer à broder", "stitch"],
    ];
    for (const [label, intent] of actions) {
      const button = [...view.querySelectorAll("button")].find(b => b.textContent?.includes(label))!;
      act(() => button.click());
      expect(onOpen).toHaveBeenLastCalledWith(intent);
    }
    expect(view.querySelector('a[href="/aime"]')).toBeNull();
    expect(view.textContent).not.toContain("Architecture mère");
    expect(view.querySelector('a[href="#csh-import"]')).not.toBeNull();
  });
  it("transmet le fichier choisi une seule fois et accepte de le sélectionner à nouveau", () => {
    const { view, onImport } = mount();
    const input = view.querySelector<HTMLInputElement>('input[aria-label="Importer une image, un PDF ou un projet"]')!;
    expect(input.accept).toContain(".oxs");
    expect(input.accept).toContain(".pdf");
    const file = new File(["image"], "souvenir.png", { type: "image/png" });
    Object.defineProperty(input, "files", { configurable: true, value: [file] });
    act(() => input.dispatchEvent(new Event("change", { bubbles: true })));
    expect(onImport).toHaveBeenCalledExactlyOnceWith(file);
    expect(input.value).toBe("");
    Object.defineProperty(input, "files", { configurable: true, value: [] });
    act(() => input.dispatchEvent(new Event("change", { bubbles: true })));
    expect(onImport).toHaveBeenCalledTimes(1);
  });
  it("suit la charte AIME : dock du haut, « + Entrer » vers le BurO, dock du bas des sections", () => {
    const onBuro = vi.fn(), onShare = vi.fn(), onVisite = vi.fn();
    const { view, onOpen } = mount({ onBuro, onShare, onVisite });
    expect(view.querySelector('nav[aria-label="Navigation point de croix"]')).toBeTruthy();
    const enter = view.querySelector<HTMLButtonElement>('button[aria-label="Entrer dans Point Zéro"]')!;
    act(() => enter.click());
    expect(onBuro).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
    const bottom = view.querySelector('nav[aria-label="Sections de la page"]')!;
    expect([...bottom.querySelectorAll("a")].map(a => a.textContent)).toEqual(["Les docks", "Le Point", "Fonctionnalités", "Commencer"]);
    expect([...bottom.querySelectorAll("a")].map(a => a.getAttribute("href"))).toEqual(["#docks", "#le-point", "#fonctionnalites", "#commencer"]);
    for (const id of ["docks", "le-point", "fonctionnalites", "commencer"]) expect(view.querySelector("#" + id)).toBeTruthy();
    act(() => bottom.querySelector<HTMLButtonElement>('button[aria-label^="Le Point"]')!.click());
    expect(onVisite).toHaveBeenCalledTimes(1);
    const brand = view.querySelector<HTMLButtonElement>("#pzh-brand")!;
    act(() => brand.click());
    expect(brand.getAttribute("aria-expanded")).toBe("true");
    expect([...view.querySelectorAll("#pzh-menu button")].map(b => b.textContent)).not.toContain("Boutique de patrons");
    act(() => [...view.querySelectorAll<HTMLButtonElement>("#pzh-menu button")].find(b => b.textContent === "Faire la visite avec Le Point")!.click());
    expect(onVisite).toHaveBeenCalledTimes(2);
    expect(view.querySelector("#pzh-menu")).toBeNull();
    const invite = [...view.querySelectorAll<HTMLButtonElement>("button")].find(b => b.textContent?.includes("Inviter à regarder"))!;
    act(() => invite.click());
    expect(onShare).toHaveBeenCalled();
    expect(view.textContent).toContain("Bientôt");
  });
  it("met en avant les deux docks, Le Point et toutes les fonctionnalités dans une grande grille", () => {
    const { view, onOpen } = mount();
    expect(view.querySelector("#editions")).toBeNull();
    expect(view.textContent).not.toContain("Les éditions");
    const docks = view.querySelector("#docks")!;
    expect(docks.querySelectorAll(".pzh-dock")).toHaveLength(2);
    for (const t of ["Dessiner", "Broder", "Fils", "Partager", "Chercher", "Mes ouvrages", "Le cercle", "Tout voir", "Repères", "Progression"]) expect(docks.textContent).toContain(t);
    const point = view.querySelector("#le-point")!;
    expect(point.querySelector("h2")?.textContent).toBe("Le Point");
    expect(point.querySelectorAll(".pzh-parcours li").length).toBeGreaterThanOrEqual(14);
    const tuiles = view.querySelectorAll("#fonctionnalites .pzh-bento > li");
    expect(tuiles).toHaveLength(10);
    expect([...tuiles].map(t => t.querySelector("h3")?.textContent).every(Boolean)).toBe(true);
    for (const t of ["Demi-point", "Point arrière", "Puzzle PDF", "Perles Miyuki Delica", "Parking des fils", "PDF paginé", "Contraste élevé"]) expect(view.querySelector("#fonctionnalites")!.textContent).toContain(t);
    act(() => [...view.querySelectorAll<HTMLButtonElement>("#fonctionnalites button")].find(b => b.textContent?.includes("Passer en mode Broder"))!.click());
    expect(onOpen).toHaveBeenLastCalledWith("stitch");
  });
  it("sans visite branchée, « Faire la visite » ouvre l’atelier", () => {
    const { view, onOpen } = mount();
    act(() => [...view.querySelectorAll<HTMLButtonElement>("button")].find(b => b.textContent === "Faire la visite avec Le Point")!.click());
    expect(onOpen).toHaveBeenCalledWith("create");
  });
  it("sans BurO, « + Entrer » ouvre mes ouvrages", () => {
    const { view, onOpen } = mount();
    act(() => view.querySelector<HTMLButtonElement>('button[aria-label="Entrer dans Point Zéro"]')!.click());
    expect(onOpen).toHaveBeenCalledWith("library");
  });
});
