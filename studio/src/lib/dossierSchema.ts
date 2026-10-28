/** Optional versioned extension of existing WorldSpace, NOT a second project registry.
 * SafeWorld continues to use its original v1 localStorage key and legacy shape.
 */
export type Confirmation="proposé"|"confirmé"|"rejeté";
export type TrainingContext="loisirs"|"association"|"professionnelle";
export interface DossierReference{
 id:string;type:"document"|"media"|"studio"|"source";title:string;targetId:string;studio:string;status:Confirmation;
}
export interface DossierDecision {id:string;title:string;status:Confirmation;at:string}
export interface DossierContribution {id:string;personId:string;description:string;at:string}
export interface DossierRelation {id:string;fromId:string;toId:string;kind:string}
export interface DossierAction{ id:string;label:string;state:"à-faire"|"réalisée"|"bloquée";requiresValidation:boolean }
export interface DossierChange{
 id:string;at:string;entityId:string;field:string;before:string;after:string;
 origin:"utilisateur"|"studio"|"import";validation:"confirmé"|"brouillon";
}
export interface TrainingProjectionData{
 context:TrainingContext;audience:string;participants:number|null;durationHours:number|null;
 prerequisites:string;outline:string[];evaluation:string;facilitator:string;
}
export interface UniversalMeta {
 version:1;intent:string;primaryUniverse:string;associatedUniverses:string[];
 identityRef:string;objectives:string[];references:DossierReference[];
 decisions:DossierDecision[];actions:DossierAction[];contributions:DossierContribution[];
 relations:DossierRelation[];history:DossierChange[];training?:TrainingProjectionData;
}
const short=(x:unknown,n:number)=>typeof x==="string"&&x.length<=n;
const ident=(x:unknown)=>short(x,100)&&!!x;
const strs=(v:unknown,n:number,max:number)=>Array.isArray(v)&&v.length<=max&&v.every(x=>short(x,n));
const ids=(list:{id:string}[])=>list.every(x=>ident(x.id))&&new Set(list.map(x=>x.id)).size===list.length;
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v);
export function validUniversalMeta(raw:unknown):raw is UniversalMeta{
 if(!obj(raw)||raw.version!==1||!short(raw.intent,3000)||!short(raw.primaryUniverse,60)||
 !strs(raw.associatedUniverses,60,12)||!short(raw.identityRef,100)||
 !strs(raw.objectives,400,35))return false;
 const collections=["references","decisions","actions","contributions","relations","history"] as const;
 const caps=[80,80,80,80,120,300];
 for(let i=0;i<collections.length;i++){
  const v=raw[collections[i]];
  if(!Array.isArray(v)||v.length>caps[i]||!ids(v))return false;
 }
 const d=raw as unknown as UniversalMeta;
 if(!d.references.every((r:DossierReference)=>obj(r)&&["document","media","studio","source"].includes(r.type)&&short(r.title,180)&&short(r.targetId,130)&&short(r.studio,70)&&["proposé","confirmé","rejeté"].includes(r.status)))return false;
 if(!d.decisions.every((r:DossierDecision)=>obj(r)&&short(r.title,400)&&["proposé","confirmé","rejeté"].includes(r.status)&&short(r.at,40)))return false;
 if(!d.actions.every((r:DossierAction)=>obj(r)&&short(r.label,280)&&["à-faire","réalisée","bloquée"].includes(r.state)&&typeof r.requiresValidation==="boolean"))return false;
 if(!d.contributions.every((r:DossierContribution)=>obj(r)&&short(r.personId,100)&&short(r.description,500)&&short(r.at,40)))return false;
 if(!d.relations.every((r:DossierRelation)=>obj(r)&&short(r.fromId,100)&&short(r.toId,100)&&short(r.kind,60)))return false;
 if(!d.history.every((r:DossierChange)=>obj(r)&&short(r.at,40)&&ident(r.entityId)&&short(r.field,80)&&short(r.before,3000)&&short(r.after,3000)&&
 ["utilisateur","studio","import"].includes(r.origin)&&["confirmé","brouillon"].includes(r.validation)))return false;
 if(raw.training!==undefined){
  const t=raw.training;
  if(!obj(t)||!["loisirs","association","professionnelle"].includes(t.context as string)||!short(t.audience,300)||
   !(t.participants===null||(Number.isInteger(t.participants)&&Number(t.participants)>=0&&Number(t.participants)<=100000))||
   !(t.durationHours===null||(typeof t.durationHours==="number"&&Number.isFinite(t.durationHours)&&t.durationHours>0&&t.durationHours<=10000))||
   !short(t.prerequisites,600)||!strs(t.outline,400,40)||!short(t.evaluation,600)||!short(t.facilitator,160))return false;
 }
 return true;
}
export function emptyUniversalMeta(intent="",universe="creation"):UniversalMeta{
 return {version:1,intent,primaryUniverse:universe,associatedUniverses:[],identityRef:"",
  objectives:[],references:[],decisions:[],actions:[],contributions:[],relations:[],history:[]};
}
