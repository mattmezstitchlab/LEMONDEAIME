import {useEffect,useMemo,useState} from "react";
import {BookOpen,ChevronRight,Download,ExternalLink,FileCheck2,FileText,FolderOpen,Scale,Shield,Trash2,Users} from "lucide-react";
import {StudioFrame,studioButton,studioInput,saveStudioFile} from "./StudioFrame";
import {
 BASIS,LEGAL_ACTIVE_KEY,TREATMENTS,inspectLegal,legalDraft,newLegalDossier,newTreatment,
 readLegal,sourceProjects,writeLegal,type EditorKind,type CookieMode,type LegalDossier,
 type LawfulBasis,type TreatmentKind
} from "../lib/legalCore";
type Tab="bilan"|"identification"|"donnees"|"traceurs"|"dossier";
const tabs:{id:Tab;label:string;icon:typeof Scale}[]=[
 {id:"bilan",label:"Diagnostic du projet",icon:FileCheck2},
 {id:"identification",label:"Mentions légales",icon:Scale},
 {id:"donnees",label:"Données personnelles",icon:Users},
 {id:"traceurs",label:"Cookies & sécurité",icon:Shield},
 {id:"dossier",label:"Dossier à transmettre",icon:FolderOpen}
];
interface Props{onBack:()=>void;onMiniSite:()=>void;onAcademy:()=>void}
const cap=(s:string,n:number)=>s.slice(0,n);
const TextField=({label,aria,value,onChange,max=280,placeholder=""}:{label:string;aria:string;value:string;onChange:(text:string)=>void;max?:number;placeholder?:string})=>
 <label className="block text-xs text-white/75">{label}<input aria-label={aria} className={studioInput+" mt-1"} value={value} maxLength={max} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/></label>;
export default function LegalStudio({onBack,onMiniSite,onAcademy}:Props){
 const [store,setStore]=useState(readLegal);
 const sources=useMemo(sourceProjects,[]);
 const [key,setKey]=useState(()=>{const preferred=localStorage.getItem(LEGAL_ACTIVE_KEY)??"";return sources.some(s=>s.key===preferred)?preferred:sources[0]?.key??"";});
 const [tab,setTab]=useState<Tab>("bilan");
 const [notice,setNotice]=useState("");
 const source=sources.find(p=>p.key===key)??null;
 const doc=store.dossiers.find(d=>d.projectKey===key)??(key?newLegalDossier(key):null);
 const issues=doc?inspectLegal(doc,source):[];
 const needs=issues.filter(v=>v.level==="prioritaire");
 useEffect(()=>{if(key)try{localStorage.setItem(LEGAL_ACTIVE_KEY,key);}catch{/* no local storage */}},[key]);
 const update=(patch:Partial<LegalDossier>)=>{
  if(!doc)return;
  const next={...doc,...patch,updatedAt:new Date().toISOString().slice(0,10)};
  const dossiers=store.dossiers.filter(d=>d.projectKey!==key);
  const value={version:1 as const,dossiers:[...dossiers,next]};
  try{writeLegal(value);setStore(value);setNotice("");}
  catch{setNotice("Le dossier n'a pas été enregistré : vérifiez les informations saisies ou la capacité du navigateur.");}
 };
 const addTreatment=(kind:TreatmentKind)=>{
  if(!doc||doc.treatments.length>=25)return;
  const item=newTreatment(kind);update({treatments:[...doc.treatments,item]});
 };
 const patchTreatment=(id:string,patch:Partial<LegalDossier["treatments"][number]>)=>{
  if(!doc)return;update({treatments:doc.treatments.map(t=>t.id===id?{...t,...patch}:t)});
 };
 const download=()=>{if(!doc)return;saveStudioFile("pointzero-juridique-brouillon-"+key.replace(/[^a-z0-9_-]+/gi,"_")+".md",legalDraft(doc,source),"text/markdown;charset=utf-8");
 setNotice("Brouillon pédagogique exporté. Aucune publication ni validation juridique automatique.");};
 const allLabels:{id:Tab;title:string;description:string}[]=[
  {id:"identification",title:"Qui édite et héberge ?",description:"Mentions légales selon l'activité réelle."},
  {id:"donnees",title:"Pourquoi collecter ?",description:"Finalités, bases juridiques et durées différentes par traitement."},
  {id:"traceurs",title:"Faut-il demander un choix ?",description:"Les traceurs strictement nécessaires ne sont pas assimilés à la publicité."},
  {id:"dossier",title:"Qui valide le résultat ?",description:"Transmettre un dossier explicite à un professionnel."}
 ];
 const left=<div className="space-y-4 pb-28">
   <div><h2 className="flex items-center gap-2 text-sm font-semibold"><Scale size={18}/> Studio Juridique</h2><p className="mt-2 text-[11px] leading-relaxed text-white/60">Un dossier par projet existant. Aucune ressaisie de son nom ou de son contact si le studio d'origine les possède déjà.</p></div>
   <div className="space-y-2"><h3 className="text-xs font-semibold">Projets disponibles</h3>
     {sources.map(project=><button key={project.key} aria-label={"Choisir projet juridique "+project.title} aria-pressed={key===project.key} onClick={()=>setKey(project.key)}
       className={"w-full rounded-[5px] border p-3 text-left text-xs "+(key===project.key?"border-white bg-white font-semibold text-black":"border-white/15 hover:bg-white/10")}>
       <span className="block truncate">{project.title}</span><span className="mt-1 block text-[10px] opacity-60">{project.source}</span></button>)}
     {!sources.length&&<p className="rounded-[5px] border border-dashed border-white/15 p-3 text-[11px] text-white/60">Créez d'abord votre mini-site ou votre projet Academy. Son identité sera récupérée ici.</p>}
   </div>
   <div className="space-y-1.5 border-t border-white/15 pt-4">
     {tabs.map(t=><button key={t.id} aria-label={"Ouvrir "+t.label} aria-pressed={tab===t.id} onClick={()=>setTab(t.id)}
       className={"flex min-h-11 w-full items-center gap-2 rounded-[5px] border px-3 text-left text-xs "+(tab===t.id?"border-white bg-white font-semibold text-black":"border-white/10 text-white/75 hover:bg-white/10")}>
       <t.icon size={15}/><span className="flex-1">{t.label}</span><ChevronRight size={13}/></button>)}
   </div>
   <div className="space-y-2 border-t border-white/15 pt-4">
     <h3 className="text-xs font-semibold">Continuer dans un autre studio</h3>
     <button className={studioButton+" w-full"} onClick={onMiniSite}><ExternalLink size={13}/> Mini-site</button>
     <button className={studioButton+" w-full"} onClick={onAcademy}><BookOpen size={13}/> UI/UX Academy</button>
   </div>
 </div>;
 const right=<div className="space-y-4 pb-24">
  <h2 className="text-sm font-semibold">Uniquement les informations manquantes</h2>
  {!doc?<p className="text-xs text-white/60">Choisissez un projet ou créez-en un dans Mini-site / Academy.</p>:<>
   <div className="rounded-[6px] border border-white/15 p-3">
     <p className="text-[11px] text-white/55">Informations reprises du studio d'origine</p>
     <p className="mt-2 text-xs font-semibold">{source?.title??"Projet d'origine introuvable"}</p>
     <p className="mt-1 text-[11px] text-white/70">Contact : {source?.contact||"non renseigné à la source"}</p>
     <p className="mt-2 text-[10px] text-white/50">Référence : {doc.projectKey}</p>
   </div>
   {tab==="identification"&&<div className="space-y-3">
     <label className="block text-xs text-white/70">Statut de l'éditeur
      <select aria-label="Nature de l'éditeur" className={studioInput+" mt-1"} value={doc.editorKind} onChange={e=>update({editorKind:e.target.value as EditorKind})}>
       <option value="a-definir">À déterminer</option><option value="professionnel">Professionnel / indépendant</option><option value="association">Association</option><option value="particulier">Particulier</option></select></label>
     <TextField label="Éditeur responsable" aria="Nom de l'éditeur juridique" value={doc.editorName} onChange={v=>update({editorName:v})}/>
     {doc.editorKind!=="particulier"&&<TextField label="Adresse de l'éditeur" aria="Adresse légale de l'éditeur" value={doc.editorAddress} onChange={v=>update({editorAddress:v})}/>}
     {doc.editorKind==="professionnel"&&<TextField label="Identifiant professionnel (à vérifier)" aria="Numéro d'identification professionnel" value={doc.registration} onChange={v=>update({registration:v})}/>}
     <TextField label="Nom de l'hébergeur" aria="Nom de l'hébergeur du site" value={doc.hostName} onChange={v=>update({hostName:v})}/>
     <TextField label="Coordonnées de l'hébergeur" aria="Contact de l'hébergeur" value={doc.hostContact} onChange={v=>update({hostContact:v})}/>
   </div>}
   {tab==="donnees"&&<div className="space-y-3">
     <p className="text-[11px] leading-relaxed text-white/60">Ajoutez seulement les traitements vraiment présents. Un simple mini-site statique sans collecte ne doit pas devenir fictivement une boutique ou une application à comptes.</p>
     {doc.treatments.map(t=><details key={t.id} className="rounded-[5px] border border-white/15 p-2">
       <summary className="cursor-pointer text-xs font-semibold">{TREATMENTS.find(v=>v.kind===t.kind)?.label}</summary>
       <div className="mt-3 space-y-2">
         <TextField label="Finalité exacte" aria={"Finalité "+t.id} value={t.purpose} onChange={v=>patchTreatment(t.id,{purpose:v})} max={500}/>
         <TextField label="Données utilisées" aria={"Catégories "+t.id} value={t.categories} onChange={v=>patchTreatment(t.id,{categories:v})} max={500}/>
         <label className="block text-xs text-white/75">Base légale (ne pas présumer du consentement)
           <select className={studioInput+" mt-1"} aria-label={"Base légale "+t.id} value={t.lawfulBasis} onChange={e=>patchTreatment(t.id,{lawfulBasis:e.target.value as LawfulBasis})}>
            {BASIS.map(b=><option key={b.value} value={b.value}>{b.label}</option>)}</select></label>
         <TextField label="Durée / critère de conservation" aria={"Durée "+t.id} value={t.retention} onChange={v=>patchTreatment(t.id,{retention:v})}/>
         <TextField label="Destinataires / sous-traitants" aria={"Destinataires "+t.id} value={t.recipients} onChange={v=>patchTreatment(t.id,{recipients:v})} max={500}/>
         <button aria-label={"Retirer traitement "+t.id} onClick={()=>update({treatments:doc.treatments.filter(a=>a.id!==t.id)})} className={studioButton+" w-full"}><Trash2 size={13}/> Retirer le traitement</button>
       </div>
     </details>)}
     <label className="block text-xs text-white/75">Transferts hors EEE
       <select aria-label="Transferts hors EEE" className={studioInput+" mt-1"} value={doc.transfersOutsideEEA} onChange={e=>update({transfersOutsideEEA:e.target.value as LegalDossier["transfersOutsideEEA"]})}>
         <option value="inconnu">À vérifier</option><option value="non">Non, après vérification</option><option value="oui">Oui, à documenter</option></select></label>
     <TextField label="Contact dédié aux droits (si différent du site)" aria="Contact RGPD de remplacement" value={doc.rightsEmail} onChange={v=>update({rightsEmail:v})}/>
     <label className="flex items-center gap-2 text-xs text-white/75"><input aria-label="Mineurs concernés" type="checkbox" checked={doc.minorsInvolved}
       onChange={e=>update({minorsInvolved:e.target.checked})} className="accent-white"/>Des mineurs sont concernés</label>
   </div>}
   {tab==="traceurs"&&<div className="space-y-3">
     <label className="block text-xs text-white/75">Quels traceurs sont réellement présents ?
       <select aria-label="Catégorie des traceurs" className={studioInput+" mt-1"} value={doc.cookies} onChange={e=>update({cookies:e.target.value as CookieMode,consentMechanismChecked:false})}>
         <option value="inconnu">Je dois vérifier</option><option value="aucun">Aucun identifié</option>
         <option value="necessaires">Seulement des traceurs strictement nécessaires</option>
         <option value="mesure-audience-a-verifier">Mesure d'audience — exemption à analyser</option>
         <option value="autres-traceurs">Autres traceurs (publicité, réseaux sociaux…)</option>
       </select></label>
     {doc.cookies==="autres-traceurs"&&<label className="flex items-start gap-2 text-xs text-white/75">
       <input aria-label="Vérification du mécanisme de consentement" className="mt-0.5 accent-white" type="checkbox" checked={doc.consentMechanismChecked}
         onChange={e=>update({consentMechanismChecked:e.target.checked})}/>
       J'ai vérifié manuellement l'information, l'acceptation, le refus, le retrait et le dépôt préalable.</label>}
     <p className="text-[11px] leading-relaxed text-white/60">Un simple stockage local de préférences n'implique pas automatiquement un bandeau. Les traceurs publicitaires peuvent nécessiter un consentement préalable et vérifiable.</p>
     <label className="flex items-start gap-2 text-xs text-white/75"><input aria-label="Sécurité opérationnelle examinée" type="checkbox" className="mt-0.5 accent-white"
       checked={doc.securityReviewed} onChange={e=>update({securityReviewed:e.target.checked})}/>Les mesures de sécurité ont été examinées en situation réelle.</label>
   </div>}
   {(tab==="bilan"||tab==="dossier")&&<div className="space-y-3 rounded-[5px] border border-white/15 p-3">
     <p className="text-xs font-semibold">Avant de transmettre à un professionnel</p>
     <label className="flex items-start gap-2 text-xs text-white/75"><input aria-label="Vérification juridique par un professionnel" type="checkbox" checked={doc.professionalReviewed}
       onChange={e=>update({professionalReviewed:e.target.checked})} className="mt-0.5 accent-white"/>
       J'ai fait relire le dossier par une personne compétente (déclaration, non vérifiée par l'application).</label>
     <label className="block text-xs text-white/75">Notes à transmettre
       <textarea aria-label="Notes de relecture juridique" maxLength={1800} rows={5} className={studioInput+" mt-1 resize-y"} value={doc.notes} onChange={e=>update({notes:cap(e.target.value,1800)})}/></label>
   </div>}
   <p className="border-t border-white/15 pt-3 text-[11px] leading-relaxed text-white/55">Données stockées localement sur cet appareil, sans synchronisation, chiffrement dédié ni contrôle d'accès. N'y placez pas de données sensibles de personnes réelles.</p>
  </>}
 </div>;
 const center=<div className="mx-auto max-w-[1050px] space-y-5 pb-28">
   <div><p className="text-[10px] font-semibold uppercase tracking-widest text-white/55">COMPRENDRE · DOCUMENTer · TRANSMETTRE</p>
     <h2 className="mt-2 text-[clamp(23px,3vw,33px)] font-semibold">{source?.title??"Le dossier naît du projet, pas d'un formulaire."}</h2>
     <p className="mt-2 text-xs leading-relaxed text-white/60">Une information déjà connue reste dans Mini-site ou Academy. Ici, seules les questions juridiques apparaissent lorsqu'elles sont utiles.</p></div>
   {!doc?<div className="rounded-[8px] border border-dashed border-white/20 p-6 text-center text-xs text-white/65">
     Aucun projet trouvé. Créez d'abord un Mini-site ou un site dans Academy pour réutiliser sa fiche.</div>:<>
     <div className="grid gap-3 sm:grid-cols-3">
       <div className="rounded-[7px] border border-white/15 bg-white/5 p-4"><p className="text-[11px] text-white/60">Questions prioritaires</p><strong className="mt-2 block text-3xl">{needs.length}</strong></div>
       <div className="rounded-[7px] border border-white/15 bg-white/5 p-4"><p className="text-[11px] text-white/60">À vérifier humainement</p><strong className="mt-2 block text-3xl">{issues.length-needs.length}</strong></div>
       <div className="rounded-[7px] border border-white/15 bg-white/5 p-4"><p className="text-[11px] text-white/60">Traitements documentés</p><strong className="mt-2 block text-3xl">{doc.treatments.length}</strong></div>
     </div>
     {tab==="bilan"&&<>
       <div className="grid gap-3 sm:grid-cols-2">{allLabels.map(area=><button aria-label={"Examiner "+area.title} key={area.id} onClick={()=>setTab(area.id)}
         className="rounded-[8px] border border-white/15 bg-white/5 p-4 text-left hover:bg-white/10">
         <div className="flex items-start justify-between"><h3 className="text-sm font-semibold">{area.title}</h3><ChevronRight size={17}/></div>
         <p className="mt-2 text-xs leading-relaxed text-white/55">{area.description}</p>
       </button>)}</div>
       <div className="rounded-[8px] border border-white/15 p-4"><h3 className="text-sm font-semibold">Questions qui restent ouvertes</h3>
        {issues.map(issue=><button key={issue.id} onClick={()=>setTab(issue.area==="identification"?"identification":issue.area==="cookies"?"traceurs":issue.area==="rgpd"?"donnees":"dossier")}
          className="mt-2 block w-full rounded-[5px] border border-white/10 bg-white/5 p-3 text-left hover:bg-white/10">
          <strong className="text-xs">{issue.title}</strong><p className="mt-1 text-[11px] text-white/60">{issue.reason}</p>
          <span className="mt-1 block text-[10px] text-white/50">{issue.level==="prioritaire"?"À traiter en priorité":"À confirmer"}</span>
        </button>)}
        {issues.length===0&&<p className="mt-3 text-xs text-white/60">Aucune question détectée par cette liste limitée de contrôles. Cela ne constitue pas un certificat.</p>}
       </div>
     </>}
     {tab==="identification"&&<div className="rounded-[8px] border border-white/15 p-4">
       <h3 className="text-sm font-semibold">Éditeur et hébergement</h3>
       <p className="mt-2 text-xs leading-relaxed text-white/60">Les mentions publiées dépendent du statut et de l'activité. Ne recopiez pas vos coordonnées dans chaque Studio : le dossier reste relié à la même source.</p>
       <button onClick={()=>setTab("bilan")} className={studioButton+" mt-3"}>Voir le diagnostic <ChevronRight size={14}/></button>
     </div>}
     {tab==="donnees"&&<>
       <section className="rounded-[8px] border border-white/15 bg-white/5 p-4">
         <h3 className="text-sm font-semibold">Ce site ou son service collecte-t-il vraiment des informations ?</h3>
         <p className="mt-2 text-xs leading-relaxed text-white/60">Un mini-site statique n'a pas les mêmes flux qu'un RSVP connecté, un paiement ou un stockage de photos. Les traitements sont ajoutés uniquement s'ils existent.</p>
         <label className="mt-4 block text-xs text-white/75">Ajouter une activité de traitement
           <select aria-label="Ajouter un traitement au registre" className={studioInput+" mt-2"} defaultValue="" onChange={e=>{if(e.target.value)addTreatment(e.target.value as TreatmentKind);e.target.value="";}}>
            <option value="">Sélectionner seulement ce qui existe…</option>
            {TREATMENTS.map(t=><option key={t.kind} value={t.kind}>{t.label}</option>)}
           </select></label>
       </section>
       <div className="space-y-2">{doc.treatments.map(t=><div key={t.id} className="rounded-[7px] border border-white/15 p-3">
         <p className="text-xs font-semibold">{TREATMENTS.find(x=>x.kind===t.kind)?.label}</p>
         <p className="mt-2 text-[11px] text-white/65">Finalité : {t.purpose}</p><p className="mt-1 text-[11px] text-white/65">Base : {BASIS.find(b=>b.value===t.lawfulBasis)?.label}</p>
         <p className="mt-1 text-[11px] text-white/55">Durée : {t.retention||"à préciser"} · Destinataires : {t.recipients||"à préciser"}</p>
       </div>)}
       {!doc.treatments.length&&<p className="rounded-[7px] border border-dashed border-white/15 p-5 text-xs text-white/55">Aucun traitement déclaré. Vérifiez le formulaire de contact, les statistiques, les RSVP et tous les services externes avant de conclure.</p>}</div>
     </>}
     {tab==="traceurs"&&<div className="space-y-4 rounded-[8px] border border-white/15 p-4">
       <h3 className="text-sm font-semibold">Pas de bandeau inutile ; pas de consentement fictif.</h3>
       <p className="text-xs leading-relaxed text-white/65">Certains traceurs nécessaires sont exemptés ; les traceurs commerciaux ou publicitaires peuvent demander un consentement préalable. Le formulaire de droite ne déploie aucun script et n'audite pas les serveurs tiers.</p>
       <a href="https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/comment-mettre-mon-site-web-en-conformite" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs underline">Guide CNIL <ExternalLink size={13}/></a>
     </div>}
     {tab==="dossier"&&<div className="space-y-4 rounded-[8px] border border-white/15 p-4">
       <h3 className="text-sm font-semibold">Un dossier professionnel à relire</h3>
       <p className="text-xs leading-relaxed text-white/60">Les informations proviennent du Mini-site ou du projet Academy, complétées par les seules informations légales saisies ici. Le document comporte les éléments inconnus et les questions à transmettre.</p>
       <button aria-label="Exporter le brouillon juridique Markdown" onClick={download} className="inline-flex min-h-10 items-center gap-2 rounded-[5px] bg-white px-4 text-xs font-semibold text-black"><Download size={15}/> Exporter le dossier .md</button>
       <p className="text-[11px] leading-relaxed text-white/50">Ce n'est pas une politique de confidentialité prête à publier, un registre complet certifié, ni un service de conseil juridique.</p>
     </div>}
   </>}
   {notice&&<p role="status" className="rounded-[6px] border border-white/15 bg-[#09090b] p-3 text-xs">{notice}</p>}
 </div>;
 return <StudioFrame title="Juridique & RGPD" subtitle="Une information, une source · pédagogie · contrôle · transmission"
  onBack={onBack} leftLabel="Projets et démarches" rightLabel="Informations juridiques" left={left} right={right}
  actions={<button aria-label="Préparer le dossier juridique" onClick={()=>setTab("dossier")} className={studioButton}><FileText size={14}/> <span className="hidden sm:inline">Dossier</span></button>}>
  {center}
 </StudioFrame>;
}
