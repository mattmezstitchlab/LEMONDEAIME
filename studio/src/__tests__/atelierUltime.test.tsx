import {act} from "react";
import {createRoot,type Root} from "react-dom/client";
import {afterEach,describe,expect,it,vi} from "vitest";
import MetamorphoseStudio from "../components/MetamorphoseStudio";
import {createDesign} from "../lib/designStudio";
import {referenceCurrentDesign} from "../lib/fragmentResources";
import {demoFragments,readFragments} from "../lib/fragmentGrid";
import {beginComposition,commitComposition,confirmFragmentPreview,INTEGRATION_POINTS,previewFragmentSpan,redoComposition,selectFragment,undoComposition} from "../lib/atelierCompositionContract";

let root:Root|null=null,host:HTMLDivElement|null=null;
afterEach(async()=>{if(root)await act(async()=>root?.unmount());root=null;host?.remove();host=null;localStorage.clear();vi.restoreAllMocks()});
async function render(){
 (globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
 host=document.createElement("div");document.body.append(host);root=createRoot(host);
 await act(async()=>root!.render(<MetamorphoseStudio onBack={vi.fn()} onCircle={vi.fn()} onGame={vi.fn()}/>));
 return host;
}
function button(label:string){
 const b=[...(host?.querySelectorAll("button")??[])].find(x=>x.textContent?.trim()===label);
 if(!b)throw Error("Bouton introuvable : "+label);return b;
}
describe("MÉTAMORPHOSE ULTIME — atelier et moteur existants",()=>{
 it("propose, confirme, annule et rétablit sans modifier l'identité ni la source",()=>{
  const c=demoFragments(),id=c.fragments[0].id;
  const session=beginComposition(c);
  const preview=previewFragmentSpan(c,id,3);
  expect(c.fragments[0].span).toBe(2);
  expect(preview.after.fragments[0].span).toBe(3);
  expect(preview.effects).toHaveLength(3);
  const confirmed=confirmFragmentPreview(session,preview);
  expect(confirmed.present.fragments[0].span).toBe(3);
  expect(undoComposition(confirmed).present.fragments[0].span).toBe(2);
  expect(redoComposition(undoComposition(confirmed)).present.fragments[0].span).toBe(3);
  expect(selectFragment(c.fragments[0]).objectId).toBe(id);
  expect(commitComposition(session,c)).toBe(session);
  expect(()=>confirmFragmentPreview(commitComposition(session,preview.after),preview)).toThrow();
  expect(()=>previewFragmentSpan(c,"absent",1)).toThrow();
  expect(()=>previewFragmentSpan(c,id,5 as never)).toThrow();
 });
 it("refuse toute modification d'un fragment verrouillé et conserve une référence Design",()=>{
  const d=createDesign("affiche");d.name="Design source";
  localStorage.setItem("pointzero:design-current:v1",JSON.stringify(d));
  const ref=referenceCurrentDesign();
  const coll=demoFragments();coll.fragments=[ref];
  const p=previewFragmentSpan(coll,ref.id,3);
  expect(p.after.fragments[0].source?.resourceId).toBe(d.id);
  expect(p.after.fragments[0].source?.allowExport).toBe(false);
  expect(JSON.stringify(p.after)).not.toContain("data:image/svg");
  const locked={...coll,fragments:[{...ref,locked:true}]};
  expect(()=>previewFragmentSpan(locked,ref.id,3)).toThrow("verrouillé");
  expect(INTEGRATION_POINTS.find(x=>x.id==="pattern.zoom-code")?.state).toBe("experimental");
 });
 it("propose une vraie liaison Design puis la prévisualisation, la sauvegarde et le retour",async()=>{
  const d=createDesign("affiche");d.name="Source de départ";
  localStorage.setItem("pointzero:design-current:v1",JSON.stringify(d));
  await render();
  expect(host?.querySelector('nav[aria-label="Objets de la composition"]')).toBeTruthy();
  await act(async()=>button("Relier ma création Design").click());
  const key="pointzero:universal-fragments:v1";
  let saved=readFragments(JSON.parse(localStorage.getItem(key)!))!;
  const ref=saved.fragments.find(f=>f.source?.resourceId===d.id)!;
  expect(ref).toBeTruthy();
  expect(ref.source?.allowExport).toBe(false);
  await act(async()=>host!.querySelector<HTMLButtonElement>(`[data-fragment-id="${ref.id}"]`)!.click());
  await act(async()=>button("Comprendre").click());
  expect(host?.textContent).toContain(d.id);
  await act(async()=>button("Code").click());
  expect(host?.textContent).toContain("schemaVersion");
  await act(async()=>button("Propriétés").click());
  const bytes=localStorage.getItem(key);
  await act(async()=>button("Prévisualiser +1 colonne").click());
  expect(host?.textContent).toContain("Confirmer la modification");
  expect(localStorage.getItem(key)).toBe(bytes);
  await act(async()=>button("Confirmer la modification").click());
  saved=readFragments(JSON.parse(localStorage.getItem(key)!))!;
  expect(saved.fragments.find(f=>f.id===ref.id)?.span).toBe(3);
  await act(async()=>button("Annuler").click());
  expect(readFragments(JSON.parse(localStorage.getItem(key)!))!.fragments.find(f=>f.id===ref.id)?.span).toBe(2);
  await act(async()=>button("Rétablir").click());
  expect(readFragments(JSON.parse(localStorage.getItem(key)!))!.fragments.find(f=>f.id===ref.id)?.span).toBe(3);
  await act(async()=>button("Exporter HTML responsive").click());
  expect(host?.textContent).toContain("Export refusé");
  await act(async()=>root!.unmount());root=null;host?.remove();host=null;
  await render();
  const reopened=readFragments(JSON.parse(localStorage.getItem(key)!))!;
  expect(reopened.fragments.find(f=>f.id===ref.id)?.span).toBe(3);
  expect(reopened.fragments.find(f=>f.id===ref.id)?.source?.resourceId).toBe(d.id);
 });
 it("n'efface pas des fragments locaux corrompus",async()=>{
  const key="pointzero:universal-fragments:v1",raw="{invalid-original";
  localStorage.setItem(key,raw);
  await render();
  expect(localStorage.getItem(key)).toBe(raw);
  expect(host?.textContent).toContain("Sauvegarde bloquée");
 });
});
