import {act} from "react";
import {createRoot,type Root} from "react-dom/client";
import {afterEach,describe,expect,it,vi} from "vitest";
import AimeUnifiedHome from "../components/AimeUnifiedHome";
import AimeEcosystem from "../components/AimeEcosystem";
import UniversalDossierStudio from "../components/UniversalDossierStudio";
import {entryStudio} from "../lib/entryNavigation";

let root:Root|null=null,host:HTMLDivElement|null=null;
afterEach(async()=>{
 if(root)await act(async()=>root!.unmount());
 root=null;host?.remove();host=null;
 window.history.replaceState(null,"","/");
 localStorage.clear();vi.restoreAllMocks();
});
async function mount(node:React.ReactNode){
 (globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
 host=document.createElement("div");document.body.append(host);root=createRoot(host);
 await act(async()=>root!.render(node));return host;
}
describe("AIME — une landing MÉTAMORPHOSE, sans migration",()=>{
 it("présente d'abord MÉTAMORPHOSE et garde la preuve réelle derrière une activation explicite",async()=>{
  const navigate=vi.fn();
  const view=await mount(<AimeUnifiedHome onNavigate={navigate}/>);
  expect(view.querySelectorAll("h1")).toHaveLength(1);
  expect(view.textContent).toContain("MÉTAMORPHOSE ULTIME");
  expect(view.textContent).toContain("Le temps retrouvé");
  expect(view.textContent).toContain("Dossier de référence");
  expect(view.querySelector('iframe')).toBeNull();
  const button=[...view.querySelectorAll("button")].find(v=>v.textContent?.includes("Afficher l'interface réelle"))!;
  await act(async()=>button.click());
  const frame=view.querySelector("iframe")!;
  expect(frame.getAttribute("src")).toBe("/atelier?studio=metamorphose");
  expect(frame.getAttribute("title")).toContain("MÉTAMORPHOSE");
  const design=[...view.querySelectorAll("button")].find(v=>v.textContent==="Design")!;
  await act(async()=>design.click());
  expect(view.querySelector("iframe")).toBeNull();
  expect(view.textContent).toContain("Créations vectorielles et composition");
 });
 it("transmet l'intention sans sauvegarder ni créer de dossier automatiquement",async()=>{
  const navigate=vi.fn();
  const write=vi.spyOn(Storage.prototype,"setItem");
  const view=await mount(<AimeUnifiedHome onNavigate={navigate}/>);
  const textarea=view.querySelector<HTMLTextAreaElement>("#au-intent-input")!;
  const payload="Je veux concevoir une affiche accessible à partir de mes fragments";
  await act(async()=>{
   const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value")!.set!;
   setter.call(textarea,payload);
   textarea.dispatchEvent(new Event("input",{bubbles:true}));
   textarea.dispatchEvent(new Event("change",{bubbles:true}));
  });
  const form=view.querySelector("form.au-intent-form")!;
  await act(async()=>form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true})));
  expect(navigate).toHaveBeenCalledWith("/espace",payload);
  expect(write).not.toHaveBeenCalled();
  expect(entryStudio("?intention="+encodeURIComponent(payload),"","/espace")).toBe("universal-dossier");
 });
 it("préfournit seulement le champ de la page Dossier et préserve son étape de confirmation",async()=>{
  const text="Créer un bouquet floral brodable à partir de mes fragments";
  window.history.replaceState({aimeIntention:text},"","/espace");
  expect(window.location.search).toBe("");
  const view=await mount(<UniversalDossierStudio onBack={vi.fn()} onOpenAcademy={vi.fn()}/>);
  expect(view.querySelector<HTMLTextAreaElement>("#ud-intent")?.value).toBe(text);
  expect(view.textContent).toContain("Comprendre mon projet");
  expect(view.textContent).not.toContain("Dossier créé localement.");
 });
 it("montre un seul accueil tout en conservant les anciennes routes documentaires",async()=>{
  const navigate=vi.fn();
  const view=await mount(<AimeEcosystem page="aime-home" onNavigate={navigate} onOpenStudio={vi.fn()}/>);
  expect(view.querySelectorAll("h1")).toHaveLength(1);
  expect(view.textContent).toContain("La preuve");
  expect(view.querySelector('a[href="/pointzero"]')).toBeTruthy();
  expect(view.querySelector('a[href="/le-monde-aime"]')).toBeTruthy();
  expect(view.querySelector('a[href="/vision"]')).toBeTruthy();
  expect(view.querySelector('a[href="/dossier"]')).toBeTruthy();
  expect(view.querySelector('a[href="/univers"]')).toBeTruthy();
  expect(entryStudio("","","/pointzero")).toBe("manifest");
  expect(entryStudio("","","/le-monde-aime")).toBe("aime-landing");
  expect(entryStudio("","","/dossier")).toBe("reference-dossier");
  expect(entryStudio("?studio=metamorphose","","/atelier")).toBe("metamorphose");
 });
});
