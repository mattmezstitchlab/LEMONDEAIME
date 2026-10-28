import { afterEach,beforeAll,describe,expect,it,vi } from "vitest";
import { act } from "react";
import { createRoot,type Root } from "react-dom/client";
import AimeEcosystem from "../components/AimeEcosystem";
import {AIME_SIGNATURES,STUDIO_STORIES,UNIVERSES,MOTORS} from "../lib/aimeEditorial";
import {entryStudio,publicPathFor} from "../lib/entryNavigation";
let node:HTMLDivElement|null=null,root:Root|null=null;
beforeAll(()=>{(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;});
afterEach(()=>{act(()=>root?.unmount());root=null;node?.remove();node=null;vi.unstubAllGlobals();window.history.replaceState(null,"","/");});
async function open(path:string,page:"aime-home"|"studio-detail"|"universe-index"|"universe-detail"|"vision",onNavigate=vi.fn()){
 window.history.replaceState(null,"",path);
 vi.stubGlobal("fetch",vi.fn(async()=>({ok:true,json:async()=>({config:null})})));
 node=document.createElement("div");document.body.appendChild(node);root=createRoot(node);
 await act(async()=>root!.render(<AimeEcosystem page={page} onNavigate={onNavigate} onOpenStudio={vi.fn()}/>));
 return {node,onNavigate};
}
describe("AIME — maison mère et dossiers reliés",()=>{
 it("préserve les pages POINTZERO et les anciens liens de l'association",()=>{
  expect(entryStudio("","","/")).toBe("stitch-home");
  expect(entryStudio("","","/aime")).toBe("aime-home");
  expect(entryStudio("","","/pointzero")).toBe("manifest");
  expect(entryStudio("?studio=design","","/atelier")).toBe("design");
  expect(entryStudio("?studio=embroidery","","/atelier")).toBe("embroidery");
  expect(entryStudio("?site=le-monde-aime","","/")).toBe("aime-landing");
  expect(entryStudio("","","/le-monde-aime")).toBe("aime-landing");
  expect(publicPathFor("design")).toBe("/atelier?studio=design");
 });
 it("affiche AIME en page mère et invite à entrer dans les Univers",async()=>{
  const onNavigate=vi.fn(),{node}=await open("/","aime-home",onNavigate);
  expect(node.textContent).toContain("AIME");
  expect(node.textContent).toContain("MÉTAMORPHOSE ULTIME");
  expect(AIME_SIGNATURES).toHaveLength(4);
  const entry=node.querySelector('a[href="/univers"]');
  expect(entry).toBeTruthy();
  await act(async()=>entry!.dispatchEvent(new MouseEvent("click",{bubbles:true})));
  expect(onNavigate).toHaveBeenCalledWith("/univers");
 });
 it("compte les 9 Univers sans les confondre avec les Studios",async()=>{
  const {node}=await open("/univers","universe-index");
  expect(UNIVERSES).toHaveLength(9);
  expect(node.querySelectorAll(".ae-card")).toHaveLength(9);
  expect(node.querySelector('a[href="/le-monde-aime"]')).toBeTruthy();
 });
 it("offre une fiche complète même quand le Studio n'est pas disponible",async()=>{
  const {node}=await open("/studios/identite","studio-detail");
  expect(node.textContent).toContain("Studio Identité");
  for(const title of ["L'intention","Le problème","Le mécanisme","L'expérience","Les preuves d'avancement","La vision future"]){
   expect(node.textContent).toContain(title);
  }
  expect(node.textContent).toContain("Concept à découvrir");
  expect(STUDIO_STORIES).toHaveLength(13);
 });
 it("distingue les moteurs de la chronologie publique et refuse les fiches inconnues",async()=>{
  let r=await open("/vision","vision");
  expect(r.node.textContent).toContain("Les moteurs transversaux");
  expect(MOTORS).toHaveLength(4);
  act(()=>root?.unmount());root=null;r.node.remove();node=null;
  r=await open("/studios/inexistant","studio-detail");
  expect(r.node.textContent).toContain("Cette intention n'est pas documentée");
 });
});