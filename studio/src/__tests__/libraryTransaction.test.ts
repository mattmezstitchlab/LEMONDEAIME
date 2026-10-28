import {afterEach,expect,it,vi} from "vitest";
import {listProjects} from "../lib/library";
afterEach(()=>vi.unstubAllGlobals());
it("refuse une transaction interrompue au lieu de laisser la sauvegarde en attente",async()=>{
 const close=vi.fn();
 const transaction:{error:Error|null;onabort?:()=>void;objectStore:()=>unknown}={error:null,objectStore:()=>({getAll:()=>({})})};
 vi.stubGlobal("indexedDB",{open:()=>{
   const request:{result:unknown;onsuccess?:()=>void}={result:{close,transaction:()=>{queueMicrotask(()=>transaction.onabort?.());return transaction}}};
   queueMicrotask(()=>request.onsuccess?.());return request;
 }});
 await expect(listProjects()).rejects.toThrow("interrompue");
 expect(close).toHaveBeenCalled();
});
