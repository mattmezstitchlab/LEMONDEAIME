/** Local-first teaching sessions and training programmes. */
export type ProgrammeKind="cours"|"seance"|"formation"|"atelier";
export type SessionState="prévue"|"réalisée"|"annulée";
export interface ProgrammeSession {
  id:string;title:string;date:string;start:string;minutes:number;location:string;
  objective:string;description:string;materials:string;status:SessionState;
}
export interface Programme {
  id:string;kind:ProgrammeKind;title:string;audience:string;objective:string;
  projectId:string;notes:string;sessions:ProgrammeSession[];created:string;
}
export interface ProgrammeStore {version:1;programmes:Programme[]}
export const PROGRAMME_STORAGE="pointzero:programmes:v1";
export const uid=()=>globalThis.crypto?.randomUUID?.()??Math.random().toString(36).slice(2);
const isoDate=(d:Date)=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const tomorrow=()=>{const d=new Date();d.setDate(d.getDate()+1);return isoDate(d);};
const validDate=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+"T12:00:00"));
const validTime=(s:string)=>/^([01]\d|2[0-3]):[0-5]\d$/.test(s);
export function makeProgramme(title="Nouvelle formation",kind:ProgrammeKind="formation",projectId=""):Programme{
  return {id:uid(),title,kind,projectId,audience:"",objective:"",notes:"",created:isoDate(new Date()),sessions:[]};
}
export const blankSession=():ProgrammeSession=>({
  id:uid(),title:"Nouvelle séance",date:tomorrow(),start:"09:00",minutes:90,
  location:"",objective:"",description:"",materials:"",status:"prévue"
});
export const hoursFor=(p:Programme)=>p.sessions.filter(s=>s.status!=="annulée").reduce((sum,s)=>sum+s.minutes,0)/60;
export const sortedSessions=(p:Programme)=>[...p.sessions].sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));
export function repeatNextWeek(session:ProgrammeSession):ProgrammeSession{
  const d=new Date(session.date+"T12:00:00");d.setDate(d.getDate()+7);
  return {...session,id:uid(),title:session.title,date:isoDate(d),status:"prévue"};
}
export function safeProgrammeStore(raw:unknown):ProgrammeStore|null {
  if(!raw||typeof raw!=="object")return null;
  const store=raw as Partial<ProgrammeStore>;
  if(store.version!==1||!Array.isArray(store.programmes)||store.programmes.length>120)return null;
  const known=new Set<string>();
  for(const p of store.programmes){
    if(!p||typeof p.id!=="string"||p.id.length>100||known.has(p.id)||!["cours","seance","formation","atelier"].includes(p.kind)||
      typeof p.title!=="string"||p.title.length>180||typeof p.audience!=="string"||p.audience.length>300||
      typeof p.objective!=="string"||p.objective.length>2000||typeof p.notes!=="string"||p.notes.length>5000||
      typeof p.projectId!=="string"||p.projectId.length>120||!validDate(p.created)||!Array.isArray(p.sessions)||p.sessions.length>500)return null;
    known.add(p.id);
    const sessionIds=new Set<string>();
    for(const s of p.sessions){
      if(!s||typeof s.id!=="string"||s.id.length>100||sessionIds.has(s.id)||typeof s.title!=="string"||s.title.length>180||
        !validDate(s.date)||!validTime(s.start)||!Number.isInteger(s.minutes)||s.minutes<10||s.minutes>1440||
        !["prévue","réalisée","annulée"].includes(s.status)||
        typeof s.location!=="string"||s.location.length>300||typeof s.objective!=="string"||s.objective.length>2000||
        typeof s.description!=="string"||s.description.length>5000||typeof s.materials!=="string"||s.materials.length>2000)return null;
      sessionIds.add(s.id);
    }
  }
  return store as ProgrammeStore;
}
const esc=(t:string)=>t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
export function programmeToHTML(p:Programme):string{
  const items=sortedSessions(p).map((s,i)=>'<article><div class="when">'+esc(s.date)+' · '+esc(s.start)+' · '+s.minutes+' min</div>'+
    '<h2>'+(i+1)+'. '+esc(s.title)+'</h2>'+
    '<p>'+esc(s.objective)+'</p><p class="muted">'+esc(s.description)+'</p><p class="muted">'+esc(s.materials)+'</p>'+
    '<small>'+esc(s.location)+' · '+esc(s.status)+'</small></article>').join("");
  return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<title>'+esc(p.title)+'</title><style>@page{size:A4;margin:18mm}body{font:15px/1.45 Arial,sans-serif;color:#18181b;margin:25px auto;max-width:780px;padding:0 20px}'+
    'h1{font-size:32px}h2{font-size:18px;margin:5px 0 10px}article{padding:18px 0;border-top:1px solid #ccc;break-inside:avoid}.when,small{font-size:12px;color:#52525b}'+
    '.muted{color:#52525b;white-space:pre-wrap}.goal{white-space:pre-wrap;margin:15px 0 25px}</style></head><body>'+
    '<header><small>POINTZERO · Programme '+esc(p.kind)+'</small><h1>'+esc(p.title)+'</h1><p>'+esc(p.audience)+'</p><p class="goal">'+esc(p.objective)+'</p>'+
    '<p>'+p.sessions.length+' séance(s) · '+hoursFor(p).toLocaleString("fr-FR")+' heures prévues (hors annulations)</p></header>'+items+'</body></html>';
}
const icsText=(s:string)=>s.replace(/\\/g,"\\\\").replace(/\r?\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;");
function datetimeUTC(s:ProgrammeSession){
  const start=new Date(s.date+"T"+s.start+":00");
  if(Number.isNaN(start.getTime()))throw Error("Date invalide");
  const end=new Date(start.getTime()+s.minutes*60_000);
  const utc=(d:Date)=>d.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z");
  return {start:utc(start),end:utc(end)};
}
export function programmeToICS(p:Programme):string{
  const events=sortedSessions(p).filter(s=>s.status!=="annulée").map(s=>{
    const times=datetimeUTC(s);
    return ["BEGIN:VEVENT","UID:"+icsText(s.id)+"@pointzero.local","DTSTART:"+times.start,"DTEND:"+times.end,
      "SUMMARY:"+icsText(s.title),"DESCRIPTION:"+icsText(s.objective+"\n"+s.description),
      "LOCATION:"+icsText(s.location),"END:VEVENT"].join("\r\n");
  }).join("\r\n");
  return "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//POINTZERO//Programme//FR\r\nCALSCALE:GREGORIAN\r\n"+events+"\r\nEND:VCALENDAR\r\n";
}
export function programmesToCSV(p:Programme):string{
  const q=(s:string)=>'"'+s.replace(/"/g,'""')+'"';
  const lines=["date","heure","duree_min","titre","lieu","objectif","description","materiel","etat"];
  for(const s of sortedSessions(p))lines.push([s.date,s.start,String(s.minutes),s.title,s.location,s.objective,s.description,s.materials,s.status].map(q).join(","));
  return "\uFEFF"+lines.map(x=>Array.isArray(x)?x.join(","):x).join("\r\n");
}
