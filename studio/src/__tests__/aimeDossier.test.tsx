import type React from "react";
import {afterEach,beforeAll,describe,expect,it,vi} from "vitest";
import {act} from "react";
import {createRoot,type Root} from "react-dom/client";
import AimeDossier from "../components/AimeDossier";
import AimeEcosystem from "../components/AimeEcosystem";
import {calculateHypothesis,FINANCE_EXAMPLE,HISTORY,OBSERVED,REFERENCE_DOCS,validObserved} from "../lib/aimeReference";
import {entryStudio,publicPathFor} from "../lib/entryNavigation";

let mount:HTMLDivElement|null=null,root:Root|null=null;
beforeAll(()=>{(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;});
afterEach(()=>{act(()=>root?.unmount());root=null;mount?.remove();mount=null;window.history.replaceState(null,"","/");vi.unstubAllGlobals()});
async function render(element:React.ReactElement){
 mount=document.createElement("div");document.body.appendChild(mount);root=createRoot(mount);
 await act(async()=>root!.render(element));
 return mount;
}
describe("AIME — Dossier stratégique de référence",()=>{
 it("garde le lien permanent et réversible AIME → dossier",async()=>{
  vi.stubGlobal("fetch",vi.fn(async()=>({ok:true,json:async()=>({config:null})})));
  const nav=vi.fn(),node=await render(<AimeEcosystem page="aime-home" onNavigate={nav} onOpenStudio={vi.fn()}/>);
  const links=node.querySelectorAll('a[href="/dossier"]');
  expect(links.length).toBeGreaterThanOrEqual(2);
  expect(node.textContent).toContain("Dossier de référence");
  await act(async()=>links[0].dispatchEvent(new MouseEvent("click",{bubbles:true})));
  expect(nav).toHaveBeenCalledWith("/dossier");
  expect(entryStudio("","","/dossier")).toBe("reference-dossier");
  expect(publicPathFor("reference-dossier")).toBe("/dossier");
  expect(entryStudio("?page=manifest","","/")).toBe("manifest");
  expect(entryStudio("?studio=design","","/atelier")).toBe("design");
 });
 it("affiche 12 sections, l'introduction, la timeline sourcée et des documents explicitement privés",async()=>{
  const node=await render(<AimeDossier onNavigate={vi.fn()}/>);
  expect(node.querySelectorAll(".adr-sidebar nav a")).toHaveLength(12);
  expect(node.querySelector("#histoire")).toBeTruthy();
  expect(node.querySelector("#architecture")).toBeTruthy();
  expect(node.querySelector("#marches")).toBeTruthy();
  expect(node.querySelector("#modele")).toBeTruthy();
  expect(node.querySelector("#gouvernance")).toBeTruthy();
  expect(node.querySelector("#documents")).toBeTruthy();
  expect(HISTORY.length).toBeGreaterThanOrEqual(8);
  expect(REFERENCE_DOCS.some(x=>x.status==="Privé — non accessible")).toBe(true);
  expect(node.textContent).toContain("Données observées".toUpperCase());
  expect(node.textContent).toContain("aucun accès privé fictif".replace("aucun","Aucun"));
 });
 it("les données observées possèdent des séries, des champs et des sources",()=>{
  expect(OBSERVED).toHaveLength(3);
  expect(OBSERVED.every(validObserved)).toBe(true);
  expect(OBSERVED.find(s=>s.id==="frAi")?.values).toEqual([6,10,18]);
  expect(OBSERVED.find(s=>s.id==="euCloud")?.values).toEqual([17.8,45.3,52.7]);
  expect(OBSERVED.every(s=>s.method.length>15&&s.sourceId.length>1)).toBe(true);
 });
 it("distingue hypothèses financières et résultats réels, et recalcule les scénarios",()=>{
  const base=calculateHypothesis(FINANCE_EXAMPLE);
  expect(base).toHaveLength(3);
  expect(base.every(x=>Number.isFinite(x.revenue)&&Number.isFinite(x.cost))).toBe(true);
  const zero=calculateHypothesis({...FINANCE_EXAMPLE,clients:0,fixedMonthlyCost:0});
  expect(zero.every(x=>x.revenue===0&&x.cost===0)).toBe(true);
  const expensive=calculateHypothesis({...FINANCE_EXAMPLE,monthlyFee:35});
  expect(expensive[0].revenue).toBeGreaterThan(base[0].revenue);
 });
 it("permet l'exploration d'une relation causale sans promesse de preuve",async()=>{
  const node=await render(<AimeDossier onNavigate={vi.fn()}/>);
  const steps=node.querySelectorAll(".adr-causal-flow button");
  expect(steps).toHaveLength(6);
  await act(async()=>steps[2].dispatchEvent(new MouseEvent("click",{bubbles:true})));
  expect(steps[2].getAttribute("aria-pressed")).toBe("true");
  expect(node.textContent).toContain("Relation non étayée");
 });
});
