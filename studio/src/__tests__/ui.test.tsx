import { describe, expect, it, vi, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ReactNode } from "react";
import FlossRail from "../components/FlossRail";
import { createPattern, ensurePalette, type Pattern } from "../lib/pattern";
import { flossIndex } from "../lib/dmc";

/**
 * Rendu réel du rail de fils (référence de perle). jsdom ne connaît ni
 * canvas ni matchMedia, mais aucun des deux n'est utilisé ici.
 */

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const RED = flossIndex("321");

let container: HTMLDivElement;
let root: Root;

function mount(node: ReactNode) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(node);
  });
}

afterEach(() => {
  if (!root) return;
  act(() => root.unmount());
  container.remove();
});

const click = (el: Element | null) => {
  if (!el) throw new Error("Élément introuvable");
  act(() => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const byLabel = (prefix: string) => container.querySelector(`[aria-label^="${prefix}"]`);

/**
 * Attend qu'un texte apparaisse, le temps que la table de perles se charge.
 * Chaque tour est un `act` complet : React ne flush pas les effets tant que le
 * `act` englobant n'est pas sorti, donc boucler à l'intérieur ne verrait rien.
 */
async function waitFor(text: string) {
  for (let i = 0; i < 50 && !container.textContent?.includes(text); i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  }
}

function beadPattern(reference?: string): Pattern {
  const p = createPattern("Perles", 8, 8, 14, 2);
  p.cross[0] = RED;
  ensurePalette(p, RED);
  p.special = [
    { x: 1.5, y: 1.5, c: RED, kind: "bead" },
    { x: 2.5, y: 2.5, c: RED, kind: "bead" },
  ];
  if (reference) p.beadMap = { "321": reference };
  return p;
}

const railProps = {
  active: RED,
  onActive: () => {},
  onBrowse: () => {},
  stitching: true,
};

describe("Rail de fils : référence de perle", () => {
  it("reste discret quand le motif ne porte aucune perle", async () => {
    const p = createPattern("Sans perle", 6, 6, 14, 2);
    p.cross[0] = RED;
    ensurePalette(p, RED);
    mount(<FlossRail pattern={p} {...railProps} onPattern={vi.fn()} />);
    click(byLabel("DMC 321,"));
    await waitFor("Personnaliser le symbole");
    expect(container.textContent).toContain("Personnaliser le symbole");
    expect(container.textContent).not.toContain("Miyuki");
  });

  it("propose les trois perles les plus proches et enregistre le choix", async () => {
    const onPattern = vi.fn();
    mount(<FlossRail pattern={beadPattern()} {...railProps} onPattern={onPattern} />);
    click(byLabel("DMC 321,"));
    expect(container.textContent).toContain("Perles Miyuki Delica 11/0");
    expect(container.textContent).toContain("2 perle(s) de cette couleur dans le motif");

    await waitFor("Les plus proches de ce fil");
    const proposals = container.querySelectorAll('[aria-label^="Choisir la perle"]');
    expect(proposals).toHaveLength(3);

    const reference = /perle (DB\d+)/.exec(proposals[0].getAttribute("aria-label")!)![1];
    click(proposals[0]);
    expect(onPattern).toHaveBeenCalledTimes(1);
    expect(onPattern.mock.calls[0][0].beadMap).toEqual({ "321": reference });

    // L'écart de teinte documenté par la source est affiché, pas lissé.
    expect(container.textContent).toContain("6 à 12 ΔE00");
    expect(container.textContent).toContain("craft-color-codes");
    expect(container.textContent).toContain("CC BY 4.0");
  });

  it("une référence déjà choisie ouvre sur ses remplaçantes disponibles", async () => {
    const onPattern = vi.fn();
    mount(<FlossRail pattern={beadPattern("DB0010")} {...railProps} onPattern={onPattern} />);
    click(byLabel("DMC 321,"));
    await waitFor("Remplaçantes disponibles");
    expect(container.textContent).toContain("DB0010");
    expect(container.textContent).toContain("Remplaçantes disponibles les plus proches");
    // La référence choisie n'est pas proposée comme sa propre remplaçante.
    const labels = [...container.querySelectorAll('[aria-label^="Choisir la perle"]')].map((n) => n.getAttribute("aria-label"));
    expect(labels.some((l) => l?.includes("DB0010 ·"))).toBe(false);

    // Retirer la référence vide beadMap.
    click(byLabel("Retirer la référence de perle"));
    expect(onPattern.mock.calls.at(-1)![0].beadMap).toBeUndefined();
  });

  it("accepte une référence exacte saisie à la main", async () => {
    const onPattern = vi.fn();
    mount(<FlossRail pattern={beadPattern()} {...railProps} onPattern={onPattern} />);
    click(byLabel("DMC 321,"));
    await waitFor("Les plus proches de ce fil");

    const field = container.querySelector("#perle-321") as HTMLInputElement;
    expect(field).toBeTruthy();
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(field, "db-0361");
      field.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const choose = [...container.querySelectorAll("button")].find((b) => b.textContent === "Choisir" && !b.hasAttribute("aria-label"));
    expect(choose!.hasAttribute("disabled")).toBe(false);
    click(choose!);
    expect(onPattern.mock.calls.at(-1)![0].beadMap).toEqual({ "321": "DB0361" });
  });

  it("refuse une référence absente de la table", async () => {
    const onPattern = vi.fn();
    mount(<FlossRail pattern={beadPattern()} {...railProps} onPattern={onPattern} />);
    click(byLabel("DMC 321,"));
    await waitFor("Les plus proches de ce fil");
    const field = container.querySelector("#perle-321") as HTMLInputElement;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(field, "DB9999999");
      field.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(container.textContent).toContain("Référence absente de la table Miyuki Delica");
    expect(onPattern).not.toHaveBeenCalled();
  });
});
