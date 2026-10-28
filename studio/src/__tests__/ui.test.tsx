import { describe, expect, it, vi, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ReactNode } from "react";
import Dock from "../components/Dock";
import FlossRail from "../components/FlossRail";
import Coach from "../components/Coach";
import { TRACKS, entryById } from "../lib/coach";
import { createPattern, ensurePalette, type Pattern } from "../lib/pattern";
import { flossIndex } from "../lib/dmc";

/**
 * Rendu réel des deux composants d'atelier qui ont changé : le dock (outils
 * moins fréquents) et le rail de fils (référence de perle). jsdom ne connaît ni
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

describe("Dock : les outils moins fréquents sont atteignables", () => {
  it("cache les extras derrière un bouton qui les révèle", () => {
    const onTool = vi.fn();
    mount(<Dock tool="cross" onTool={onTool} color={RED} workspace="create" />);
    expect(byLabel("Point de croix (X)")).toBeTruthy();
    expect(byLabel("Perle")).toBeNull();

    const more = byLabel("Afficher les outils moins fréquents");
    expect(more).toBeTruthy();
    expect(more!.getAttribute("aria-expanded")).toBe("false");
    click(more);

    expect(byLabel("Masquer les outils moins fréquents")!.getAttribute("aria-expanded")).toBe("true");
    for (const label of [
      "Trois-quarts de point (1)",
      "Petite croix (2)",
      "Perle (3)",
      "Ligne de croix (4)",
      "Rectangle (5)",
      "Ellipse (6)",
      "Lasso (7)",
      "Déplacer la sélection (8)",
    ]) {
      expect(byLabel(label), label).toBeTruthy();
    }
    click(byLabel("Perle (3)"));
    expect(onTool).toHaveBeenCalledWith("bead");
  });

  it("s'ouvre tout seul quand l'outil actif vient d'ailleurs", () => {
    // Choisi depuis le panneau Projet : sans cela, l'outil actif n'était
    // visible nulle part.
    mount(<Dock tool="ellipse" onTool={vi.fn()} color={RED} workspace="create" />);
    expect(byLabel("Ellipse (6)")!.getAttribute("aria-pressed")).toBe("true");
  });

  it("en mode Broder ne propose aucun outil de dessin", () => {
    mount(<Dock tool="mark" onTool={vi.fn()} color={RED} workspace="stitch" />);
    expect(byLabel("Bloc 10 × 10 (B)")).toBeTruthy();
    expect(byLabel("Point de croix")).toBeNull();
    expect(byLabel("Perle")).toBeNull();
    click(byLabel("Afficher les outils moins fréquents"));
    expect(byLabel("Cocher un contour ou un ornement (J)")).toBeTruthy();
    expect(byLabel("Note sur la grille (9)")).toBeTruthy();
    expect(byLabel("Perle")).toBeNull();
  });
});

describe("Dock : le guide n'anime qu'un pictogramme", () => {
  const outils = (mode: string) =>
    new Set([...container.querySelectorAll(`[data-mode="${mode}"] [data-tool]`)].map((b) => b.getAttribute("data-tool")));

  it("marque chaque outil d'un identifiant exploitable", () => {
    mount(<Dock tool="cross" onTool={vi.fn()} color={RED} workspace="create" />);
    const ids = [...container.querySelectorAll("[data-tool]")].map((b) => b.getAttribute("data-tool"));
    expect(ids).toContain("cross");
    expect(ids.every((id) => !!id)).toBe(true);
    expect(new Set(ids).size, "un outil, une entrée").toBe(ids.length);
  });

  it("n'anime que le pictogramme montré, et rien quand le guide se tait", () => {
    mount(<Dock tool="cross" onTool={vi.fn()} color={RED} workspace="create" coachTool="fill" />);
    const on = container.querySelectorAll('[data-coach="on"]');
    expect(on).toHaveLength(1);
    expect(on[0].getAttribute("data-tool")).toBe("fill");
    // Montrer un outil n'est pas l'activer à la place de l'utilisateur.
    expect(on[0].getAttribute("aria-pressed")).toBe("false");
  });

  it("ouvre le groupe « plus » pour montrer un outil qui y était caché", () => {
    mount(<Dock tool="cross" onTool={vi.fn()} color={RED} workspace="create" coachTool="petite" />);
    expect(byLabel("Masquer les outils moins fréquents"), "le groupe s'est ouvert").toBeTruthy();
    expect(byLabel("Petite croix (2)")!.getAttribute("data-coach")).toBe("on");
  });

  it("chaque outil visé par le guide existe dans le dock du mode concerné", () => {
    // Un outil du groupe « plus » comme outil actif ouvre le groupe : les deux
    // docks sont alors complets, et l'on peut vérifier le parcours entier.
    mount(
      <>
        <div data-mode="create">
          <Dock tool="ellipse" onTool={vi.fn()} color={RED} workspace="create" />
        </div>
        <div data-mode="stitch">
          <Dock tool="note" onTool={vi.fn()} color={RED} workspace="stitch" />
        </div>
      </>,
    );
    const create = outils("create"), stitch = outils("stitch");
    expect(create.size).toBeGreaterThan(15);
    expect(stitch.size).toBeGreaterThan(8);
    for (const step of TRACKS.create) {
      if (step.target.kind === "tool") expect(create.has(step.target.tool), `${step.id} → ${step.target.tool}`).toBe(true);
    }
    for (const step of TRACKS.stitch) {
      if (step.target.kind === "tool") expect(stitch.has(step.target.tool), `${step.id} → ${step.target.tool}`).toBe(true);
    }
  });
});

describe("Guide : un mémo, une cible, un champ de questions", () => {
  const props = (over: Partial<React.ComponentProps<typeof Coach>> = {}) => ({
    open: true,
    track: "create" as const,
    step: TRACKS.create[1],
    index: 1,
    total: TRACKS.create.length,
    ask: null,
    onAsk: vi.fn(),
    onPick: vi.fn(),
    onBackToStep: vi.fn(),
    onNext: vi.fn(),
    onPrev: vi.fn(),
    onClose: vi.fn(),
    ...over,
  });
  const type = (field: HTMLInputElement, value: string) =>
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(field, value);
      field.dispatchEvent(new Event("input", { bubbles: true }));
    });

  it("montre une étape à la fois, avec son mémo et sa place dans le parcours", () => {
    mount(<Coach {...props()} />);
    expect(container.textContent).toContain(TRACKS.create[1].title);
    expect(container.textContent).toContain(TRACKS.create[1].memo);
    expect(container.textContent).toContain(`Étape 2 / ${TRACKS.create.length}`);
    // Le pas à pas laisse toujours la main : Suivant et Précédent sont là.
    expect(container.textContent).toContain("Suivant");
    expect(container.textContent).toContain("Précédent");
    expect(container.querySelectorAll("input")).toHaveLength(1);
  });

  it("transmet la question posée, et vide le champ", () => {
    const onAsk = vi.fn();
    mount(<Coach {...props({ onAsk })} />);
    const field = container.querySelector("input") as HTMLInputElement;
    type(field, "comment activer la symétrie");
    act(() => {
      container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(onAsk).toHaveBeenCalledWith("comment activer la symétrie");
    expect(field.value).toBe("");
  });

  it("ne transmet pas une question vide", () => {
    const onAsk = vi.fn();
    mount(<Coach {...props({ onAsk })} />);
    act(() => {
      container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(onAsk).not.toHaveBeenCalled();
  });

  it("affiche la réponse trouvée, son mémo, et les entrées voisines", () => {
    const symmetry = entryById("symmetry")!;
    const shapes = entryById("shapes")!;
    mount(<Coach {...props({ ask: { query: "symétrie", hits: [{ entry: symmetry, score: 4 }, { entry: shapes, score: 2 }] } })} />);
    expect(container.textContent).toContain("L'atelier répond");
    expect(container.textContent).toContain(symmetry.answer);
    expect(container.textContent).toContain(symmetry.memo);
    expect(container.textContent).toContain(shapes.ask);
    expect(container.textContent).toContain("Revenir au guide pas à pas");
    // Une réponse n'affiche plus le pas à pas : une seule chose à la fois.
    expect(container.textContent).not.toContain(TRACKS.create[1].title);
  });

  it("dit qu'il ne sait pas, et propose de quoi repartir", () => {
    mount(<Coach {...props({ ask: { query: "la capitale du Pérou", hits: [] } })} />);
    expect(container.textContent).toContain("je ne sais pas répondre");
    expect(container.textContent).toContain("plutôt que d'inventer");
    expect(container.querySelectorAll(".chip").length).toBeGreaterThan(2);
  });

  it("un parcours terminé garde le champ de questions", () => {
    mount(<Coach {...props({ step: null, index: TRACKS.create.length })} />);
    expect(container.textContent).toContain("parcours est terminé");
    expect(container.querySelectorAll("input")).toHaveLength(1);
    expect(container.textContent).not.toContain("Suivant");
  });

  it("fermé, il ne rend rien", () => {
    mount(<Coach {...props({ open: false })} />);
    expect(container.textContent).toBe("");
  });
});

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
