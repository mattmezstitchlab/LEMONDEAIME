import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import StudioDemo from "../components/StudioDemo";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("Réplique du studio sur l’accueil", () => {
  it("reprend les libellés réels du studio et reste décorative", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    act(() => root.render(<StudioDemo/>));
    const demo = host.querySelector(".sdemo")!;
    expect(demo.getAttribute("aria-hidden")).toBe("true");
    for (const label of ["Dessiner", "Broder", "Fils", "Partager", "BurO", "Réaliste", "Tout voir", "Point Zéro"]) expect(demo.textContent).toContain(label);
    expect(demo.querySelectorAll("button, input, a")).toHaveLength(0);
    act(() => root.unmount());
    host.remove();
  });
});
