/**
 * Composer une rosace : cinq gestes → une signature → un vrai patron brodable → un PDF reproductible.
 * Les empreintes de référence figent la version v0.1 : un motif publié ne change jamais.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { codeDe, lireCode, lireRecetteOuvrage, type Signature } from "../lib/motif5d/code";
import { cosTour, fractionOctant, hasard, melanger } from "../lib/motif5d/maths";
import { empreinteCroix, formatParDefaut, generer, regenerer, retoucheRecette } from "../lib/motif5d/generer";
import { RECETTES, recetteDe } from "../lib/motif5d/recettes";
import { fromObject, toObject } from "../lib/pattern";
import ComposerRosace from "../components/ComposerRosace";
import Sceau from "../components/Sceau";

/** [code, empreinte au format par défaut, empreinte au double moins un point, croix, fils] — version v0.1 */
const REFERENCE: [string, number, number, number, number][] = [
  ["5D-11111.g12.v0.1", 69102211, 3515315559, 1076, 3], ["5D-22224.g58.v0.1", 2220709342, 2318805570, 1249, 5],
  ["5D-33333.g14.v0.1", 575580766, 2756360744, 955, 4], ["5D-44442.g1.v0.1", 1962140065, 586611654, 3721, 5],
  ["5D-12342.g21.v0.1", 4265912910, 2879266299, 1689, 7], ["5D-23411.g19.v0.1", 2398235458, 2947122070, 3721, 5],
  ["5D-34124.g29.v0.1", 2520181340, 2380432597, 769, 4], ["5D-41233.g15.v0.1", 3164088279, 651281991, 1786, 5],
  ["5D-13133.g59.v0.1", 508323518, 1403252785, 905, 6], ["5D-24242.g28.v0.1", 1447009034, 2782597358, 1525, 8],
  ["5D-31311.g17.v0.1", 2537247231, 3308084723, 2483, 4], ["5D-42424.g9.v0.1", 2716637352, 2621943428, 3721, 5],
];

describe("Le code d'une recette", () => {
  it("s'écrit et se relit à l'identique ; tout code mal formé est refusé", () => {
    const r = lireCode("5D-13133.g59.v0.1")!;
    expect(r.signature).toEqual({ structure: 0, trace: 2, densite: 0, echelle: 2, palette: 2 });
    expect(codeDe(r)).toBe("5D-13133.g59.v0.1");
    for (const faux of ["5D-13135.g1.v0.1", "5D-1313.g1.v0.1", "5D-13133.g0.v0.1", "5D-13133.g100000.v0.1", "5D-13133.g1.v0.2", "<script>", 42, null, "5D-13133.g1.v0.1 ; DROP"]) expect(lireCode(faux), String(faux)).toBeNull();
    expect(lireRecetteOuvrage({ code: "javascript:1", empreinte: 3 })).toBeUndefined();
  });
});

describe("Les calculs reproductibles", () => {
  it("le hasard redonne la même suite ; les approximations restent proches des vraies fonctions", () => {
    const a = hasard(melanger(7, 3)), b = hasard(melanger(7, 3));
    for (let i = 0; i < 50; i++) expect(a()).toBe(b());
    for (let x = 0; x <= 1; x += 0.01) expect(Math.abs(cosTour(x) - Math.cos(2 * Math.PI * x))).toBeLessThan(0.002);
    for (let t = 0; t <= 1; t += 0.05) expect(Math.abs(fractionOctant(1, t) - Math.atan(t) / (Math.PI / 4))).toBeLessThan(0.006);
  });
});

describe("Les douze recettes", () => {
  it("chaque réponse apparaît exactement trois fois", () => {
    for (const k of ["structure", "trace", "densite", "echelle", "palette"] as (keyof Signature)[]) {
      const n = [0, 0, 0, 0]; for (const r of RECETTES) n[recetteDe(r.code).signature[k]]++;
      expect(n, k).toEqual([3, 3, 3, 3]);
    }
  });
  it("redonnent exactement leurs motifs de référence, à deux tailles, et passent tous les garde-fous", () => {
    for (const [code, e1, e2, croix, fils] of REFERENCE) {
      const r = recetteDe(code), [w, h] = formatParDefaut(r.signature);
      const a = generer({ ...r, w, h }), b = generer({ ...r, w: w * 2 - 1, h: h * 2 - 1 });
      expect(a.pattern.recette?.empreinte, code).toBe(e1);
      expect(b.pattern.recette?.empreinte, code + " en grand").toBe(e2);
      expect([a.controle.croix, a.controle.fils], code).toEqual([croix, fils]);
      expect(a.controle.confettis, code).toBeLessThanOrEqual(0.02);
      expect(a.controle.maxFils10, code).toBeLessThanOrEqual(5);
      expect(a.pattern.palette.length, code).toBeLessThanOrEqual(24);
    }
  });
});

describe("Le générateur", () => {
  const S: Signature = { structure: 0, trace: 2, densite: 1, echelle: 1, palette: 2 };
  it("une rosace est identique sous ses huit symétries", () => {
    const { pattern: p } = generer({ signature: S, graine: 5, version: "v0.1", w: 61, h: 61 });
    const at = (x: number, y: number) => p.cross[y * 61 + x];
    for (let y = 0; y < 61; y++) for (let x = 0; x < 61; x++) {
      const v = at(x, y);
      expect([at(60 - x, y), at(x, 60 - y), at(y, x), at(60 - y, 60 - x)].every(o => o === v), `${x},${y}`).toBe(true);
    }
  });
  it("un geste ne change que ce qu'il annonce : la palette colore la même forme", () => {
    const forme = (palette: 0 | 1 | 2 | 3) => Array.from(generer({ signature: { ...S, palette }, graine: 5, version: "v0.1", w: 61, h: 61 }).pattern.cross, v => v >= 0);
    expect(forme(0)).toEqual(forme(2)); expect(forme(1)).toEqual(forme(3));
  });
  it("garde sa recette dans l'ouvrage, la sauvegarde, et la régénère à une autre taille", () => {
    const { pattern: p } = generer({ signature: S, graine: 9, version: "v0.1", w: 61, h: 61, nom: "Ma rosace" });
    expect(p.recette?.code).toBe("5D-13223.g9.v0.1");
    expect(p.provenance?.personalOnly).toBe(true);
    const relu = fromObject(JSON.parse(JSON.stringify(toObject(p))))!;
    expect(relu.recette).toEqual(p.recette); expect(retoucheRecette(relu)).toBe(false);
    const grand = regenerer({ ...relu, id: "ouvrage-1" }, 81, 81)!;
    expect([grand.w, grand.h, grand.id, grand.name, grand.recette?.code]).toEqual([81, 81, "ouvrage-1", "Ma rosace", "5D-13223.g9.v0.1"]);
    expect(retoucheRecette(grand)).toBe(false);
    relu.cross[0] = relu.cross[0] < 0 ? relu.palette[0] : -1;
    expect(retoucheRecette(relu)).toBe(true);
    expect(empreinteCroix(relu)).not.toBe(relu.recette!.empreinte);
  });
  it("refuse les combinaisons fragiles : la dentelle aérée passe en fin", () => {
    const { controle } = generer({ signature: { ...S, echelle: 3, densite: 0 }, graine: 1, version: "v0.1", w: 61, h: 61 });
    expect(controle.ajustements.join(" ")).toContain("Dentelle aérée");
  });
});

describe("Le parcours et le sceau", () => {
  const saved = HTMLCanvasElement.prototype.getContext;
  beforeAll(() => { (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true; HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as unknown as typeof saved; });
  afterAll(() => { HTMLCanvasElement.prototype.getContext = saved; });
  let root: Root | null = null, host: HTMLDivElement | null = null;
  afterEach(() => { act(() => root?.unmount()); host?.remove(); root = null; host = null; });
  const monter = (el: React.ReactElement) => { host = document.createElement("div"); document.body.append(host); root = createRoot(host); act(() => root!.render(el)); };
  const touche = (key: string) => act(() => { (document.activeElement ?? host!).dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })); });

  it("cinq gestes au clavier seul : les flèches tournent, Entrée choisit, et l'ouvrage porte sa recette", async () => {
    const onBroder = vi.fn();
    monter(<ComposerRosace onBroder={onBroder} onFermer={vi.fn()} />);
    await act(async () => { await new Promise(r => requestAnimationFrame(() => r(null))); });
    expect(host!.querySelector("#cr-titre")?.textContent).toBe("Quelle forme ?");
    const radios = () => [...host!.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
    expect(radios().map(r => r.getAttribute("aria-label"))).toEqual(["Rosace", "Anneaux", "Frise", "Pavage"]);
    expect(document.getElementById(radios()[0].getAttribute("aria-describedby")!)?.textContent).toContain("fleur géométrique");
    // Rosace (Entrée), puis Courbe (deux flèches), Aérée, Fin (deux flèches), Vive (deux flèches)
    for (const fleches of [0, 2, 0, 2, 2]) {
      for (let k = 0; k < fleches; k++) touche("ArrowRight");
      act(() => (document.activeElement as HTMLButtonElement).click());
      await act(async () => { await new Promise(r => requestAnimationFrame(() => r(null))); });
    }
    expect(host!.querySelector(".sceau svg")?.getAttribute("aria-label")).toBe("Sceau 5D-13133, graine 1 : rosace, courbe, aérée, fin, vive");
    act(() => host!.querySelector<HTMLButtonElement>(".cr-broder")!.click());
    expect(onBroder).toHaveBeenCalledTimes(1);
    expect(onBroder.mock.calls[0][0].recette.code).toBe("5D-13133.g1.v0.1");
    expect(onBroder.mock.calls[0][1]).toBe("5D-13133.g1.v0.1");
  });
  it("un lien partagé ouvre la recette en lecture, avec son nom ; Échap ferme", () => {
    const onFermer = vi.fn();
    monter(<ComposerRosace depart="5D-13133.g59.v0.1" lecture onBroder={vi.fn()} onFermer={onFermer} />);
    expect(host!.querySelector("#cr-titre")?.textContent).toBe("Kaléidoscope");
    expect(host!.textContent).toContain("Une recette partagée avec vous");
    expect(host!.textContent).not.toContain("Recommencer");
    expect(host!.querySelector(".cr-fin")?.getAttribute("data-empreinte")).toBe("508323518");
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); });
    expect(onFermer).toHaveBeenCalled();
  });
  it("le sceau en cours dit combien d'anneaux sont dessinés", () => {
    monter(<Sceau signature={{ structure: 1 }} faits={1} />);
    expect(host!.querySelector("svg")?.getAttribute("aria-label")).toBe("Sceau en cours : 1 anneau sur 5");
  });
});

describe("Le PDF reproductible", () => {
  it("porte une page « recette » avec le code et les cinq choix ; le même code redonne le même PDF", async () => {
    const { buildPdf } = await import("../lib/pdf");
    const { pdfText, normalize, pageCount } = await import("./helpers");
    const r = recetteDe("5D-13133.g59.v0.1");
    const un = generer({ ...r, w: 61, h: 61, nom: "Kaléidoscope" }).pattern, deux = generer({ ...r, w: 61, h: 61, nom: "Kaléidoscope" }).pattern;
    const blob = await buildPdf(un, { bw: false });
    const texte = await pdfText(blob);
    expect(texte).toContain("La recette");
    expect(texte).toContain("5D-13133 · g59 · v0.1");
    for (const mot of ["Structure", "Rosace", "Courbe", "Aérée", "Fin", "Vive"]) expect(texte).toContain(mot);
    expect(texte).toContain("Commencez au centre");
    expect(normalize(await pdfText(await buildPdf(deux, { bw: false })))).toBe(normalize(texte));
    const sansRecette = await buildPdf({ ...un, recette: undefined }, { bw: false });
    expect(pageCount(texte)).toBe(pageCount(await pdfText(sansRecette)) + 1);
  });
});

describe("Le Cadre et une rosace", () => {
  const saved = HTMLCanvasElement.prototype.getContext;
  beforeAll(() => { HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as unknown as typeof saved; });
  afterAll(() => { HTMLCanvasElement.prototype.getContext = saved; });
  it("un coin régénère le motif depuis sa recette, à la nouvelle taille", async () => {
    const { default: Cadre } = await import("../components/Cadre");
    const { VUE_CADRE } = await import("../components/Canvas");
    const { pattern } = generer({ ...recetteDe("5D-13133.g59.v0.1"), w: 61, h: 61, nom: "Kaléidoscope" });
    const onSet = vi.fn(), host = document.createElement("div"); document.body.append(host);
    const root = createRoot(host);
    act(() => root.render(<Cadre pattern={pattern} plus={[]} onSet={onSet} onBegin={vi.fn()} onLive={vi.fn()} onEnd={vi.fn()} onNotify={vi.fn()} />));
    act(() => { window.dispatchEvent(new CustomEvent(VUE_CADRE, { detail: { s: 8, ox: 100, oy: 120, w: 1000, h: 800, pw: 61, ph: 61, left: 0, top: 0 } })); });
    await act(async () => { host.querySelector<HTMLElement>(".cadre-se")!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })); });
    const p = onSet.mock.calls[0][0];
    expect([p.w, p.h, p.name, p.recette.code]).toEqual([67, 67, "Kaléidoscope", "5D-13133.g59.v0.1"]);
    expect(p.recette.empreinte).toBe(generer({ ...recetteDe("5D-13133.g59.v0.1"), w: 67, h: 67 }).pattern.recette!.empreinte);
    act(() => root.unmount()); host.remove();
  });
});
