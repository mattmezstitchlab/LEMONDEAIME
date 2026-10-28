import {writeStoredJSON} from "./storageSafety";
import { fromObject, toObject, type Pattern } from "./pattern";

const KEY="pointzero:components:v1";
const MAX_RECORDS=20;
export interface LibrarySubject {
  id:string;
  name:string;
  updated:number;
  personalOnly:boolean;
  author:string;
  sprite:string;
}
function validLibrarySubject(v:unknown):v is LibrarySubject {
      if(!v||typeof v!=="object")return false;
      const x=v as Record<string,unknown>;
      return typeof x.id==="string"&&x.id.length<120&&typeof x.name==="string"&&x.name.length<120&&
        typeof x.updated==="number"&&Number.isFinite(x.updated)&&typeof x.personalOnly==="boolean"&&
        typeof x.author==="string"&&x.author.length<150&&typeof x.sprite==="string"&&x.sprite.length<2_000_000;

}
const validLibrary=(v:unknown)=>Array.isArray(v)&&v.length<=MAX_RECORDS&&v.every(validLibrarySubject);
export function loadSubjectLibrary():LibrarySubject[] {
  try{
    const arr=JSON.parse(localStorage.getItem(KEY)??"[]") as unknown;
    if(!Array.isArray(arr))return [];
    return arr.filter(validLibrarySubject).slice(0,MAX_RECORDS);

  }catch{return [];}
}
export function storeSubject(pattern:Pattern):LibrarySubject[] {
  if(pattern.w*pattern.h>250_000)throw new Error("Composant trop grand pour la bibliothèque locale.");
  const snapshot=JSON.stringify(toObject({...pattern,subjectScene:undefined,composition:undefined,layers:[]}));
  if(snapshot.length>2_000_000)throw new Error("Composant trop volumineux pour la bibliothèque locale.");
  const rec:LibrarySubject={
    id:pattern.id??String(Date.now()),name:pattern.name.slice(0,119),updated:Date.now(),
    personalOnly:pattern.provenance?.personalOnly!==false,
    author:pattern.provenance?.author??"",sprite:snapshot,
  };
  const next=[rec,...loadSubjectLibrary().filter(x=>x.id!==rec.id)].slice(0,MAX_RECORDS);
  try{writeStoredJSON(KEY,JSON.stringify(next),validLibrary);return next;}
  catch{throw new Error("Stockage local indisponible ou plein. Exportez le JSON pour conserver ce sujet.");}
}
export function openLibrarySubject(item:LibrarySubject):Pattern {
  const p=fromObject(JSON.parse(item.sprite));
  if(!p||p.w*p.h>250_000)throw new Error("Composant enregistré invalide.");
  return p;
}
export function deleteLibrarySubject(id:string):LibrarySubject[] {
  const next=loadSubjectLibrary().filter(x=>x.id!==id);
  try{writeStoredJSON(KEY,JSON.stringify(next),validLibrary);}
  catch{throw new Error("Bibliothèque locale indisponible.");}
  return next;
}
