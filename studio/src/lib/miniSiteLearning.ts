import {writeStoredJSON} from "./storageSafety";
/** POINTZERO Mini-site Academy — deterministic, explainable preflight rules.
 * This is not a full RGAA, WCAG, SEO or cognitive usability audit.
 * Lessons attach to the original document, never a copied site.
 */
import {contrastGrade} from "./accessibilityCore";
import {safeHref} from "./academyCore";
import {type MiniSite} from "./miniSiteCore";
export const MINI_COACH_KEY="pointzero:minisite-academy:v1";
export type CoachPhase="intention"|"hero"|"navigation"|"lisibilite"|"seo"|"verification";
export type CoachTarget="settings"|"hero"|"sections"|"image"|"contact";
export interface MiniCoachProfile{
 version:1;siteId:string;audience:string;purpose:string;reviewed:boolean;
}
export interface CoachIssue{
 id:string;phase:CoachPhase;severity:"a-corriger"|"a-verifier";title:string;why:string;
 action:string;target:CoachTarget;sectionId?:string;
}
export const COACH_PHASES:{id:CoachPhase;name:string;description:string;target:CoachTarget}[]=[
 {id:"intention",name:"Fondations",description:"À qui s'adresse ce site et quelle action doit-il permettre ?",target:"settings"},
 {id:"hero",name:"Premier écran",description:"La promesse est compréhensible avant toute photographie.",target:"hero"},
 {id:"navigation",name:"Navigation",description:"La page suit une hiérarchie logique et les liens ont un nom.",target:"sections"},
 {id:"lisibilite",name:"Lisibilité",description:"Les contrastes sont mesurés, les images ont un rôle identifiable.",target:"image"},
 {id:"seo",name:"Référencement",description:"Les moteurs et les visiteurs comprennent le titre et la description.",target:"settings"},
 {id:"verification",name:"Relecture",description:"Tester au clavier, au mobile et avec de vrais lecteurs.",target:"hero"}
];
const trim=(s:string)=>s.normalize("NFKC").trim();
export const blankMiniCoach=(siteId:string):MiniCoachProfile=>({version:1,siteId,audience:"",purpose:"",reviewed:false});
export function safeMiniCoach(value:unknown,siteId:string):MiniCoachProfile|null{
 if(!value||typeof value!=="object")return null;
 const x=value as Partial<MiniCoachProfile>;
 if(x.version!==1||x.siteId!==siteId||typeof x.audience!=="string"||x.audience.length>220||
 typeof x.purpose!=="string"||x.purpose.length>350||typeof x.reviewed!=="boolean")return null;
 return x as MiniCoachProfile;
}
export function readMiniCoach(siteId:string):MiniCoachProfile{
 try{
  const data=JSON.parse(localStorage.getItem(MINI_COACH_KEY)??"{}") as Record<string,unknown>;
  return safeMiniCoach(data?.[siteId],siteId)??blankMiniCoach(siteId);
 }catch{return blankMiniCoach(siteId);}
}
export function writeMiniCoach(profile:MiniCoachProfile):void{
 if(!safeMiniCoach(profile,profile.siteId))throw Error("Profil de formation invalide.");
 const all=JSON.parse(localStorage.getItem(MINI_COACH_KEY)??"{}") as Record<string,unknown>;
 const records=all&&typeof all==="object"&&!Array.isArray(all)?all:{};
 if(!(profile.siteId in records)&&Object.keys(records).length>=25)throw Error("Limite de 25 profils atteinte : données existantes conservées.");
 const selected=records;
 writeStoredJSON(MINI_COACH_KEY,JSON.stringify({...selected,[profile.siteId]:profile}),v=>!!v&&typeof v==="object"&&!Array.isArray(v)&&Object.entries(v).every(([id,p])=>!!safeMiniCoach(p,id)));
}
const defaultTitles=["Camille & Gabriel","Une signature singulière","Une rencontre à vivre","Votre univers prend forme"];
const defaultSubtitles=["Nous avons le bonheur de vous inviter","Découvrez mes créations et mon univers","Toutes les informations au même endroit","Une page simple pour présenter l'essentiel"];
const filler=["Ajoutez votre contenu ici.","Adresse et indications à compléter.","Présentez votre univers et vos projets.","Projet 1\nProjet 2\nProjet 3"];
export function miniSiteAudit(doc:MiniSite,profile:MiniCoachProfile):CoachIssue[]{
 const issues:CoachIssue[]=[];
 const add=(id:string,phase:CoachPhase,severity:CoachIssue["severity"],title:string,why:string,action:string,target:CoachTarget,sectionId?:string)=>
  issues.push({id,phase,severity,title,why,action,target,sectionId});
 if(!trim(profile.audience))add("audience","intention","a-corriger","Public à préciser",
  "Une navigation efficace commence par le besoin du visiteur, pas par les couleurs.",
  "Décrire en une phrase qui doit consulter cette page.","settings");
 if(!trim(profile.purpose))add("purpose","intention","a-corriger","Action principale inconnue",
  "Le premier écran doit orienter vers une intention vérifiable.",
  "Décrire ce que le visiteur doit trouver, comprendre ou faire.","settings");
 if(trim(doc.title).length<8||defaultTitles.includes(trim(doc.title)))add("hero-title","hero","a-corriger","Titre principal trop générique",
  "Le h1 donne le sujet de la page aux lecteurs et aux technologies d'assistance.",
  "Remplacer le modèle par une phrase explicite et personnelle.","hero");
 if(trim(doc.subtitle).length<30||defaultSubtitles.includes(trim(doc.subtitle)))add("hero-subtitle","hero","a-corriger","Promesse peu informative",
  "Le sous-titre doit compléter le titre par une information utile : pour qui, quoi ou quand.",
  "Rédiger un sous-titre d'au moins quelques mots précis.","hero");
 if(!trim(doc.heroActionLabel??"")||!trim(doc.heroActionHref??"")||!safeHref(doc.heroActionHref??""))
  add("hero-action","hero","a-corriger","Aucune action visible dès l'accueil",
   "Un premier écran utile peut orienter immédiatement vers le programme, le contact ou les informations essentielles.",
   "Ajouter un libellé et une destination valide au bouton principal.","hero");
 const visible=doc.sections.filter(s=>s.visible);
 if(visible.length<2)add("structure","navigation","a-verifier","Parcours très court",
  "Une navigation doit refléter de vraies informations. Plusieurs blocs ne sont pas obligatoires si une page courte suffit.",
  "Vérifier que la page permet d'atteindre sa destination.","sections");
 const names=new Set<string>();
 for(const s of visible){
  const name=trim(s.title).toLocaleLowerCase("fr-FR");
  if(!name||names.has(name))add("section-title-"+s.id,"navigation","a-corriger","Intitulé absent ou répété",
   "Les liens de navigation doivent annoncer leur destination sans ambiguïté.",
   "Renommer cette section.", "sections",s.id);
  names.add(name);
  if(!trim(s.body)||filler.includes(trim(s.body)))add("content-"+s.id,"navigation","a-corriger","Contenu encore démonstratif",
   "Un visiteur pourrait prendre ces indications provisoires pour de vraies informations.",
   "Rédiger les informations exactes dans cette section.","sections",s.id);
 }
 const text=contrastGrade("#171719",doc.background);
 const nav=contrastGrade("#333333",doc.background);
 const kicker=contrastGrade(doc.primaryColor,doc.background);
 if(!text.normalAA||!nav.normalAA)add("body-contrast","lisibilite","a-corriger","Contraste insuffisant pour certains textes",
  "Avec les couleurs actuelles, certains textes et liens peuvent ne pas atteindre le seuil WCAG AA 4,5:1.",
  "Modifier le fond et revérifier les contrastes.","settings");
 if(!kicker.normalAA)add("accent-contrast","lisibilite","a-corriger","Accent peu lisible sur le fond",
  "Les sur-titres et étiquettes utilisent cette couleur, qui doit rester contrastée.",
  "Choisir un accent plus sombre ou modifier le fond.","settings");
 if(doc.heroImage&&!trim(doc.heroAlt??""))add("cover-alt","lisibilite","a-verifier","Rôle de la photo à confirmer",
  "Une image purement décorative peut avoir alt vide. Une image informative doit avoir une alternative descriptive.",
  "Si elle transmet une information, renseigner sa description dans les réglages de couverture.","image");
 if(doc.heroImage.length>900_000)add("cover-weight","lisibilite","a-verifier","Image intégrée volumineuse",
  "Une photo trop lourde peut ralentir le chargement sur mobile.",
  "Optimiser le fichier et refaire l'import.", "image");
 if(trim(doc.title).length<12)add("seo-title","seo","a-corriger","Titre HTML peu descriptif",
  "Le titre de la page est aussi utilisé par les navigateurs et peut influencer sa présentation dans les résultats de recherche.",
  "Rédiger un titre clair qui décrit réellement cette page.","hero");
 if(trim(doc.subtitle).length<45)add("seo-description","seo","a-verifier","Description méta peu précise",
  "Le sous-titre sert actuellement de description HTML. Google peut choisir un autre extrait.",
  "Écrire un résumé utile et cohérent avec le contenu.","hero");
 if(doc.kind==="mariage"||doc.kind==="evenement"){
  if(!trim(doc.date)||!trim(doc.place))add("practical","verification","a-corriger","Date ou lieu à compléter",
   "Les invités ne devraient pas devoir demander les informations pratiques essentielles.",
   "Compléter la date et le lieu dans le panneau du site.","settings");
 }
 if(!visible.some(s=>s.kind==="contact")&&!trim(doc.contact))add("contact","verification","a-verifier","Aucun moyen de contact visible",
  "Un site destiné à être partagé doit proposer une suite logique à sa visite.",
  "Ajouter un bloc contact ou une adresse de contact.","contact");
 if(!profile.reviewed)add("manual","verification","a-verifier","Test réel non effectué",
  "Les règles automatiques ne peuvent pas établir l'absence d'obstacles cognitifs ni garantir un référencement.",
  "Tester au clavier et sur téléphone, faire lire la page à une autre personne, puis cocher la relecture.","hero");
 return issues;
}
export function miniCoachProgress(doc:MiniSite,profile:MiniCoachProfile){
 const issues=miniSiteAudit(doc,profile);
 const ready=COACH_PHASES.filter(p=>issues.every(i=>i.phase!==p.id));
 return {issues,ready:ready.map(v=>v.id),passed:ready.length,total:COACH_PHASES.length,
  errors:issues.filter(i=>i.severity==="a-corriger").length};
}
