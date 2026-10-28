import {projectMiniSite,storedProjectionSource} from "../lib/dossierProjections";
import {AIME_WORLD_CHANGED} from "../lib/universalDossier";
import {writeStoredJSON,everyStored} from "../lib/storageSafety";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { ArrowDown, ArrowUp, BookOpen, Check, ChevronRight, Download, Eye, EyeOff, GitBranch, ImagePlus, Laptop, Save, Scale, Smartphone, Trash2, Upload } from "lucide-react";
import { StudioFrame, studioButton, studioInput, saveStudioFile } from "./StudioFrame";
import { createMiniSite, MINI_DRAFTS, MINI_KEY, MINI_KINDS, miniProjectFile, miniSection, miniSiteToHTML, safeMiniSite, type MiniKind, type MiniSection, type MiniSectionKind, type MiniSite } from "../lib/miniSiteCore";
import { loadProjectOptions } from "../lib/budgetCore";
import { LEGAL_ACTIVE_KEY } from "../lib/legalCore";
import {readExternal,externalById} from "../lib/externalProjects";
import ExternalEmbed from "./ExternalEmbed";
import { COACH_PHASES, miniCoachProgress, readMiniCoach, writeMiniCoach, type CoachIssue, type CoachPhase, type MiniCoachProfile } from "../lib/miniSiteLearning";
const load=():MiniSite=>{try{return safeMiniSite(JSON.parse(localStorage.getItem(MINI_KEY)??"null"))??createMiniSite();}catch{return createMiniSite();}};
const loadDrafts=():MiniSite[]=>{try {const json=JSON.parse(localStorage.getItem(MINI_DRAFTS)??"[]") as unknown;return Array.isArray(json)?json.map(safeMiniSite).filter((x):x is MiniSite=>!!x).slice(0,12):[];}catch{return [];}};
const slug=(s:string)=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-")||"mini-site";
interface Props {onBack:()=>void;incomingDraft?:MiniSite|null;onLegal?:()=>void}
export default function MiniSiteStudio({onBack,incomingDraft,onLegal}:Props) {
  const [doc,setDoc]=useState<MiniSite>(()=>incomingDraft??load());
  const [drafts,setDrafts]=useState<MiniSite[]>(loadDrafts);
  const [selected,setSelected]=useState<string|null>(null);
  const [viewport,setViewport]=useState<"phone"|"desktop">("desktop");
  const [status,setStatus]=useState("");
  const [leftMode,setLeftMode]=useState<"plan"|"academy">("plan");
  const [coachPhase,setCoachPhase]=useState<CoachPhase>("intention");
  const [coach,setCoach]=useState<MiniCoachProfile>(()=>readMiniCoach((incomingDraft??load()).id));
  const [externalRegistry,setExternalRegistry]=useState(readExternal);
  const filePicker=useRef<HTMLInputElement>(null);
  const imagePicker=useRef<HTMLInputElement>(null);
  const [,refreshSource]=useState(0);
  useEffect(()=>{const refresh=()=>refreshSource(n=>n+1);window.addEventListener(AIME_WORLD_CHANGED,refresh);window.addEventListener("storage",refresh);return()=>{window.removeEventListener(AIME_WORLD_CHANGED,refresh);window.removeEventListener("storage",refresh)}},[]);
  let effectiveDoc=doc,projectionError="";
  try{effectiveDoc=projectMiniSite(doc,doc.dossierBinding?.programmeMode==="linked"?storedProjectionSource(doc.dossierBinding.spaceId):null)}catch(e){projectionError=String(e)}
  const section=effectiveDoc.sections.find(s=>s.id===selected)??null;
  const evaluation=useMemo(()=>miniCoachProgress(doc,coach.siteId===doc.id?coach:readMiniCoach(doc.id)),[doc,coach]);
  const projects=useMemo(loadProjectOptions,[]);
  const update=(patch:Partial<MiniSite>)=>setDoc(d=>({...d,...patch}));
  const updateSection=(id:string,patch:Partial<MiniSection>)=>setDoc(d=>({...d,sections:d.sections.map(s=>s.id===id?{...s,...patch}:s),dossierBinding:d.dossierBinding&&id===d.dossierBinding.programmeSectionId&&patch.body!==undefined?{...d.dossierBinding,programmeMode:"custom"}:d.dossierBinding}));
  useEffect(()=>{try{writeStoredJSON(MINI_KEY,JSON.stringify(doc),safeMiniSite);}catch{setStatus("Stockage saturé : exportez ce mini-site en HTML ou JSON.");}},[doc]);
  useEffect(()=>{setCoach(readMiniCoach(doc.id));},[doc.id]);
  useEffect(()=>{try{writeMiniCoach(coach);}catch{setStatus("Le parcours pédagogique ne peut pas être conservé dans ce navigateur.");}},[coach]);
  useEffect(()=>{
    const changed=()=>setExternalRegistry(readExternal());
    window.addEventListener("pointzero:external-changed",changed);
    return ()=>window.removeEventListener("pointzero:external-changed",changed);
  },[]);
  const editCoach=(patch:Partial<MiniCoachProfile>)=>setCoach(c=>({...c,...patch}));
  const fixIssue=(issue:CoachIssue)=>{
    setSelected(issue.sectionId??null);
    setLeftMode("plan");
    setStatus(issue.action);
  };
  const newSite=(kind:MiniKind)=>{
    if(!window.confirm("Créer un mini-site vierge ? L'actuel reste accessible uniquement si vous l'avez enregistré dans Mes mini-sites."))return;
    const next=createMiniSite(kind);setDoc(next);setSelected(null);
  };
  const store=()=>{
    const next=[doc,...drafts.filter(d=>d.id!==doc.id)].slice(0,12);
    try{writeStoredJSON(MINI_DRAFTS,JSON.stringify(next),everyStored(safeMiniSite));setDrafts(next);setStatus("Mini-site conservé dans Mes mini-sites.");}
    catch{setStatus("Stockage saturé : exportez ce mini-site en JSON.");}
  };
  const changeOrder=(id:string,delta:number)=>{
    setDoc(d=>{const items=[...d.sections];const index=items.findIndex(s=>s.id===id),to=index+delta;
      if(index<0||to<0||to>=items.length)return d;
      [items[index],items[to]]=[items[to],items[index]];
      return {...d,sections:items};
    });
  };
  const importJSON=async(e:ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0];e.target.value="";if(!file)return;
    if(file.size>6_000_000){setStatus("Fichier trop volumineux.");return;}
    try{
      const parsed=safeMiniSite(JSON.parse(await file.text()));
      if(!parsed)throw Error("Le mini-site JSON n'est pas valide.");
      setDoc(parsed);setSelected(null);setStatus("Mini-site importé localement.");
    }catch(error){setStatus(error instanceof Error?error.message:"Import impossible.");}
  };
  const importHero=(e:ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0];e.target.value="";if(!file)return;
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>3_000_000){setStatus("PNG, JPEG ou WebP de 3 Mo maximum.");return;}
    const reader=new FileReader();
    reader.onerror=()=>setStatus("Lecture de l'image impossible.");
    reader.onload=()=>{
      const data=String(reader.result??"");
      if(data.length>5_500_000){setStatus("Image trop volumineuse.");return;}
      update({heroImage:data});setStatus("Photo de couverture ajoutée.");
    };
    reader.readAsDataURL(file);
  };
  const exportHTML=()=>{if(projectionError){setStatus(projectionError);return;}saveStudioFile(slug(doc.name)+".html",miniSiteToHTML(effectiveDoc),"text/html;charset=utf-8");
    setStatus("HTML exporté. "+evaluation.errors+" correction(s) prioritaires restantes selon le pré-audit local ; publication et vérifications humaines à effectuer.");};
  const preview=projectionError?"<!doctype html><html lang=fr><body>Source du programme indisponible. Aperçu et export liés bloqués.</body></html>":miniSiteToHTML(effectiveDoc);
  const actions=<div className="flex gap-1">
    {onLegal&&<button type="button" className={studioButton+" !px-2"} onClick={()=>{localStorage.setItem(LEGAL_ACTIVE_KEY,"mini-site:"+doc.id);onLegal();}} title="Vérifier les obligations juridiques" aria-label="Vérifier Juridique RGPD du mini-site"><Scale size={16}/></button>}
    <button type="button" className={studioButton+" !px-2"} onClick={store} title="Enregistrer dans Mes mini-sites" aria-label="Enregistrer le mini-site"><Save size={16}/></button>
    <button type="button" className={studioButton+" !px-2"} onClick={()=>filePicker.current?.click()} title="Importer JSON" aria-label="Importer un mini-site JSON"><Upload size={16}/></button>
    <button type="button" className={studioButton+" !px-2"} onClick={()=>saveStudioFile(slug(doc.name)+".pointzero.json",miniProjectFile(doc))} title="Exporter JSON" aria-label="Exporter le mini-site JSON"><Download size={16}/></button>
    <button type="button" onClick={exportHTML} className="inline-flex min-h-9 items-center gap-1.5 rounded-[5px] bg-white px-3 text-xs font-semibold text-black"><Download size={15}/> HTML</button>
  </div>;
  return <StudioFrame title="Mini-site" subtitle="Une seule page · responsive · export HTML statique" onBack={onBack}
    leftLabel="Bibliothèque de mini-sites" rightLabel="Contenu du mini-site" actions={actions}
    left={<>
      <label className="block text-xs">Composition responsive<select className={studioInput} aria-label="Composition du mini-site" value={doc.compositionMode??''} onChange={e=>update({compositionMode:e.target.value?e.target.value as 'editorial'|'regular'|'immersive':undefined})}><option value="">Présentation originale</option><option value="editorial">Éditoriale</option><option value="regular">Régulière</option><option value="immersive">Immersive</option></select></label>

      {doc.dossierBinding&&<div role="status"><p>Programme {doc.dossierBinding.programmeMode==="linked"?"lié au Dossier Universel":"personnalisé, non synchronisé"}. Local uniquement.</p><p>{projectionError}</p>
      <button type="button" onClick={()=>{if(!projectionError&&window.confirm("Dissocier le programme et conserver son contenu actuel ?"))setDoc({...effectiveDoc,dossierBinding:{...doc.dossierBinding!,programmeMode:"custom"}})}}>Conserver une version personnalisée</button>
      {doc.dossierBinding.programmeMode==="custom"&&<button type="button" onClick={()=>{if(window.confirm("Remplacer l’affichage du programme par la source canonique ? Le texte personnalisé reste dans le JSON local."))update({dossierBinding:{...doc.dossierBinding!,programmeMode:"linked"}})}}>Suivre le programme du dossier</button>}</div>}

      <div className="mb-4 grid grid-cols-2 gap-1 rounded-[5px] border border-white/15 p-1">
        <button aria-label="Voir le plan du mini-site" aria-pressed={leftMode==="plan"} className={"rounded-[4px] px-2 py-2 text-xs "+(leftMode==="plan"?"bg-white font-semibold text-black":"text-white/80")} onClick={()=>setLeftMode("plan")}><GitBranch size={14} className="mr-1 inline"/>Plan</button>
        <button aria-label="Ouvrir le parcours Academy du mini-site" aria-pressed={leftMode==="academy"} className={"rounded-[4px] px-2 py-2 text-xs "+(leftMode==="academy"?"bg-white font-semibold text-black":"text-white/80")} onClick={()=>setLeftMode("academy")}><BookOpen size={14} className="mr-1 inline"/>Apprendre</button>
      </div>
      {leftMode==="academy"?<div className="space-y-4 pb-24">
        <div><p className="text-xs font-semibold">Construire dans le bon ordre.</p>
          <p className="mt-2 text-[11px] leading-relaxed text-white/60">Chaque vérification indique ce qui manque et dans quel champ intervenir. Ce parcours ne délivre pas de certification.</p>
          <div aria-label="Progression Academy du mini-site" role="progressbar" aria-valuemin={0} aria-valuemax={evaluation.total} aria-valuenow={evaluation.passed} className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-[#9bd6c3]" style={{width:(evaluation.passed/evaluation.total*100)+"%"}}/>
          </div>
          <p className="mt-2 text-[11px] text-white/65">{evaluation.passed}/{evaluation.total} étapes vérifiées · {evaluation.errors} points à corriger</p>
        </div>
        <label className="block text-xs text-white/75">À qui s'adresse le site ?
          <textarea aria-label="Public visé par le mini-site" className={studioInput+" mt-1 min-h-20 resize-y"} maxLength={220}
            value={coach.siteId===doc.id?coach.audience:""} onChange={e=>editCoach({audience:e.target.value})} placeholder="Invités, futurs clients, bénévoles…"/>
        </label>
        <label className="block text-xs text-white/75">Que doit faire ou comprendre le visiteur ?
          <textarea aria-label="Objectif principal du mini-site" className={studioInput+" mt-1 min-h-20 resize-y"} maxLength={350}
            value={coach.siteId===doc.id?coach.purpose:""} onChange={e=>editCoach({purpose:e.target.value})} placeholder="Trouver le lieu, découvrir une prestation, contacter…"/>
        </label>
        <div className="space-y-1.5">
          {COACH_PHASES.map((phase,i)=><button key={phase.id} aria-label={"Étape "+phase.name} aria-pressed={coachPhase===phase.id} onClick={()=>setCoachPhase(phase.id)}
            className={"flex min-h-10 w-full items-center gap-2 rounded-[5px] border px-2 text-left text-[11px] "+(coachPhase===phase.id?"border-white/80 bg-white/10":"border-white/15 hover:bg-white/5")}>
            <span className={"grid size-6 shrink-0 place-items-center rounded-full "+(evaluation.ready.includes(phase.id)?"bg-[#265b49]":"bg-white/10")}>{evaluation.ready.includes(phase.id)?<Check size={13}/>:i+1}</span>
            <span className="min-w-0 flex-1">{phase.name}</span>
            <span className="text-white/50">{evaluation.issues.filter(v=>v.phase===phase.id).length}</span>
          </button>)}
        </div>
        <div className="space-y-2 rounded-[6px] border border-white/15 p-3">
          <h3 className="text-xs font-semibold">{COACH_PHASES.find(p=>p.id===coachPhase)?.name}</h3>
          <p className="text-[11px] text-white/60">{COACH_PHASES.find(p=>p.id===coachPhase)?.description}</p>
          {evaluation.issues.filter(issue=>issue.phase===coachPhase).map(issue=><div key={issue.id} className="rounded-[5px] border border-white/15 bg-white/5 p-2">
            <strong className="text-[11px]">{issue.severity==="a-corriger"?"À corriger : ":"À vérifier : "}{issue.title}</strong>
            <p className="mt-1 text-[11px] leading-relaxed text-white/65">{issue.why}</p>
            {issue.id!=="manual"&&<button aria-label={"Corriger "+issue.title} className={studioButton+" mt-2 w-full"} onClick={()=>fixIssue(issue)}>Accéder à la correction <ChevronRight size={13}/></button>}
          </div>)}
          {evaluation.issues.every(issue=>issue.phase!==coachPhase)&&<p className="text-[11px] text-[#b8e7d2]">Points automatiques satisfaits pour cette étape.</p>}
        </div>
        <label className="flex items-start gap-2 rounded-[5px] border border-white/15 p-3 text-[11px] text-white/75">
          <input aria-label="Confirmer la relecture manuelle du mini-site" type="checkbox" checked={coach.siteId===doc.id&&coach.reviewed}
            onChange={e=>editCoach({reviewed:e.target.checked})} className="mt-0.5 accent-white"/>
          J'ai vérifié la navigation au clavier, le rendu mobile et la compréhension auprès d'une autre personne.
        </label>
        <p className="text-[11px] leading-relaxed text-white/55">Le contrôle des contrastes est partiel. Une relecture cochée ne prouve ni conformité RGAA/WCAG, ni positionnement Google.</p>
      </div>:<>
      <h2 className="mb-3 text-sm font-semibold">Mes mini-sites</h2>
      <div className="space-y-2">{drafts.map(site=><button type="button" key={site.id} onClick={()=>{setDoc(site);setSelected(null);}} aria-pressed={doc.id===site.id}
        className={"w-full rounded-[5px] border p-3 text-left text-xs "+(doc.id===site.id?"border-white/70 bg-white/15":"border-white/15 hover:bg-white/10")}>
        <span className="block truncate font-semibold">{site.name}</span><span className="mt-1 block text-[11px] text-white/60">{site.kind}</span></button>)}
      </div>
      <div className="mt-5 border-t border-white/15 pt-4">
        <h3 className="mb-2 text-xs font-semibold">Nouveau modèle</h3>
        <div className="grid grid-cols-2 gap-2">{MINI_KINDS.map(k=><button key={k.id} onClick={()=>newSite(k.id)} className={studioButton+" px-2"}>{k.name}</button>)}</div>
      </div>
      <div className="mt-5 border-t border-white/15 pt-4">
        <div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-semibold">Arborescence · page unique</h3><span className="text-[10px] text-white/50">{doc.sections.length}/16</span></div>
        <button aria-label="Sélectionner l'accueil et le hero du mini-site" aria-pressed={selected===null} onClick={()=>setSelected(null)} className={"mb-2 flex w-full items-center gap-2 rounded-[5px] border p-3 text-left text-xs "+(selected===null?"border-white/70 bg-white/15":"border-white/15")}>
          <GitBranch size={15}/> Accueil <span className="ml-auto text-[10px] text-white/60">H1 · hero</span></button>
        {doc.sections.map((s,i)=><div key={s.id} className={"mb-2 flex items-center gap-1 rounded-[5px] border p-1 "+(selected===s.id?"border-white/70 bg-white/15":"border-white/10")}>
          <button className="min-w-0 flex-1 px-2 py-2 text-left text-xs" onClick={()=>setSelected(s.id)}><span className="block truncate font-medium">{s.title}</span>
            <span className="block text-[10px] text-white/55">{s.kind}</span></button>
          <div className="flex flex-col">
            <button aria-label={"Monter "+s.title} title="Monter" disabled={i===0} onClick={()=>changeOrder(s.id,-1)} className="px-1 text-white/60 disabled:opacity-25"><ArrowUp size={13}/></button>
            <button aria-label={"Descendre "+s.title} title="Descendre" disabled={i===doc.sections.length-1} onClick={()=>changeOrder(s.id,1)} className="px-1 text-white/60 disabled:opacity-25"><ArrowDown size={13}/></button>
          </div>
          <button aria-label={(s.visible?"Masquer ":"Afficher ")+s.title} onClick={()=>updateSection(s.id,{visible:!s.visible})} className="px-1 text-white/70">{s.visible?<Eye size={15}/>:<EyeOff size={15}/>}</button>
        </div>)}
        <label className="mt-3 block text-xs text-white/70">Ajouter une section
          <select className={studioInput+" mt-1"} defaultValue="" onChange={e=>{if(!e.target.value)return;
            const next=miniSection(e.target.value as MiniSectionKind);
            setDoc(d=>({...d,sections:d.sections.length>=16?d.sections:[...d.sections,next]}));
            setSelected(next.id);e.target.value="";
          }}>
            <option value="">Choisir…</option>
            <option value="texte">Texte</option><option value="programme">Programme</option><option value="informations">Informations</option><option value="galerie">Galerie</option><option value="contact">Contact</option><option value="externe">Projet externe</option>
          </select>
        </label>
        <p className="mt-3 border-t border-white/10 pt-3 text-[11px] leading-relaxed text-white/55">Ces éléments sont des ancres dans une seule page HTML. De véritables pages séparées nécessiteront une architecture multipage.</p>
      </div>
      </>}
    </>}
    right={<>
      <h2 className="mb-4 text-sm font-semibold">{section?"Éditer la section":"Personnaliser le site"}</h2>
      {section?<div className="space-y-3">
        <button className={studioButton+" w-full"} onClick={()=>setSelected(null)}>Retour aux paramètres du site</button>
        <label className="block text-xs text-white/75">Titre<input aria-label="Titre de section" className={studioInput+" mt-1"} value={section.title} maxLength={300} onChange={e=>updateSection(section.id,{title:e.target.value})}/></label>
        <label className="block text-xs text-white/75">Contenu<textarea aria-label="Texte de section" className={studioInput+" mt-1"} value={section.body} rows={section.kind==="externe"?3:8} maxLength={5000} onChange={e=>updateSection(section.id,{body:e.target.value})}/></label>
        {section.kind==="externe"&&<div className="space-y-2 rounded-[7px] border border-white/15 p-3">
          <h3 className="text-xs font-semibold">Projet connecté à ma bibliothèque</h3>
          <p className="text-[11px] leading-relaxed text-white/60">On réutilise une référence existante. Aucun besoin de recopier le code de l'application.</p>
          <select aria-label="Relier une application externe au mini-site" className={studioInput} value={section.externalRefId??""}
            onChange={e=>updateSection(section.id,{externalRefId:e.target.value})}>
            <option value="">Choisir une application…</option>
            {externalRegistry.resources.map(v=><option key={v.id} value={v.id}>{v.title}</option>)}
          </select>
          <p className="text-[11px] leading-relaxed text-white/55">Sur le site exporté, le visiteur choisira explicitement de charger l'iframe. Si l'application l'interdit, un lien dans un nouvel onglet reste disponible. Dans l'aperçu isolé ci-dessous, les scripts sont volontairement désactivés.</p>
        </div>}
        <p className="text-[11px] text-white/55">Pour une galerie, ajoutez un intitulé par ligne. Le modèle affiche des cartes, pas encore des images indépendantes.</p>
        <button className={studioButton+" w-full"} onClick={()=>{if(!window.confirm("Supprimer cette section ?"))return;setDoc(d=>({...d,sections:d.sections.filter(s=>s.id!==section.id),dossierBinding:d.dossierBinding?.programmeSectionId===section.id?undefined:d.dossierBinding}));setSelected(null);}}><Trash2 size={14}/> Supprimer la section</button>
      </div>:<div className="space-y-3">
        <label className="block text-xs text-white/75">Nom du projet<input aria-label="Nom du mini-site" className={studioInput+" mt-1"} value={doc.name} maxLength={140} onChange={e=>update({name:e.target.value})}/></label>
        <label className="block text-xs text-white/75">Titre principal<input aria-label="Titre principal" className={studioInput+" mt-1"} value={doc.title} maxLength={300} onChange={e=>update({title:e.target.value})}/></label>
        <label className="block text-xs text-white/75">Accroche<input aria-label="Accroche" className={studioInput+" mt-1"} value={doc.eyebrow} maxLength={200} onChange={e=>update({eyebrow:e.target.value})}/></label>
        <label className="block text-xs text-white/75">Sous-titre<textarea aria-label="Sous-titre" className={studioInput+" mt-1"} rows={3} value={doc.subtitle} maxLength={500} onChange={e=>update({subtitle:e.target.value})}/></label>
        <div className="space-y-2 rounded-[6px] border border-white/15 p-3">
          <h3 className="text-xs font-semibold">Action du premier écran</h3>
          <p className="text-[11px] leading-relaxed text-white/55">Le visiteur doit pouvoir atteindre l'information attendue sans chercher dans le menu.</p>
          <input aria-label="Libellé du bouton du hero" className={studioInput} maxLength={80} placeholder="Voir le programme" value={doc.heroActionLabel??""} onChange={e=>update({heroActionLabel:e.target.value})}/>
          <select aria-label="Destination interne du bouton du hero" className={studioInput} value={doc.heroActionHref?.startsWith("#s-")?doc.heroActionHref:""} onChange={e=>{if(e.target.value)update({heroActionHref:e.target.value});}}>
            <option value="">Destination dans la page…</option>{doc.sections.filter(s=>s.visible).map(s=><option key={s.id} value={"#s-"+s.id}>{s.title}</option>)}
          </select>
          <input aria-label="Lien du bouton du hero" className={studioInput} maxLength={300} placeholder="#s-… ou https://… ou mailto:…" value={doc.heroActionHref??""} onChange={e=>update({heroActionHref:e.target.value})}/>
        </div>
        <label className="block text-xs text-white/75">Date<input className={studioInput+" mt-1"} value={doc.date} maxLength={150} onChange={e=>update({date:e.target.value})}/></label>
        <label className="block text-xs text-white/75">Lieu<input className={studioInput+" mt-1"} value={doc.place} maxLength={300} onChange={e=>update({place:e.target.value})}/></label>
        <label className="block text-xs text-white/75">Email de contact<input type="email" className={studioInput+" mt-1"} value={doc.contact} maxLength={254} onChange={e=>update({contact:e.target.value})}/></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-[11px] text-white/75">Accent<input aria-label="Couleur d'accent" type="color" className="mt-1 block size-9" value={doc.primaryColor} onChange={e=>update({primaryColor:e.target.value})}/></label>
          <label className="text-[11px] text-white/75">Fond<input aria-label="Couleur de fond" type="color" className="mt-1 block size-9" value={doc.background} onChange={e=>update({background:e.target.value})}/></label>
        </div>
        <button onClick={()=>imagePicker.current?.click()} className={studioButton+" w-full"}><ImagePlus size={16}/> Importer une photo de couverture</button>
        {doc.heroImage&&<label className="block text-xs text-white/75">Description de la couverture si informative
          <input aria-label="Alternative textuelle de la couverture" className={studioInput+" mt-1"} maxLength={300} value={doc.heroAlt??""} onChange={e=>update({heroAlt:e.target.value})} placeholder="Vide si la photo est décorative"/>
        </label>}
        {doc.heroImage&&<button onClick={()=>update({heroImage:""})} className={studioButton+" w-full"}>Retirer la photo</button>}
        <label className="block text-xs text-white/75">Projet graphique associé
          <select className={studioInput+" mt-1"} value={doc.projectId} onChange={e=>update({projectId:e.target.value})}>
            <option value="">Aucun</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
      </div>}
      <p className="mt-5 text-[11px] leading-relaxed text-white/55">Aucune publication ni collecte de RSVP côté serveur. Le contact ouvre l'application email du visiteur. Exportez le HTML puis hébergez-le pour partager une URL.</p>
    </>}
  >
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div><p className="text-[11px] font-semibold uppercase tracking-widest text-white/60">Aperçu en direct</p><h2 className="mt-1 text-lg font-semibold">{doc.name}</h2>
          <button aria-label="Voir les vérifications pédagogiques" onClick={()=>setLeftMode("academy")} className="mt-2 inline-flex items-center gap-2 text-[11px] text-[#cae9db] underline underline-offset-2">
            <BookOpen size={13}/> {evaluation.passed}/{evaluation.total} étapes pédagogiques · {evaluation.errors} corrections prioritaires</button></div>
        <div className="flex gap-1 rounded-[5px] border border-white/20 bg-[#09090b] p-1">
          <button onClick={()=>setViewport("desktop")} aria-pressed={viewport==="desktop"} aria-label="Aperçu ordinateur" className={(viewport==="desktop"?"bg-white text-black":"text-white")+" rounded-[4px] px-3 py-2"}><Laptop size={16}/></button>
          <button onClick={()=>setViewport("phone")} aria-pressed={viewport==="phone"} aria-label="Aperçu téléphone" className={(viewport==="phone"?"bg-white text-black":"text-white")+" rounded-[4px] px-3 py-2"}><Smartphone size={16}/></button>
        </div>
      </div>
      <div className="flex justify-center rounded-[8px] border border-white/15 bg-[#232326] p-3 sm:p-5">
        <iframe title="Prévisualisation du mini-site" sandbox="" srcDoc={preview} className={"h-[min(78dvh,950px)] min-h-[400px] rounded-[5px] border-0 bg-white shadow-2xl transition-[width] "+(viewport==="phone"?"w-[390px] max-w-full":"w-full")}/>
      </div>
      {section?.kind==="externe"&&section.externalRefId&&externalById(section.externalRefId)&&<div className="mt-4">
        <h3 className="mb-2 text-sm font-semibold">Tester l'application externe dans POINTZERO</h3>
        <ExternalEmbed key={section.externalRefId} resource={externalById(section.externalRefId)!}/>
      </div>}
      {status&&<p role="status" className="mt-3 rounded-[5px] bg-[#09090b] p-3 text-xs text-white">{status}</p>}
      <p className="mt-3 text-xs text-white/60">Prévisualisation isolée et responsive. Le HTML exporté fonctionne de manière autonome ; un module externe ne se charge qu’à la demande du visiteur et peut être bloqué par le site tiers.</p>
    </div>
    <input ref={filePicker} type="file" accept="application/json,.json" className="sr-only" aria-label="Choisir mini-site JSON" onChange={e=>void importJSON(e)}/>
    <input ref={imagePicker} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="Choisir photo de couverture" onChange={importHero}/>
  </StudioFrame>;
}
