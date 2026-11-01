import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import CrossStitchHome from "../components/CrossStitchHome";
import { entryStudio, publicPathFor } from "../lib/entryNavigation";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;
let host: HTMLDivElement | undefined;
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = undefined;
  localStorage.clear();
  vi.restoreAllMocks();
});
function mount(extra: { onOuvrages?: () => void; onShare?: () => void; onVisite?: () => void } = {}) {
  const onOpen = vi.fn(), onImport = vi.fn();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root!.render(<CrossStitchHome projectName="Roses de famille" onOpen={onOpen} onImport={onImport} {...extra}/>));
  return { view: host, onOpen, onImport };
}
describe("Point Zéro spécialisé", () => {
  it("ouvre la racine spécialisée et conserve les destinations historiques", () => {
    expect(entryStudio("", "", "/")).toBe("stitch-home");
    expect(publicPathFor("stitch-home")).toBe("/");
    expect(entryStudio("", "", "/aime")).toBe("stitch-home");
    expect(entryStudio("?studio=embroidery", "", "/atelier")).toBe("embroidery");
    expect(entryStudio("", "", "/atelier")).toBe("embroidery");
    expect(publicPathFor("embroidery")).toBe("/atelier");
  });
  it("ne crée ni ne remplace de données à l’ouverture", () => {
    localStorage.setItem("ouvrage", "données existantes");
    const write = vi.spyOn(Storage.prototype, "setItem");
    const { view, onOpen } = mount();
    expect(view.querySelectorAll("h1")).toHaveLength(1);
    expect(view.textContent).toContain("Roses de famille");
    expect(view.textContent).toContain("son effacement supprime les projets locaux");
    expect(view.querySelector("iframe")).toBeNull();
    expect(view.textContent).toContain("Le puzzle PDF");
    expect(view.querySelector("h1")?.textContent).toBe("Point Zéro");
    expect(view.querySelector(".ru .ed-brode-photo")?.getAttribute("src")).toMatch(/met-palampore/);
    expect(write).not.toHaveBeenCalled();
    expect(onOpen).not.toHaveBeenCalled();
    expect(localStorage.getItem("ouvrage")).toBe("données existantes");
  });
  it("relie chaque action à son intention, sans catalogue d’univers généralistes", () => {
    const { view, onOpen } = mount();
    const actions = [
      ["Mes ouvrages", "library"], ["Créer mon patron", "create"],
      ["Préparer", "prepare"], ["Continuer à broder", "stitch"],
    ];
    for (const [label, intent] of actions) {
      const button = [...view.querySelectorAll("button")].find(b => b.textContent === label || b.textContent?.includes(label + " "))!;
      act(() => button.click());
      expect(onOpen).toHaveBeenLastCalledWith(intent);
    }
    expect(view.querySelector('a[href="/aime"]')).toBeNull();
    expect(view.textContent).not.toContain("Architecture mère");
    expect(view.querySelector('a[href="#csh-import"]')).not.toBeNull();
  });
  it("transmet le fichier choisi une seule fois et accepte de le sélectionner à nouveau", () => {
    const { view, onImport } = mount();
    const input = view.querySelector<HTMLInputElement>('input[aria-label="Importer une image, un PDF ou un projet"]')!;
    expect(input.accept).toContain(".oxs");
    expect(input.accept).toContain(".pdf");
    const file = new File(["image"], "souvenir.png", { type: "image/png" });
    Object.defineProperty(input, "files", { configurable: true, value: [file] });
    act(() => input.dispatchEvent(new Event("change", { bubbles: true })));
    expect(onImport).toHaveBeenCalledExactlyOnceWith(file);
    expect(input.value).toBe("");
    Object.defineProperty(input, "files", { configurable: true, value: [] });
    act(() => input.dispatchEvent(new Event("change", { bubbles: true })));
    expect(onImport).toHaveBeenCalledTimes(1);
  });
  it("garde les actions métier en contexte sans dock de navigation concurrent", () => {
    const onOuvrages = vi.fn(), onShare = vi.fn(), onVisite = vi.fn();
    const { view, onOpen } = mount({ onOuvrages, onShare, onVisite });
    const actions = view.querySelector('[aria-label="Actions de la présentation Broderie"]')!;
    expect(actions).toBeTruthy();
    expect(view.querySelector('.pzh-bottom')).toBeNull();
    const buttons = [...actions.querySelectorAll<HTMLButtonElement>('button')];
    act(() => buttons.find(b => b.textContent === 'Mes ouvrages de broderie')!.click());
    expect(onOuvrages).toHaveBeenCalledTimes(1); expect(onOpen).not.toHaveBeenCalled();
    act(() => buttons.find(b => b.textContent === 'Ouvrir l’atelier')!.click()); expect(onOpen).toHaveBeenLastCalledWith('stitch');
    act(() => buttons.find(b => b.textContent === 'Faire la visite avec Le Point')!.click()); expect(onVisite).toHaveBeenCalledTimes(1);
    for (const id of ['chapitres','ch-point','tout','commencer']) expect(view.querySelector('#'+id)).toBeTruthy();
    const invite=[...view.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent?.includes('Inviter à regarder'))!;
    act(()=>invite.click());expect(onShare).toHaveBeenCalled();
    expect(view.textContent).toContain('Bientôt');
  });
  it("présente les usages du vrai Disque sans captures d’écran", () => {
    const { view, onOpen } = mount();
    expect(view.querySelector("#editions")).toBeNull();
    expect(view.querySelectorAll('#chapitres img[src*="ecran-"]')).toHaveLength(0);
    expect(view.querySelectorAll('#usages-disque .lp-scene-hote')).toHaveLength(1);
    const index = view.querySelector('[aria-label="Tous les usages du Disque"]')!;
    expect(index.querySelectorAll('button')).toHaveLength(8);
    act(() => index.querySelector<HTMLButtonElement>('#ch-docks')!.click());
    expect(view.querySelector('[aria-label="Usage choisi"]')?.textContent).toContain('Une couronne');
    act(() => [...view.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent==='Créer dans l’atelier')!.click());
    expect(onOpen).toHaveBeenLastCalledWith('create');
    act(() => index.querySelector<HTMLButtonElement>('#ch-nuancier')!.click());
    expect(view.querySelectorAll('.usages-fils li').length).toBeGreaterThan(0);
    const tout = view.querySelector('#tout')!;
    expect(tout.querySelectorAll('dt')).toHaveLength(12);
    for (const t of ['demi-point','point arrière','puzzle PDF','Miyuki Delica','parking des fils','PDF paginé','contraste élevé']) expect(tout.textContent).toContain(t);
  });
  it("les usages import, visite et ouvrages réutilisent les callbacks existants", () => {
    const onOuvrages=vi.fn(), onVisite=vi.fn();
    const {view,onImport}=mount({onOuvrages,onVisite});
    const input=view.querySelector<HTMLInputElement>('input[aria-label="Importer depuis le Disque de présentation"]')!;
    const file=new File(['x'],'motif.png',{type:'image/png'});
    Object.defineProperty(input,'files',{value:[file]});
    act(()=>input.dispatchEvent(new Event('change',{bubbles:true})));
    expect(onImport).toHaveBeenCalledExactlyOnceWith(file);expect(input.value).toBe('');
    act(()=>view.querySelector<HTMLButtonElement>('#ch-point')!.click());
    const panel=view.querySelector('.usages-detail')!;
    act(()=>[...panel.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent==='Faire la visite avec Le Point')!.click());
    expect(onVisite).toHaveBeenCalledTimes(1);
    act(()=>[...panel.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent==='Mes ouvrages de broderie')!.click());
    expect(onOuvrages).toHaveBeenCalledTimes(1);
  });
  it("sans visite branchée, « Faire la visite » ouvre l’atelier", () => {
    const { view, onOpen } = mount();
    act(() => [...view.querySelectorAll<HTMLButtonElement>("button")].find(b => b.textContent === "Faire la visite avec Le Point")!.click());
    expect(onOpen).toHaveBeenCalledWith("create");
  });
  it("sans branchement, « + Entrer » ouvre mes ouvrages", () => {
    const { view, onOpen } = mount();
    act(() => view.querySelector<HTMLButtonElement>('.csh-actions-contextuelles button')!.click());
    expect(onOpen).toHaveBeenCalledWith("library");
  });
});
