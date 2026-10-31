/**
 * Le Cadre : les coins recomptent les points, les bords agrandissent la toile, la poignée déplace le motif ;
 * l'étiquette donne la taille réelle, le temps et les écheveaux ; la photo gardée se règle (auto, lumière, palettes).
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import Cadre, { TracerCadre } from "../components/Cadre";
import { VUE_CADRE } from "../components/Canvas";
import { decaler, duree, empreinte, etendre, fusionnerVoisins, mesures, mesuresAEchelle, pointsPourCm, reechantillonner, reglerPixels, retouche, REGLAGES_AUTO, filsAuto } from "../lib/cadre";
import { createPattern, ensurePalette, fromObject, toObject, type Pattern } from "../lib/pattern";
import { flossIndex } from "../lib/dmc";

const rouge = flossIndex("321"), vert = flossIndex("699");
function motif(w = 10, h = 6): Pattern {
  const p = createPattern("Essai", w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (x < w / 2) p.cross[y * w + x] = rouge; else p.cross[y * w + x] = vert;
  ensurePalette(p, rouge); ensurePalette(p, vert);
  p.back.push({ x1: 0, y1: 0, x2: w, y2: h, c: rouge });
  return p;
}

describe("Le Cadre : agrandir, étendre, déplacer", () => {
  it("les coins mettent le motif à l'échelle : chaque case reprend la case d'origine la plus proche", () => {
    const p = motif(), g = reechantillonner(p, 20, 12);
    expect([g.w, g.h]).toEqual([20, 12]);
    expect(g.cross[0]).toBe(rouge); expect(g.cross[19]).toBe(vert); expect(g.cross[11 * 20 + 9]).toBe(rouge); expect(g.cross[11 * 20 + 10]).toBe(vert);
    expect(g.back[0]).toMatchObject({ x1: 0, y1: 0, x2: 20, y2: 12 });
    expect(g.id).toBe(p.id);
    const r = reechantillonner(p, 5, 3);
    expect([...r.cross]).toEqual([rouge, rouge, vert, vert, vert, rouge, rouge, vert, vert, vert, rouge, rouge, vert, vert, vert]);
  });
  it("les bords agrandissent la toile sans bouger les points ; ils peuvent aussi la recouper", () => {
    const p = motif(), e = etendre(p, { gauche: 3, haut: 1, droite: 0, bas: 2 });
    expect([e.w, e.h]).toEqual([13, 9]);
    expect(e.cross[0]).toBe(-1); expect(e.cross[1 * 13 + 3]).toBe(rouge); expect(e.cross[1 * 13 + 12]).toBe(vert);
    const c = etendre(p, { gauche: 0, haut: 0, droite: -5, bas: 0 });
    expect(c.w).toBe(5); expect(c.palette.includes(rouge)).toBe(true);
    expect(c.cross.every(v => v === rouge)).toBe(true);
  });
  it("la poignée déplace le motif dans son cadre, case par case", () => {
    const p = motif(), d = decaler(p, 2, 1);
    expect([d.w, d.h]).toEqual([10, 6]);
    expect(d.cross[0]).toBe(-1); expect(d.cross[1 * 10 + 2]).toBe(rouge);
    expect(decaler(p, 0, 0)).toBe(p);
  });
});

describe("L'étiquette : taille réelle, temps, écheveaux", () => {
  it("donne les centimètres selon la toile, une durée lisible et les écheveaux", () => {
    const p = motif(14, 28), m = mesures(p);
    expect(m.cmL).toBeCloseTo(2.54); expect(m.cmH).toBeCloseTo(5.08);
    expect(m.fils).toBe(2); expect(m.echeveaux).toBeGreaterThanOrEqual(2); expect(m.heures).toBeGreaterThan(0);
    const lin = mesures({ ...p, count: 28, fabric: { type: "linen", over: 2, color: "#fff", margin: 5, units: "cm" } });
    expect(lin.cmL).toBeCloseTo(2.54);
    const x2 = mesuresAEchelle(m, 2);
    expect(x2.cmL).toBeCloseTo(m.cmL * 2); expect(x2.points).toBe(m.points * 4);
    expect(duree(0)).toBe("—"); expect(duree(.3)).toBe("≈ 20 min"); expect(duree(3.3)).toBe("≈ 3,5 h"); expect(duree(31.4)).toBe("≈ 31 h");
    expect(pointsPourCm(15, 14)).toBe(83); expect(pointsPourCm(15, 28, 2)).toBe(83);
  });
  it("assez de fils pour le détail, pas plus : un petit format en demande peu", () => {
    expect(filsAuto(30, 30)).toBeLessThan(filsAuto(120, 120));
    expect(filsAuto(5, 5)).toBe(8); expect(filsAuto(1000, 1000)).toBe(40);
  });
});

describe("La photo gardée", () => {
  const image = (w: number, h: number, f: (x: number, y: number) => [number, number, number]) => {
    const d = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b] = f(x, y), o = (y * w + x) * 4; d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255; }
    return d;
  };
  it("le fond uni (même en dégradé) devient toile nue ; le sujet reste", () => {
    const d = image(40, 40, (x, y) => Math.hypot(x - 20, y - 20) < 8 ? [200, 30, 60] : [20 + x, 30 + x, 25 + x]);
    reglerPixels(d, 40, 40, { ...REGLAGES_AUTO, auto: false });
    expect(d[3]).toBe(0); expect(d[(39 * 40 + 39) * 4 + 3]).toBe(0);
    expect(d[(20 * 40 + 20) * 4 + 3]).toBe(255);
    const garde = image(40, 40, (x, y) => Math.hypot(x - 20, y - 20) < 8 ? [200, 30, 60] : [20 + x, 30 + x, 25 + x]);
    reglerPixels(garde, 40, 40, { ...REGLAGES_AUTO, auto: false, fond: false });
    expect(garde[3]).toBe(255);
  });
  it("auto étire les niveaux ; la lumière éclaircit ; les palettes transforment les couleurs", () => {
    const terne = () => image(10, 10, x => [80 + x * 10, 70 + x * 10, 60 + x * 10]);
    const a = terne(); reglerPixels(a, 10, 10, { ...REGLAGES_AUTO, fond: false });
    expect(a[0]).toBeLessThan(40); expect(a[(9) * 4]).toBeGreaterThan(215);
    const l = terne(); reglerPixels(l, 10, 10, { ...REGLAGES_AUTO, auto: false, fond: false, lumiere: 60 });
    expect(l[0]).toBeGreaterThan(110);
    const vif = () => image(4, 1, x => x < 2 ? [220, 30, 40] : [30, 160, 60]);
    const douce = vif(); reglerPixels(douce, 4, 1, { ...REGLAGES_AUTO, auto: false, fond: false, palette: "douce" });
    expect(Math.max(douce[0], douce[1], douce[2]) - Math.min(douce[0], douce[1], douce[2])).toBeLessThan(190 * .7);
    const cam = vif(); reglerPixels(cam, 4, 1, { ...REGLAGES_AUTO, auto: false, fond: false, palette: "camaieu" });
    expect(cam[12 + 0]).toBeGreaterThan(cam[12 + 1]); // le vert passe dans la teinte dominante (rouge)
    const anc = vif(); reglerPixels(anc, 4, 1, { ...REGLAGES_AUTO, auto: false, fond: false, palette: "ancienne" });
    expect(anc[12]).toBeGreaterThan(80); // sépia : le vert se réchauffe
  });
  it("palette harmonieuse : un fil trop voisin d'un fil plus présent le rejoint", () => {
    const proche = flossIndex("321"), voisin = flossIndex("304"), loin = flossIndex("699");
    const cross = Int16Array.from([proche, proche, proche, voisin, loin, -1]);
    const garde = fusionnerVoisins(cross, 9);
    expect(garde).toContain(proche); expect(garde).toContain(loin); expect(garde).not.toContain(voisin);
    expect(cross[3]).toBe(proche);
  });
  it("est sauvegardée avec l'ouvrage, et ses réglages sont relus prudemment", () => {
    const p = motif(); p.photo = { src: "data:image/webp;base64,AAAA", reglages: { ...REGLAGES_AUTO, palette: "ancienne", lumiere: 250 }, empreinte: empreinte(p) };
    const q = fromObject(JSON.parse(JSON.stringify(toObject(p))))!;
    expect(q.photo?.src).toBe(p.photo.src); expect(q.photo?.reglages.palette).toBe("ancienne"); expect(q.photo?.reglages.lumiere).toBe(100);
    expect(retouche(q)).toBe(false);
    q.cross[0] = vert; expect(retouche(q)).toBe(true);
    const faux = fromObject({ ...JSON.parse(JSON.stringify(toObject(p))), photo: { src: "javascript:alert(1)" } })!;
    expect(faux.photo).toBeUndefined();
  });
});

describe("Le cadre à l'écran", () => {
  const saved = HTMLCanvasElement.prototype.getContext;
  beforeAll(() => { (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true; HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as unknown as typeof saved; });
  afterAll(() => { HTMLCanvasElement.prototype.getContext = saved; });
  let root: Root | null = null, host: HTMLDivElement | null = null;
  afterEach(() => { act(() => root?.unmount()); host?.remove(); root = null; host = null; });
  const monter = (el: React.ReactElement) => { host = document.createElement("div"); document.body.append(host); root = createRoot(host); act(() => root!.render(el)); act(() => { window.dispatchEvent(new CustomEvent(VUE_CADRE, { detail: { s: 10, ox: 100, oy: 120, w: 1000, h: 800, pw: 10, ph: 6, left: 0, top: 0 } })); }); };

  it("l'étiquette dit le format, la toile, le temps ; le + range les fonctions rares ; les poignées marchent au clavier", async () => {
    const onSet = vi.fn(), autre = vi.fn();
    monter(<Cadre pattern={motif()} plus={[["Motifs à glisser", autre]]} onSet={onSet} onBegin={vi.fn()} onLive={vi.fn()} onEnd={vi.fn()} onNotify={vi.fn()} />);
    const tete = host!.querySelector(".cadre-tete")!;
    expect(tete.textContent).toContain("10 × 6 pts"); expect(tete.textContent).toContain("Aida 14"); expect(tete.textContent).toMatch(/≈ .*(min|h)/);
    expect(host!.querySelectorAll('[role="slider"]')).toHaveLength(8);
    act(() => host!.querySelector<HTMLButtonElement>(".cadre-plus")!.click());
    act(() => [...host!.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')].find(b => b.textContent === "Motifs à glisser")!.click());
    expect(autre).toHaveBeenCalled();
    const droit = host!.querySelector<HTMLElement>(".cadre-e")!;
    await act(async () => { droit.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })); });
    expect(onSet.mock.calls[0][0].w).toBe(11);
    const coin = host!.querySelector<HTMLElement>(".cadre-se")!;
    await act(async () => { coin.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })); });
    expect(onSet.mock.calls[1][0].w).toBe(11); expect(onSet.mock.calls[1][0].h).toBe(7);
    act(() => host!.querySelector<HTMLButtonElement>(".cadre-puce")!.click());
    act(() => [...host!.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]')].find(b => b.textContent?.startsWith("Aida 18"))!.click());
    expect(onSet.mock.calls[2][0].count).toBe(18);
  });
  it("en lecture partagée, ni poignées ni déplacement", () => {
    monter(<Cadre pattern={motif()} readOnly plus={[]} onSet={vi.fn()} onBegin={vi.fn()} onLive={vi.fn()} onEnd={vi.fn()} onNotify={vi.fn()} />);
    expect(host!.querySelectorAll('[role="slider"]')).toHaveLength(0);
    expect(host!.querySelector(".cadre-deplacer")).toBeNull();
  });
  it("tracer : un format tout fait se convertit en points selon la toile", () => {
    const onTrace = vi.fn();
    monter(<TracerCadre count={14} onTrace={onTrace} onAnnuler={vi.fn()} />);
    act(() => [...host!.querySelectorAll<HTMLButtonElement>(".cadre-formats button")].find(b => b.textContent?.startsWith("Marque-page"))!.click());
    expect(onTrace).toHaveBeenCalledWith(33, 99, "Marque-page");
  });
});
