import {act} from "react";
import {createRoot, type Root} from "react-dom/client";
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import ArtWorldStudio from "../components/ArtWorldStudio";
import {ART_KEY,makeArt} from "../lib/artWorldCore";
(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
let root:Root|null=null,host:HTMLDivElement|null=null;
beforeEach(()=>{localStorage.clear();});
afterEach(()=>{act(()=>root?.unmount());root=null;host?.remove();host=null;localStorage.clear();vi.restoreAllMocks();});
function mount(){
 host=document.createElement("div");document.body.appendChild(host);root=createRoot(host);
 act(()=>root!.render(<ArtWorldStudio onBack={vi.fn()} onPattern={vi.fn()} onDesign={vi.fn()}/>));return host;
}
function click(label:string){
 const button=host?.querySelector<HTMLButtonElement>('button[aria-label="'+label+'"]');
 expect(button,label).toBeTruthy();
 act(()=>button!.dispatchEvent(new MouseEvent("click",{bubbles:true})));
}
describe("LE MONDE AIME — interface",()=>{
 it("ouvre la toile, les outils, l'aide à la demande et la palette permanente",()=>{
  const h=mount();
  expect(h.querySelector('[aria-label="Espace LE MONDE AIME"]')).toBeTruthy();
  expect(h.querySelector('[aria-label="Toile libre tactile et souris"]')).toBeTruthy();
  expect(h.querySelector('[aria-label="Palette universelle de matières, couleurs et sons"]')).toBeTruthy();
  expect(h.querySelector('[aria-label="Outils de l\'atelier libre"]')).toBeTruthy();
  click("Outil Aquarelle");
  expect(h.querySelector('[aria-label="Outil Aquarelle"]')?.getAttribute("aria-pressed")).toBe("true");
  expect(h.querySelector('[aria-label="Demander un outil d\'artiste"]')).toBeTruthy();
  click("Activer les sons des couleurs");
  expect(h.querySelector('[aria-label="Désactiver les sons des couleurs"]')).toBeTruthy();
 });
 it("ouvre les créations sauvegardées et affiche le statut privé",()=>{
  const p=makeArt();p.title="Une création de test";
  p.marks=[{id:"point",tool:"pin",color:"#123456",width:12,opacity:1,points:[{x:30,y:30}]}];
  localStorage.setItem(ART_KEY,JSON.stringify(p));
  const h=mount();
  click("Enregistrer en galerie privée");
  expect(h.querySelector('[aria-label="Galerie privée d\'œuvres"]')?.textContent).toContain("Une création de test");
  expect(h.querySelector('[aria-label="Galerie privée d\'œuvres"]')?.textContent).toContain("Privé");
 });
});
