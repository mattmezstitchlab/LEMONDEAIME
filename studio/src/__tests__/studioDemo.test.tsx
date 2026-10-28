import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import StudioDemo, { ARRETS } from "../components/StudioDemo";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ""; });
function monter() {
  const host = document.createElement("div"); document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(<StudioDemo />));
  return { host, root };
}
const legende = (host: HTMLElement) => host.querySelector(".sdemo-legende p")!.textContent!;

describe("Réplique du studio sur l’accueil, avec Le Point", () => {
  it("reprend les libellés réels des deux docks et reste décorative", () => {
    const { host, root } = monter();
    const demo = host.querySelector(".sdemo")!;
    expect(demo.getAttribute("aria-hidden")).toBe("true");
    for (const label of ["Dessiner", "Broder", "Fils", "Partager", "Réaliste", "À plat", "Patron", "Symboles", "Tout voir", "Point Zéro"]) expect(demo.textContent).toContain(label);
    expect(demo.querySelectorAll("button, input, a")).toHaveLength(0);
    for (const a of ARRETS) expect(demo.querySelector(`[data-k="${a.k}"]`), a.k).toBeTruthy();
    act(() => root.unmount());
  });
  it("Le Point passe d’un outil au suivant tout seul, et s’arrête sur Pause", () => {
    vi.useFakeTimers();
    const { host, root } = monter();
    expect(legende(host)).toContain(ARRETS[0].nom);
    expect(host.querySelector(`[data-k="${ARRETS[0].k}"]`)?.getAttribute("data-point")).toBe("1");
    act(() => { vi.advanceTimersByTime(2700); });
    expect(legende(host)).toContain(ARRETS[1].nom);
    expect(host.querySelector(`[data-k="${ARRETS[1].k}"]`)?.getAttribute("data-point")).toBe("1");
    const pause = [...host.querySelectorAll("button")].find(b => b.textContent === "Pause")!;
    act(() => pause.click());
    expect(pause.getAttribute("aria-pressed")).toBe("true");
    act(() => { vi.advanceTimersByTime(10000); });
    expect(legende(host)).toContain(ARRETS[1].nom);
    act(() => host.querySelector<HTMLButtonElement>('button[aria-label="Outil suivant"]')!.click());
    expect(legende(host)).toContain(ARRETS[2].nom);
    act(() => host.querySelector<HTMLButtonElement>('button[aria-label="Outil précédent"]')!.click());
    act(() => host.querySelector<HTMLButtonElement>('button[aria-label="Outil précédent"]')!.click());
    expect(legende(host)).toContain(ARRETS[0].nom);
    act(() => root.unmount());
  });
  it("ne défile pas quand l’appareil demande moins d’animations", () => {
    vi.useFakeTimers();
    const avant = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: q.includes("reduce"), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
    try {
      const { host, root } = monter();
      act(() => { vi.advanceTimersByTime(10000); });
      expect(legende(host)).toContain(ARRETS[0].nom);
      expect([...host.querySelectorAll("button")].some(b => b.textContent === "Lecture")).toBe(true);
      act(() => root.unmount());
    } finally { window.matchMedia = avant; }
  });
});
