import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeAll, afterAll, afterEach, describe, expect, it, vi } from "vitest";
import SubjectWorkspace from "../components/SubjectWorkspace";
import { createPattern } from "../lib/pattern";

let host: HTMLDivElement | null = null;
let root: Root | null = null;
const oldContext = HTMLCanvasElement.prototype.getContext;
beforeAll(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});
afterAll(() => {
  HTMLCanvasElement.prototype.getContext = oldContext;
});
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
  localStorage.clear();
});
function mount() {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  const pattern = createPattern("Atelier de test", 80, 80);
  act(() => root?.render(<SubjectWorkspace pattern={pattern} onCancel={vi.fn()} onUse={vi.fn()} />));
  return host;
}
describe("Décomposition — interface noire unifiée", () => {
  it("utilise la surface noire et des panneaux identifiés sans modifier la toile", () => {
    const view = mount();
    const dialog = view.querySelector('[role="dialog"][aria-label="Décomposer et recomposer les sujets"]');
    expect(dialog?.classList.contains("pz-decomposition")).toBe(true);
    expect(dialog?.classList.contains("bg-[#09090b]")).toBe(true);
    expect(view.querySelector('[aria-label="Bibliothèque et outils de décomposition"]')).toBeTruthy();
    expect(view.querySelector('[aria-label="Calques et propriétés des sujets"]')).toBeTruthy();
    const center = view.querySelector('[aria-label="Grille de composition des sujets"]');
    expect(center?.classList.contains("bg-[#0d0d10]")).toBe(true);
    expect(center?.querySelector('canvas[aria-label^="Grille de sujets"]')).toBeTruthy();
    expect(view.textContent).toContain("Décomposer → Composer");
  });
  it("conserve les réglages et les commandes de décomposition", () => {
    const view = mount();
    expect(view.textContent).toContain("Décomposer ce motif");
    expect(view.textContent).toContain("Profil et stock de fils");
    expect(view.textContent).toContain("Bibliothèque personnelle");
    expect(view.textContent).toContain("Utiliser dans l'atelier");
    expect(view.querySelector(".pz-decomposition-primary")).toBeTruthy();
  });
});
