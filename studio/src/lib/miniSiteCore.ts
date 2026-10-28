import {compositionCSS,type CompositionMode} from "./compositionLayout";
import {DESIGN_SYSTEM,standaloneDesignCSS} from "./designSystem";
/** POINTZERO mini-sites: responsive static pages generated locally, without hosting or server forms. */
import {safeHref} from "./academyCore";
import {externalById,safeExternalURL} from "./externalProjects";
export type MiniKind = "mariage" | "portfolio" | "evenement" | "presentation";
export type MiniSectionKind = "texte" | "programme" | "informations" | "galerie" | "contact" | "externe";
export interface MiniSection {
  id:string;kind:MiniSectionKind;title:string;body:string;visible:boolean;externalRefId?:string;
}
export interface MiniSite {
  version:1;id:string;name:string;kind:MiniKind;title:string;subtitle:string;
  designVersion?:"1.0.0";
  compositionMode?:CompositionMode;
  dossierBinding?:{version:1;spaceId:string;programmeSectionId:string;programmeMode:"linked"|"custom"};
  eyebrow:string;date:string;place:string;contact:string;
  primaryColor:string;background:string;heroImage:string;
  heroAlt?:string;heroActionLabel?:string;heroActionHref?:string;
  sections:MiniSection[]; projectId:string;
}
export const MINI_KEY="pointzero:minisite:v1";
export const MINI_DRAFTS="pointzero:minisite-drafts:v1";
export const MINI_KINDS:{id:MiniKind;name:string}[]=[
  {id:"mariage",name:"Mariage"},{id:"portfolio",name:"Portfolio"},
  {id:"evenement",name:"Événement"},{id:"presentation",name:"Présentation"}
];
const id=()=>globalThis.crypto?.randomUUID?.()??Math.random().toString(36).slice(2);
const section=(kind:MiniSectionKind,title:string,body:string):MiniSection=>({id:id(),kind,title,body,visible:true});
const defaultBlocks:Record<MiniKind,Array<[MiniSectionKind,string,string]>>={
  mariage:[["texte","Notre histoire","Un beau moment à partager, entourés de nos proches."],["programme","Le programme","15:00 · Accueil\n16:00 · Cérémonie\n18:00 · Cocktail"],["informations","Infos pratiques","Adresse et indications à compléter."],["contact","Confirmer votre présence","Contactez-nous à l'adresse indiquée ci-dessous."]],
  portfolio:[["texte","À propos","Présentez votre univers et vos projets."],["galerie","Réalisations","Projet 1\nProjet 2\nProjet 3"],["contact","Parlons de votre projet","Écrivez-moi pour une collaboration."]],
  evenement:[["texte","L'événement","Découvrez ce qui vous attend."],["programme","Programme","09:00 · Accueil\n10:00 · Rencontre\n12:00 · Échanges"],["informations","Lieu et accès","Précisez ici les informations utiles."],["contact","Contact","Une question ? Écrivez-nous."]],
  presentation:[["texte","Notre vision","La présentation de votre activité, tout simplement."],["galerie","Nos projets","Une sélection de créations."],["informations","Informations","Retrouvez ici les informations essentielles."],["contact","Nous contacter","Prenons contact pour en discuter."]]
};
const defaults:Record<MiniKind,[string,string,string,string,string]>={
  mariage:["Camille & Gabriel","Nous avons le bonheur de vous inviter","LE GRAND JOUR",DESIGN_SYSTEM.tokens.petrol,DESIGN_SYSTEM.tokens.subtle],
  portfolio:["Une signature singulière","Découvrez mes créations et mon univers","PORTFOLIO","#726763","#faf8f5"],
  evenement:["Une rencontre à vivre","Toutes les informations au même endroit","ÉVÉNEMENT","#526b78","#f7f8f8"],
  presentation:["Votre univers prend forme","Une page simple pour présenter l'essentiel","BIENVENUE","#655f7b","#f8f7fa"]
};
export function createMiniSite(kind:MiniKind="mariage"):MiniSite{
  const [title,subtitle,eyebrow,primaryColor,background]=defaults[kind];
  return {version:1,designVersion:DESIGN_SYSTEM.version as "1.0.0",id:id(),name:MINI_KINDS.find(x=>x.id===kind)!.name+" sans titre",kind,title,subtitle,eyebrow,date:"",place:"",contact:"",primaryColor,background,heroImage:"",
    sections:defaultBlocks[kind].map(([k,t,b])=>section(k,t,b)),projectId:"",heroAlt:"",heroActionLabel:"",heroActionHref:""};
}
export const miniSection=(kind:MiniSectionKind):MiniSection=>{
  const titles:Record<MiniSectionKind,string>={texte:"Nouvelle section",programme:"Programme",informations:"Informations",galerie:"Galerie",contact:"Contact",externe:"Projet externe"};
  return {...section(kind,titles[kind],kind==="externe"?"Une application complémentaire à découvrir.":"Ajoutez votre contenu ici."),...(kind==="externe"?{externalRefId:""}:{})};
};
export const validHex=(s:unknown)=>typeof s==="string"&&/^#[0-9a-f]{6}$/i.test(s);
export const safeHero=(src:unknown)=>typeof src==="string"&&(!src||(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(src)&&src.length<5_500_000));
export function safeMiniSite(value:unknown):MiniSite|null {
  if(!value||typeof value!=="object")return null;
  const d=value as Partial<MiniSite>;
  if(d.compositionMode!==undefined&&!["editorial","regular","immersive"].includes(d.compositionMode))return null;
  if(d.designVersion!==undefined&&d.designVersion!=="1.0.0")return null;
  if(d.version!==1||typeof d.id!=="string"||d.id.length>120||!MINI_KINDS.some(k=>k.id===d.kind)||
    !["name","title","subtitle","eyebrow","date","place","contact","projectId"].every(k=>{
      const v=d[k as keyof MiniSite];return typeof v==="string"&&v.length<1000;
    })||!validHex(d.primaryColor)||!validHex(d.background)||!safeHero(d.heroImage)||
    !Array.isArray(d.sections)||d.sections.length>16||
    !["heroAlt","heroActionLabel","heroActionHref"].every(key=>{
      const v=d[key as keyof MiniSite];return v===undefined||(typeof v==="string"&&v.length<320);
    })|| (d.heroActionHref!==undefined&&d.heroActionHref!==""&&!safeHref(d.heroActionHref)))return null;
  if(d.dossierBinding!==undefined){const b=d.dossierBinding;if(!b||b.version!==1||typeof b.spaceId!=="string"||!b.spaceId||b.spaceId.length>100||d.projectId!==b.spaceId||typeof b.programmeSectionId!=="string"||!["linked","custom"].includes(b.programmeMode)||!d.sections.some(s=>s&&s.id===b.programmeSectionId&&s.kind==="programme"))return null;}
  const ids=new Set<string>();
  for(const s of d.sections){
    if(!s||typeof s.id!=="string"||s.id.length>120||ids.has(s.id)||
      !["texte","programme","informations","galerie","contact","externe"].includes(s.kind)||
      typeof s.title!=="string"||s.title.length>300||typeof s.body!=="string"||s.body.length>5000||
      typeof s.visible!=="boolean"||(s.externalRefId!==undefined&&(typeof s.externalRefId!=="string"||s.externalRefId.length>100)))return null;
    ids.add(s.id);
  }
  return d as MiniSite;
}
const esc=(text:string)=>text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&#34;").replace(/'/g,"&#39;");
const plain=(text:string)=>esc(text).replace(/\n/g,"<br>");
const emailOK=(email:string)=>/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(email)&&email.length<255;
function sectionHTML(s:MiniSection,contact:string){
  const blocks=s.kind==="programme"?s.body.split(/\r?\n/).filter(Boolean).map(line=>'<li>'+esc(line)+'</li>').join(""):"";
  let content=s.kind==="programme"?"<ul>"+blocks+"</ul>":'<p class="paragraph">'+plain(s.body)+'</p>';
  if(s.kind==="galerie"){
    content='<div class="gallery">'+s.body.split(/\r?\n/).filter(Boolean).slice(0,12).map(v=>'<div class="gallery-card">'+esc(v)+'</div>').join("")+'</div>';
  }
  if(s.kind==="externe"){
    const res=s.externalRefId?externalById(s.externalRefId):null;
    const url=res?safeExternalURL(res.url):"";
    content=url?'<div class="external-project" data-external-url="'+esc(url)+'">'+
      '<p>'+plain(s.body)+'</p><a class="cta" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Ouvrir '+esc(res!.title)+' ↗</a>'+
      '<p class="external-note">Application externe : l’aperçu demande votre accord et peut être bloqué par son hébergeur.</p>'+
      '<button class="cta external-load" type="button">Afficher ici à ma demande</button>'+
      '<div class="external-embed-target"></div></div>':
      '<p>Projet externe non relié ou indisponible. Sélectionnez-le dans POINTZERO avant l’export.</p>';
  }
  if(s.kind==="contact"&&emailOK(contact))content+='<p><a class="cta" href="mailto:'+encodeURIComponent(contact)+'?subject='+encodeURIComponent("Contact mini-site")+'">Écrire un message ↗</a></p>';
  return '<section id="s-'+esc(s.id)+'" class="section"><div class="section-inner"><span class="kicker">'+esc(s.kind)+'</span><h2>'+esc(s.title)+'</h2>'+content+'</div></section>';
}
export function miniSiteToHTML(doc:MiniSite):string {
  // All visible fields are escaped. Optional external section loads third-party content only on a visitor click.
  const sections=doc.sections.filter(s=>s.visible);
  const hasExternal=sections.some(s=>s.kind==="externe"&&s.externalRefId&&externalById(s.externalRefId));
  const links=sections.map(s=>'<a href="#s-'+esc(s.id)+'">'+esc(s.title)+'</a>').join("");
  const hero=doc.heroImage&&safeHero(doc.heroImage)?'<img class="hero-image" alt="'+esc(doc.heroAlt??"")+'" src="'+doc.heroImage+'">':"";
  const heroCTA=doc.heroActionLabel&&doc.heroActionHref&&safeHref(doc.heroActionHref)?
    '<a class="cta hero-cta" href="'+esc(safeHref(doc.heroActionHref))+'">'+esc(doc.heroActionLabel)+'</a>':"";
  const safeMail=emailOK(doc.contact)?'<a href="mailto:'+encodeURIComponent(doc.contact)+'">'+esc(doc.contact)+'</a>':esc(doc.contact);
  return '<!doctype html><html lang="fr" data-aime-design-version="'+(doc.designVersion==='1.0.0'?DESIGN_SYSTEM.version:'legacy')+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<meta name="description" content="'+esc(doc.subtitle)+'"><title>'+esc(doc.title)+'</title>'+
    '<style>'+(doc.designVersion==='1.0.0'||doc.compositionMode?standaloneDesignCSS():'')+':root{--accent:'+doc.primaryColor+';--paper:'+doc.background+'}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:#171719;font:16px/1.65 -apple-system,BlinkMacSystemFont,"Helvetica Neue",sans-serif}'+
    '.site-header{height:76px;display:flex;align-items:center;justify-content:space-between;gap:30px;padding:0 max(24px,calc((100vw - 1120px)/2));background:var(--paper);position:sticky;top:0;z-index:3;border-bottom:1px solid #0001}'+
    '.brand{font-size:15px;font-weight:700;text-decoration:none;color:inherit}.nav{display:flex;gap:20px;overflow:auto;white-space:nowrap}.nav a{font-size:12px;color:#333;text-decoration:none}.nav a:hover{text-decoration:underline}'+
    '.hero{min-height:550px;display:grid;place-items:center;text-align:center;padding:95px 24px;position:relative;isolation:isolate;overflow:hidden}'+
    '.hero-image{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.22;z-index:-1}.eyebrow,.kicker{font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--accent)}'+
    'h1{font-size:clamp(42px,7vw,86px);font-weight:500;line-height:1.07;letter-spacing:-.045em;max-width:900px;margin:28px auto}'+
    '.subtitle{max-width:650px;margin:25px auto;color:#4b4b50;font-size:clamp(15px,2vw,20px)}.meta{font-size:13px;white-space:pre-wrap}.section{padding:85px 24px;border-top:1px solid #0001}.section:nth-of-type(even){background:#fff8}.section-inner{max-width:810px;margin:0 auto}'+
    'h2{font-size:clamp(31px,4vw,52px);line-height:1.16;letter-spacing:-.035em;font-weight:500;margin:13px 0 25px}.paragraph{white-space:normal;color:#434349;overflow-wrap:anywhere}'+
    'ul{list-style:none;padding:0}li{padding:12px 0;border-bottom:1px solid #0002}.gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.gallery-card{display:grid;place-items:center;min-height:160px;padding:20px;text-align:center;background:#ffffff;border:1px solid #0001;border-radius:6px}'+
    '.external-project{padding:15px 0}.external-note{font-size:13px;color:#555}.external-embed-target iframe{display:block;width:100%;height:min(70vh,690px);min-height:360px;margin-top:22px;border:1px solid #8888;border-radius:6px;background:#fafafa}.external-load{cursor:pointer}.external-load:disabled{opacity:.55;cursor:not-allowed}'+
    '.cta{display:inline-flex;margin-top:22px;padding:13px 21px;background:#171719;color:white;border-radius:5px;text-decoration:none}.hero-cta{font-weight:700}.nav a:focus-visible,.cta:focus-visible,.brand:focus-visible{outline:3px solid #171719;outline-offset:4px}.footer{padding:50px 24px;text-align:center;border-top:1px solid #0002;font-size:12px;color:#666}'+
    '@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}'+
    '@media(max-width:720px){.site-header{height:auto;min-height:64px;padding:12px 18px;display:block}.nav{margin-top:10px}.hero{min-height:440px;padding:72px 18px}.section{padding:58px 20px}.gallery{grid-template-columns:1fr 1fr}.gallery-card{min-height:120px}}'+
    (doc.designVersion==='1.0.0'?'body{font-family:var(--aime-body)}h1,h2{font-family:var(--aime-heading)}.cta{border-radius:var(--aime-pill);background:var(--aime-button);color:var(--aime-buttonText);min-height:48px}.hero{min-height:clamp(500px,82vh,850px);padding:clamp(72px,10vw,150px) var(--aime-gutter)}.hero-image{opacity:.32}.section-inner{max-width:1000px}.section{padding:clamp(60px,8vw,120px) var(--aime-gutter)}.hero:has(.hero-image){background:#161616;color:white}.hero:has(.hero-image) .subtitle,.hero:has(.hero-image) .eyebrow{color:white}.hero:has(.hero-image) .cta{background:white;color:#161616}':'')+
    (doc.compositionMode?compositionCSS(doc.compositionMode).split('.aime-composition article').join('.aime-composition > section'):'')+
    '</style></head><body><header class="site-header"><a class="brand" href="#top">'+esc(doc.title)+'</a><nav class="nav" aria-label="Sections">'+links+'</nav></header>'+
    '<main id="top"><div class="hero">'+hero+'<div><p class="eyebrow">'+esc(doc.eyebrow)+'</p><h1>'+esc(doc.title)+'</h1><p class="subtitle">'+esc(doc.subtitle)+'</p>'+
    '<p class="meta">'+esc([doc.date,doc.place].filter(Boolean).join(" · "))+'</p>'+heroCTA+'</div></div>'+
    '<div'+(doc.compositionMode?' class="aime-composition"':'')+'>'+sections.map(s=>sectionHTML(s,doc.contact)).join("")+'</div></main><footer class="footer">'+safeMail+'</footer>'+
    (hasExternal?'<script>(function(){document.querySelectorAll(".external-project[data-external-url]").forEach(function(card){var button=card.querySelector(".external-load");if(!button)return;button.addEventListener("click",function(){if(card.querySelector("iframe"))return;var frame=document.createElement("iframe");frame.title="Projet externe : "+(card.closest("section").querySelector("h2")?.textContent||"Application");frame.referrerPolicy="no-referrer";frame.loading="lazy";frame.setAttribute("sandbox","allow-scripts allow-same-origin allow-forms");frame.setAttribute("allow","fullscreen");frame.src=card.dataset.externalUrl;card.querySelector(".external-embed-target").appendChild(frame);button.disabled=true;button.textContent="Aperçu demandé";});});})();</script>':"")+
    '</body></html>';
}
export const miniProjectFile=(doc:MiniSite)=>JSON.stringify(doc,null,2);
