import {assertStorageWritable,writeStoredJSON} from "./storageSafety";
import { deltaE2000 } from "./colorScience";
import { FLOSS, flossIndex } from "./dmc";
import { clonePattern, computeStats, ensurePalette, type Count, type Pattern } from "./pattern";

export type BroderieStyle = "botanique" | "minimal" | "geometrique" | "vintage" | "realiste-doux";
export type SkillLevel = "debutant" | "intermediaire" | "expert";
export interface BrodeuseProfile {
  version: 1;
  brand: string; // DMC supported, other brands informational only until official mappings exist
  preferredCodes: string[];
  stock: Record<string,{skeins:number;remainingMeters:number}>;
  skill: SkillLevel;
  style: BroderieStyle;
  maxColors: number;
  maxWidth: number; maxHeight: number;
  count: Count;
  minutes: number | null;
}
export type AdaptationMode="original"|"stock"|"debutant"|"expert"|"petit"|"reduite";
export interface AdaptationReport {
  mode:AdaptationMode;
  substitutions:{from:string;to:string;deltaE:number}[];
  warnings:string[];
  missing:{code:string;requiredMeters:number;ownedMeters:number}[];
  usedCodes:string[];
  beforeColors:number;
  afterColors:number;
  maxDeltaE:number;
  /** Heuristic count of source-neighbor boundaries that became hard to read. */
  weakBoundaries:number;
  estimatedMeters:number;
}
export interface AdaptationResult {pattern:Pattern;report:AdaptationReport}

const KEY="pointzero:brodeuse:profile-v1";
export const defaultBrodeuseProfile=():BrodeuseProfile=>({
 version:1,brand:"DMC",preferredCodes:[],stock:{},
 skill:"intermediaire",style:"botanique",maxColors:16,maxWidth:180,maxHeight:180,count:14,minutes:null,
});
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export function validatedProfile(value:unknown):BrodeuseProfile {
  const def=defaultBrodeuseProfile();
  if(!value||typeof value!=="object")return def;
  const v=value as Record<string,unknown>;
  const stock:BrodeuseProfile["stock"]={};
  if(v.stock&&typeof v.stock==="object"&&!Array.isArray(v.stock)){
    for(const [code,item] of Object.entries(v.stock)){
      if(Object.keys(stock).length>=500)break;
      if(flossIndex(code)<0||typeof item!=="object"||!item)continue;
      const i=item as Record<string,unknown>,skeins=Number(i.skeins),remainingMeters=Number(i.remainingMeters);
      if(!Number.isFinite(skeins)||!Number.isFinite(remainingMeters))continue;
      if(skeins<0||remainingMeters<0)continue;
      stock[FLOSS[flossIndex(code)].code]={skeins:clamp(Math.floor(skeins),0,1000),remainingMeters:clamp(remainingMeters,0,8)};
    }
  }
  const skill=["debutant","intermediaire","expert"].includes(String(v.skill))?v.skill as SkillLevel:def.skill;
  const style=["botanique","minimal","geometrique","vintage","realiste-doux"].includes(String(v.style))?v.style as BroderieStyle:def.style;
  const counts=[7,11,14,16,18,20,22,25,28,32,36,40];
  const codeList=Array.isArray(v.preferredCodes)?v.preferredCodes.filter((x):x is string=>typeof x==="string"&&flossIndex(x)>=0).slice(0,50):[];
  const num=(x:unknown,fallback:number,a:number,b:number)=>Number.isFinite(Number(x))?clamp(Math.round(Number(x)),a,b):fallback;
  return {version:1,brand:typeof v.brand==="string"?v.brand.slice(0,40):"DMC",
    preferredCodes:codeList,stock,skill,style,
    maxColors:num(v.maxColors,def.maxColors,2,50),maxWidth:num(v.maxWidth,def.maxWidth,20,500),
    maxHeight:num(v.maxHeight,def.maxHeight,20,500),
    count:counts.includes(Number(v.count))?Number(v.count) as Count:def.count,
    minutes:v.minutes===null||v.minutes===undefined?null:num(v.minutes,180,10,50000)};
}
export function loadBrodeuseProfile():BrodeuseProfile {
  try {
    const profile=validatedProfile(JSON.parse(localStorage.getItem(KEY)??"null"));
    const inventory=JSON.parse(localStorage.getItem("point-zero:inventory")??"null") as Record<string,{whole?:number;partialMeters?:number}>|null;
    if(!inventory||typeof inventory!=="object")return profile;
    return validatedProfile({...profile,stock:Object.fromEntries(Object.entries(inventory).map(([code,q])=>[code,{
      skeins:Number(q?.whole??0),remainingMeters:Number(q?.partialMeters??0)
    }]))});
  } catch {return defaultBrodeuseProfile();}
}
const storedProfile=(v:unknown)=>!!v&&typeof v==='object'&&!Array.isArray(v)&&(v as {version?:unknown}).version===1&&JSON.stringify(validatedProfile(v))===JSON.stringify(v);
const storedInventory=(v:unknown)=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.values(v).every(q=>!!q&&typeof q==='object'&&Number.isFinite(q.whole)&&q.whole>=0&&Number.isFinite(q.partialMeters)&&q.partialMeters>=0);
export function saveBrodeuseProfile(profile:BrodeuseProfile):void {
  try {
    const valid=validatedProfile(profile);
    assertStorageWritable(KEY,storedProfile);
    assertStorageWritable("point-zero:inventory",storedInventory);
    writeStoredJSON(KEY,JSON.stringify(valid),storedProfile);
    const old=JSON.parse(localStorage.getItem("point-zero:inventory")??"{}") as Record<string,{lot?:string}>;
    writeStoredJSON("point-zero:inventory",JSON.stringify(Object.fromEntries(Object.entries(valid.stock).map(([code,q])=>[code,{
      whole:q.skeins,partialMeters:q.remainingMeters,lot:old[code]?.lot??""
    }]))),storedInventory);
    window.dispatchEvent(new Event("pointzero:inventory-changed"));
  } catch {throw new Error("Profil non sauvegardé : stockage local indisponible.");}
}
const ownedMeters=(p:BrodeuseProfile,code:string)=>{
 const q=p.stock[code];return q? q.skeins*48+q.remainingMeters*6 : 0;
};
const usedColors=(p:Pattern)=>{
 const usage=new Map<number,number>();
 for(const i of p.cross)if(i>=0)usage.set(i,(usage.get(i)??0)+1);
 for(const arr of [p.fwd,p.bwd,...p.q])for(const i of arr)if(i>=0)usage.set(i,(usage.get(i)??0)+.5);
 for(const s of [...p.back,...p.long])usage.set(s.c,(usage.get(s.c)??0)+.12);
 return [...usage].sort((a,b)=>b[1]-a[1]||a[0]-b[0]);
};
const delta=(a:number,b:number)=>deltaE2000(FLOSS[a].lab,FLOSS[b].lab);
function paletteMapping(p:Pattern,pool:number[],limit:number){
 const source=usedColors(p),mapped=new Map<number,number>();
 const selected:number[]=[];
 const score=(idx:number)=>source.reduce((sum,[color,weight])=>sum+weight*Math.min(
   selected.length?Math.min(...selected.map(s=>delta(s,color))):80,delta(idx,color)),0);
 // Facility-location selection: prioritize maximal decrease in weighted perceptual loss.
 while(selected.length<Math.min(limit,pool.length)){
   let best=-1,lowest=Infinity;
   for(const candidate of pool)if(!selected.includes(candidate)){
     const s=score(candidate);
     if(s<lowest-1e-8 || (Math.abs(s-lowest)<1e-8 && candidate<best)){lowest=s;best=candidate;}
   }
   if(best<0)break;
   selected.push(best);
   if(lowest===0)break;
 }
 for(const [idx] of source){
   const nearest=selected.slice().sort((a,b)=>delta(idx,a)-delta(idx,b)||a-b)[0];
   if(nearest!==undefined)mapped.set(idx,nearest);
 }
 return mapped;
}
export function adaptPatternToProfile(source:Pattern,profileInput:BrodeuseProfile,mode:AdaptationMode):AdaptationResult {
 const profile=validatedProfile(profileInput),pattern=clonePattern(source);
 const warnings:string[]=[];
 if(pattern.w*pattern.h>250000)throw new Error("Adaptation limitée à 250 000 cases.");
 if(profile.brand.toLowerCase()!=="dmc")warnings.push("Stock renseigné dans une autre marque : aucune correspondance intermarques certifiée. Seules les références DMC identiques peuvent être vérifiées.");
 const originalColors=usedColors(pattern);
 if(mode!=="original")pattern.count=profile.count;
 const caps=mode==="debutant"?Math.min(profile.maxColors,8):mode==="expert"?Math.max(profile.maxColors,32):mode==="reduite"?Math.min(6,profile.maxColors):profile.maxColors;
 const stockMode=mode==="stock";
 const available=Object.keys(profile.stock).filter(c=>ownedMeters(profile,c)>0).map(flossIndex).filter(i=>i>=0);
 const fallback=originalColors.map(c=>c[0]);
 let pool:number[];
 if(mode==="original"||mode==="expert")pool=fallback;
 else if(stockMode)pool=available;
 else pool=[...new Set([...profile.preferredCodes.map(flossIndex).filter(i=>i>=0),...fallback])];
 if(stockMode && profile.brand.toLowerCase()!=="dmc")pool=[];
 if(stockMode && !pool.length){
   warnings.push("Aucun fil DMC avec quantité disponible : aucune substitution inventée, version originale conservée.");
   pool=fallback;
 }
 const mapping=(mode==="original"||mode==="expert")?new Map(originalColors.map(([i])=>[i,i])):paletteMapping(pattern,pool,Math.max(1,Math.min(caps,pool.length)));
 const replace=(i:number)=>i>=0?(mapping.get(i)??i):-1;
 for(const arr of [pattern.cross,pattern.fwd,pattern.bwd,...pattern.q])
   for(let i=0;i<arr.length;i++)if(arr[i]>=0)arr[i]=replace(arr[i]);
 for(const group of [pattern.back,pattern.long])for(const s of group)s.c=replace(s.c);
 for(const k of pattern.knots)k.c=replace(k.c);
 for(const k of pattern.special??[])k.c=replace(k.c);
 pattern.palette=[];
 const colors=new Set<number>([...pattern.cross,...pattern.fwd,...pattern.bwd,
   ...pattern.q.flatMap(a=>Array.from(a)),...pattern.back.map(s=>s.c),...pattern.long.map(s=>s.c),
   ...pattern.knots.map(s=>s.c),...(pattern.special??[]).map(s=>s.c)]);
 for(const idx of colors)if(idx>=0&&FLOSS[idx])ensurePalette(pattern,idx);
 // No impossible resampling or automated deletion: reduced sizes are offered
 // as explicit future preview requirements, never silently cropped.
 if(mode==="petit"){
   const targetW=Math.min(profile.maxWidth,pattern.w),targetH=Math.min(profile.maxHeight,pattern.h);
   warnings.push("Petit format : grille actuelle "+pattern.w+" × "+pattern.h+" ; objectif "+targetW+" × "+targetH+
     ". Réduction de grille à valider dans le réglage Dimensions pour préserver les détails. Aucun recadrage silencieux.");
 }
 if(mode!=="original" && (pattern.w>profile.maxWidth || pattern.h>profile.maxHeight))
   warnings.push("La grille dépasse le format préféré ("+profile.maxWidth+" × "+profile.maxHeight+"). Ajustement manuel nécessaire avant impression.");
 if(mode!=="original" && profile.minutes!==null)
   warnings.push("Temps disponible annoncé : "+profile.minutes+" min. Durée de broderie non estimée faute de cadence personnelle mesurée.");
 if(mode==="debutant"){
   warnings.push("Débutant : palette réduite ; points arrière et fractionnés source conservés pour ne pas effacer de détails utiles.");
 }
 const substitutions=[...mapping].filter(([a,b])=>a!==b).map(([a,b])=>({
   from:FLOSS[a].code,to:FLOSS[b].code,deltaE:+delta(a,b).toFixed(1),
 }));
 const maxDeltaE=Math.max(0,...substitutions.map(x=>x.deltaE));
 if(maxDeltaE>12)warnings.push("Certaines substitutions changent visiblement la couleur (écart CIEDE2000 supérieur à 12). Comparez à la source.");
 // Neighbor readability is a warning, not a claim of actual visible contrast.
 let weakBoundaries=0;
 for(let y=0;y<source.h;y++)for(let x=0;x<source.w;x++){
   const idx=y*source.w+x,a=source.cross[idx];
   if(a<0)continue;
   for(const j of [x+1<source.w?idx+1:-1,y+1<source.h?idx+source.w:-1]){
     if(j<0||source.cross[j]<0||source.cross[j]===a)continue;
     const old=delta(a,source.cross[j]);
     if(old>12 && delta(replace(a),replace(source.cross[j]))<5)weakBoundaries++;
   }
 }
 if(weakBoundaries>0)warnings.push(weakBoundaries+" bordures fortement contrastées à l'origine risquent de devenir peu lisibles. Vérifiez les détails avant broderie.");
 const stats=computeStats(pattern);
 const missing=stats.rows.filter(row=>row.meters>ownedMeters(profile,row.code)+.001).map(row=>({
   code:row.code,requiredMeters:+row.meters.toFixed(2),ownedMeters:+ownedMeters(profile,row.code).toFixed(2),
 }));
 if(stockMode&&missing.length)warnings.push("Stock insuffisant pour "+missing.length+" références. Le moteur ne garantit pas de broder tout le motif avec les quantités déclarées.");
 if(mode!=="original"&&profile.skill==="debutant"&&pattern.back.length>60)warnings.push("Nombreux points arrière : préférez une version simplifiée ou validez leur nécessité.");
 pattern.notes=[pattern.notes,"Variante POINTZERO : "+mode,
   "Palette : "+pattern.palette.length+" fils DMC. Substitutions : "+substitutions.length,
   ...warnings].filter(Boolean).join("\n");
 pattern.name=source.name+" · "+mode;
 pattern.adaptation={version:1,mode,substitutions,warnings,profileBrand:profile.brand};
 const report:AdaptationReport={mode,substitutions,warnings,missing,
   usedCodes:pattern.palette.map(i=>FLOSS[i].code),beforeColors:originalColors.length,
   afterColors:pattern.palette.length,maxDeltaE,weakBoundaries,
   estimatedMeters:+stats.totals.meters.toFixed(2)};
 return {pattern,report};
}

/** No product/payment link. A future shop supplies an owned licensed Pattern. */
export function previewBoutiqueVariants(pattern:Pattern,profile:BrodeuseProfile){
 return (["original","stock","debutant","expert","petit","reduite"] as AdaptationMode[])
   .map(mode=>adaptPatternToProfile(pattern,profile,mode));
}
