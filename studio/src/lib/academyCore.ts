import {designVariables} from "./designSystem";
import {writeStoredJSON} from "./storageSafety";
/**
 * POINTZERO Academy — a genuinely editable, local-first website and learning project.
 * No fake multi-tenant accounts, published hosting, course certification or LMS backend.
 */
import { contrastGrade } from "./accessibilityCore";
export const ACADEMY_KEY="pointzero:academy:project:v1";
export const ACADEMY_PROGRESS_KEY="pointzero:academy:learning:v1";
export type SectionKind="hero"|"intro"|"cards"|"quote"|"callout"|"footer";
export type Device="desktop"|"tablet"|"mobile";
export type AcademyTemplate="artisan"|"association"|"portfolio";
export type SiteSection={
 id:string;kind:SectionKind;title:string;body:string;actionLabel:string;actionHref:string;
};
export type SiteProject={
 version:1;id:string;name:string;siteTitle:string;accent:string;background:string;foreground:string;
 font:"sans"|"serif";template:AcademyTemplate;sections:SiteSection[];updated:string;
 dossierBinding?:{spaceId:string;titleMode:"linked"|"custom";objectivesMode?:"linked"|"custom"}
};
export type CustomExercise={id:string;title:string;instructions:string};
export type LearningState={version:1;completedCustom:string[];exercises:CustomExercise[];notes:string};
export type AcademyLesson={
 id:string;title:string;description:string;task:string;validate:(p:SiteProject)=>boolean
};
export const palettes=[
 {name:"Lavande",accent:"#6547bb",background:"#ffffff",foreground:"#20202a"},
 {name:"Nature",accent:"#216a51",background:"#fbfdf8",foreground:"#192b22"},
 {name:"Marine",accent:"#22569b",background:"#fcfdff",foreground:"#162439"},
 {name:"Chaleur",accent:"#963e5a",background:"#fffcfa",foreground:"#302129"}
] as const;
const templates:{id:AcademyTemplate;title:string;subtitle:string;hero:string;description:string;cta:string;category:string}[]=[
 {id:"artisan",title:"Site professionnel",subtitle:"Prestataire · indépendant",hero:"Votre savoir-faire mérite de rayonner.",
  description:"Un accueil chaleureux, une présentation claire de votre métier et un contact direct pour vos clients.",cta:"Prendre contact",category:"Mes prestations"},
 {id:"association",title:"Site associatif",subtitle:"Culture · solidarité",hero:"L'art crée des liens entre les générations.",
  description:"Une place pour créer, partager et soutenir les projets qui rapprochent les personnes.",cta:"Découvrir l'association",category:"Nos actions"},
 {id:"portfolio",title:"Portfolio créatif",subtitle:"Artiste · designer",hero:"Des idées qui prennent forme.",
  description:"Un espace simple pour présenter vos créations, vos projets et votre démarche.",cta:"Voir mes projets",category:"Mes créations"}
];
export const ACADEMY_TEMPLATES=templates;
const uid=()=>globalThis.crypto?.randomUUID?.()??Math.random().toString(36).slice(2);
const today=()=>new Date().toISOString().slice(0,10);
const color=(s:unknown)=>typeof s==="string"&&/^#[a-f0-9]{6}$/i.test(s);
const short=(s:unknown,len:number)=>typeof s==="string"&&s.length<=len;
const validKinds:SectionKind[]=["hero","intro","cards","quote","callout","footer"];
const templatesIDs:AcademyTemplate[]=["artisan","association","portfolio"];
/** Only relative, HTTPS, email or telephone URLs can leave exported pages. */
export function safeHref(input:string):string{
 const href=input.trim();
 if(href==="")return "";
 if(/^#[a-z0-9_-]+$/i.test(href))return href;
 if(/^\/(?!\/)[a-z0-9\-_/]*(?:\?[a-z0-9=&%._-]*)?$/i.test(href))return href;
 if(/^https:\/\/[^\s<>"']+$/i.test(href))return href;
 if(/^mailto:[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(href))return href;
 if(/^tel:\+?[0-9() .-]{4,22}$/i.test(href))return href;
 return "";
}
export const makeSection=(kind:SectionKind):SiteSection=>{
 const label:{[K in SectionKind]:{title:string;body:string;actionLabel:string;actionHref:string}}={
  hero:{title:"Votre titre principal",body:"Présentez ici votre activité.",actionLabel:"Nous contacter",actionHref:"mailto:bonjour@example.com"},
  intro:{title:"Notre histoire",body:"Racontez votre projet en quelques mots.",actionLabel:"",actionHref:""},
  cards:{title:"Ce que nous proposons",body:"Un service clair\nUne autre idée\nUn accompagnement",actionLabel:"",actionHref:""},
  quote:{title:"Une phrase qui nous représente",body:"Une citation ou une intention personnelle.",actionLabel:"",actionHref:""},
  callout:{title:"Un projet en tête ?",body:"Échangeons et construisons votre prochain projet.",actionLabel:"Écrire un message",actionHref:"mailto:bonjour@example.com"},
  footer:{title:"Restons en lien",body:"Merci de votre visite.",actionLabel:"Écrivez-nous",actionHref:"mailto:bonjour@example.com"}
 };
 return {id:uid(),kind,...label[kind]};
};
export function makeAcademyProject(template:AcademyTemplate="artisan"):SiteProject{
 const seed=templates.find(t=>t.id===template)??templates[0];
 const base=makeSection("hero"),intro=makeSection("intro"),cards=makeSection("cards"),footer=makeSection("footer");
 return {version:1,id:uid(),name:seed.title,siteTitle:seed.title,accent:template==="association"?"#216a51":template==="portfolio"?"#963e5a":"#6547bb",
  background:"#ffffff",foreground:"#20202a",font:"sans",template,
  sections:[
   {...base,title:seed.hero,body:seed.description,actionLabel:seed.cta,actionHref:"mailto:bonjour@example.com"},
   {...intro,title:"Bienvenue",body:"Une histoire à raconter, un savoir-faire à transmettre et des personnes à rencontrer."},
   {...cards,title:seed.category,body:"Découvrir notre univers\nImaginer ensemble\nPartager une expérience"},
   {...footer,title:"Restons en contact",body:"À bientôt autour de votre projet."}
  ],updated:today()};
}
export function validProject(data:unknown):SiteProject|null{
 if(!data||typeof data!=="object")return null;
 const p=data as Partial<SiteProject>;
 if(p.version!==1||!short(p.id,100)||!p.id||!short(p.name,100)||!short(p.siteTitle,100)||
  !color(p.accent)||!color(p.background)||!color(p.foreground)||!["sans","serif"].includes(p.font as string)||
  !templatesIDs.includes(p.template as AcademyTemplate)||!short(p.updated,30)||
  !Array.isArray(p.sections)||p.sections.length<1||p.sections.length>45||
  (p.dossierBinding!==undefined&&(!p.dossierBinding||!short(p.dossierBinding.spaceId,100)||!p.dossierBinding.spaceId||!["linked","custom"].includes(p.dossierBinding.titleMode)||
   (p.dossierBinding.objectivesMode!==undefined&&!["linked","custom"].includes(p.dossierBinding.objectivesMode)))))return null;
 const ids=new Set<string>();
 for(const section of p.sections){
  if(!section||!short(section.id,100)||!section.id||ids.has(section.id)||
    !validKinds.includes(section.kind)||!short(section.title,150)||!short(section.body,1800)||
    !short(section.actionLabel,80)||!short(section.actionHref,300)|| (section.actionHref&&!safeHref(section.actionHref)))return null;
  ids.add(section.id);
 }
 return p as SiteProject;
}
/** Read-through projection: the canonical title is NEVER copied back into a linked site.
 * Explicit personalization switches titleMode to "custom" and is not overwritten.
 */
export function academyDisplayProject(project:SiteProject,source:{id:string;title:string;objectives?:string[];dossier?:{objectives:string[]}}|null):SiteProject{
 if(!source||project.dossierBinding?.spaceId!==source.id)return project;
 const titleLinked=project.dossierBinding.titleMode==="linked";
 const objectivesLinked=project.dossierBinding.objectivesMode==="linked";
 const objectives=source.objectives??source.dossier?.objectives??[];
 return {...project,
  name:titleLinked?source.title:project.name,
  siteTitle:titleLinked?source.title:project.siteTitle,
  sections:objectivesLinked?
   project.sections.map(section=>section.kind==="intro"?{...section,body:objectives.length?
    objectives.map((v,i)=>(i+1)+". "+v).join("\n"):"Aucun objectif pédagogique renseigné dans le Dossier Universel."}:section):project.sections
 };
}
export const defaultLearning=():LearningState=>({version:1,completedCustom:[],exercises:[],notes:""});
export function validLearning(data:unknown):LearningState|null{
 if(!data||typeof data!=="object")return null;
 const v=data as Partial<LearningState>;
 if(v.version!==1||!Array.isArray(v.exercises)||v.exercises.length>20||
   !Array.isArray(v.completedCustom)||v.completedCustom.length>20||!short(v.notes,2400))return null;
 const ids=new Set<string>();
 for(const e of v.exercises){
   if(!e||!short(e.id,100)||!e.id||ids.has(e.id)||!short(e.title,100)||!short(e.instructions,800))return null;
   ids.add(e.id);
 }
 if(v.completedCustom.some(id=>typeof id!=="string"||!ids.has(id)))return null;
 return v as LearningState;
}
export const readAcademy=():SiteProject=>{
 try{return validProject(JSON.parse(localStorage.getItem(ACADEMY_KEY)??"null"))??makeAcademyProject();}
 catch{return makeAcademyProject();}
};
export const readLearning=():LearningState=>{
 try{return validLearning(JSON.parse(localStorage.getItem(ACADEMY_PROGRESS_KEY)??"null"))??defaultLearning();}
 catch{return defaultLearning();}
};
export function writeAcademy(p:SiteProject){
 if(!validProject(p))throw Error("Projet non valide.");
 writeStoredJSON(ACADEMY_KEY,JSON.stringify(p),validProject);
}
export const ACADEMY_LESSONS:AcademyLesson[]=[
 {id:"hero",title:"Personnaliser l'accueil",description:"Écrire pour être compris en une seconde.",
   task:"Modifiez le titre principal du premier écran pour qu'il décrive réellement votre activité.",
   validate:p=>p.sections.find(s=>s.kind==="hero")?.title.trim()!==templates.find(t=>t.id===p.template)?.hero&&
    (p.sections.find(s=>s.kind==="hero")?.title.trim().length??0)>=12},
 {id:"identity",title:"Définir l'identité",description:"Donner un nom explicite à son site.",
   task:"Remplacez le nom générique du site par celui de votre projet ou activité.",
   validate:p=>p.siteTitle.trim().length>=3&&p.siteTitle.trim()!==templates.find(t=>t.id===p.template)?.title},
 {id:"message",title:"Raconter en quelques lignes",description:"Un paragraphe utile vaut mieux qu'un long discours.",
   task:"Rédigez votre propre présentation dans la section « Bienvenue ».",
   validate:p=>p.sections.some(s=>s.kind==="intro"&&s.body.trim().length>=40&&s.body!=="Une histoire à raconter, un savoir-faire à transmettre et des personnes à rencontrer.")},
 {id:"layout",title:"Composer avec des blocs",description:"Une hiérarchie visuelle sans une ligne de code.",
   task:"Ajoutez une nouvelle section à la page depuis le panneau de gauche.",
   validate:p=>p.sections.length>=5},
 {id:"brand",title:"Construire sa palette",description:"Définir une couleur et vérifier le contraste.",
   task:"Choisissez une couleur de marque et obtenez un contraste AA sur le texte principal.",
   validate:p=>contrastGrade(p.foreground,p.background).normalAA&&p.accent!==(p.template==="association"?"#216a51":p.template==="portfolio"?"#963e5a":"#6547bb")},
 {id:"action",title:"Donner envie d'agir",description:"Un bouton doit annoncer une vraie destination.",
   task:"Modifiez le texte et la destination du bouton principal (lien HTTPS, mail, téléphone ou ancre).",
   validate:p=>{const h=p.sections.find(s=>s.kind==="hero");
     return !!h&&!!h.actionLabel.trim()&&h.actionHref!==""&&!!safeHref(h.actionHref)&&h.actionHref!=="mailto:bonjour@example.com";}},
 {id:"handoff",title:"Préparer une livraison",description:"Un site peut se lire et se modifier sans dépendance cachée.",
   task:"Vérifiez que votre site comporte un accueil, un pied de page et des textes renseignés.",
   validate:p=>p.sections.some(s=>s.kind==="hero")&&p.sections.some(s=>s.kind==="footer")&&
     p.sections.every(s=>s.title.trim().length>=3)&&contrastGrade(p.foreground,p.background).normalAA}
];
export const courseProgress=(p:SiteProject,l:LearningState)=>{
 const complete=ACADEMY_LESSONS.filter(lesson=>lesson.validate(p)).map(lesson=>lesson.id);
 return {passed:complete.length,all:ACADEMY_LESSONS.length,percentage:Math.round(complete.length/ACADEMY_LESSONS.length*100),ids:complete,
   customPassed:l.completedCustom.length,customAll:l.exercises.length};
};
const html=(text:string)=>text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const multiline=(text:string)=>text.split(/\n/g).map(html).join("<br>");
export function exportAcademyHTML(p:SiteProject):string{
 if(!validProject(p))throw Error("Page invalide.");
 const nav=p.sections.filter(s=>s.kind!=="footer"&&s.kind!=="hero").map(s=>'<a href="#part-'+html(s.id)+'">'+html(s.title)+'</a>').join("");
 const sections=p.sections.map(s=>{
  const heading=s.kind==="hero"?"h1":"h2";
  const items=s.kind==="cards"?
   '<div class="cards">'+s.body.split(/\n+/g).filter(Boolean).slice(0,8).map(v=>'<div class="card">'+html(v)+'</div>').join("")+"</div>":
   '<p>'+multiline(s.body)+'</p>';
  const link=s.actionLabel&&safeHref(s.actionHref)?'<a class="button" href="'+html(safeHref(s.actionHref))+'">'+html(s.actionLabel)+'</a>':"";
  const semantic=s.kind==="footer"?"footer":"section";
  return '<'+semantic+' id="part-'+html(s.id)+'" class="block block-'+s.kind+'">'+
    '<'+heading+'>'+html(s.title)+'</'+heading+'>'+items+link+'</'+semantic+'>';
 }).join("");
 return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta name="description" content="'+html(p.siteTitle)+'"><title>'+html(p.siteTitle)+'</title>'+
  '<style>'+(':root{'+designVariables()+'}')+':root{--ink:'+p.foreground+';--bg:'+p.background+';--accent:'+p.accent+'}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font-family:'+(p.font==="serif"?'Georgia,serif':'system-ui,-apple-system,sans-serif')+';line-height:1.65}a{color:inherit}a:focus-visible{outline:3px solid var(--accent);outline-offset:4px}.top{position:sticky;top:0;display:flex;justify-content:space-between;align-items:center;gap:20px;padding:20px max(22px,6vw);background:var(--bg);border-bottom:1px solid #9995}.top nav{display:flex;gap:18px;flex-wrap:wrap}.top nav a{text-decoration:none;font-size:13px}.block{padding:clamp(45px,8vw,110px) max(22px,8vw);max-width:var(--aime-content);margin:auto}.block-hero{min-height:480px;display:flex;flex-direction:column;justify-content:center;background:linear-gradient(120deg,var(--bg),color-mix(in srgb,var(--accent) 10%,var(--bg)))}h1{max-width:850px;font-size:clamp(38px,5vw,82px);letter-spacing:-.045em;line-height:1.1}h2{font-size:clamp(27px,3.4vw,48px);letter-spacing:-.025em}p{max-width:780px;font-size:clamp(16px,1.5vw,19px)}.button{display:inline-flex;margin-top:20px;padding:14px 23px;border-radius:var(--aime-pill);background:var(--accent);color:#fff;text-decoration:none;font-weight:700}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px}.card{padding:25px;border-radius:9px;background:color-mix(in srgb,var(--accent) 10%,var(--bg));border:1px solid #7773}.block-footer{border-top:1px solid #7773;padding-block:45px}@media(max-width:560px){.top{display:block}.top nav{padding-top:12px}h1{font-size:36px}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}</style>'+
  '</head><body><header class="top"><strong>'+html(p.siteTitle)+'</strong><nav aria-label="Sections">'+nav+'</nav></header><main>'+
  sections+'</main></body></html>';
}
