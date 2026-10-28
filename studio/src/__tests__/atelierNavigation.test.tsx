import { afterEach, describe, expect, it, vi } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import CategoryBar from "../components/CategoryBar";
import AtelierCreate from "../components/AtelierCreate";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | null = null;
let node: HTMLDivElement | null = null;
function render(element: ReactNode) {
  node = document.createElement("div");
  document.body.appendChild(node);
  root = createRoot(node);
  act(() => root?.render(element));
  return node;
}
afterEach(() => {
  act(() => root?.unmount());
  node?.remove();
  root = null;
  node = null;
});
describe("Atelier unique", () => {
  it("présente exactement quatre catégories et un seul choix actif", () => {
    const onChoose = vi.fn();
    const view = render(<CategoryBar active="create" onChoose={onChoose} />);
    const buttons = Array.from(view.querySelectorAll("nav button"));
    expect(buttons.map((b) => b.textContent)).toEqual(["Créer","Outils","Fils","Broder"]);
    expect(buttons.filter((b) => b.getAttribute("aria-pressed") === "true")).toHaveLength(1);
    act(() => buttons[2].dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onChoose).toHaveBeenCalledWith("threads");
  });
  it("propose sur la grille la description, l'import et la reprise sans guide", () => {
    const onBlank = vi.fn(), onLibrary = vi.fn(), onGenerate = vi.fn();
    const view = render(<AtelierCreate prompt="" onPrompt={vi.fn()} onGenerate={onGenerate} onImport={vi.fn()} onBlank={onBlank} onLibrary={onLibrary} />);
    expect(view.querySelector('textarea[placeholder="Décrivez votre motif…"]')).not.toBeNull();
    const generate = Array.from(view.querySelectorAll("button")).find((b) => b.textContent?.includes("Générer"));
    expect(generate?.disabled).toBe(true);
    const blank = Array.from(view.querySelectorAll("button")).find((b) => b.textContent?.includes("Grille vierge"));
    const library = Array.from(view.querySelectorAll("button")).find((b) => b.textContent?.includes("Mes projets"));
    act(() => blank?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    act(() => library?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onBlank).toHaveBeenCalledOnce();
    expect(onLibrary).toHaveBeenCalledOnce();
    expect(view.textContent).not.toContain("Guide pas à pas");
  });
});
