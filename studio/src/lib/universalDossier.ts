/** AIME dossier orchestration over the existing oneSpaceCore canonical WorldSpace.
 * All writes preserve original world storage and its unrelated spaces/tiles/signals.
 * Deliberately deterministic, offline interpretation, NOT an AI service.
 */
import {WORLD_KEY,ids,newMoment,newSpace,readWorld,safeWorld,writeWorld,type WorldSpace} from "./oneSpaceCore";
import {emptyUniversalMeta,validUniversalMeta,type DossierChange,type TrainingContext,type UniversalMeta} from "./dossierSchema";
import {validProject} from "./academyCore";
export const AIME_WORLD_CHANGED="aime:universal-world-changed";
export const DOSSIER_EXPORT_KIND="aime:universal-dossier";
export const academyDossierKey=(id:string)=>"pointzero:academy:linked:"+id+":v1";
const iso=()=>new Date().toISOString();
const trim=(s:string,max=3000)=>s.trim().slice(0,max);
export type Inference={intent:string;title:string;universe:string;objectives:string[];training?:NonNullable<UniversalMeta["training"]>;questions:string[];method:"heuristique locale"};
export function understandIntent(input:string):Inference{
 const intent=trim(input);const lower=intent.toLocaleLowerCase("fr");
 const training=/form|atelier|apprend|transmett|enseigne|débutant|cours|pédagog|initia/i.test(lower);
 const sax=/sax|improvis|musique|instrument/i.test(lower);
 const wedding=/mariage|marié|cérémonie|noces/i.test(lower);
 const universe=training?"formation":wedding?"mariage":"creation";
 const count=lower.match(/\b(\d{1,5})\s*(débutants?|participants?|personnes?|apprenants?|élèves?)\b/i);
 const wordCount=/(dix|10)\s+(débutants?|participants?|personnes?)/i.test(lower)?10:null;
 const participants=count?Number(count[1]):wordCount;
 const objectives=training?(sax?["Explorer l'improvisation musicale","Pratiquer une courte improvisation guidée"]:["Identifier les compétences à transmettre","Pratiquer une activité accompagnée"]):[];
 const title=training?(sax?"Atelier d’improvisation au saxophone":"Projet de transmission"):wedding?"Projet de mariage":"Mon projet AIME";
 const trainingMeta=training?{context:"loisirs" as TrainingContext,audience:/débutant/i.test(lower)?"Débutants (proposé)":"",
  participants:participants!==null&&participants>=1&&participants<=100000?participants:null,durationHours:null,
  prerequisites:"",outline:[],evaluation:"",facilitator:""}:undefined;
 const questions=training?["Nature de la transmission à confirmer (loisirs, association, formation professionnelle)","Durée et créneaux à préciser","Objectifs à relire"]:["Titre et objectifs à confirmer"];
 return {intent,title,universe,objectives,training:trainingMeta,questions,method:"heuristique locale"};
}
export function readDossier(id:string):WorldSpace|null{
 return readWorld().spaces.find(s=>s.id===id)??null;
}
export function selectedDossier():WorldSpace|null{
 const store=readWorld();
 return store.spaces.find(s=>s.id===store.selectedSpaceId)??null;
}
/** A corrupted or future-version local store must never be interpreted as empty
 * for a write: that would replace an unrecoverable original value.
 * Read-only legacy UI remains unchanged; only dossier mutations are guarded.
 */
export function writableWorld(){
 const original=localStorage.getItem(WORLD_KEY);
 if(original===null)return readWorld();
 let decoded:unknown;
 try{decoded=JSON.parse(original);}catch{throw Error("Stockage AIME illisible : données conservées, exportez une sauvegarde avant toute correction.");}
 const validated=safeWorld(decoded);
 if(!validated)throw Error("Stockage AIME incompatible : données conservées, aucun remplacement automatique.");
 return validated;
}
const emit=()=>{if(typeof window!=="undefined")window.dispatchEvent(new Event(AIME_WORLD_CHANGED));};
const persist=(space:WorldSpace,selected=true)=>{
 const store=writableWorld();
 const next={...store,selectedSpaceId:selected?space.id:store.selectedSpaceId,
 spaces:store.spaces.some(x=>x.id===space.id)?store.spaces.map(x=>x.id===space.id?space:x):[...store.spaces,space]};
 if(!safeWorld(next))throw Error("Dossier invalide ou limite de stockage atteinte.");
 writeWorld(next);emit();return space;
};
export function makeUniversalDossier(input:string):WorldSpace{
 const inference=understandIntent(input);
 if(inference.intent.length<8)throw Error("Décrivez votre intention en quelques mots.");
 const base=newSpace(inference.universe==="mariage"?"mariage":"professionnel",inference.title);
 const dossier=emptyUniversalMeta(inference.intent,inference.universe);
 dossier.objectives=inference.objectives;
 if(inference.training)dossier.training=inference.training;
 dossier.actions=[{id:ids(),label:"Relire la compréhension",state:"à-faire",requiresValidation:true},
 {id:ids(),label:"Créer un support dans Academy",state:"à-faire",requiresValidation:false},
 {id:ids(),label:"Exporter le dossier JSON",state:"à-faire",requiresValidation:false}];
 const created={...base,description:trim(inference.intent,1200),dossier};
 if(!validUniversalMeta(dossier))throw Error("Dossier généré invalide.");
 return created;
}
export function adoptLegacySpace(spaceId:string):WorldSpace{
 const space=readDossier(spaceId);if(!space)throw Error("Espace introuvable.");
 if(space.dossier)return space;
 const meta=emptyUniversalMeta(space.description||"",space.kind==="mariage"?"mariage":space.kind==="association"?"transmission":"creation");
 return persist({...space,dossier:meta}); // Original people, moments, signals and refs unchanged.
}
export function createUniversalDossier(input:string):WorldSpace{
 const store=writableWorld();if(store.spaces.length>=30)throw Error("Limite de 30 espaces locaux atteinte : sauvegardez vos données.");
 const space=makeUniversalDossier(input);
 return persist(space);
}
export type EditKey="title"|"description"|"dossier.intent"|"dossier.training.context"|"dossier.training.audience"|
 "dossier.training.participants"|"dossier.training.durationHours"|"dossier.training.prerequisites"|
 "dossier.training.evaluation"|"dossier.training.outline"|"dossier.objectives";
export function updateUniversalField(spaceId:string,field:EditKey,input:string,origin:DossierChange["origin"]="utilisateur"):WorldSpace{
 const prev=readDossier(spaceId);if(!prev)throw Error("Dossier introuvable.");
 let d=prev.dossier??emptyUniversalMeta(prev.description||"", "creation");
 if(!validUniversalMeta(d))throw Error("Métadonnées du dossier invalides.");
 let before="",after="";
 let next:WorldSpace={...prev};
 const value=trim(input);
 if(field==="title"){
  if(!value||value.length>180)throw Error("Titre requis, maximum 180 caractères.");
  before=prev.title;after=value;next.title=after;
 }else if(field==="description"){
  before=prev.description;after=trim(input,1200);next.description=after;
 }else{
  if(field==="dossier.intent"){before=d.intent;after=value;d={...d,intent:value};}
  else if(field==="dossier.objectives"){
   before=JSON.stringify(d.objectives);const arr=value.split(/\n/).map(x=>x.trim()).filter(Boolean).slice(0,35);
   if(arr.some(x=>x.length>400))throw Error("Objectif trop long.");
   after=JSON.stringify(arr);d={...d,objectives:arr};
  }else {
   const key=field.slice("dossier.training.".length) as keyof NonNullable<UniversalMeta["training"]>;
   const training=d.training??{context:"loisirs" as const,audience:"",participants:null,durationHours:null,prerequisites:"",outline:[],evaluation:"",facilitator:""};
   before=JSON.stringify(training[key]);
   let parsed:string|number|null|string[]=value;
   if(key==="context"){
    if(!["loisirs","association","professionnelle"].includes(value))throw Error("Nature de formation inconnue.");
   }else if(key==="participants"||key==="durationHours"){
    parsed=value===""?null:Number(value);
    if(parsed!==null&&(!Number.isFinite(parsed)||parsed<0||(key==="participants"&&!Number.isInteger(parsed))))throw Error("Nombre invalide.");
   }else if(key==="outline"){
    const lines=value.split(/\n/).map(x=>x.trim()).filter(Boolean);
    if(lines.length>40||lines.some(x=>x.length>400))throw Error("Programme trop long.");
    parsed=lines;
   }
   after=JSON.stringify(parsed);
   d={...d,training:{...training,[key]:parsed}};
  }
 }
 if(field==="title"||field==="description"){}else next.dossier=d;
 if(before===after)return prev;
 const item:DossierChange={id:ids(),at:iso(),entityId:spaceId,field,before,after,origin,validation:"confirmé"};
 next={...next,dossier:{...d,history:[...d.history,item].slice(-300)}};
 if(!validUniversalMeta(next.dossier))throw Error("Modification rejetée par la validation.");
 return persist(next);
}
/** Add a canonical scheduled moment, not a second formation-only schedule. */
export function addUniversalMoment(spaceId:string,title:string,time:string):WorldSpace{
 const space=readDossier(spaceId);if(!space)throw Error("Dossier introuvable.");
 if(space.moments.length>=200)throw Error("Limite de moments atteinte.");
 if(title.trim().length<2||title.length>180||!(time===""||/^([01]\d|2[0-3]):[0-5]\d$/.test(time)))throw Error("Titre ou horaire invalide.");
 const moment=newMoment(trim(title,180),time);
 const meta=space.dossier??emptyUniversalMeta(space.description);
 const revision:DossierChange={id:ids(),at:iso(),entityId:moment.id,field:"moments",before:"",after:moment.title+" @ "+moment.time,origin:"utilisateur",validation:"confirmé"};
 return persist({...space,moments:[...space.moments,moment],dossier:{...meta,history:[...meta.history,revision].slice(-300)}});
}
/** Verify the referenced local support without mutating or repairing anything. */
export function academyReferenceHealth(space:WorldSpace):"none"|"available"|"missing"|"invalid"{
 const ref=space.dossier?.references.find(r=>r.type==="studio"&&r.studio==="academy");
 if(!ref)return "none";
 try{
  const raw=localStorage.getItem(academyDossierKey(space.id));
  if(raw===null)return "missing";
  const saved=validProject(JSON.parse(raw));
  return saved&&saved.id===ref.targetId&&saved.dossierBinding?.spaceId===space.id?"available":"invalid";
 }catch{return "invalid";}
}
export function attachAcademyResource(spaceId:string,academyProjectId:string,approveReplacement=false):WorldSpace{
 const space=readDossier(spaceId);if(!space)throw Error("Dossier source introuvable.");
 const d=space.dossier??emptyUniversalMeta(space.description);
 const current=d.references.find(r=>r.type==="studio"&&r.studio==="academy");
 if(!academyProjectId.trim()||academyProjectId.length>100)throw Error("Identifiant Academy invalide.");
 if(current&&current.targetId!==academyProjectId&&!approveReplacement)
  throw Error("Conflit Academy : référence existante conservée. Autorisation explicite requise avant remplacement.");
 const ref={id:current?.id??ids(),type:"studio" as const,title:"Support pédagogique Academy",targetId:academyProjectId,studio:"academy",status:"confirmé" as const};
 const refs=current?d.references.map(r=>r.id===current.id?ref:r):[...d.references,ref];
 const tiles=space.tiles.map(t=>t.kind==="academy"?{...t,refId:academyProjectId}:t);
 if(current?.targetId===academyProjectId&&tiles.every((t,i)=>t.refId===space.tiles[i].refId))return space;
 const history:DossierChange={id:ids(),at:iso(),entityId:spaceId,field:"references.academy",
 before:current?.targetId??"",after:academyProjectId,origin:"studio",validation:"confirmé"};
 return persist({...space,tiles,dossier:{...d,references:refs,history:[...d.history,history].slice(-300)}},false);
}
export interface FormationView {
 dossierId:string;title:string;kind:TrainingContext;audience:string;participants:number|null;
 objectives:string[];prerequisites:string;durationHours:number|null;outline:string[];
 evaluation:string;moments:{id:string;title:string;time:string}[];resources:{id:string;title:string;studio:string}[];
 missing:string[];disclaimer:string;
}
export function projectFormation(space:WorldSpace):FormationView|null{
 const d=space.dossier;
 if(!d||!d.training)return null;
 const t=d.training;
 const missing=[!t.audience&&"Public à définir",t.participants===null&&"Nombre de participants",t.durationHours===null&&"Durée à préciser",
 !t.outline.length&&"Déroulement à préciser",!space.moments.length&&"Créneaux à renseigner"].filter((x):x is string=>typeof x==="string");
 return {dossierId:space.id,title:space.title,kind:t.context,audience:t.audience,participants:t.participants,
 objectives:d.objectives,prerequisites:t.prerequisites,durationHours:t.durationHours,outline:t.outline,evaluation:t.evaluation,
 moments:space.moments.map(m=>({id:m.id,title:m.title,time:m.time})),
 resources:d.references.map(r=>({id:r.targetId,title:r.title,studio:r.studio})),missing,
 disclaimer:t.context==="professionnelle"?"Formation professionnelle : tous les documents réglementaires restent des brouillons à contrôler, sans certification Qualiopi automatique.":
 t.context==="association"?"Transmission associative : vérifier les financements, les autorisations et le statut exact du projet.":
 "Atelier de loisirs : ne pas présumer qu'il constitue une formation professionnelle."};
}
export function exportUniversalJSON(space:WorldSpace):string{
 const snapshot=readDossier(space.id)??space;
 if(!safeWorld({version:1,spaces:[snapshot],selectedSpaceId:snapshot.id}))throw Error("Dossier invalide.");
 return JSON.stringify({kind:DOSSIER_EXPORT_KIND,version:1,exportedAt:iso(),space:snapshot},null,2);
}
export function importUniversalJSON(raw:unknown,replace=false):WorldSpace{
 if(!raw||typeof raw!=="object")throw Error("Fichier non reconnu.");
 const input=raw as {kind?:string;version?:number;space?:WorldSpace};
 if(input.kind!==DOSSIER_EXPORT_KIND||input.version!==1||!input.space)throw Error("Format de dossier incompatible.");
 const space=input.space;
 if(!safeWorld({version:1,spaces:[space],selectedSpaceId:space.id}))throw Error("Schéma du dossier non conforme.");
 const store=writableWorld();
 if(store.spaces.some(s=>s.id===space.id)&&!replace)throw Error("Conflit d'identifiant : importation refusée. Confirmez explicitement un remplacement.");
 if(!store.spaces.some(s=>s.id===space.id)&&store.spaces.length>=30)throw Error("Capacité locale atteinte.");
 return persist(space);
}

/** Explicit fictitious demo creation: one canonical write, no secondary stores. */
export function createWeddingDemo():WorldSpace {
 const store=writableWorld();if(store.spaces.length>=30)throw Error("Limite de 30 espaces atteinte.");
 const base=makeUniversalDossier("Je souhaite organiser notre mariage et relier le programme aux documents.");
 return persist({...base,kind:"mariage",title:"Camille & Gabriel — mariage fictif",moments:[newMoment("Cérémonie","15:00"),newMoment("Cocktail","17:00")]});
}
/** Programme projection edits the original moment; no ProgrammeStore copy. */
export function updateUniversalMoment(spaceId:string,momentId:string,time:string):WorldSpace {
 const space=readDossier(spaceId);if(!space)throw Error("Dossier introuvable.");
 const moment=space.moments.find(m=>m.id===momentId);if(!moment)throw Error("Moment introuvable.");
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw Error("Horaire invalide.");
 if(time===moment.time)return space;
 const d=space.dossier??emptyUniversalMeta(space.description);
 const revision:DossierChange={id:ids(),at:iso(),entityId:moment.id,field:"moments.time",before:moment.time,after:time,origin:"utilisateur",validation:"confirmé"};
 return persist({...space,moments:space.moments.map(m=>m.id===momentId?{...m,time}:m),dossier:{...d,history:[...d.history,revision].slice(-300)}});
}
