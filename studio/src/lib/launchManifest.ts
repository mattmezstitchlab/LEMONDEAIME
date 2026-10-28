/** POINTZERO .0 — publicly readable launch config, NOT a permissions database.
 * Server controls persistence/publication. Never infer availability from a countdown.
 */
export const LAUNCH_STATUSES=["available","experiment","preparation","future"] as const;
export type LaunchStatus=typeof LAUNCH_STATUSES[number];
export interface LaunchStudio {
 id:string;number:string;title:string;description:string;status:LaunchStatus;
 route:string|null;openAt:string|null;history:string[];published:boolean;preview:boolean;
}
export interface LaunchJournal {id:string;date:string;status:"Conçu"|"Développé"|"Testé"|"Publié"|"Prévu";title:string;source:string}
export interface LaunchConfig {
 version:1;title:string;eyebrow:string;subtitle:string;introduction:string;
 mainDate:string|null;mainLabel:string; announcement:string;
 studios:LaunchStudio[];journal:LaunchJournal[];
 aimeSignatures?:string[];
}
export const STATUS_LABELS:Record<LaunchStatus,string>={
 available:"Disponible",experiment:"En expérimentation",preparation:"En préparation",future:"À venir"
};
const s=(id:string,number:string,title:string,description:string,status:LaunchStatus,route:string|null,preview=false):LaunchStudio=>
 ({id,number,title,description,status,route,openAt:null,history:[],published:status==="available",preview});
export const DEFAULT_LAUNCH:LaunchConfig={
 version:1,
 title:"Le temps retrouvé.",
 eyebrow:"POINTZERO .0 — UN NOUVEAU POINT DE DÉPART",
 subtitle:"Un seul espace pour apprendre, créer, comprendre, administrer et transmettre.",
 introduction:"Et si tous les outils dont nous avons besoin pouvaient enfin se comprendre ? Et si chaque expérience, chaque connaissance et chaque action pouvait servir à la suivante ?",
 mainDate:null,mainLabel:"Présentation publique",announcement:"",
 studios:[
 s("identite","01","Studio Identité","Une carte universelle, des profils et des autorisations réutilisables.","preparation","one-space"),
 s("administratif","02","Studio Administratif","Devis, contrats, dossiers et documents dans une même continuité.","experiment","admin"),
 s("web","03","Studio Web","Créer un mini-site à partir des éléments déjà structurés.","experiment","mini-site"),
 s("chronologique","04","Studio Chronologique","Moments, programme, dépendances et historique des actions.","experiment","programme"),
 s("creatif","05","Studio Créatif","Créer, composer et travailler la matière, la grille et la broderie.","available","design",true),
 s("evenementiel","06","Studio Événementiel","Réunir lieux, événements, moments et intervenants.","experiment","one-space"),
 s("transmission","07","Studio Transmission","Conserver des œuvres et partager des savoirs entre générations.","experiment","art-world"),
 s("organisation","08","Studio Organisation","Espaces, rôles et responsabilités au service d'un collectif.","experiment","one-space"),
 s("formation","09","Studio Formation","Apprendre à son rythme avec un parcours et des acquis vérifiables.","experiment","academy"),
 s("causalite","10","Studio Causalité","Relier les faits, hypothèses, décisions et conséquences.","experiment","causal"),
 s("metamorphose","11","MÉTAMORPHOSE","Une source devient des fragments puis de nouvelles compositions.","experiment","metamorphose"),
 s("ripplecircle","12","RIPPLECIRCLE","Un cadran vivant pour relier les personnes, les moments et leurs impacts.","experiment","ripplecircle"),
 s("game","13","Studio Game","Une grille devient une action ludique : confettis, portraits et défis.","experiment","game")
 ],
 journal:[]
};
export function validLaunch(raw:unknown):LaunchConfig|null {
 if(!raw||typeof raw!=="object")return null;
 const c=raw as Partial<LaunchConfig>;
 if(c.version!==1||typeof c.title!=="string"||c.title.length>130||
 typeof c.eyebrow!=="string"||c.eyebrow.length>130||
 typeof c.subtitle!=="string"||c.subtitle.length>220||
 typeof c.introduction!=="string"||c.introduction.length>900||
 typeof c.mainLabel!=="string"||c.mainLabel.length>130||
 typeof c.announcement!=="string"||c.announcement.length>500||
 !(c.mainDate===null||validDate(c.mainDate))||
 !Array.isArray(c.studios)||c.studios.length!==DEFAULT_LAUNCH.studios.length||!Array.isArray(c.journal)||c.journal.length>80||
 (c.aimeSignatures!==undefined&&(!Array.isArray(c.aimeSignatures)||c.aimeSignatures.length<1||c.aimeSignatures.length>8||
 c.aimeSignatures.some(x=>typeof x!=="string"||!x.startsWith("Architecture Intelligente ")||x.length>160))))return null;
 const expected=new Map(DEFAULT_LAUNCH.studios.map(v=>[v.id,v]));
 const found=new Set<string>();
 for(const t of c.studios){
  if(!t||typeof t.id!=="string"||found.has(t.id)||!expected.has(t.id))return null;
  found.add(t.id);
  if(!LAUNCH_STATUSES.includes(t.status)||typeof t.title!=="string"||t.title.length>120||
   typeof t.description!=="string"||t.description.length>550||
   !(t.openAt===null||validDate(t.openAt))||
   typeof t.published!=="boolean"||typeof t.preview!=="boolean"||
   !Array.isArray(t.history)||t.history.length>20||t.history.some(h=>typeof h!=="string"||h.length>300)||
   t.route!==expected.get(t.id)!.route||t.number!==expected.get(t.id)!.number)return null;
 }
 for(const j of c.journal)if(!j||typeof j.id!=="string"||j.id.length>100||
  !/^\d{4}-\d{2}-\d{2}$/.test(j.date)||!["Conçu","Développé","Testé","Publié","Prévu"].includes(j.status)||
  typeof j.title!=="string"||j.title.length>240||typeof j.source!=="string"||j.source.length>900)return null;
 return c as LaunchConfig;
}
export function validDate(x:unknown):x is string {
 return typeof x==="string"&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/.test(x)&&Number.isFinite(Date.parse(x));
}
export function countdown(target:string|null,now=Date.now()){
 if(!target||!validDate(target))return null;
 const ms=Math.max(0,Date.parse(target)-now);
 return {done:ms===0,days:Math.floor(ms/86400000),hours:Math.floor(ms/3600000)%24,
  minutes:Math.floor(ms/60000)%60,seconds:Math.floor(ms/1000)%60};
}
export const canEnter=(studio:LaunchStudio)=>
 studio.status==="available"&&studio.published===true&&!!studio.route;
export const canPreview=(studio:LaunchStudio)=>
 studio.preview&&!!studio.route&&(studio.status==="experiment"||canEnter(studio));
