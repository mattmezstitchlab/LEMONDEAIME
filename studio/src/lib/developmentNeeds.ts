/** Explicit, immutable proposals. No network, code generation, ticket or persistence side effects. */
import type {Diagnostic,DiagnosticRequest} from './capabilityRegistry';
export type NeedStatus='proposé'|'accepté'|'rejeté'|'satisfait';
export interface DevelopmentNeed {
 id:string;dossierId:string;intent:string;missingCapability:string;justification:string;
 studios:string[];engines:string[];prerequisites:string[];risks:string[];successCriteria:string[];
 status:NeedStatus;history:{at:string;decision:string;actor:string}[];
}
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
/** Candidates only: similar wording never automatically merges distinct user needs. */
export function similarNeeds(needs:readonly DevelopmentNeed[],target:string):DevelopmentNeed[]{
 const normalized=normalize(target);if(!normalized)return [];
 const words=new Set(normalized.split(' '));
 return needs.filter(n=>{
  const other=normalize(n.missingCapability);if(other===normalized)return true;
  const set=new Set(other.split(' ')),intersection=[...words].filter(w=>set.has(w)).length;
  return intersection/(new Set([...words,...set]).size||1)>=0.6;
 });
}
export function proposeNeed(request:DiagnosticRequest,diagnostic:Diagnostic,id:string,at:string):DevelopmentNeed {
 if(diagnostic.status!=='développement'||!diagnostic.missing.length||!id||!request.dossierId||diagnostic.missing[0]!==request.target||!Number.isFinite(Date.parse(at)))throw Error('Besoin non justifié');
 return {id,dossierId:request.dossierId,intent:request.intent,missingCapability:diagnostic.missing[0],justification:diagnostic.reason,
 studios:[],engines:[],prerequisites:['Cadrage et validation humaine'],risks:['Faisabilité et contraintes réglementaires à évaluer'],
 successCriteria:[`Produire ${diagnostic.missing[0]} avec contrat, tests et preuve versionnée`],status:'proposé',
 history:[{at,decision:'Proposition locale ; aucun ticket ni code créé',actor:'diagnostic déterministe'}]};
}
export function decideNeed(need:DevelopmentNeed,status:NeedStatus,actor:string,reason:string,at:string):DevelopmentNeed {
 if(!actor.trim()||!reason.trim()||!Number.isFinite(Date.parse(at)))throw Error('Décision explicite requise');
 const allowed:Record<NeedStatus,NeedStatus[]>={proposé:['accepté','rejeté'],accepté:['satisfait','rejeté'],rejeté:['proposé'],satisfait:[]};
 if(!allowed[need.status].includes(status))throw Error('Transition non autorisée');
 return {...need,status,history:[...need.history,{at,actor,decision:reason}]};
}
export function exportNeeds(needs:readonly DevelopmentNeed[]):string {
 return JSON.stringify({kind:'aime:development-needs',version:1,needs},null,2);
}
