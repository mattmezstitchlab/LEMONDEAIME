import {WORLD_KEY,safeWorld} from "./oneSpaceCore";
import {academyDossierKey} from "./universalDossier";
import {writeStoredJSON} from "./storageSafety";
/** POINTZERO Legal — educational local dossier, NOT legal advice or a compliance certificate.
 * Project source records stay in their original studio. No automatic publishing. */
import {ACADEMY_KEY,validProject} from "./academyCore";
import {MINI_DRAFTS,MINI_KEY,safeMiniSite} from "./miniSiteCore";
export const LEGAL_KEY="pointzero:legal-dossiers:v1";
export const LEGAL_ACTIVE_KEY="pointzero:legal-active-project:v1";
export type SiteRef={key:string;kind:"mini-site"|"academy";id:string;title:string;contact:string;source:string};
export type EditorKind="professionnel"|"association"|"particulier"|"a-definir";
export type CookieMode="aucun"|"necessaires"|"mesure-audience-a-verifier"|"autres-traceurs"|"inconnu";
export type TreatmentKind="contact"|"rsvp"|"compte"|"audience"|"marketing"|"paiement"|"fichiers"|"donnees-sensibles"|"autre";
export type LawfulBasis=""|"consentement"|"contrat"|"interet-legitime"|"obligation-legale"|"interets-vitaux"|"mission-publique"|"a-etudier";
export type Treatment={id:string;kind:TreatmentKind;purpose:string;categories:string;lawfulBasis:LawfulBasis;retention:string;recipients:string};
export type LegalDossier={
 version:1;projectKey:string;editorKind:EditorKind;editorName:string;editorAddress:string;registration:string;
 hostName:string;hostContact:string;rightsEmail:string;
 cookies:CookieMode;consentMechanismChecked:boolean;transfersOutsideEEA:"inconnu"|"non"|"oui";
 securityReviewed:boolean;minorsInvolved:boolean;professionalReviewed:boolean;
 treatments:Treatment[];notes:string;updatedAt:string;
};
export type LegalStore={version:1;dossiers:LegalDossier[]};
export const TREATMENTS:{kind:TreatmentKind;label:string;example:string;sensitive?:boolean}[]=[
 {kind:"contact",label:"Demandes de contact",example:"Répondre aux demandes des visiteurs"},
 {kind:"rsvp",label:"Invitations et RSVP",example:"Gérer les réponses et la participation aux événements"},
 {kind:"compte",label:"Comptes et espace personnel",example:"Permettre l'accès au service"},
 {kind:"audience",label:"Statistiques de visite",example:"Mesurer la fréquentation et la performance"},
 {kind:"marketing",label:"Communication et prospection",example:"Informer les personnes des actualités et offres"},
 {kind:"paiement",label:"Paiements et facturation",example:"Exécuter les prestations et suivre les paiements"},
 {kind:"fichiers",label:"Fichiers et contributions",example:"Gérer les médias et documents transmis"},
 {kind:"donnees-sensibles",label:"Allergies / informations sensibles",example:"Prendre en compte les besoins spécifiques",sensitive:true},
 {kind:"autre",label:"Autre traitement",example:"Décrire exactement la finalité"}
];
export const BASIS:{value:LawfulBasis;label:string}[]=[
 {value:"",label:"À déterminer après analyse"},
 {value:"consentement",label:"Consentement (article 6)"},
 {value:"contrat",label:"Exécution d'un contrat"},
 {value:"interet-legitime",label:"Intérêt légitime (analyse requise)"},
 {value:"obligation-legale",label:"Obligation légale"},
 {value:"interets-vitaux",label:"Intérêts vitaux"},
 {value:"mission-publique",label:"Mission d'intérêt public"},
 {value:"a-etudier",label:"À examiner avec un professionnel"}
];
const id=()=>globalThis.crypto?.randomUUID?.()??Math.random().toString(36).slice(2);
const today=()=>new Date().toISOString().slice(0,10);
const short=(x:unknown,len:number)=>typeof x==="string"&&x.length<=len;
export function sourceProjects():SiteRef[]{
 const refs:SiteRef[]=[];
 try{
  const current=safeMiniSite(JSON.parse(localStorage.getItem(MINI_KEY)??"null"));
  const drafts=JSON.parse(localStorage.getItem(MINI_DRAFTS)??"[]") as unknown;
  const candidates=[current,...(Array.isArray(drafts)?drafts.slice(0,12).map(safeMiniSite):[])];
  for(const doc of candidates)if(doc&&!refs.some(v=>v.key==="mini-site:"+doc.id))
    refs.push({key:"mini-site:"+doc.id,kind:"mini-site",id:doc.id,title:doc.name||doc.title||"Mini-site",contact:doc.contact,source:"Studio Mini-site"});
 }catch{/* Invalid draft source is ignored. */}
 try{
  const raw=JSON.parse(localStorage.getItem(ACADEMY_KEY)??"null");
  const project=validProject(raw);
  if(project)refs.push({key:"academy:"+project.id,kind:"academy",id:project.id,title:project.siteTitle||project.name||"Site Academy",contact:"",source:"Academy UI/UX"});
 }catch{/* Invalid project source is ignored. */}
 try{
  const world=safeWorld(JSON.parse(localStorage.getItem(WORLD_KEY)??"null"));
  for(const space of world?.spaces??[]){try{
   const raw=localStorage.getItem(academyDossierKey(space.id));if(!raw)continue;
   const p=validProject(JSON.parse(raw));if(!p||p.dossierBinding?.spaceId!==space.id)continue;
   if(!refs.some(x=>x.key==='academy:'+p.id))refs.push({key:'academy:'+p.id,kind:'academy',id:p.id,title:p.dossierBinding.titleMode==='linked'?space.title:p.siteTitle,contact:'',source:'Academy liée au Dossier Universel'});
  }catch{/* A damaged support must not hide the other valid supports. */}}
 }catch{/* No repair or fallback write. */}
 return refs;
}
export const newLegalDossier=(projectKey:string):LegalDossier=>({
 version:1,projectKey,editorKind:"a-definir",editorName:"",editorAddress:"",registration:"",
 hostName:"",hostContact:"",rightsEmail:"",cookies:"inconnu",consentMechanismChecked:false,
 transfersOutsideEEA:"inconnu",securityReviewed:false,minorsInvolved:false,professionalReviewed:false,
 treatments:[],notes:"",updatedAt:today()
});
export const newTreatment=(kind:TreatmentKind):Treatment=>{
 const preset=TREATMENTS.find(t=>t.kind===kind)!;
 return {id:id(),kind,purpose:preset.example,categories:"",lawfulBasis:"",retention:"",recipients:""};
};
export function validLegal(value:unknown):LegalDossier|null{
 if(!value||typeof value!=="object")return null;
 const d=value as Partial<LegalDossier>;
 if(d.version!==1||!short(d.projectKey,240)||!d.projectKey||
 !["professionnel","association","particulier","a-definir"].includes(d.editorKind as string)||
 !["editorName","editorAddress","registration","hostName","hostContact","rightsEmail"].every(p=>short(d[p as keyof LegalDossier],280))||
 !["aucun","necessaires","mesure-audience-a-verifier","autres-traceurs","inconnu"].includes(d.cookies as string)||
 typeof d.consentMechanismChecked!=="boolean"||!["inconnu","non","oui"].includes(d.transfersOutsideEEA as string)||
 typeof d.securityReviewed!=="boolean"||typeof d.minorsInvolved!=="boolean"||
 typeof d.professionalReviewed!=="boolean"||!short(d.notes,1800)||!short(d.updatedAt,40)||
 !Array.isArray(d.treatments)||d.treatments.length>25)return null;
 const seen=new Set<string>();
 for(const t of d.treatments){
  if(!t||!short(t.id,120)||!t.id||seen.has(t.id)||
  !TREATMENTS.some(p=>p.kind===t.kind)||!short(t.purpose,500)||!short(t.categories,500)||
  !BASIS.some(p=>p.value===t.lawfulBasis)||!short(t.retention,280)||!short(t.recipients,500))return null;
  seen.add(t.id);
 }
 return d as LegalDossier;
}
export function validLegalStore(value:unknown):LegalStore|null{
 if(!value||typeof value!=="object")return null;
 const s=value as Partial<LegalStore>;
 if(s.version!==1||!Array.isArray(s.dossiers)||s.dossiers.length>40)return null;
 const seen=new Set<string>();
 for(const dossier of s.dossiers){
  if(!validLegal(dossier)||seen.has(dossier.projectKey))return null;
  seen.add(dossier.projectKey);
 }
 return s as LegalStore;
}
export function readLegal():LegalStore{
 try{return validLegalStore(JSON.parse(localStorage.getItem(LEGAL_KEY)??"null"))??{version:1,dossiers:[]};}
 catch{return {version:1,dossiers:[]};}
}
export function writeLegal(store:LegalStore):void{
 if(!validLegalStore(store))throw Error("Le dossier contient des données incorrectes.");
 writeStoredJSON(LEGAL_KEY,JSON.stringify(store),validLegalStore);
}
export type LegalIssue={
 id:string;area:"identification"|"rgpd"|"cookies"|"verification";level:"prioritaire"|"a-confirmer";
 title:string;reason:string;
};
export function inspectLegal(d:LegalDossier,source:SiteRef|null):LegalIssue[]{
 const issues:LegalIssue[]=[];
 const add=(id:string,area:LegalIssue["area"],level:LegalIssue["level"],title:string,reason:string)=>issues.push({id,area,level,title,reason});
 if(!source)add("source","identification","a-confirmer","Projet d'origine indisponible","L'identité du projet ne peut plus être récupérée automatiquement.");
 if(d.editorKind==="a-definir")add("kind","identification","prioritaire","Statut de l'éditeur à préciser","Les mentions à fournir varient selon le responsable et la nature du site.");
 if(!d.editorName.trim())add("editor","identification","prioritaire","Éditeur non identifié","Un site professionnel doit identifier correctement son éditeur ; le contexte d'un site personnel diffère.");
 if(d.editorKind!=="particulier"&&!d.editorAddress.trim())add("address","identification","prioritaire","Coordonnées de l'éditeur à examiner","Les mentions légales du site professionnel exigent des informations d'identification.");
 if(d.editorKind==="professionnel"&&!d.registration.trim())add("registration","identification","a-confirmer","Identifiant professionnel à examiner","Le numéro pertinent et les mentions obligatoires dépendent de la forme juridique.");
 if(!d.hostName.trim()||!d.hostContact.trim())add("host","identification","prioritaire","Hébergeur non identifié","L'éditeur doit vérifier les mentions de son hébergeur et leur accessibilité.");
 if(d.treatments.length&&!(source?.contact||d.rightsEmail.trim()))add("rights","rgpd","prioritaire","Point de contact pour les droits absent","Les personnes doivent pouvoir exercer leurs droits selon les modalités réellement proposées.");
 if(!d.treatments.length)add("inventory","rgpd","a-confirmer","Traitements à inventorier","Vérifier si le site et les services liés collectent vraiment des données ; ne pas en inventer.");
 for(const t of d.treatments){
  if(!t.purpose.trim()||!t.categories.trim())add("data-"+t.id,"rgpd","prioritaire","Finalité ou données à préciser","Un registre utile décrit chaque finalité, les catégories de données et les destinataires.");
  if(!t.lawfulBasis||t.lawfulBasis==="a-etudier")add("basis-"+t.id,"rgpd","prioritaire","Base légale à analyser","La base légale se détermine par finalité ; le consentement n'est pas systématique.");
  if(!t.retention.trim()||!t.recipients.trim())add("retention-"+t.id,"rgpd","prioritaire","Conservation / destinataires à documenter","Il faut expliquer les durées ou critères et les destinataires éventuels.");
  if(t.kind==="donnees-sensibles")add("sensitive-"+t.id,"rgpd","prioritaire","Données particulières : expertise nécessaire","Des allergies ou données de santé peuvent relever de l'article 9 du RGPD, au-delà de l'article 6.");
 }
 if(d.transfersOutsideEEA==="inconnu"&&d.treatments.length)add("transfers","rgpd","a-confirmer","Sous-traitants et transferts à vérifier","Un prestataire peut transférer des données hors EEE ; vérifier leur situation effective.");
 if(d.minorsInvolved)add("minors","rgpd","a-confirmer","Mineurs concernés","Adapter l'information, les autorisations et les mesures de protection aux usages réels.");
 if(d.cookies==="inconnu")add("cookies","cookies","prioritaire","Traceurs non inventoriés","Vérifier le site publié et tous les scripts tiers avant de décider d'un bandeau.");
 if(d.cookies==="mesure-audience-a-verifier")add("analytics","cookies","a-confirmer","Exemption de mesure d'audience à vérifier","Une exemption est possible uniquement sous certaines conditions fixées par la CNIL.");
 if(d.cookies==="autres-traceurs"&&!d.consentMechanismChecked)add("consent","cookies","prioritaire","Consentement préalable à vérifier","Certains traceurs publicitaires ou sociaux nécessitent un choix valide avant dépôt.");
 if(!d.securityReviewed)add("security","verification","a-confirmer","Mesures de sécurité à vérifier","L'analyse automatisée ne teste ni hébergement, ni accès, ni sauvegarde, ni sous-traitants.");
 if(!d.professionalReviewed)add("review","verification","a-confirmer","Relecture juridique non attestée","Ces modèles sont préparatoires et ne remplacent pas une validation adaptée à l'activité.");
 return issues;
}
const clean=(value:string)=>value.replace(/\r/g,"").trim()||"[À compléter]";
/** Drafts are intentionally not described as legal-approved policies. */
export function legalDraft(d:LegalDossier,source:SiteRef|null):string{
 const project=source?.title??"[Projet introuvable]";
 const email=source?.contact||d.rightsEmail;
 const rows=d.treatments.map(t=>"- **"+clean(t.purpose)+"** : catégories "+clean(t.categories)+", base envisagée "+clean(BASIS.find(b=>b.value===t.lawfulBasis)?.label??"")+", conservation "+clean(t.retention)+", destinataires "+clean(t.recipients)+".").join("\n");
 return [
 "# Dossier juridique préparatoire — "+project,
 "**BROUILLON À VÉRIFIER — non publié, non certifié.**",
 "Référence projet : "+d.projectKey,
 "## Éditeur et hébergement",
 "Statut déclaré : "+d.editorKind,
 "Éditeur : "+clean(d.editorName),
 "Adresse : "+clean(d.editorAddress),
 "Identification : "+clean(d.registration),
 "Hébergeur : "+clean(d.hostName)+" — "+clean(d.hostContact),
 "## Information relative aux données personnelles",
 "Contact proposé pour les droits : "+clean(email||""),
 "Finalités inventoriées (à confirmer par le responsable de traitement) :",
 rows||"- [Inventaire des traitements à réaliser]",
 "Transferts hors EEE : "+d.transfersOutsideEEA,
 "Mineurs concernés (déclaratif) : "+(d.minorsInvolved?"Oui":"Non renseignés"),
 "## Cookies et traceurs",
 "État déclaré : "+d.cookies,
 "Mécanisme de choix vérifié par l'éditeur : "+(d.consentMechanismChecked?"Déclaré vérifié":"Non vérifié"),
 "Le besoin de consentement dépend des traceurs réellement déposés, de leurs finalités et des conditions d'exemption.",
 "## Points à compléter",
 ...inspectLegal(d,source).map(issue=>"- "+issue.title+" : "+issue.reason),
 "## Références officielles",
 "CNIL — https://www.cnil.fr/fr/RGPD-le-registre-des-activites-de-traitement",
 "CNIL — https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/comment-mettre-mon-site-web-en-conformite",
 "Service-Public — https://entreprendre.service-public.gouv.fr/vosdroits/F31228",
 "Rédigé comme support de compréhension et de transmission à un professionnel. Ne constitue pas un avis juridique individualisé ni une preuve de conformité."
 ].join("\n\n");
}
