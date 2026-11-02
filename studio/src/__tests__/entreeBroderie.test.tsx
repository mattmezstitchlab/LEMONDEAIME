import { afterEach, describe, expect, it, vi } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import EntreeBroderie from "../components/EntreeBroderie";

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
describe("Entrée broderie", () => {
  it("ouvre les trois parcours sans modifier les ouvrages", () => {
    const onCreate = vi.fn(), onImport = vi.fn(), onLibrary = vi.fn(), onContinue = vi.fn();
    localStorage.setItem("ouvrage-test", "conservé");
    const view = render(<EntreeBroderie projectName="Mes roses" {...{ onCreate, onImport, onLibrary, onContinue }} />);
    const buttons = view.querySelectorAll("button");
    expect(buttons).toHaveLength(4);
    act(() => buttons[0].click());
    expect(onCreate).toHaveBeenCalledOnce();
    const input = view.querySelector("input")!;
    const click = vi.spyOn(input, "click");
    act(() => buttons[1].click());
    expect(click).toHaveBeenCalledOnce();
    expect(onImport).not.toHaveBeenCalled();
    const file = new File(["patron"], "roses.pdf", { type: "application/pdf" });
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    act(() => input.dispatchEvent(new Event("change", { bubbles: true })));
    expect(onImport).toHaveBeenCalledWith(file);
    Object.defineProperty(input, "files", { value: [], configurable: true });
    act(() => input.dispatchEvent(new Event("change", { bubbles: true })));
    expect(onImport).toHaveBeenCalledTimes(1);
    act(() => buttons[2].click());
    expect(onLibrary).toHaveBeenCalledOnce();
    act(() => buttons[3].click());
    expect(onContinue).toHaveBeenCalledOnce();
    expect(view.textContent).toContain("Mes roses");
    expect(localStorage.getItem("ouvrage-test")).toBe("conservé");
    expect(view.textContent).not.toMatch(/ATLAS|\.0NE|LUMIERE/);
    localStorage.removeItem("ouvrage-test");
  });
});
