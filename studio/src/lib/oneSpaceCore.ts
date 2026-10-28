import {writeStoredJSON} from "./storageSafety";
/** POINTZERO common spaces. All permissions here are local planning data, not authentication. */
import {ACADEMY_KEY,validProject} from "./academyCore";
import {validUniversalMeta,type UniversalMeta} from "./dossierSchema";
import {PROGRAMME_STORAGE,safeProgrammeStore} from "./programmeCore";
import {MUSIC_LABEL_KEY,safeMusicLabel} from "./musicLabelCore";
import {readExternal} from "./externalProjects";
export const WORLD_KEY="pointzero:one-space:v1";
export type SpaceKind="famille"|"mariage"|"association"|"professionnel"|"personnel";
export type TileKind="academy"|"broderie"|"musique"|"programme"|"mini-site"|"documents"|"atelier-art"|"causal"|"photo"|"design"|"external";
export type RelationRole="organisateur"|"famille"|"invité"|"prestataire"|"participant";
export type SignalKind="retard"|"changement"|"information";
export interface SpacePerson {id:string;name:string;role:RelationRole;notificationsOptIn:boolean;subscribedMomentIds:string[]}
export interface SpaceMoment {id:string;title:string;time:string;personIds:string[];followsMomentIds:string[]}
export interface SpaceTile {id:string;kind:TileKind;title:string;visible:boolean;refId:string}
export interface CausalSignal {
 id:string;momentId:string;authorId:string;kind:SignalKind;delayMinutes:number;message:string;
 status:"brouillon"|"validé";created:string;plannedRecipientIds:string[]
}
export interface WorldSpace {
 id:string;kind:SpaceKind;title:string;description:string;created:string;
 people:SpacePerson[];moments:SpaceMoment[];tiles:SpaceTile[];signals:CausalSignal[];
 dossier?:UniversalMeta; // optional extension; legacy stored projects remain valid
}
export interface WorldStore {version:1;spaces:WorldSpace[];selectedSpaceId:string}
export const KINDS:SpaceKind[]=["mariage","famille","association","professionnel","personnel"];
export const ROLES:RelationRole[]=["organisateur","famille","invité","prestataire","participant"];
export const TILES:{id:TileKind;label:string;studio:string;description:string}[]=[
 {id:"academy",label:"Academy",studio:"academy",description:"Site, cours et progression"},
 {id:"broderie",label:"Broderie",studio:"embroidery",description:"Motifs et point de croix"},
 {id:"musique",label:"Music",studio:"music-production",description:"Playlist, événements et artistes"},
 {id:"programme",label:"Programme",studio:"programme",description:"Cours, séances et moments"},
 {id:"mini-site",label:"Mini-site",studio:"mini-site",description:"Informations et invités"},
 {id:"documents",label:"Documents",studio:"admin",description:"Devis, contrats et documents"},
 {id:"atelier-art",label:"Atelier libre",studio:"art-world",description:"Créations et galerie"},
 {id:"causal",label:"Causal",studio:"causal",description:"Impacts et décisions"},
 {id:"photo",label:"Photo",studio:"photo",description:"Retouche et cadrage"},
 {id:"design",label:"Design",studio:"design",description:"Composition visuelle"},
 {id:"external",label:"Projet externe",studio:"external",description:"Lien ou aperçu d’une application déjà construite"}
];
export const ids=()=>globalThis.crypto?.randomUUID?.()??Math.random().toString(36).slice(2);
const now=()=>new Date().toISOString();
const bounded=(x:unknown,max:number)=>typeof x==="string"&&x.length<=max;
const ident=(x:unknown)=>bounded(x,100)&&!!x;
const uniq=(values:string[])=>new Set(values).size===values.length;
const isTime=(s:string)=>s===""||/^([01]\d|2[0-3]):[0-5]\d$/.test(s);
export const emptyWorld=():WorldStore=>({version:1,spaces:[],selectedSpaceId:""});
export function newSpace(kind:SpaceKind,title:string):WorldSpace{
 const base:TileKind[]=kind==="mariage"?["academy","programme","musique","mini-site","causal"]:
  kind==="famille"?["academy","atelier-art","musique","causal"]:
  kind==="association"?["academy","atelier-art","documents","causal"]:["academy","broderie","documents","causal"];
 return {id:ids(),kind,title:title.trim(),description:"",created:now(),people:[],moments:[],signals:[],
  tiles:base.map(k=>({id:ids(),kind:k,title:TILES.find(t=>t.id===k)?.label??k,visible:true,refId:""}))};
}
export function newPerson(name:string,role:RelationRole="participant"):SpacePerson{
 return {id:ids(),name:name.trim(),role,notificationsOptIn:false,subscribedMomentIds:[]};
}
export function newMoment(title:string,time=""):SpaceMoment{
 return {id:ids(),title:title.trim(),time,personIds:[],followsMomentIds:[]};
}
export function newSignal(momentId:string,authorId:string,kind:SignalKind,delayMinutes:number,message:string):CausalSignal{
 return {id:ids(),momentId,authorId,kind,delayMinutes,message:message.trim(),status:"brouillon",created:now(),plannedRecipientIds:[]};
}
export function safeWorld(raw:unknown):WorldStore|null{
 if(!raw||typeof raw!=="object")return null;
 const w=raw as Partial<WorldStore>;
 if(w.version!==1||!Array.isArray(w.spaces)||w.spaces.length>30||!bounded(w.selectedSpaceId,100))return null;
 const spaceIds=new Set<string>();
 for(const s of w.spaces){
  if(!s||!ident(s.id)||spaceIds.has(s.id)||!KINDS.includes(s.kind)||!bounded(s.title,180)||
   !bounded(s.description,1200)||!bounded(s.created,40)||!Array.isArray(s.people)||s.people.length>200||
   !Array.isArray(s.moments)||s.moments.length>200||!Array.isArray(s.tiles)||s.tiles.length>35||
   !Array.isArray(s.signals)||s.signals.length>300||
   (s.dossier!==undefined&&!validUniversalMeta(s.dossier)))return null;
  spaceIds.add(s.id);
  const personIds=new Set<string>(),momentIds=new Set<string>(),tileIds=new Set<string>(),signalIds=new Set<string>();
  for(const p of s.people){
   if(!p||!ident(p.id)||personIds.has(p.id)||!bounded(p.name,100)||!ROLES.includes(p.role)||
    typeof p.notificationsOptIn!=="boolean"||!Array.isArray(p.subscribedMomentIds)||p.subscribedMomentIds.length>200||
    !p.subscribedMomentIds.every(v=>ident(v))||!uniq(p.subscribedMomentIds))return null;
   personIds.add(p.id);
  }
  for(const m of s.moments){
   if(!m||!ident(m.id)||momentIds.has(m.id)||!bounded(m.title,180)||!bounded(m.time,5)||!isTime(m.time)||
    !Array.isArray(m.personIds)||!Array.isArray(m.followsMomentIds)||m.personIds.length>200||m.followsMomentIds.length>200||
    !m.personIds.every(v=>ident(v)&&personIds.has(v))||!m.followsMomentIds.every(v=>ident(v))||
    !uniq(m.personIds)||!uniq(m.followsMomentIds))return null;
   momentIds.add(m.id);
  }
  for(const m of s.moments){if(m.followsMomentIds.some(v=>!momentIds.has(v)||v===m.id))return null;}
  for(const p of s.people){if(p.subscribedMomentIds.some(v=>!momentIds.has(v)))return null;}
  for(const t of s.tiles){
   if(!t||!ident(t.id)||tileIds.has(t.id)||!TILES.some(v=>v.id===t.kind)||
    !bounded(t.title,90)||typeof t.visible!=="boolean"||!bounded(t.refId,120))return null;
   tileIds.add(t.id);
  }
  for(const sig of s.signals){
   if(!sig||!ident(sig.id)||signalIds.has(sig.id)||!momentIds.has(sig.momentId)||
    (sig.authorId!==""&&!personIds.has(sig.authorId))||
    !["retard","changement","information"].includes(sig.kind)||!Number.isInteger(sig.delayMinutes)||sig.delayMinutes<0||sig.delayMinutes>240||
    !bounded(sig.message,500)||!["brouillon","validé"].includes(sig.status)||!bounded(sig.created,40)||
    !Array.isArray(sig.plannedRecipientIds)||!uniq(sig.plannedRecipientIds)||
    sig.plannedRecipientIds.some(v=>!personIds.has(v)))return null;
   signalIds.add(sig.id);
  }
 }
 const selectedId=w.selectedSpaceId??"";
 if(selectedId!==""&&!spaceIds.has(selectedId))return null;
 return w as WorldStore;
}
export function readWorld():WorldStore{
 try{return safeWorld(JSON.parse(localStorage.getItem(WORLD_KEY)??"null"))??emptyWorld();}
 catch{return emptyWorld();}
}
export function writeWorld(w:WorldStore):void{
 if(!safeWorld(w))throw Error("Espace invalide : informations non enregistrées.");
 writeStoredJSON(WORLD_KEY,JSON.stringify(w),safeWorld);
}
export function selectedWorld(w:WorldStore){
 return w.spaces.find(s=>s.id===w.selectedSpaceId)??w.spaces[0]??null;
}
export const setSpace=(store:WorldStore,space:WorldSpace):WorldStore=>
 ({...store,spaces:store.spaces.map(v=>v.id===space.id?space:v)});
/** Follow explicit temporal dependencies; a cycle cannot cause an infinite loop. */
export function downstreamMoments(space:WorldSpace,momentId:string):string[]{
 if(!space.moments.some(m=>m.id===momentId))return [];
 const impacted=new Set<string>([momentId]);const todo=[momentId];
 while(todo.length){
  const prev=todo.shift()!;
  for(const next of space.moments){
   if(next.followsMomentIds.includes(prev)&&!impacted.has(next.id)){
    impacted.add(next.id);todo.push(next.id);
   }
  }
 }
 return [...impacted];
}
export interface Impact{
 moments:SpaceMoment[];direct:SpacePerson[];indirect:SpacePerson[];
 recipients:SpacePerson[];notOptedIn:SpacePerson[];summary:string;
}
/** A possible recipient must be attached to an impacted moment, opt in and subscribe to that moment. */
export function previewImpact(space:WorldSpace,signal:CausalSignal):Impact{
 const impactedIds=downstreamMoments(space,signal.momentId);
 const moments=impactedIds.map(id=>space.moments.find(m=>m.id===id)!).filter(Boolean);
 const root=space.moments.find(m=>m.id===signal.momentId);
 const directIds=new Set(root?.personIds??[]);
 const allIds=new Set(moments.flatMap(m=>m.personIds));
 const direct=space.people.filter(p=>directIds.has(p.id)&&p.id!==signal.authorId);
 const indirect=space.people.filter(p=>allIds.has(p.id)&&!directIds.has(p.id)&&p.id!==signal.authorId);
 const recipients=space.people.filter(p=>p.id!==signal.authorId&&
   moments.some(m=>m.personIds.includes(p.id)&&p.notificationsOptIn&&p.subscribedMomentIds.includes(m.id)));
 const recipientIds=new Set(recipients.map(p=>p.id));
 const notOptedIn=space.people.filter(p=>allIds.has(p.id)&&p.id!==signal.authorId&&!recipientIds.has(p.id));
 return {moments,direct,indirect,recipients,notOptedIn,
  summary:impactedIds.length+" moment(s) concerné(s) · "+recipients.length+" destinataire(s) consentant(s) potentiel(s)"};
}
export function validateSignal(space:WorldSpace,signalId:string):WorldSpace{
 const signal=space.signals.find(s=>s.id===signalId);
 if(!signal||signal.status!=="brouillon")return space;
 const impacted=previewImpact(space,signal);
 return {...space,signals:space.signals.map(s=>s.id===signalId?
   {...s,status:"validé",plannedRecipientIds:impacted.recipients.map(p=>p.id)}:s)};
}
export type TrainingStep={id:string;title:string;description:string;passed:boolean};
export function journeySteps(space:WorldSpace|null):TrainingStep[]{
 return [
  {id:"space",title:"Choisir son espace",description:"Créer une page personnelle, familiale, mariage ou associative.",passed:!!space},
  {id:"modules",title:"Composer sa page",description:"Afficher au moins trois studios utiles au projet.",passed:!!space&&space.tiles.filter(t=>t.visible).length>=3},
  {id:"people",title:"Relier les personnes",description:"Ajouter deux personnes et définir leurs rôles.",passed:!!space&&space.people.length>=2},
  {id:"moments",title:"Préparer les moments",description:"Prévoir deux moments de l'événement ou du projet.",passed:!!space&&space.moments.length>=2},
  {id:"choice",title:"Consentement",description:"Enregistrer au moins un accord explicite de réception pour un moment.",passed:!!space&&space.people.some(p=>p.notificationsOptIn&&p.subscribedMomentIds.length>0)},
  {id:"branch",title:"Relier une création",description:"Brancher volontairement un projet Academy, Programme ou Music.",passed:!!space&&space.tiles.some(t=>t.refId.length>0)},
  {id:"causal",title:"Comprendre les impacts",description:"Créer un signal, vérifier l'onde et valider son plan sans envoi réel.",passed:!!space&&space.signals.some(s=>s.status==="validé")}
 ];
}
/** Read original records by canonical IDs: never copy or silently switch resources. */
export function sourcesForTile(kind:TileKind):{label:string;id:string}[]{
 try{
  if(kind==="external")return readExternal().resources.map(v=>({label:v.title,id:v.id}));
  if(kind==="academy"){
   const p=validProject(JSON.parse(localStorage.getItem(ACADEMY_KEY)??"null"));
   return p?[{label:p.siteTitle,id:p.id}]:[];
  }
  if(kind==="programme"){
   const p=safeProgrammeStore(JSON.parse(localStorage.getItem(PROGRAMME_STORAGE)??"null"));
   return p?.programmes.map(v=>({id:v.id,label:v.title}))??[];
  }
  if(kind==="musique"){
   const music=safeMusicLabel(JSON.parse(localStorage.getItem(MUSIC_LABEL_KEY)??"null"));
   return music?.events.map(v=>({id:v.id,label:v.title}))??[];
  }
 }catch{/* Invalid cross-studio data is not imported. */}
 return [];
}
export function linkedModuleInfo(tile:SpaceTile):{label:string;id:string}|null{
 if(!tile.refId)return null;
 return sourcesForTile(tile.kind).find(v=>v.id===tile.refId)??null;
}
