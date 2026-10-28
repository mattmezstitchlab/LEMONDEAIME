import {writeStoredJSON} from "./storageSafety";
/** Persistent accessibility preferences and a bounded first-pass markup audit.
 * A partial automated audit is never a certificate of WCAG/RGAA compliance. */
export const ACCESS_KEY="pointzero:accessibility:v1";
export type Theme="system"|"dark"|"light";
export type Vision="standard"|"daltonisme"|"monochrome";
export type Preferences={version:1;theme:Theme;vision:Vision;fontScale:number;lineHeight:number;spacing:number;contrast:"normal"|"strong";
 reduceMotion:boolean;enhancedFocus:boolean;readingGuide:boolean;privacyBlur:boolean;accent:string};
export const DEFAULT_ACCESS:Preferences={
 version:1,theme:"system",vision:"standard",fontScale:1,lineHeight:1.5,spacing:0,
 contrast:"normal",reduceMotion:false,enhancedFocus:false,readingGuide:false,privacyBlur:false,accent:"#7562ce"
};
const colors=["#7562ce","#0d766b","#a14878","#2457ac","#a56c20","#1d1d1d"];
export const ACCENTS=colors.map((hex,i)=>({hex,name:["Lavande","Sauge foncée","Prune","Bleu","Ocre","Noir"][i]}));
const finite=(value:unknown,min:number,max:number)=>typeof value==="number"&&Number.isFinite(value)&&value>=min&&value<=max;
export function parsePrefs(value:unknown):Preferences|null{
 if(!value||typeof value!=="object")return null;
 const p=value as Partial<Preferences>;
 if(p.version!==1||!["system","dark","light"].includes(p.theme as string)||!["standard","daltonisme","monochrome"].includes(p.vision as string)||
 !finite(p.fontScale,1,1.75)||!finite(p.lineHeight,1.2,2.1)||!finite(p.spacing,0,0.15)||!["normal","strong"].includes(p.contrast as string)||
 typeof p.reduceMotion!=="boolean"||typeof p.enhancedFocus!=="boolean"||typeof p.readingGuide!=="boolean"||typeof p.privacyBlur!=="boolean"||
 !colors.includes(p.accent as string))return null;
 return p as Preferences;
}
export function readPrefs():Preferences{
 try{return parsePrefs(JSON.parse(localStorage.getItem(ACCESS_KEY)??"null"))??{...DEFAULT_ACCESS};}
 catch{return {...DEFAULT_ACCESS};}
}
export function savePrefs(p:Preferences):void{
 const safe=parsePrefs(p);
 if(!safe)throw Error("Préférences d’accessibilité invalides.");
 writeStoredJSON(ACCESS_KEY,JSON.stringify(safe),parsePrefs);
 window.dispatchEvent(new CustomEvent("pz:accessibility",{detail:safe}));
}
export function resolvedTheme(p:Preferences,systemDark:boolean):"dark"|"light"{
 return p.theme==="system"?(systemDark?"dark":"light"):p.theme;
}
export function applyPrefs(p:Preferences):void{
 const root=document.documentElement;
 const systemDark=window.matchMedia?.("(prefers-color-scheme: dark)")?.matches??true;
 const systemReduced=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches??false;
 root.dataset.pzTheme=resolvedTheme(p,systemDark);
 root.dataset.pzVision=p.vision;
 root.dataset.pzContrast=p.contrast;
 root.dataset.pzMotion=p.reduceMotion||systemReduced?"reduce":"standard";
 root.dataset.pzFocus=p.enhancedFocus?"strong":"standard";
 root.dataset.pzDiscretion=p.privacyBlur?"on":"off";
 root.dataset.pzTextScale=p.fontScale!==1||p.lineHeight!==1.5||p.spacing!==0?"custom":"standard";
 root.style.setProperty("--pz-accent",p.accent);
 root.style.setProperty("--pz-user-font-scale",String(p.fontScale));
 root.style.setProperty("--pz-user-line-height",String(p.lineHeight));
 root.style.setProperty("--pz-user-letter-spacing",p.spacing+"em");
}
const luminance=(hex:string)=>{
 if(!/^#[a-f\d]{6}$/i.test(hex))throw Error("Couleur invalide. Utilisez #RRGGBB.");
 const n=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
 return n[0]*.2126+n[1]*.7152+n[2]*.0722;
};
export function ratio(a:string,b:string){
 const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
export function contrastGrade(a:string,b:string){
 const r=ratio(a,b);
 return {ratio:r,normalAA:r>=4.5,largeAA:r>=3,normalAAA:r>=7,uiAA:r>=3};
}
export function bestInk(bg:string):"#000000"|"#ffffff"{
 return ratio(bg,"#000000")>=ratio(bg,"#ffffff")?"#000000":"#ffffff";
}
export type AuditIssue={code:string;severity:"error"|"warning";detail:string;where:string};
export type AuditResult={checked:number;issues:AuditIssue[];limitations:string[]};
const shortWhere=(el:Element)=>{
 const id=el.id?"#"+el.id.slice(0,60):"";
 const cls=el.classList?.length?"."+String(el.classList[0]).slice(0,40):"";
 return el.tagName.toLowerCase()+id+cls;
};
/** Static local HTML only: checks semantics; not actual browser layout, CSS or keyboard interactions. */
export function auditMarkup(markup:string):AuditResult{
 if(markup.length>1_500_000)throw Error("Code HTML trop volumineux (1,5 Mo maximum).");
 if(typeof DOMParser==="undefined")throw Error("Analyse HTML indisponible.");
 const doc=new DOMParser().parseFromString(markup,"text/html");
 const issues:AuditIssue[]=[];let checked=0;
 const add=(code:string,detail:string,el:Element,severity:"error"|"warning"="error")=>{
   if(issues.length<400)issues.push({code,detail,where:shortWhere(el),severity});
 };
 if(!doc.documentElement.getAttribute("lang")?.trim())add("LANG","Langue du document absente (html lang).",doc.documentElement);
 checked++;
 if(!doc.title?.trim())add("TITLE","Titre de page absent ou vide.",doc.head);checked++;
 const h1=doc.querySelectorAll("h1");
 if(!h1.length)add("H1","Aucun titre principal h1.",doc.body,"warning");
 if(h1.length>1)add("H1","Plusieurs h1 : vérifier leur pertinence et la hiérarchie.",doc.body,"warning");
 checked++;
 let previous=0;
 for(const h of doc.querySelectorAll("h1,h2,h3,h4,h5,h6")){
   const level=Number(h.tagName.slice(1));
   if(previous&&level>previous+1)add("HEADINGS","Saut de niveau de titre : h"+previous+" → h"+level+".",h,"warning");
   previous=level;checked++;
 }
 for(const img of doc.querySelectorAll("img")){
   checked++;
   if(!img.hasAttribute("alt"))add("IMG_ALT","Image sans attribut alt : renseigner alt, y compris alt vide pour un décor.",img);
 }
 for(const el of doc.querySelectorAll("button,[role='button']")){
   checked++;
   const title=el.getAttribute("aria-label")||el.getAttribute("aria-labelledby")||el.textContent||el.getAttribute("title")||"";
   if(!title.trim()&&!(el.querySelector("img[alt]")?.getAttribute("alt")??"").trim())
     add("BUTTON_NAME","Bouton sans nom accessible évident.",el);
 }
 for(const el of doc.querySelectorAll("a[href]")){
   checked++;
   const name=el.getAttribute("aria-label")||el.getAttribute("aria-labelledby")||el.textContent||el.querySelector("img[alt]")?.getAttribute("alt")||"";
   if(!name.trim())add("LINK_NAME","Lien sans nom accessible évident.",el);
 }
 for(const el of doc.querySelectorAll("input:not([type=hidden]),textarea,select")){
   checked++;
   const id=el.getAttribute("id"),aria=el.getAttribute("aria-label")||el.getAttribute("aria-labelledby");
   const label=el.closest("label")||(id?[...doc.querySelectorAll("label[for]")].find(l=>l.getAttribute("for")===id):null);
   if(!aria?.trim()&&!label&&!el.getAttribute("title")?.trim())add("INPUT_NAME","Champ sans étiquette accessible.",el);
 }
 for(const frame of doc.querySelectorAll("iframe")){
   checked++;
   if(!frame.getAttribute("title")?.trim())add("FRAME_TITLE","iFrame sans titre.",frame);
 }
 return {checked,issues,limitations:[
  "Analyse statique du HTML fourni, sans chargement ni exécution de scripts.",
  "Les CSS externes, contrastes calculés, interactions clavier, lecteurs d’écran, responsive et médias doivent être testés séparément.",
  "Une absence d'alertes ne signifie pas conformité WCAG 2.2, RGAA ou EN 301 549.",
  "WCAG 3.0 est encore un projet en cours et ne sert pas de certification."
 ]};
}
