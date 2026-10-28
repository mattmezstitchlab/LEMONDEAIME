/** Guard existing bytes before JSON writes. No deletion, migration, backup or repair on read. */
export type StorageStatus='absent'|'valid'|'corrupt'|'incompatible'|'invalid'|'unavailable';
export interface StorageInspection {key:string;status:StorageStatus;raw:string|null}
export const STORAGE_BLOCKED='aime:storage-blocked';
export type StoredValidator=(value:unknown)=>unknown;
export function inspectStorage(key:string,validate:StoredValidator):StorageInspection {
 let raw:string|null;
 try{raw=localStorage.getItem(key);}catch{return {key,status:'unavailable',raw:null};}
 if(raw===null)return {key,status:'absent',raw};
 let value:unknown;try{value=JSON.parse(raw);}catch{return {key,status:'corrupt',raw};}
 if(value&&typeof value==='object'&&!Array.isArray(value)&&'version' in value&&(value as {version:unknown}).version!==1)
  return {key,status:'incompatible',raw};
 try{return {key,status:validate(value)?'valid':'invalid',raw};}catch{return {key,status:'invalid',raw};}
}
export function assertStorageWritable(key:string,validate:StoredValidator):void {
 const state=inspectStorage(key,validate);
 if(state.status==='valid'||state.status==='absent')return;
 // Metadata only. Raw personal data is never dispatched or logged.
 if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent(STORAGE_BLOCKED,{detail:{key,status:state.status}}));
 throw Error(`Sauvegarde bloquée (${state.status}) : données existantes conservées. Exportez leur copie brute avant toute récupération.`);
}
export function writeStoredJSON(key:string,serialized:string,validate:StoredValidator):void {
 assertStorageWritable(key,validate);
 let next:unknown;try{next=JSON.parse(serialized);}catch{throw Error('JSON de sauvegarde invalide');}
 if(!validate(next))throw Error('Données de sauvegarde invalides');
 localStorage.setItem(key,serialized);
}
export const everyStored=(validate:StoredValidator)=>(value:unknown)=>Array.isArray(value)&&value.every(x=>!!validate(x));
