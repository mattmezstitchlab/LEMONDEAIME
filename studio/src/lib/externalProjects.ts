import {writeStoredJSON} from "./storageSafety";
/**
 * POINTZERO external project registry (local-first). This is a URL reference,
 * NOT API access, single-sign-on, synchronization or proof of iframe support.
 */
export const EXTERNAL_KEY="pointzero:external-projects:v1";
export interface ExternalResource{
 id:string;title:string;url:string;description:string;created:string;
}
export interface ExternalRegistry{version:1;resources:ExternalResource[]}
export const RIPPLECIRCLE:ExternalResource={
 id:"ripplecircle",
 title:"RIPPLECIRCLE · Cadran vivant",
 url:"https://ripplecircle.vercel.app/",
 description:"Cadran interactif pour les moments, les personnes et la musique d'un événement.",
 created:"2026-10-15"
};
const now=()=>new Date().toISOString().slice(0,10);
const newId=()=>globalThis.crypto?.randomUUID?.()??Math.random().toString(36).slice(2);
const short=(x:unknown,max:number)=>typeof x==="string"&&x.length>0&&x.length<=max;
export function safeExternalURL(raw:string):string{
 if(typeof raw!=="string"||raw.length>1000)return "";
 try{
  const u=new URL(raw.trim());
  if(u.protocol!=="https:"||!u.hostname.includes(".")||u.username||u.password||u.port||u.hash)return "";
  const host=u.hostname.toLowerCase();
  if(/^(localhost|.+\.localhost|.+\.local|.+\.internal)$/.test(host))return "";
  if(/^(\d{1,3}\.){3}\d{1,3}$/.test(host)||host.startsWith("[")||/^\d+$/.test(host))return "";
  // A sandbox with allow-scripts + allow-same-origin must not embed POINTZERO itself.
  if(typeof location!=="undefined"&&u.origin===location.origin)return "";
  return u.href;
 }catch{return "";}
}
export function validExternal(value:unknown):ExternalResource|null{
 if(!value||typeof value!=="object")return null;
 const v=value as Partial<ExternalResource>;
 if(!short(v.id,90)||!short(v.title,130)||typeof v.description!=="string"||v.description.length>500||
  !short(v.created,40)||typeof v.url!=="string"||safeExternalURL(v.url)!==v.url)return null;
 return v as ExternalResource;
}
export function validRegistry(value:unknown):ExternalRegistry|null{
 if(!value||typeof value!=="object")return null;
 const r=value as Partial<ExternalRegistry>;
 if(r.version!==1||!Array.isArray(r.resources)||r.resources.length>35)return null;
 const ids=new Set<string>(),urls=new Set<string>();
 for(const v of r.resources){
  if(!validExternal(v)||ids.has(v.id)||urls.has(v.url))return null;
  ids.add(v.id);urls.add(v.url);
 }
 return r as ExternalRegistry;
}
export function readExternal():ExternalRegistry{
 try{
  const r=validRegistry(JSON.parse(localStorage.getItem(EXTERNAL_KEY)??"null"));
  // Non-destructive builtin: keep the project available, even in old workspaces.
  if(r){
   if(r.resources.some(x=>x.id===RIPPLECIRCLE.id||x.url===RIPPLECIRCLE.url))return r;
   return {...r,resources:[RIPPLECIRCLE,...r.resources]};
  }
 }catch{/* Default registry still available. */}
 return {version:1,resources:[RIPPLECIRCLE]};
}
export function writeExternal(reg:ExternalRegistry){
 if(!validRegistry(reg))throw Error("Le registre contient une URL ou une ressource invalide.");
 writeStoredJSON(EXTERNAL_KEY,JSON.stringify(reg),validRegistry);
 window.dispatchEvent(new Event("pointzero:external-changed"));
}
export function addExternal(reg:ExternalRegistry,title:string,url:string):ExternalRegistry{
 const safe=safeExternalURL(url);
 const label=title.trim().slice(0,130);
 if(!safe||!label)throw Error("Un nom et une URL HTTPS publique sont nécessaires.");
 if(reg.resources.some(v=>v.url===safe))throw Error("Cette adresse est déjà enregistrée.");
 if(reg.resources.length>=35)throw Error("La bibliothèque est limitée à 35 ressources pour le moment.");
 return {...reg,resources:[...reg.resources,{id:newId(),title:label,url:safe,description:"Projet externe ajouté volontairement.",created:now()}]};
}
export function externalById(id:string):ExternalResource|null{
 return readExternal().resources.find(v=>v.id===id)??null;
}
/** Open graph manifest only, not a universal data connector. */
export function externalManifest(resource:ExternalResource){
 return {kind:"pointzero:external-link",version:1,id:resource.id,title:resource.title,url:resource.url,
  modes:["open","embed-on-request"] as const,capabilities:{readData:false,writeData:false,authentication:false}};
}
