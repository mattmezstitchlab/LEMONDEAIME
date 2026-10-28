import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createPattern } from "../lib/pattern";
import { saveLibrary } from "../lib/library";
import App from "../App";

vi.mock("../components/AutomaticImageImport", () => ({ default: ({ onReady }: { onReady: (p: ReturnType<typeof createPattern>) => void }) => <button onClick={() => onReady(createPattern("Image importée", 20, 20))}>Terminer image test</button> }));
vi.mock("../components/PdfPrep", () => ({ default: ({ onImport, integrated }: { onImport: (p: ReturnType<typeof createPattern>) => void; integrated?: boolean }) => <div data-integrated={String(integrated)}><span>Puzzle PDF conservé</span><button onClick={() => onImport(createPattern("PDF assemblé", 30, 20))}>Valider puzzle test</button></div> }));
vi.mock("../lib/library", async importOriginal => ({ ...await importOriginal<typeof import("../lib/library")>(), saveLibrary: vi.fn().mockResolvedValue(undefined) }));
let root: Root | undefined, host: HTMLDivElement | undefined;
beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear(); window.history.replaceState(null, "", "/");
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} unobserve() {} });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});
afterEach(async () => { await act(async () => root?.unmount()); host?.remove(); root = undefined; localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function mountAndImport(name: string, type: string) {
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root!.render(<App/>));
  const picker = host.querySelector<HTMLInputElement>('input[type="file"]')!;
  Object.defineProperty(picker, "files", { value: [new File(["test"], name, { type })] });
  await act(async () => picker.dispatchEvent(new Event("change", { bubbles: true })));
}
it("ouvre une image directement dans la grille sans composition obligatoire", async () => {
  await mountAndImport("photo.png", "image/png");
  await act(async () => [...host!.querySelectorAll("button")].find(b => b.textContent === "Terminer image test")!.click());
  expect(host!.querySelector('canvas[role="application"]')).not.toBeNull();
  expect(host!.querySelector('[aria-label="Composition intelligente Point Zéro"]')).toBeNull();
  expect(host!.textContent).toContain("Image importée");
  expect(saveLibrary).toHaveBeenCalledWith(expect.anything(), true);
});
it("conserve le puzzle dans l’import PDF puis ouvre son résultat dans la même grille", async () => {
  await mountAndImport("patron.pdf", "application/pdf");
  expect(host!.querySelector('[data-integrated="true"]')).not.toBeNull();
  await act(async () => [...host!.querySelectorAll("button")].find(b => b.textContent === "Valider puzzle test")!.click());
  expect(host!.textContent).toContain("PDF assemblé");
  expect(host!.textContent).not.toContain("Puzzle PDF conservé");
  expect(host!.querySelector('[aria-label="Composition intelligente Point Zéro"]')).toBeNull();
});
it("bloque le transfert PDF si le précédent ouvrage ne peut pas être archivé", async () => {
  await mountAndImport("patron.pdf", "application/pdf");
  vi.mocked(saveLibrary).mockRejectedValueOnce(new Error("quota"));
  await act(async () => [...host!.querySelectorAll("button")].find(b => b.textContent === "Valider puzzle test")!.click());
  expect(host!.textContent).toContain("Puzzle PDF conservé");
  expect(host!.textContent).toContain("Ouverture bloquée");
  expect(host!.textContent).not.toContain("PDF assemblé");
});
it("ne lance pas deux ouvertures pendant l’archivage du projet actif", async () => {
  await mountAndImport("patron.pdf", "application/pdf");
  let finish: (()=>void) | undefined;
  vi.mocked(saveLibrary).mockImplementationOnce(()=>new Promise<void>(resolve=>{finish=resolve}));
  const button=[...host!.querySelectorAll("button")].find(b=>b.textContent==="Valider puzzle test")!;
  const before=vi.mocked(saveLibrary).mock.calls.length;
  await act(async()=>{button.click();button.click()});
  expect(vi.mocked(saveLibrary).mock.calls.length-before).toBe(1);
  expect(host!.textContent).toContain("déjà en cours d’ouverture");
  await act(async()=>finish?.());
  expect(host!.textContent).toContain("PDF assemblé");
});
it("une nouvelle grille ne remplace pas l’ouvrage si son archivage échoue",async()=>{
  await mountAndImport("patron.pdf","application/pdf");
  await act(async()=>[...host!.querySelectorAll("button")].find(b=>b.textContent==="Valider puzzle test")!.click());
  // Une nouvelle grille se crée au BurO, l'entrée du studio.
  await act(async()=>host!.querySelector<HTMLButtonElement>("#pzs-brand")!.click());
  await act(async()=>[...host!.querySelectorAll<HTMLButtonElement>("#pzs-menu button")].find(b=>b.textContent==="BurO")!.click());
  const dock=()=>[...host!.querySelectorAll<HTMLButtonElement>('nav[aria-label="Dock des actions du BurO"] button')];
  await act(async()=>dock().find(b=>b.textContent?.replace(/\d+$/,"")==="Créer")!.click());
  vi.mocked(saveLibrary).mockRejectedValueOnce(new Error("quota"));
  await act(async()=>dock().find(b=>b.textContent==="Grille vierge")!.click());
  expect(host!.textContent).toContain("PDF assemblé");
  expect(host!.textContent).toContain("Ouverture bloquée");
});
