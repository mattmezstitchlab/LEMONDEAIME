import { beforeAll,afterAll,afterEach,describe,expect,it,vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import ManifestLanding from "../components/ManifestLanding";
import { DEFAULT_LAUNCH, canEnter, canPreview, countdown, validLaunch } from "../lib/launchManifest";
let root:Root|null=null,node:HTMLDivElement|null=null;
beforeAll(()=>{(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;});
afterAll(()=>vi.unstubAllGlobals());
afterEach(()=>{act(()=>root?.unmount());root=null;node?.remove();node=null;vi.restoreAllMocks();vi.unstubAllGlobals()});
async function mount(onStudio=vi.fn()){
 vi.stubGlobal("fetch",vi.fn(async()=>({ok:true,json:async()=>({config:null,signupReady:false,turnstileSiteKey:""})})));
 node=document.createElement("div");document.body.appendChild(node);root=createRoot(node);
 await act(async()=>{root?.render(<ManifestLanding onDetails={onStudio} onAime={vi.fn()} onOpenAtelier={vi.fn()} onUniversal={vi.fn()} onAdmin={vi.fn()}/>);});
 return {node,onStudio};
}
describe("POINTZERO .0 — manifeste et livraison progressive",()=>{
 it("garde une date non annoncée comme absente plutôt que de fabriquer un compte à rebours",()=>{
  expect(DEFAULT_LAUNCH.mainDate).toBeNull();
  expect(DEFAULT_LAUNCH.studios.every(s=>s.openAt===null)).toBe(true);
  expect(countdown(null)).toBeNull();
  expect(countdown("2026-12-25T12:00:00Z",Date.parse("2026-12-24T12:00:00Z"))?.days).toBe(1);
  expect(countdown("2025-12-25T12:00:00Z",Date.parse("2026-12-24T12:00:00Z"))?.done).toBe(true);
 });
 it("n'ouvre pas un studio à la seule expiration de son compte à rebours",()=>{
  const expired={...DEFAULT_LAUNCH.studios[0],status:"preparation" as const,openAt:"2025-01-01T09:00:00Z",published:true};
  expect(canEnter(expired)).toBe(false);
  expect(canPreview(expired)).toBe(false);
  expect(canEnter(DEFAULT_LAUNCH.studios.find(s=>s.id==="creatif")!)).toBe(true);
 });
 it("valide les studios, refuse une date ambiguë ou une route détournée",()=>{
  expect(validLaunch(DEFAULT_LAUNCH)).not.toBeNull();
  expect(validLaunch({...DEFAULT_LAUNCH,aimeSignatures:["Architecture Intelligente de la Mémoire Ensemble","Architecture Intelligente des Mondes Émergents"]})).not.toBeNull();
  expect(validLaunch({...DEFAULT_LAUNCH,aimeSignatures:["Promesse non vérifiée"]})).toBeNull();
  expect(validLaunch({...DEFAULT_LAUNCH,mainDate:"demain"})).toBeNull();
  expect(validLaunch({...DEFAULT_LAUNCH,studios:DEFAULT_LAUNCH.studios.map(s=>s.id==="creatif"?{...s,route:"admin-secret"}:s)})).toBeNull();
 });
 it("montre le manifeste et les 13 studios sans simuler une inscription",async()=>{
  const {node}=await mount();
  expect(node.textContent).toContain("Le temps retrouvé.");
  expect(node.querySelector("#manifeste")).toBeTruthy();
  expect(node.querySelector("#studios")).toBeTruthy();
  expect(node.querySelectorAll(".pz-manifest-studio")).toHaveLength(13);
  expect(node.textContent).toContain("Date à confirmer");
  expect(node.querySelector('form[aria-label="S\'inscrire aux informations de lancement"] button[type="submit"]')?.hasAttribute("disabled")).toBe(true);
 });
 it("présente le dossier du studio créatif et le dossier du studio en préparation",async()=>{
  const onStudio=vi.fn(),{node}=await mount(onStudio);
  const creative=node.querySelector('button[aria-label="Voir Studio Créatif"]');
  expect(creative).toBeTruthy();
  await act(async()=>{creative!.dispatchEvent(new MouseEvent("click",{bubbles:true}))});
  expect(onStudio).toHaveBeenCalledWith("creatif");
  const identity=node.querySelector('button[aria-label="Voir Studio Identité"]');
  await act(async()=>{identity!.dispatchEvent(new MouseEvent("click",{bubbles:true}))});
  expect(onStudio).toHaveBeenCalledWith("identite");
  expect(onStudio).toHaveBeenCalledTimes(2);
  expect(node.textContent).toContain("Découvrir le Studio");
 });
});
