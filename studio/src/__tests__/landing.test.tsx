/** Contrat de l'accueil POINT ZÉRO : grille sobre et sans fiches d'achat simulées. */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import Landing from "../components/Landing";
import type { Pattern } from "../lib/pattern";

vi.mock("../lib/convert", () => ({
  loadRemoteImage: vi.fn(async () => ({ src: "data:image/png;base64,", width: 4, height: 4 })),
}));
vi.mock("../lib/dither", () => ({
  imageToDmc: vi.fn(() => {
    const cross = new Int16Array(44 * 44).fill(-1);
    for (let i = 0; i < 200; i++) cross[i] = 80;
    for (let i = 200; i < 300; i++) cross[i] = 81;
    for (let i = 300; i < 360; i++) cross[i] = 82;
    return { cross, palette: [80, 81, 82] };
  }),
}));

const saved = { matchMedia: globalThis.matchMedia, RO: globalThis.ResizeObserver };
beforeAll(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.matchMedia = ((query: string) => ({
    matches: query.includes("(pointer: fine)"), media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  })) as unknown as typeof globalThis.matchMedia;
  globalThis.ResizeObserver = class {
    observe() {} unobserve() {} disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver;
});
afterAll(() => {
  globalThis.matchMedia = saved.matchMedia;
  globalThis.ResizeObserver = saved.RO;
});

let root: Root | null = null, container: HTMLElement | null = null;
let openSpy: ReturnType<typeof vi.fn<() => void>>;
let motifSpy: ReturnType<typeof vi.fn<(p:Pattern) => void>>;
let pdfSpy: ReturnType<typeof vi.fn<(file:File) => void>>, imageSpy: ReturnType<typeof vi.fn<(file:File) => void>>;
let projectSpy: ReturnType<typeof vi.fn<(file:File) => Promise<string|null>>>;
const click = async (el: Element) => {
  await act(async () => { el.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
};
const byText = (re: RegExp) => [...(container?.querySelectorAll("button") ?? [])].find(b => re.test(b.textContent || "")) ?? null;
const toile = () => container!.querySelector(".toile") as HTMLElement;

beforeEach(async () => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  openSpy = vi.fn(); motifSpy = vi.fn(); pdfSpy = vi.fn(); imageSpy = vi.fn(); projectSpy = vi.fn(async () => null);
  await act(async () => { root!.render(<Landing onOpen={openSpy} onMotif={motifSpy} onPdf={pdfSpy} onImage={imageSpy} onProjectFile={projectSpy} />); });
});
afterEach(async () => {
  await act(async () => root?.unmount());
  root = null; container?.remove(); container = null;
});

describe("Accueil clair, une seule grille", () => {
  it("ouvre une toile vide sans cartes, prix, animations des voisines ni bouton de paiement", () => {
    expect(toile()).toBeTruthy();
    expect(container!.querySelector(".toile-grille.blocs")).toBeTruthy();
    expect(container!.querySelector(".toile-grille.fines")).toBeTruthy();
    expect(container!.querySelector(".hero-sheet")).toBeTruthy();
    expect(container!.querySelector(".motif-vivant")).toBeNull();
    expect(container!.querySelector(".tableau-cartes")).toBeNull();
    expect(container!.querySelector(".achat-voile")).toBeNull();
    expect(container!.querySelector(".grille-motif")).toBeNull();
    expect(container!.querySelector("#hero-jeu input[aria-label='Décrire un motif à générer']")).toBeTruthy();
    expect(byText(/Générer/)).toBeTruthy();
    expect(byText(/Importer un PDF/)).toBeNull(); // L'entrée PDF est un label, non un bouton doublon.
    expect(container!.textContent).toContain("Importer un PDF");
    expect(container!.textContent).toContain("Importer un projet JSON");
    expect(container!.textContent).not.toContain("paiement est simulé");
    expect(container!.textContent).not.toContain("Faire le point zéro");
  });

  it("génère immédiatement puis remplace le formulaire par un seul aperçu à la même place", async () => {
    const input = container!.querySelector("#hero-jeu input[aria-label='Décrire un motif à générer']") as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "oiseau botanique");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => { container!.querySelector("#hero-jeu form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
    expect(container!.querySelector(".hero-result")).toBeTruthy();
    expect(container!.querySelector("#hero-jeu form")).toBeNull();
    expect(container!.querySelector(".hero-result canvas")).toBeTruthy();
    expect(container!.querySelector(".grille-motif")).toBeNull();
    expect(container!.textContent).toContain("44 × 44 points");
    await click(byText(/Continuer dans l'atelier/)!);
    expect(motifSpy).toHaveBeenCalledTimes(1);
    const p = motifSpy.mock.calls[0][0] as Pattern;
    expect(p.w).toBe(44); expect(p.h).toBe(44); expect(p.palette.length).toBe(3);
  });

  it("propose un import d'image direct, sans passer par les réglages manuels", async () => {
    const file=new File(["PNG"],"oiseau.png",{type:"image/png"});
    const input=container!.querySelector('input[aria-label="Choisir une image PNG, JPEG ou WebP"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    Object.defineProperty(input,"files",{configurable:true,value:[file]});
    await act(async()=>{input.dispatchEvent(new Event("change",{bubbles:true}));});
    expect(imageSpy).toHaveBeenCalledWith(file);
  });

  it("importer un PDF dirige le fichier vers le vrai atelier sans montrer de puzzle sur l'accueil", async () => {
    const file = new File(["%PDF-1.4\n"], "broderie.pdf", { type: "application/pdf" });
    const input = container!.querySelector('input[accept="application/pdf,.pdf"]') as HTMLInputElement;
    Object.defineProperty(input, "files", { configurable: true, value: [file] });
    await act(async () => { input.dispatchEvent(new Event("change", { bubbles: true })); });
    expect(pdfSpy).toHaveBeenCalledWith(file);
    expect(container!.querySelector(".ancre-table")).toBeNull();
    expect(container!.querySelector('[aria-label="Préparation du patron PDF"]')).toBeNull();
  });

  it("importe directement un projet POINTZERO JSON avec le lecteur de l'application", async () => {
    const file = new File(['{"v":3}'], "Bee2.pointzero.json", { type: "application/json" });
    const input = container!.querySelector('input[aria-label="Choisir un projet Point Zéro (JSON ou OXS)"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    Object.defineProperty(input, "files", { configurable: true, value: [file] });
    await act(async () => { input.dispatchEvent(new Event("change", { bubbles: true })); });
    expect(projectSpy).toHaveBeenCalledWith(file);
    expect(container!.querySelector('[role="alert"]')).toBeNull();
  });

  it("signale immédiatement une erreur d'import JSON sans quitter l'accueil", async () => {
    projectSpy.mockResolvedValue("Projet invalide");
    const file = new File(["{}"], "corrompu.pointzero.json", { type: "application/json" });
    const input = container!.querySelector('input[aria-label="Choisir un projet Point Zéro (JSON ou OXS)"]') as HTMLInputElement;
    Object.defineProperty(input, "files", { configurable: true, value: [file] });
    await act(async () => { input.dispatchEvent(new Event("change", { bubbles: true })); });
    expect(container!.querySelector('[role="alert"]')?.textContent).toContain("Projet invalide");
  });

  it("garde le déplacement et zoom de la grille universelle", async () => {
    const monde = container!.querySelector(".toile-monde") as HTMLElement;
    const initial = monde.style.transform;
    await act(async () => {
      toile().dispatchEvent(new WheelEvent("wheel", { deltaY: 120, clientX: 450, clientY: 250, bubbles: true, cancelable: true }));
    });
    expect(monde.style.transform).not.toBe(initial);
    expect(container!.querySelector('button[aria-label="Revenir au hero"]')).toBeTruthy();
  });

  it("la boutique reste accessible sans afficher de prix directement sur la toile", async () => {
    expect(byText(/Boutique · patrons/)).toBeTruthy();
    await click(byText(/Boutique · patrons/)!);
    expect(container!.querySelector('[aria-label="Boutique des patrons POINT ZÉRO"]')).toBeTruthy();
    expect(container!.querySelector(".motif-vivant")).toBeNull();
  });
});
