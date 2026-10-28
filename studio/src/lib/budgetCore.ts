import {WORLD_KEY,safeWorld} from "./oneSpaceCore";
/** POINTZERO Budget: deliberate local-only bookkeeping, not bank synchronization. */
export type BudgetScope = "personal" | "project";
export type BudgetKind = "expense" | "income";
export interface BudgetCategory { id:string; name:string; limitCents:number; color:string; kind:BudgetKind; scope:BudgetScope; projectId:string }
export interface BudgetEntry { id:string; date:string; label:string; cents:number; kind:BudgetKind; categoryId:string; scope:BudgetScope; projectId:string; note:string }
export interface BudgetState { version:1; categories:BudgetCategory[]; entries:BudgetEntry[] }
export const BUDGET_STORAGE="pointzero:budget:v1";
export const newId=()=>globalThis.crypto?.randomUUID?.()??Math.random().toString(36).slice(2);
export const euro=(cents:number)=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"}).format(cents/100);
export function eurosToCents(value:string|number):number|null{
  const numeric=typeof value==="number"?value:Number(value.trim().replace(/\s/g,"").replace(",","."));
  return Number.isFinite(numeric) && numeric>=0 && numeric<=1_000_000_000 ? Math.round(numeric*100) : null;
}
export const monthKey=(date:string)=>/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(date)?date.slice(0,7):"";
export function makeBudget():BudgetState{return {version:1,categories:[
  {id:newId(),name:"Production",kind:"expense",limitCents:0,color:"#a1a1aa",scope:"project",projectId:""},
  {id:newId(),name:"Communication",kind:"expense",limitCents:0,color:"#b6a5d7",scope:"project",projectId:""},
  {id:newId(),name:"Fournitures",kind:"expense",limitCents:0,color:"#7cb7a5",scope:"project",projectId:""},
  {id:newId(),name:"Vie quotidienne",kind:"expense",limitCents:0,color:"#9eb1d1",scope:"personal",projectId:""},
  {id:newId(),name:"Loisirs",kind:"expense",limitCents:0,color:"#e3a69e",scope:"personal",projectId:""},
  {id:newId(),name:"Revenus",kind:"income",limitCents:0,color:"#81c9ae",scope:"personal",projectId:""}
],entries:[]};}
const validDate=(date:string)=>/^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date+"T12:00:00"));
export function safeBudget(value:unknown):BudgetState|null{
  if(!value||typeof value!=="object")return null;
  const s=value as Partial<BudgetState>;
  if(s.version!==1||!Array.isArray(s.categories)||!Array.isArray(s.entries)||s.categories.length>150||s.entries.length>10000)return null;
  const categoryIds=new Set<string>();
  for(const c of s.categories){
    if(!c||typeof c.id!=="string"||c.id.length>100||categoryIds.has(c.id)||typeof c.name!=="string"||c.name.length>120||
      !Number.isSafeInteger(c.limitCents)||c.limitCents<0||c.limitCents>100_000_000_000||!/^#[0-9a-fA-F]{6}$/.test(c.color)||
      !["expense","income"].includes(c.kind)||!["personal","project"].includes(c.scope)||typeof c.projectId!=="string"||c.projectId.length>120)return null;
    categoryIds.add(c.id);
  }
  for(const e of s.entries){
    if(!e||typeof e.id!=="string"||e.id.length>100||!validDate(e.date)||typeof e.label!=="string"||e.label.length>180||
      !Number.isSafeInteger(e.cents)||e.cents<=0||e.cents>100_000_000_000||
      !["expense","income"].includes(e.kind)||!["personal","project"].includes(e.scope)||
      typeof e.projectId!=="string"||e.projectId.length>120||typeof e.note!=="string"||e.note.length>1500||
      !categoryIds.has(e.categoryId))return null;
    const cat=s.categories.find(c=>c.id===e.categoryId);
    if(!cat||cat.kind!==e.kind||cat.scope!==e.scope||cat.projectId!==e.projectId)return null;
  }
  return s as BudgetState;
}
export function budgetReport(state:BudgetState,month:string,scope:BudgetScope,projectId=""){
  const categories=state.categories.filter(c=>c.scope===scope&&(scope==="personal"||c.projectId===projectId));
  const entries=state.entries.filter(e=>e.date.startsWith(month)&&e.scope===scope&&(scope==="personal"||e.projectId===projectId));
  const income=entries.filter(e=>e.kind==="income").reduce((a,e)=>a+e.cents,0);
  const spent=entries.filter(e=>e.kind==="expense").reduce((a,e)=>a+e.cents,0);
  const planned=categories.filter(c=>c.kind==="expense").reduce((a,c)=>a+c.limitCents,0);
  const rows=categories.filter(c=>c.kind==="expense").map(cat=>{
    const actual=entries.filter(e=>e.categoryId===cat.id).reduce((a,e)=>a+e.cents,0);
    return {...cat,actual,remaining:cat.limitCents-actual,rate:cat.limitCents>0?Math.round(actual/cat.limitCents*100):0};
  });
  const over=rows.filter(row=>row.limitCents>0&&row.actual>row.limitCents);
  const alerts:string[]=[];
  if(over.length)alerts.push(over.length+" catégorie(s) ont dépassé leur plafond.");
  if(spent>income&&income>0)alerts.push("Les dépenses de ce mois dépassent les recettes enregistrées.");
  if(!entries.length)alerts.push("Ajoutez une opération pour voir les observations de ce mois.");
  return {income,spent,planned,available:planned-spent,net:income-spent,rows,entries,over,alerts};
}
export function transactionsToCSV(entries:BudgetEntry[],categories:BudgetCategory[]):string{
  const esc=(s:string)=>'"'+s.replace(/"/g,'""')+'"';
  const lines=["date,type,categorie,libelle,montant_eur,espace,projet,note"];
  for(const e of entries){
    const cat=categories.find(c=>c.id===e.categoryId);
    lines.push([e.date,e.kind,cat?.name??"",e.label,(e.cents/100).toFixed(2),e.scope,e.projectId,e.note].map(esc).join(","));
  }
  return "\uFEFF"+lines.join("\r\n");
}
export function loadProjectOptions():{id:string;name:string}[]{
  const all:{id:string;name:string}[]=[];
  try{
    const keys=["pointzero:design-current:v1","pointzero:design-drafts:v1"];
    for(const k of keys){
      const data=JSON.parse(localStorage.getItem(k)??"null") as unknown;
      const list=Array.isArray(data)?data:[data];
      for(const candidate of list){
        if(!candidate||typeof candidate!=="object")continue;
        const item=candidate as Record<string,unknown>;
        if(typeof item.id==="string"&&typeof item.name==="string"&&item.id.length<120&&item.name.length<140&&!all.some(x=>x.id===item.id))
          all.push({id:item.id,name:item.name});
      }
    }
  }catch{/* Existing drafts remain untouched. */}
  try{const world=safeWorld(JSON.parse(localStorage.getItem(WORLD_KEY)??"null"));for(const space of world?.spaces??[]){if(!all.some(x=>x.id===space.id))all.push({id:space.id,name:space.title});}}catch{/* Invalid canonical store remains untouched. */}
  return all.slice(0,60);
}
