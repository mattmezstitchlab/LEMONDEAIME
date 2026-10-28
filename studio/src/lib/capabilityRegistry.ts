import {chronology,linkedMiniSite,projectMiniSite,recapHTML} from './dossierProjections';
import {safeMiniSite} from './miniSiteCore';
/** Technical contracts, not Studio/editorial availability claims. Local prototype only. */
import {validUniversalMeta,emptyUniversalMeta} from './dossierSchema';
import {safeWorld,type WorldSpace} from './oneSpaceCore';
import {understandIntent,makeUniversalDossier,projectFormation,exportUniversalJSON} from './universalDossier';
import {makeAcademyProject,academyDisplayProject,validProject} from './academyCore';
export const REFERENCE_SHA='c93054fd88a9194ce43d31e8aa595b3d1cf479f6';
export type Artifact='intention'|'inference'|'dossier'|'formation'|'academy'|'dossier-json'|'chronology'|'mini-site'|'document-html';
export interface Evidence {sourceCommit?:string;sourceBlob?:string;sourceFile?:string;test:string;scope:'local-contract'}
export interface Capability {
 id:string;version:string;adapterId:string;input:Artifact;output:Artifact;
 studios:string[];prerequisites:string[];limits:string[];evidence:Evidence[];
 state:'validated'|'proposed';
}
const evidence=(test:string):Evidence[]=>[{sourceCommit:REFERENCE_SHA,test,scope:'local-contract'}];
const spec=(id:string,input:Artifact,output:Artifact,studios:string[],prerequisites:string[],limits:string[]):Capability=>({
 id,version:'1.0.0',adapterId:id,input,output,studios,prerequisites,limits,state:'validated',evidence:evidence(`src/__tests__/capabilityRegistry.test.ts > ${id}`)
});
const projectionEvidence:Evidence[]=[{sourceBlob:'7ec508c28ca9d6e0165a494207d113c5b01a0b18',sourceFile:'src/lib/dossierProjections.ts',test:'src/__tests__/capabilityRegistry.test.ts > projections',scope:'local-contract'}];
const projectionSpec=(id:string,output:Artifact):Capability=>({...spec(id,'dossier',output,['universal-dossier','mini-site','admin'],[],['Projection locale, pas de publication ; HTML exporté statique.']),evidence:projectionEvidence});
export const CAPABILITIES:readonly Capability[]=[
 spec('intent.structure','intention','inference',['universal-dossier'],[],['Heuristique française limitée ; propositions à confirmer, pas une IA.']),
 spec('dossier.prepare','intention','dossier',['universal-dossier','one-space'],[],['Prépare un WorldSpace en mémoire ; aucune sauvegarde implicite.']),
 spec('formation.project','dossier','formation',['universal-dossier','academy'],['Métadonnées training requises'],['Projection, pas une certification réglementaire.']),
 spec('academy.prepare','dossier','academy',['academy'],['Dossier avec métadonnées validées'],['Support en mémoire ; pas de publication ni de stockage implicite.']),
 projectionSpec('chronology.project','chronology'),
 projectionSpec('mini-site.project','mini-site'),
 projectionSpec('document.project','document-html'),
 spec('dossier.export','dossier','dossier-json',['universal-dossier'],[],['Export du WorldSpace seulement ; contenus Academy et progression exclus.'])
];
export function isDossier(value:unknown):value is WorldSpace {
 if(!value||typeof value!=='object')return false;
 const s=value as WorldSpace;
 try{return !!s.dossier&&!!safeWorld({version:1,spaces:[s],selectedSpaceId:s.id});}catch{return false;}
}
const intent=(value:unknown):value is string=>typeof value==='string'&&value.trim().length>=8&&value.length<=3000;
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const strings=(v:unknown):v is string[]=>Array.isArray(v)&&v.every(x=>typeof x==='string');
export const ADAPTERS:Record<string,{accepts:(v:unknown)=>boolean;run:(v:unknown)=>unknown;validates:(v:unknown)=>boolean}>={
 'chronology.project':{accepts:isDossier,run:v=>chronology(v as WorldSpace),validates:v=>record(v)&&typeof v.dossierId==='string'&&Array.isArray(v.moments)&&v.moments.every(m=>record(m)&&typeof m.id==='string'&&typeof m.title==='string'&&typeof m.time==='string')},
 'mini-site.project':{accepts:isDossier,run:v=>projectMiniSite(linkedMiniSite(v as WorldSpace),v as WorldSpace),validates:v=>!!safeMiniSite(v)},
 'document.project':{accepts:isDossier,run:v=>recapHTML(v as WorldSpace),validates:v=>typeof v==='string'&&v.startsWith('<!doctype html>')},
 'intent.structure':{accepts:intent,run:v=>understandIntent(v as string),validates:v=>record(v)&&v.method==='heuristique locale'&&typeof v.intent==='string'&&typeof v.title==='string'&&typeof v.universe==='string'&&strings(v.questions)&&validUniversalMeta({...emptyUniversalMeta(v.intent,v.universe),objectives:v.objectives,...(v.training?{training:v.training}:{})})},
 'dossier.prepare':{accepts:intent,run:v=>makeUniversalDossier(v as string),validates:isDossier},
 'formation.project':{accepts:v=>isDossier(v)&&!!v.dossier?.training,run:v=>projectFormation(v as WorldSpace),validates:v=>record(v)&&typeof v.dossierId==='string'&&typeof v.title==='string'&&strings(v.objectives)&&strings(v.outline)&&strings(v.missing)&&typeof v.disclaimer==='string'&&Array.isArray(v.moments)&&v.moments.every(m=>record(m)&&typeof m.id==='string'&&typeof m.title==='string'&&typeof m.time==='string')&&Array.isArray(v.resources)&&v.resources.every(r=>record(r)&&typeof r.id==='string'&&typeof r.title==='string'&&typeof r.studio==='string')&&validUniversalMeta({...emptyUniversalMeta(),objectives:v.objectives,training:{context:v.kind,audience:v.audience,participants:v.participants,durationHours:v.durationHours,prerequisites:v.prerequisites,outline:v.outline,evaluation:v.evaluation,facilitator:''}})},
 'academy.prepare':{accepts:isDossier,run:v=>{
  const s=v as WorldSpace;
  return academyDisplayProject({...makeAcademyProject(),dossierBinding:{spaceId:s.id,titleMode:'linked',objectivesMode:'linked'}},s);
 },validates:v=>!!validProject(v)},
 'dossier.export':{accepts:isDossier,run:v=>exportUniversalJSON(v as WorldSpace),validates:v=>{
  if(typeof v!=='string')return false;
  try{const p=JSON.parse(v);return p.kind==='aime:universal-dossier'&&p.version===1&&isDossier(p.space);}catch{return false;}
 }}
};
export function executeCapability(id:string,input:unknown):unknown {
 const c=CAPABILITIES.find(x=>x.id===id),a=c&&ADAPTERS[c.adapterId];
 if(!c||c.state!=='validated'||!c.evidence.length||!a)throw Error('Capacité non validée');
 if(!a.accepts(input))throw Error('Entrée ou prérequis non conforme');
 const result=a.run(input);
 if(!a.validates(result))throw Error('Sortie non conforme');
 return result;
}
export type DiagnosticStatus='immédiat'|'composition'|'développement'|'à-vérifier'|'non-réalisable';
export interface DiagnosticRequest {
 intent:string;dossierId:string;available:Artifact[];target:Artifact|string;
 confirmed:boolean;blockedReason?:string;verifiedPrerequisites?:string[];
}
export interface Diagnostic {status:DiagnosticStatus;path:string[];reason:string;missing:string[]}
/** Bounded graph search over declared artifact contracts. Advisory: execution rechecks values. */
export function diagnose(r:DiagnosticRequest,registry:readonly Capability[]=CAPABILITIES):Diagnostic {
 if(r.blockedReason)return {status:'non-réalisable',path:[],reason:r.blockedReason,missing:[]};
 if(!intent(r.intent)||!r.dossierId||!r.target.trim()||!r.confirmed)return {status:'à-vérifier',path:[],reason:'Intention, dossier et objectif structuré à confirmer',missing:[]};
 if(r.available.includes(r.target as Artifact))return {status:'immédiat',path:[],reason:'Résultat déjà disponible',missing:[]};
 const queue=r.available.map(type=>({type,path:[] as string[]}));const seen=new Set<string>(r.available);
 for(let i=0;i<queue.length;i++){
  const node=queue[i];
  for(const c of registry){
   if(c.input!==node.type||seen.has(c.output)||c.state!=='validated'||!c.evidence.length)continue;
   // Prerequisites cannot be inferred from artifact names alone.
   if(!c.prerequisites.every(p=>r.verifiedPrerequisites?.includes(p)))continue;
   const path=[...node.path,c.id];
   if(c.output===r.target)return {status:path.length===1?'immédiat':'composition',path,reason:'Contrats compatibles ; valeurs à contrôler avant exécution',missing:[]};
   seen.add(c.output);queue.push({type:c.output,path});
  }
 }
 if(registry.some(c=>c.output===r.target))return {status:'à-vérifier',path:[],reason:'Capacité déclarée mais prérequis, preuve ou données à vérifier',missing:[]};
 return {status:'développement',path:[],reason:'Aucune capacité validée ne produit le résultat demandé',missing:[r.target]};
}
