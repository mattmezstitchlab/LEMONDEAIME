import {act} from "react";
import {createRoot} from "react-dom/client";
import {afterEach,beforeAll,expect,it,vi} from "vitest";
import AimeEcosystem from "../components/AimeEcosystem";
beforeAll(()=>{(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();localStorage.clear()});
it("présente une seule landing MÉTAMORPHOSE, les vrais Studios à la demande et les archives conservées",async()=>{
 vi.stubGlobal("fetch",vi.fn(async()=>({ok:true,json:async()=>({config:null})})));
 const write=vi.spyOn(Storage.prototype,"setItem"),navigate=vi.fn();
 const node=document.createElement("div");document.body.append(node);const root=createRoot(node);
 try{
  await act(async()=>root.render(<AimeEcosystem page="aime-home" onNavigate={navigate} onOpenStudio={vi.fn()}/>));
  expect(node.querySelectorAll("h1")).toHaveLength(1);
  expect(node.textContent).toContain("MÉTAMORPHOSE ULTIME");
  expect(node.textContent).toContain("Composer autrement");
  expect(node.textContent).toContain("Dossier de référence");
  expect(node.querySelector("iframe")).toBeNull();
  expect(write).not.toHaveBeenCalled();
  const direct=node.querySelector('a[href="/atelier?studio=metamorphose"]')!;
  await act(async()=>direct.dispatchEvent(new MouseEvent("click",{bubbles:true})));
  expect(navigate).toHaveBeenCalledWith("/atelier?studio=metamorphose");
  const btn=[...node.querySelectorAll("button")].find(x=>x.textContent?.includes("Afficher l'interface réelle"))!;
  await act(async()=>btn.click());
  expect(node.querySelector('iframe[src="/atelier?studio=metamorphose"]')).toBeTruthy();
  expect(node.querySelector('a[href="/le-monde-aime"]')).toBeTruthy();
  expect(node.querySelector('a[href="/pointzero"]')).toBeTruthy();
 }finally{await act(async()=>root.unmount());node.remove()}
});
