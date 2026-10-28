import {writeStoredJSON} from "../lib/storageSafety";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { ArrowDown, ArrowUp, BookOpen, Check, ChevronRight, Code2, Download, Eye, GraduationCap, Layers3, Monitor, Palette, Plus, RotateCcw, Save, Scale, Smartphone, Tablet, Trash2, Upload } from "lucide-react";
import { StudioFrame, studioButton, studioInput, saveStudioFile } from "./StudioFrame";
import { LEGAL_ACTIVE_KEY } from "../lib/legalCore";
import {AIME_WORLD_CHANGED,academyDossierKey,attachAcademyResource,readDossier} from "../lib/universalDossier";
import { contrastGrade } from "../lib/accessibilityCore";
import {
 ACADEMY_KEY, ACADEMY_PROGRESS_KEY, ACADEMY_LESSONS, ACADEMY_TEMPLATES,
 academyDisplayProject,courseProgress,defaultLearning,exportAcademyHTML,makeAcademyProject,makeSection,palettes,
 readAcademy,readLearning,safeHref,validLearning,validProject,
 type SiteProject,type SiteSection,type SectionKind,type Device,type LearningState,type AcademyTemplate
} from "../lib/academyCore";

const sectionNames:{kind:SectionKind;label:string;description:string}[]=[
 {kind:"hero",label:"Accueil",description:"Titre, présentation et bouton"},
 {kind:"intro",label:"Présentation",description:"L'histoire du projet"},
 {kind:"cards",label:"Cartes",description:"Services, ateliers ou projets"},
 {kind:"quote",label:"Citation",description:"Une idée forte à transmettre"},
 {kind:"callout",label:"Appel à l'action",description:"Un contact ou une invitation"},
 {kind:"footer",label:"Pied de page",description:"Rester en contact"}
];
const localToday=()=>new Date().toISOString().slice(0,10);
const studioTxt="text-xs text-white/70";
const bounded=(value:string,n:number)=>value.slice(0,n);
export default function AcademyStudio({onBack,onAccessibility,onLegal,linkedDossierId}:{onBack:()=>void;onAccessibility:()=>void;onLegal?:()=>void;linkedDossierId?:string}){
 const readContext=():SiteProject=>{
  if(!linkedDossierId||!readDossier(linkedDossierId))return readAcademy();
  try{
   const saved=validProject(JSON.parse(localStorage.getItem(academyDossierKey(linkedDossierId))??"null"));
   if(saved?.dossierBinding?.spaceId===linkedDossierId)return saved;
  }catch{/* Unlinked legacy Academy remains untouched. */}
  return {...makeAcademyProject(),dossierBinding:{spaceId:linkedDossierId,titleMode:"linked",objectivesMode:"linked"}};
 };
 const readProgress=():LearningState=>{
  if(!linkedDossierId)return readLearning();
  try{return validLearning(JSON.parse(localStorage.getItem(ACADEMY_PROGRESS_KEY+":"+linkedDossierId)??"null"))??defaultLearning();}
  catch{return defaultLearning();}
 };
 const [project,setProject]=useState<SiteProject>(readContext);
 const [learning,setLearning]=useState<LearningState>(readProgress);
 const [,refreshSpace]=useState(0);
 useEffect(()=>{
  const refresh=()=>refreshSpace(n=>n+1);
  window.addEventListener(AIME_WORLD_CHANGED,refresh);window.addEventListener("storage",refresh);
  return()=>{window.removeEventListener(AIME_WORLD_CHANGED,refresh);window.removeEventListener("storage",refresh)};
 },[]);
 const linked=linkedDossierId?readDossier(linkedDossierId):null;
 const isLinked=!!linked&&project.dossierBinding?.spaceId===linked.id;
 const effectiveTitle=isLinked&&project.dossierBinding?.titleMode==="linked"?linked.title:project.siteTitle;
 const effectiveProject=academyDisplayProject(project,linked?{id:linked.id,title:linked.title,objectives:linked.dossier?.objectives}:null);
 const [device,setDevice]=useState<Device>("desktop");
 const [selected,setSelected]=useState<string|null>(null);
 const [mode,setMode]=useState<"apprenant"|"formateur">("apprenant");
 const [lesson,setLesson]=useState(ACADEMY_LESSONS[0].id);
 const [notice,setNotice]=useState("");
 const [newTitle,setNewTitle]=useState(""),[newInstructions,setNewInstructions]=useState("");
 const [collapsed,setCollapsed]=useState(false);
 const picker=useRef<HTMLInputElement>(null);
 const selectedSection=project.sections.find(s=>s.id===selected)??project.sections[0]??null;
 const displayedSection=effectiveProject.sections.find(s=>s.id===selectedSection?.id)??null;
 const tasks=courseProgress(effectiveProject,learning);
 const inspectorSelected=selectedSection!==null;
 const grades=useMemo(()=>contrastGrade(project.foreground,project.background),[project.foreground,project.background]);
 const accentGrade=useMemo(()=>contrastGrade("#ffffff",project.accent),[project.accent]);
 const chosenLesson=ACADEMY_LESSONS.find(t=>t.id===lesson)??ACADEMY_LESSONS[0];
 useEffect(()=>{try{
 const key=linkedDossierId?academyDossierKey(linkedDossierId):ACADEMY_KEY;
 if(linkedDossierId){
  if(!readDossier(linkedDossierId))throw Error("Dossier lié introuvable : aucune sauvegarde liée effectuée.");
  const raw=localStorage.getItem(key);
  if(raw!==null){
   let old:SiteProject|null=null;
   try{old=validProject(JSON.parse(raw));}catch{/* Preserve original bytes. */}
   if(!old||old.dossierBinding?.spaceId!==linkedDossierId)
    throw Error("Support Academy stocké invalide ou étranger : contenu original conservé. Exportez votre support avant toute réparation.");
  }
 }
 writeStoredJSON(key,JSON.stringify(project),validProject);
 if(linkedDossierId)attachAcademyResource(linkedDossierId,project.id);
 }catch(error){setNotice(error instanceof Error?error.message:"Stockage local indisponible : exportez votre site.");}},[project,linkedDossierId]);
 useEffect(()=>{try{writeStoredJSON(linkedDossierId?ACADEMY_PROGRESS_KEY+":"+linkedDossierId:ACADEMY_PROGRESS_KEY,JSON.stringify(learning),validLearning);}catch{setNotice("Stockage des exercices impossible : exportez votre projet.");}},[learning,linkedDossierId]);
 const update=(fn:(p:SiteProject)=>SiteProject)=>setProject(p=>({...fn(p),updated:localToday()}));
 const patchSite=(patch:Partial<SiteProject>)=>update(p=>({...p,...patch}));
 const patchSection=(patch:Partial<SiteSection>)=>{
  if(!selectedSection)return;
  update(p=>({...p,sections:p.sections.map(s=>s.id===selectedSection.id?{...s,...patch}:s),
   dossierBinding:patch.body!==undefined&&selectedSection.kind==="intro"&&p.dossierBinding?
    {...p.dossierBinding,objectivesMode:"custom"}:p.dossierBinding}));
 };
 const addSection=(kind:SectionKind)=>{
  if(project.sections.length>=45)return setNotice("Maximum 45 sections.");
  const next=makeSection(kind);
  update(p=>({...p,sections:kind==="footer"?[...p.sections,next]:
   [...p.sections.filter(s=>s.kind!=="footer"),next,...p.sections.filter(s=>s.kind==="footer")]}));
  setSelected(next.id);setNotice("Bloc ajouté. Cliquez sur son aperçu pour le modifier.");
 };
 const move=(id:string,dir:-1|1)=>{
  const index=project.sections.findIndex(s=>s.id===id),target=index+dir;
  if(index<0||target<0||target>=project.sections.length)return;
  update(p=>{const sections=[...p.sections];[sections[index],sections[target]]=[sections[target],sections[index]];return {...p,sections};});
 };
 const deleteSection=(id:string)=>{
  if(project.sections.length<2)return setNotice("Conservez au moins une section.");
  if(!window.confirm("Supprimer cette section du site ?"))return;
  update(p=>({...p,sections:p.sections.filter(s=>s.id!==id)}));
  if(selected===id)setSelected(null);
 };
 const chooseTemplate=(template:AcademyTemplate)=>{
  if(!window.confirm("Créer un site depuis ce modèle ? Le site actuel sera remplacé. Exportez-le avant pour le conserver."))return;
  const next={...makeAcademyProject(template),dossierBinding:project.dossierBinding};setProject(next);setSelected(null);setNotice("Nouveau projet prêt. Suivez les étapes de formation à gauche.");
 };
 const addExercise=()=>{
  if(!newTitle.trim()||!newInstructions.trim())return setNotice("Ajoutez le titre et la consigne de l'exercice.");
  if(learning.exercises.length>=20)return setNotice("Maximum 20 exercices personnalisés.");
  const exercise={id:globalThis.crypto?.randomUUID?.()??Math.random().toString(36).slice(2),title:bounded(newTitle.trim(),100),instructions:bounded(newInstructions.trim(),800)};
  setLearning(l=>({...l,exercises:[...l.exercises,exercise]}));setNewTitle("");setNewInstructions("");
  setNotice("Exercice ajouté au projet local. Aucun élève distant ne reçoit de notification.");
 };
 const exportProject=()=>saveStudioFile("pointzero-academy-projet.json",JSON.stringify({kind:"pointzero:academy-bundle",project:effectiveProject,learning},null,2));
 const importProject=async(e:ChangeEvent<HTMLInputElement>)=>{
  const file=e.target.files?.[0];e.target.value="";if(!file)return;
  if(file.size>500000)return setNotice("Fichier trop volumineux (500 Ko maximum).");
  try{
   const parsed=JSON.parse(await file.text());
   const p=validProject(parsed?.kind==="pointzero:academy-bundle"?parsed.project:parsed);
   const state=parsed?.kind==="pointzero:academy-bundle"?validLearning(parsed.learning):defaultLearning();
   if(!p||!state)throw Error("Projet Academy non reconnu.");
   if(!window.confirm("Remplacer votre projet actuel par le fichier importé ?"))return;
   setProject(linkedDossierId?{...p,dossierBinding:{spaceId:linkedDossierId,titleMode:"custom"}}:p);setLearning(state);setSelected(null);setNotice("Projet et exercices restaurés sur cet appareil.");
  }catch(e){setNotice(e instanceof Error?e.message:"Import impossible.");}
 };
 const exportHTML=()=>{
  try{saveStudioFile("site-"+project.id.slice(0,8)+".html",exportAcademyHTML(effectiveProject),"text/html;charset=utf-8");setNotice("Fichier HTML téléchargé. Contrôlez son contenu, son hébergement, ses liens et son accessibilité avant publication.");}
  catch(e){setNotice(e instanceof Error?e.message:"Export indisponible.");}
 };
 const contrastOK=grades.normalAA&&accentGrade.normalAA;
 const chosenPalette=palettes.find(p=>p.accent===project.accent);
 const left=<div className="space-y-4 pb-28">
   <div className="flex items-center gap-2"><GraduationCap size={18}/><h2 className="text-sm font-semibold">POINTZERO Academy</h2></div>
   <div className="grid grid-cols-2 gap-1 rounded-[5px] border border-white/15 p-1">
     <button type="button" aria-label="Mode apprenant Academy" aria-pressed={mode==="apprenant"} onClick={()=>setMode("apprenant")}
      className={"rounded-[4px] px-2 py-2 text-xs "+(mode==="apprenant"?"bg-white text-black":"text-white/80")}>Apprendre</button>
     <button type="button" aria-label="Mode formateur Academy" aria-pressed={mode==="formateur"} onClick={()=>setMode("formateur")}
      className={"rounded-[4px] px-2 py-2 text-xs "+(mode==="formateur"?"bg-white text-black":"text-white/80")}>Former</button>
   </div>
   <div className="space-y-2">
     <div className="flex items-center justify-between"><span className="text-xs font-semibold">Mon parcours</span><span className="text-xs text-white/75">{tasks.passed}/{tasks.all}</span></div>
     <div className="h-2 rounded-full bg-white/15" role="progressbar" aria-label="Progression du parcours UI UX" aria-valuemin={0} aria-valuemax={tasks.all} aria-valuenow={tasks.passed}>
       <div className="h-full rounded-full bg-[#9edacc] transition-[width]" style={{width:tasks.percentage+"%"}}/>
     </div>
     <p className="text-[11px] leading-relaxed text-white/60">La progression dépend des changements réels que vous effectuez sur le site.</p>
     {ACADEMY_LESSONS.map((t,i)=><button key={t.id} aria-label={"Leçon "+t.title} aria-pressed={lesson===t.id} onClick={()=>{setLesson(t.id);setCollapsed(false);}}
       className={"flex min-h-12 w-full items-center gap-2 rounded-[5px] border px-2 text-left text-[11px] "+(lesson===t.id?"border-white/70 bg-white/10":"border-white/10 hover:bg-white/5")}>
       <span className={"grid size-7 shrink-0 place-items-center rounded-full border text-[11px] "+(tasks.ids.includes(t.id)?"border-[#88dec2] bg-[#245944] text-white":"border-white/20 text-white/70")}>{tasks.ids.includes(t.id)?<Check size={14}/>:i+1}</span>
       <span className="min-w-0 flex-1">{t.title}<span className="block text-[10px] text-white/45">{tasks.ids.includes(t.id)?"Étape validée":"À pratiquer"}</span></span>
     </button>)}
   </div>
   {mode==="formateur"&&<div className="space-y-2 border-t border-white/15 pt-4">
     <h3 className="text-xs font-semibold">Préparer un exercice client</h3>
     <input aria-label="Titre de l'exercice du formateur" className={studioInput} placeholder="Ex. Créer votre page contact" value={newTitle} maxLength={100} onChange={e=>setNewTitle(e.target.value)}/>
     <textarea aria-label="Consigne de l'exercice du formateur" className={studioInput+" min-h-24 resize-y"} placeholder="Expliquez ce que l'apprenant doit réaliser…" value={newInstructions} maxLength={800} onChange={e=>setNewInstructions(e.target.value)}/>
     <button onClick={addExercise} aria-label="Ajouter un exercice de formation" className={studioButton+" w-full"}><Plus size={14}/> Ajouter la consigne</button>
     {learning.exercises.map(ex=><div key={ex.id} className="rounded-[5px] border border-white/15 p-2">
       <strong className="text-[11px]">{ex.title}</strong><p className="mt-1 whitespace-pre-wrap text-[11px] text-white/60">{ex.instructions}</p>
       <button aria-label={"Supprimer l'exercice "+ex.title} onClick={()=>setLearning(l=>({...l,exercises:l.exercises.filter(v=>v.id!==ex.id),completedCustom:l.completedCustom.filter(id=>id!==ex.id)}))}
        className="mt-2 text-[10px] text-white/75 underline">Supprimer</button>
     </div>)}
     <p className="text-[10px] text-white/55">Mode local de préparation, sans comptes de formateur, classes, paiement ni suivi distant.</p>
   </div>}
   {mode==="apprenant"&&learning.exercises.length>0&&<div className="space-y-2 border-t border-white/15 pt-4">
     <h3 className="text-xs font-semibold">Exercices du formateur</h3>
     {learning.exercises.map(ex=><div key={ex.id} className="rounded-[5px] border border-white/15 p-2">
       <strong className="text-[11px]">{ex.title}</strong><p className="mt-1 whitespace-pre-wrap text-[11px] text-white/60">{ex.instructions}</p>
       <label className="mt-3 flex items-center gap-2 text-[11px]"><input aria-label={"Marquer l'exercice "+ex.title+" comme réalisé"} type="checkbox" checked={learning.completedCustom.includes(ex.id)}
         onChange={e=>setLearning(l=>({...l,completedCustom:e.target.checked?[...l.completedCustom,ex.id]:l.completedCustom.filter(id=>id!==ex.id)}))} className="accent-white"/>Je l'ai réalisé</label>
     </div>)}
     <p className="text-[10px] text-white/55">Ces exercices sont auto-déclarés ; le formateur doit vérifier le travail.</p>
   </div>}
   <div className="space-y-2 border-t border-white/15 pt-4">
     <h3 className="text-xs font-semibold">Modèles pour démarrer</h3>
     {ACADEMY_TEMPLATES.map(t=><button key={t.id} aria-label={"Utiliser modèle "+t.title} onClick={()=>chooseTemplate(t.id)}
       className={"block w-full rounded-[5px] border p-3 text-left text-xs "+(project.template===t.id?"border-white/55":"border-white/15 hover:bg-white/10")}>
       <strong>{t.title}</strong><span className="mt-1 block text-[10px] text-white/50">{t.subtitle}</span></button>)}
   </div>
   <div className="space-y-2 border-t border-white/15 pt-4">
     <h3 className="text-xs font-semibold">Construire avec des blocs</h3>
     <div className="grid grid-cols-2 gap-2">{sectionNames.map(t=><button key={t.kind} aria-label={"Ajouter bloc "+t.label} onClick={()=>addSection(t.kind)}
       className="min-h-14 rounded-[5px] border border-white/15 px-2 py-2 text-left text-[11px] hover:bg-white/10"><Plus size={14} className="mb-1 text-white/70"/>{t.label}</button>)}</div>
   </div>
 </div>;
 const right=<div className="space-y-4 pb-24">
   <h2 className="text-sm font-semibold">Inspecteur UI/UX</h2>
   <details open className="rounded-[6px] border border-white/15 p-3">
     <summary className="cursor-pointer text-xs font-semibold">Identité du site</summary>
     <div className="mt-3 space-y-3">
       <label className={studioTxt}>Nom du projet<input aria-label="Nom du projet Academy" className={studioInput+" mt-1"} maxLength={100} value={effectiveProject.name} onChange={e=>patchSite({name:e.target.value,dossierBinding:project.dossierBinding?{...project.dossierBinding,titleMode:"custom"}:undefined})}/></label>
       <label className={studioTxt}>Nom affiché dans l'en-tête<input aria-label="Nom public du site Academy" className={studioInput+" mt-1"} maxLength={100} value={effectiveTitle} onChange={e=>patchSite({siteTitle:e.target.value,dossierBinding:project.dossierBinding?{...project.dossierBinding,titleMode:"custom"}:undefined})}/></label>
       <label className={studioTxt}>Typographie
         <select aria-label="Typographie du site Academy" value={project.font} className={studioInput+" mt-1"} onChange={e=>patchSite({font:e.target.value as SiteProject["font"]})}>
           <option value="sans">Moderne · Sans serif</option><option value="serif">Éditoriale · Serif</option></select></label>
     </div>
   </details>
   <details open className="rounded-[6px] border border-white/15 p-3">
     <summary className="cursor-pointer text-xs font-semibold">Couleurs & contraste</summary>
     <div className="mt-3 space-y-2">
       {(["accent","foreground","background"] as const).map(key=><label key={key} className="flex items-center gap-2 text-[11px] text-white/75">
         <input aria-label={"Choisir "+key+" du site Academy"} type="color" value={project[key]} onChange={e=>patchSite({[key]:e.target.value})} className="h-9 w-10 shrink-0 cursor-pointer rounded-[4px] border border-white/20"/>
         <span className="min-w-0 flex-1">{key==="accent"?"Couleur principale":key==="foreground"?"Texte":"Fond"}</span><span className="font-mono text-[10px] text-white/55">{project[key]}</span>
       </label>)}
       <div className="rounded-[5px] border border-white/10 bg-white/5 p-2 text-[11px]">
         <p>Texte principal : <strong>{grades.ratio.toFixed(2)}:1</strong> · {grades.normalAA?"AA contraste atteint":"AA contraste insuffisant"}</p>
         <p className="mt-1">Bouton blanc : <strong>{accentGrade.ratio.toFixed(2)}:1</strong> · {accentGrade.normalAA?"AA contraste atteint":"AA contraste insuffisant"}</p>
       </div>
       <button onClick={onAccessibility} className={studioButton+" w-full"}><Eye size={14}/> Ouvrir Studio Accessibilité</button>
     </div>
   </details>
   {inspectorSelected&&<details open className="rounded-[6px] border border-white/15 p-3">
     <summary className="cursor-pointer text-xs font-semibold">Bloc sélectionné · {sectionNames.find(t=>t.kind===selectedSection.kind)?.label}</summary>
     <div className="mt-3 space-y-3">
       <label className={studioTxt}>Titre du bloc<input aria-label="Titre du bloc Academy" className={studioInput+" mt-1"} maxLength={150}
         value={selectedSection.title} onChange={e=>patchSection({title:e.target.value})}/></label>
       <label className={studioTxt}>Contenu<textarea aria-label="Texte du bloc Academy" className={studioInput+" mt-1 min-h-28 resize-y"} maxLength={1800}
         value={displayedSection?.body??selectedSection.body} onChange={e=>patchSection({body:e.target.value})}/></label>
       <label className={studioTxt}>Texte du bouton (facultatif)<input aria-label="Bouton du bloc Academy" className={studioInput+" mt-1"} maxLength={80}
         value={selectedSection.actionLabel} onChange={e=>patchSection({actionLabel:e.target.value})}/></label>
       <label className={studioTxt}>Destination HTTPS, email, téléphone ou ancre
         <input aria-label="Lien du bouton Academy" className={studioInput+" mt-1"} maxLength={300} value={selectedSection.actionHref}
           onChange={e=>patchSection({actionHref:e.target.value})}/>
         {selectedSection.actionHref&&!safeHref(selectedSection.actionHref)&&<span role="alert" className="mt-1 block text-[11px] text-[#ffb6b6]">Lien non autorisé. Aucun script ou URL dangereuse ne peut être exporté.</span>}</label>
       <div className="grid grid-cols-3 gap-2">
         <button aria-label="Remonter le bloc Academy" className={studioButton} onClick={()=>move(selectedSection.id,-1)}><ArrowUp size={15}/></button>
         <button aria-label="Descendre le bloc Academy" className={studioButton} onClick={()=>move(selectedSection.id,1)}><ArrowDown size={15}/></button>
         <button aria-label="Supprimer le bloc Academy" className={studioButton} onClick={()=>deleteSection(selectedSection.id)}><Trash2 size={15}/></button>
       </div>
     </div>
   </details>}
   <div className="space-y-2 border-t border-white/15 pt-4">
     <h3 className="text-xs font-semibold">Sections de la page</h3>
     {project.sections.map((s,i)=><button key={s.id} aria-label={"Sélectionner section "+(i+1)} aria-pressed={selectedSection?.id===s.id}
       onClick={()=>setSelected(s.id)} className={"flex min-h-9 w-full items-center gap-2 rounded-[5px] px-2 text-left text-[11px] "+(selectedSection?.id===s.id?"bg-white text-black":"text-white/75 hover:bg-white/10")}>
       <Layers3 size={14}/><span className="min-w-0 flex-1 truncate">{i+1}. {s.title||"Sans titre"}</span><ChevronRight size={13}/></button>)}
   </div>
 </div>;
 const actions=<div className="flex items-center gap-1.5">
   {onLegal&&<button type="button" aria-label="Vérifier Juridique RGPD du site Academy" onClick={()=>{localStorage.setItem(LEGAL_ACTIVE_KEY,"academy:"+project.id);onLegal();}} className={studioButton+" !px-2"}><Scale size={15}/></button>}
   <button type="button" aria-label="Importer un projet Academy JSON" onClick={()=>picker.current?.click()} className={studioButton+" !px-2"}><Upload size={15}/></button>
   <button type="button" aria-label="Sauvegarder le projet Academy JSON" onClick={exportProject} className={studioButton+" !px-2"}><Save size={15}/></button>
   <button type="button" aria-label="Exporter le site Academy en HTML" onClick={exportHTML} className="flex min-h-9 items-center gap-1.5 rounded-[5px] bg-white px-3 text-xs font-semibold text-black"><Code2 size={15}/> <span className="hidden sm:inline">Export site</span></button>
 </div>;
 const selectedStyle={backgroundColor:project.background,color:project.foreground,fontFamily:project.font==="serif"?"Georgia,serif":"system-ui,Arial,sans-serif"};
 const rootPreview=displayedSection??effectiveProject.sections[0];
 return <StudioFrame title="UI/UX & Academy" subtitle="No Code · apprendre et construire un véritable site dans le même espace"
   onBack={onBack} leftLabel="Projets et cours Academy" rightLabel="Inspecteur UI UX" actions={actions} left={left} right={right}>
   <div className="mx-auto max-w-[1320px] space-y-4 pb-28">
     {isLinked&&<div className="flex flex-wrap items-center justify-between gap-2 rounded-[6px] border border-[#a6899c]/35 bg-[#29212d] px-4 py-3 text-xs" aria-label="Lien canonique Dossier Universel">
       <div>Source AIME · <strong>{linked.title}</strong> · {linked.id.slice(0,8)} · {project.dossierBinding?.titleMode==="linked"?"Titre synchronisé":"Titre personnalisé conservé"}</div>
       <div className="flex flex-wrap gap-2">
       {project.dossierBinding?.titleMode==="custom"&&<button type="button" className={studioButton} onClick={()=>{if(window.confirm("Réutiliser le titre canonique du dossier ? Le titre personnalisé reste conservé dans le projet JSON local."))patchSite({dossierBinding:{...project.dossierBinding!,titleMode:"linked"}})}}>Suivre le titre du dossier</button>}
       {project.dossierBinding?.objectivesMode==="custom"&&<button type="button" className={studioButton} onClick={()=>{if(window.confirm("Afficher les objectifs canonique du dossier ? Le texte personnalisé reste conservé dans le projet JSON local."))patchSite({dossierBinding:{...project.dossierBinding!,objectivesMode:"linked"}})}}>Suivre les objectifs du dossier</button>}
       {linked.dossier?.references.some(r=>r.studio==="academy"&&r.type==="studio"&&r.targetId!==project.id)&&
        <button type="button" className={studioButton} onClick={()=>{
         if(!window.confirm("Le dossier référence déjà un autre support Academy. Remplacer explicitement cette référence ? Le changement sera historisé."))return;
         try{attachAcademyResource(linked.id,project.id,true);setNotice("Référence Academy remplacée sur validation et historisée.");}
         catch(error){setNotice(error instanceof Error?error.message:"Réparation refusée.");}
        }}>Confirmer le remplacement de la référence Academy</button>}
       </div>
     </div>}
     <div className="flex flex-wrap items-center justify-between gap-3">
       <div><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-white/50">Créer · Comprendre · Transmettre</p>
         <h2 className="mt-1 text-lg font-semibold">{effectiveProject.name}</h2></div>
       <div className="flex items-center gap-1 rounded-[6px] border border-white/15 bg-[#0c0c10] p-1" role="group" aria-label="Aperçu responsive Academy">
         {([{name:"Ordinateur",id:"desktop",icon:Monitor},{name:"Tablette",id:"tablet",icon:Tablet},{name:"Mobile",id:"mobile",icon:Smartphone}] as const).map(d=><button key={d.id}
           aria-label={"Aperçu "+d.name} aria-pressed={device===d.id} onClick={()=>setDevice(d.id)}
           className={"flex size-9 items-center justify-center rounded-[4px] "+(device===d.id?"bg-white text-black":"text-white/70 hover:bg-white/15")}>
           <d.icon size={16}/></button>)}
       </div>
     </div>
     <div className="rounded-[8px] border border-[#b7a8ed]/45 bg-[#17151f] p-3">
       <div className="flex items-center justify-between gap-2">
         <div><p className="text-[10px] font-semibold uppercase tracking-wide text-[#bdb1f3]">Séance en cours · {chosenLesson.title}</p>
           <p className="mt-1 text-xs text-white/80">{chosenLesson.task}</p></div>
         <button aria-label="Afficher ou masquer la consigne Academy" onClick={()=>setCollapsed(v=>!v)} className={studioButton+" shrink-0 !px-2"}>{collapsed?<BookOpen size={15}/>:<RotateCcw size={15}/>}</button>
       </div>
       {!collapsed&&<p className="mt-2 text-[11px] leading-relaxed text-white/50">{chosenLesson.description}. {tasks.ids.includes(chosenLesson.id)?"Cette leçon est validée par les changements du site.":"Sélectionnez le bloc dans l'aperçu et modifiez-le dans l'inspecteur."}</p>}
     </div>
     <div className="flex justify-center overflow-x-auto rounded-[10px] border border-white/15 bg-[#22222a] p-2 sm:p-4">
       <div className="min-w-0 overflow-hidden rounded-[7px] border border-black/15 shadow-[0_20px_65px_#0006] transition-[width] duration-150"
         style={{width:device==="desktop"?"100%":device==="tablet"?680:390,maxWidth:"100%",...selectedStyle}} aria-label="Prévisualisation du site No Code">
         <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-black/10 px-5 py-4 sm:px-8">
           <strong className="text-sm">{effectiveTitle||"Votre site"}</strong><div className="flex flex-wrap gap-3">
             {project.sections.filter(s=>s.kind!=="hero"&&s.kind!=="footer").slice(0,3).map(s=><button key={s.id}
               onClick={()=>setSelected(s.id)} className="text-[11px] opacity-75 hover:underline">{s.title||"Rubrique"}</button>)}</div>
         </header>
         <main>
           {effectiveProject.sections.map(s=><section key={s.id} tabIndex={0} role="button"
             aria-label={"Modifier "+s.title} aria-pressed={rootPreview.id===s.id}
             onClick={()=>setSelected(s.id)}
             onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setSelected(s.id);}}}
             className={"group relative cursor-pointer border-2 border-transparent px-5 py-12 outline-offset-[-3px] transition-colors hover:border-[#9c83e3] focus-visible:border-[#6b58bd] sm:px-8 "+
               (rootPreview.id===s.id?"!border-[#8b77d2]":"")+
               (s.kind==="hero"?" min-h-[325px] flex flex-col justify-center":"")+
               (s.kind==="footer"?" border-t border-black/10":"")} style={s.kind==="hero"?{background:"linear-gradient(135deg,"+project.background+","+project.accent+"14)"}:undefined}>
             <span className="absolute right-3 top-3 rounded-[5px] bg-[#1d1b24] px-2 py-1 text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">{sectionNames.find(t=>t.kind===s.kind)?.label} · éditer</span>
             {s.kind==="hero"?<h1 className="max-w-[770px] font-bold leading-[1.14] tracking-[-.045em]" style={{fontSize:device==="mobile"?"32px":device==="tablet"?"44px":"clamp(34px,4.1vw,60px)"}}>{s.title||"Votre titre"}</h1>:
               <h2 className="text-[clamp(23px,3vw,38px)] font-bold leading-[1.2] tracking-[-.03em]">{s.title||"Votre rubrique"}</h2>}
             {s.kind==="cards"?<div className={"mt-6 grid gap-3 "+(device==="mobile"?"grid-cols-1":device==="tablet"?"grid-cols-2":"grid-cols-3")}>
               {s.body.split(/\n+/g).filter(Boolean).slice(0,8).map((text,i)=><div key={i} className="rounded-[7px] border border-current/10 p-4 text-sm" style={{backgroundColor:project.accent+"12"}}>{text}</div>)}
             </div>:<p className={"mt-5 max-w-[690px] whitespace-pre-wrap text-sm leading-[1.8] opacity-75 "+(s.kind==="quote"?"italic":"")}>{s.body}</p>}
             {!!s.actionLabel&&<span aria-label="Bouton de démonstration non navigable" className="mt-6 inline-flex min-h-10 self-start items-center rounded-[5px] px-4 text-xs font-semibold text-white" style={{backgroundColor:project.accent}}>
               {s.actionLabel} <ChevronRight size={14} className="ml-2"/></span>}
           </section>)}
         </main>
       </div>
     </div>
     <p className="text-center text-[11px] text-white/60">Cliquez ou utilisez Tab puis Entrée pour sélectionner un bloc. Aucun changement n'est publié en ligne sans export et déploiement.</p>
     <div className="flex flex-wrap items-center justify-between gap-3 rounded-[7px] border border-white/15 bg-white/5 p-3">
       <div><p className="text-xs font-semibold">{contrastOK?"Contrastes principaux lisibles":"Contrastes à revoir"} · {project.sections.length} blocs</p>
         <p className="mt-1 text-[11px] text-white/60">Vérification de deux couples de couleurs seulement ; audit accessibilité complet distinct.</p></div>
       <button onClick={exportHTML} className={studioButton}><Download size={15}/> Exporter mon site HTML</button>
     </div>
     {notice&&<p role="status" className="rounded-[5px] border border-white/20 bg-[#09090b] p-3 text-xs text-white">{notice}</p>}
   </div>
   <div className="fixed inset-x-0 bottom-0 z-30 flex h-[79px] items-center gap-3 overflow-x-auto border-t border-white/15 bg-[#09090b] px-3 text-white" aria-label="Palette visuelle et marque Academy">
     <div className="shrink-0"><p className="text-[11px] font-semibold">Identité visuelle</p><p className="text-[10px] text-white/50">Palette commune</p></div>
     <div className="flex items-center gap-2">{palettes.map(p=><button key={p.name} aria-label={"Palette "+p.name} aria-pressed={chosenPalette?.name===p.name}
       onClick={()=>patchSite({accent:p.accent,background:p.background,foreground:p.foreground})}
       className={"flex min-w-[76px] flex-col items-center gap-1 rounded-[5px] border px-2 py-2 text-[10px] "+(project.accent===p.accent?"border-white bg-white/15":"border-white/10 hover:bg-white/10")}>
       <span className="flex gap-0.5"><span className="size-5 rounded-[3px] border border-white/20" style={{background:p.accent}}/>
         <span className="size-5 rounded-[3px] border border-white/20" style={{background:p.background}}/></span>{p.name}</button>)}</div>
     <button onClick={onAccessibility} className={studioButton+" ml-auto shrink-0"}><Palette size={14}/> <span className="hidden sm:inline">Contrôler</span></button>
   </div>
   <input ref={picker} type="file" accept=".json,application/json" aria-label="Charger un projet Academy JSON" onChange={e=>void importProject(e)} className="sr-only"/>
 </StudioFrame>;
}
