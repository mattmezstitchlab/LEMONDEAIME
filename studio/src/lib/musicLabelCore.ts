import {writeStoredJSON} from "./storageSafety";
/** One local registry for artists, recordings, invited music choices and events.
 * No fake streaming, SACEM declaration, royalty distribution or publishing backend. */
export const MUSIC_LABEL_KEY="pointzero:music-label:v1";
export type MusicMoment="cérémonie"|"cocktail"|"dîner"|"ouverture"|"soirée"|"autre";
export type MusicRight="own"|"licensed"|"unknown";
export interface MusicArtist {id:string;name:string;ipi:string;contact:string}
export interface MusicTrack {
 id:string;title:string;artistId:string;artistName:string;authors:string;composers:string;
 isrc:string;iswc:string;ipi:string;genre:string;bpm:number;duration:number;
 rights:MusicRight;releaseDate:string;label:string;distributor:string;notes:string;
}
export interface MusicEvent {
 id:string;title:string;date:string;projectId:string;programmeSessionId:string;venue:string;
 organizer:string;created:string;
}
export interface MusicRequest {
 id:string;eventId:string;trackId:string;title:string;artistName:string;
 guestAlias:string;moment:MusicMoment;status:"proposed"|"approved"|"rejected";
 created:string;
}
export interface MusicLabelStore {version:1;artists:MusicArtist[];tracks:MusicTrack[];events:MusicEvent[];requests:MusicRequest[]}
const uid=()=>globalThis.crypto?.randomUUID?.()??Math.random().toString(36).slice(2);
export const MUSIC_MOMENTS:MusicMoment[]=["cérémonie","cocktail","dîner","ouverture","soirée","autre"];
const clean=(s:string)=>s.normalize("NFKC").trim();
const norm=(s:string)=>clean(s).toLocaleLowerCase("fr-FR").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const validDate=(s:string)=>s===""||(/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+"T12:00:00")));
const str=(v:unknown,n:number)=>typeof v==="string"&&v.length<=n;
const identifier=(v:unknown)=>str(v,100)&&v!=="";
export const makeMusicLabel=():MusicLabelStore=>({version:1,artists:[],tracks:[],events:[],requests:[]});
export const newArtist=(name:string):MusicArtist=>({id:uid(),name:clean(name),ipi:"",contact:""});
export const newTrack=(title:string,artistName:string):MusicTrack=>({
 id:uid(),title:clean(title),artistId:"",artistName:clean(artistName),authors:"",composers:"",
 isrc:"",iswc:"",ipi:"",genre:"",bpm:0,duration:0,rights:"unknown",
 releaseDate:"",label:"",distributor:"",notes:""
});
export const newMusicEvent=(title:string,date="",projectId="",programmeSessionId=""):MusicEvent=>({
 id:uid(),title:clean(title),date,projectId,programmeSessionId,venue:"",organizer:"",created:new Date().toISOString().slice(0,10)
});
export const newMusicRequest=(eventId:string,title:string,artistName:string,guestAlias:string,moment:MusicMoment,trackId=""):MusicRequest=>({
 id:uid(),eventId,title:clean(title),artistName:clean(artistName),guestAlias:clean(guestAlias),moment,trackId,status:"proposed",created:new Date().toISOString().slice(0,10)
});
export function safeMusicLabel(data:unknown):MusicLabelStore|null{
 if(!data||typeof data!=="object")return null;
 const s=data as Partial<MusicLabelStore>;
 if(s.version!==1||!Array.isArray(s.artists)||!Array.isArray(s.tracks)||!Array.isArray(s.events)||!Array.isArray(s.requests)||
 s.artists.length>500||s.tracks.length>4000||s.events.length>1000||s.requests.length>16000)return null;
 const ids=[new Set<string>(),new Set<string>(),new Set<string>(),new Set<string>()];
 for(const a of s.artists){
  if(!a||!identifier(a.id)||ids[0].has(a.id)||!str(a.name,150)||!str(a.ipi,60)||!str(a.contact,250))return null;
  ids[0].add(a.id);
 }
 for(const t of s.tracks){
  if(!t||!identifier(t.id)||ids[1].has(t.id)||!str(t.title,180)||!str(t.artistId,100)||!str(t.artistName,180)||
   !str(t.authors,500)||!str(t.composers,500)||!str(t.isrc,25)||!str(t.iswc,25)||!str(t.ipi,70)||
   !str(t.genre,80)||!str(t.releaseDate,20)||!validDate(t.releaseDate)||!str(t.label,160)||!str(t.distributor,160)||!str(t.notes,1500)||
   typeof t.bpm!=="number"||!Number.isFinite(t.bpm)||t.bpm<0||t.bpm>300||
   typeof t.duration!=="number"||!Number.isFinite(t.duration)||t.duration<0||t.duration>36000||
   !["own","licensed","unknown"].includes(t.rights)|| (t.artistId!==""&&!ids[0].has(t.artistId)))return null;
  ids[1].add(t.id);
 }
 for(const e of s.events){
  if(!e||!identifier(e.id)||ids[2].has(e.id)||!str(e.title,180)||!str(e.projectId,120)||!str(e.programmeSessionId,120)||
   !str(e.venue,250)||!str(e.organizer,250)||!str(e.date,20)||!validDate(e.date)||
   !str(e.created,20)||!validDate(e.created))return null;
  ids[2].add(e.id);
 }
 for(const r of s.requests){
  if(!r||!identifier(r.id)||ids[3].has(r.id)||!ids[2].has(r.eventId)||
   (r.trackId!==""&&!ids[1].has(r.trackId))||!str(r.title,180)||!str(r.artistName,180)||
   !str(r.guestAlias,90)||!MUSIC_MOMENTS.includes(r.moment)||!["proposed","approved","rejected"].includes(r.status)||
   !str(r.created,20)||!validDate(r.created))return null;
  ids[3].add(r.id);
 }
 return s as MusicLabelStore;
}
export const saveLabel=(s:MusicLabelStore)=>writeStoredJSON(MUSIC_LABEL_KEY,JSON.stringify(s),safeMusicLabel);
export function loadLabel():MusicLabelStore{
 try{return safeMusicLabel(JSON.parse(localStorage.getItem(MUSIC_LABEL_KEY)??"null"))??makeMusicLabel();}
 catch{return makeMusicLabel();}
}
export function matchTrack(s:MusicLabelStore,title:string,artist:string):MusicTrack|undefined{
 return s.tracks.find(t=>norm(t.title)===norm(title)&&norm(t.artistName)===norm(artist));
}
export function addRequest(s:MusicLabelStore,request:MusicRequest):{store:MusicLabelStore;added:boolean;reason:string}{
 if(!s.events.some(e=>e.id===request.eventId))return {store:s,added:false,reason:"Événement introuvable."};
 if(!request.title||!request.artistName)return {store:s,added:false,reason:"Titre et artiste obligatoires."};
 if(s.requests.some(r=>r.eventId===request.eventId&&r.moment===request.moment&&norm(r.title)===norm(request.title)&&norm(r.artistName)===norm(request.artistName)))
  return {store:s,added:false,reason:"Morceau déjà proposé pour ce moment."};
 if(s.requests.length>=16000)return {store:s,added:false,reason:"Limite des propositions atteinte."};
 const matched=matchTrack(s,request.title,request.artistName);
 return {store:{...s,requests:[...s.requests,{...request,trackId:matched?.id??request.trackId}]},added:true,reason:"Proposition enregistrée localement."};
}
export function eventPlaylist(s:MusicLabelStore,eventId:string){
 return s.requests.filter(r=>r.eventId===eventId&&r.status==="approved").map(r=>({
  ...r,track:s.tracks.find(t=>t.id===r.trackId)??matchTrack(s,r.title,r.artistName)??null
 }));
}
const csv=(v:string|number)=>'"'+String(v).replace(/"/g,'""')+'"';
export const musicCSV=(s:MusicLabelStore,eventId:string):string=>{
 const e=s.events.find(v=>v.id===eventId);if(!e)throw Error("Événement introuvable");
 const rows=[["Événement","Date","Lieu","Organisateur","Moment","Titre","Artiste","Auteurs","Compositeurs","ISRC","ISWC","IPI","Statut"],...eventPlaylist(s,eventId).map(r=>[
  e.title,e.date,e.venue,e.organizer,r.moment,r.title,r.artistName,
  r.track?.authors??"",r.track?.composers??"",r.track?.isrc??"",r.track?.iswc??"",r.track?.ipi??"","À vérifier avant déclaration"
 ])];
 return "\uFEFF"+rows.map(row=>row.map(csv).join(",")).join("\r\n");
};
export function labelCSV(s:MusicLabelStore){
 const head=["Titre","Artiste","Auteurs","Compositeurs","Genre","ISRC","ISWC","IPI","Label","Distributeur","Date de sortie","Droits"];
 return "\uFEFF"+[head,...s.tracks.map(t=>[t.title,t.artistName,t.authors,t.composers,t.genre,t.isrc,t.iswc,t.ipi,t.label,t.distributor,t.releaseDate,t.rights])]
   .map(row=>row.map(csv).join(",")).join("\r\n");
}
/** A contribution envelope is portable; no claim of instant cross-device synchronization. */
export interface GuestEnvelope {kind:"pointzero:music-choice";version:1;eventLabel:string;eventDate:string;title:string;artistName:string;guestAlias:string;moment:MusicMoment}
export const guestEnvelope=(e:MusicEvent,r:MusicRequest):GuestEnvelope=>({
 kind:"pointzero:music-choice",version:1,eventLabel:e.title,eventDate:e.date,title:r.title,artistName:r.artistName,guestAlias:r.guestAlias,moment:r.moment
});
export function safeGuestEnvelope(raw:unknown):GuestEnvelope|null{
 if(!raw||typeof raw!=="object")return null;
 const o=raw as Partial<GuestEnvelope>;
 if(o.kind!=="pointzero:music-choice"||o.version!==1||!str(o.eventLabel,180)||!str(o.eventDate,20)||!validDate(o.eventDate??"")||
  !str(o.title,180)||!o.title||!str(o.artistName,180)||!o.artistName||!str(o.guestAlias,90)||!MUSIC_MOMENTS.includes(o.moment as MusicMoment))return null;
 return o as GuestEnvelope;
}
export const guestToRequest=(envelope:GuestEnvelope,event:MusicEvent):MusicRequest=>
 newMusicRequest(event.id,envelope.title,envelope.artistName,envelope.guestAlias,envelope.moment);
export function musicToICS(e:MusicEvent):string{
 if(!e.date)return "";
 const dt=e.date.replace(/-/g,"");
 const escape=(s:string)=>s.replace(/\\/g,"\\\\").replace(/\r?\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;");
 return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//POINTZERO//Music//FR","BEGIN:VEVENT",
  "UID:"+escape(e.id)+"@pointzero.local","DTSTART;VALUE=DATE:"+dt,"SUMMARY:"+escape(e.title),
  "LOCATION:"+escape(e.venue),"DESCRIPTION:"+escape("Organisation musicale : "+e.organizer),
  "END:VEVENT","END:VCALENDAR"].join("\r\n");
}
