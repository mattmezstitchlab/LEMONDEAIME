import {writeStoredJSON} from "../lib/storageSafety";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { CalendarDays, Copy, Download, FileText, Plus, Trash2, Upload } from "lucide-react";
import { StudioFrame, studioButton, studioInput, SummaryTile, saveStudioFile } from "./StudioFrame";
import { PROGRAMME_STORAGE, blankSession, hoursFor, makeProgramme, programmeToHTML, programmeToICS, programmesToCSV, repeatNextWeek, safeProgrammeStore, sortedSessions, type Programme, type ProgrammeKind, type ProgrammeSession, type ProgrammeStore, type SessionState } from "../lib/programmeCore";
import { loadProjectOptions } from "../lib/budgetCore";

const load=():ProgrammeStore=>{
  try{return safeProgrammeStore(JSON.parse(localStorage.getItem(PROGRAMME_STORAGE)??"null"))??{version:1,programmes:[]};}
  catch{return {version:1,programmes:[]};}
};
const TEMPLATES:{name:string;kind:ProgrammeKind;topics:string[]}[]=[
  {name:"Parcours de formation",kind:"formation",topics:["Introduction et objectifs","Démonstration","Mise en pratique","Évaluation et bilan"]},
  {name:"Programme de cours",kind:"cours",topics:["Comprendre les bases","Exercices guidés","Travail individuel","Restitution"]},
  {name:"Atelier collectif",kind:"atelier",topics:["Accueil et présentation","Expérimentation","Partage et bilan"]},
  {name:"Séance unique",kind:"seance",topics:["Accueil","Pratique","Conclusion"]},
];
const dateAdd=(date:string,offset:number)=>{
  const d=new Date(date+"T12:00:00");d.setDate(d.getDate()+offset);
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
};
interface Props{onBack:()=>void;linkedProject?:{id:string;name:string}|null}
export default function ProgrammeStudio({onBack,linkedProject}:Props){
  const [store,setStore]=useState<ProgrammeStore>(load);
  const [selectedId,setSelectedId]=useState<string|null>(store.programmes[0]?.id??null);
  const [sessionId,setSessionId]=useState<string|null>(null);
  const [message,setMessage]=useState("");
  const [addTitle,setAddTitle]=useState("");
  const [addKind,setAddKind]=useState<ProgrammeKind>("formation");
  const [template,setTemplate]=useState("vide");
  const [filter,setFilter]=useState("");
  const [rightMode,setRightMode]=useState<"programme"|"seance">("programme");
  const filePicker=useRef<HTMLInputElement>(null);
  const availableProjects=useMemo(()=> {
    const options=loadProjectOptions();
    if(linkedProject&&!options.some(x=>x.id===linkedProject.id))options.unshift(linkedProject);
    return options;
  },[linkedProject]);
  const programme=store.programmes.find(p=>p.id===selectedId)??null;
  const chosenSession=programme?.sessions.find(s=>s.id===sessionId)??null;
  useEffect(()=>{try{writeStoredJSON(PROGRAMME_STORAGE,JSON.stringify(store),safeProgrammeStore);}
    catch{setMessage("Stockage saturé : exportez vos programmes en JSON.");}},[store]);
  const updateProgramme=(patch:Partial<Programme>)=>{
    if(!programme)return;
    setStore(old=>({...old,programmes:old.programmes.map(p=>p.id===programme.id?{...p,...patch}:p)}));
  };
  const updateSession=(id:string,patch:Partial<ProgrammeSession>)=>{
    if(!programme)return;
    setStore(old=>({...old,programmes:old.programmes.map(p=>p.id===programme.id?{
      ...p,sessions:p.sessions.map(s=>s.id===id?{...s,...patch}:s)
    }:p)}));
  };
  const createProgramme=()=>{
    const base=makeProgramme(addTitle.trim()||"Nouveau programme",addKind,linkedProject?.id??"");
    const t=TEMPLATES.find(x=>x.name===template);
    if(t){
      const date=blankSession().date;
      base.kind=t.kind;
      base.sessions=t.topics.map((title,i)=>({...blankSession(),title,date:dateAdd(date,7*i)}));
    }
    setStore(old=>({...old,programmes:[base,...old.programmes]}));
    setSelectedId(base.id);setSessionId(null);setRightMode("programme");setAddTitle("");setTemplate("vide");
  };
  const addSession=()=>{
    if(!programme)return;
    const session=blankSession();
    if(programme.sessions.length){
      const last=sortedSessions(programme).at(-1)!;
      session.date=dateAdd(last.date,7);session.start=last.start;
    }
    updateProgramme({sessions:[...programme.sessions,session]});setSessionId(session.id);setRightMode("seance");
  };
  const cloneNext=()=>{
    if(!programme||!chosenSession)return;
    if(programme.sessions.length>=500){setMessage("Limite de 500 séances atteinte.");return;}
    const clone=repeatNextWeek(chosenSession);
    updateProgramme({sessions:[...programme.sessions,clone]});setSessionId(clone.id);setRightMode("seance");
  };
  const removeSession=()=>{
    if(!programme||!chosenSession||!window.confirm("Supprimer cette séance ?"))return;
    updateProgramme({sessions:programme.sessions.filter(s=>s.id!==chosenSession.id)});
    setSessionId(null);setRightMode("programme");
  };
  const removeProgramme=()=>{
    if(!programme||!window.confirm("Supprimer le programme « "+programme.title+" » et ses séances ?"))return;
    setStore(old=>({...old,programmes:old.programmes.filter(p=>p.id!==programme.id)}));
    setSelectedId(store.programmes.find(p=>p.id!==programme.id)?.id??null);
    setSessionId(null);
  };
  const importJSON=async(e:ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0];e.target.value="";if(!file)return;
    if(file.size>3_000_000){setMessage("Fichier trop volumineux.");return;}
    try {
      const parsed=safeProgrammeStore(JSON.parse(await file.text()));
      if(!parsed)throw Error("Fichier de programmes invalide.");
      if(!window.confirm("Remplacer les programmes présents par ceux du fichier ?"))return;
      setStore(parsed);setSelectedId(parsed.programmes[0]?.id??null);setSessionId(null);
      setMessage("Programmes importés.");
    }catch(error){setMessage(error instanceof Error?error.message:"Import impossible.");}
  };
  const downloadSelected=(format:"html"|"csv"|"ics")=>{
    if(!programme)return;
    const safe=programme.title.toLowerCase().replace(/[^a-z0-9]+/g,"-")||"programme";
    if(format==="html")saveStudioFile(safe+".html",programmeToHTML(programme),"text/html;charset=utf-8");
    if(format==="csv")saveStudioFile(safe+".csv",programmesToCSV(programme),"text/csv;charset=utf-8");
    if(format==="ics")saveStudioFile(safe+".ics",programmeToICS(programme),"text/calendar;charset=utf-8");
  };
  const actions=<div className="flex gap-1">
    <button type="button" title="Sauvegarder les programmes JSON" aria-label="Exporter programmes JSON" className={studioButton+" !px-2"}
      onClick={()=>saveStudioFile("pointzero-programmes.json",JSON.stringify(store,null,2))}><Download size={16}/></button>
    <button type="button" title="Importer des programmes JSON" aria-label="Importer programmes JSON" className={studioButton+" !px-2"}
      onClick={()=>filePicker.current?.click()}><Upload size={16}/></button>
  </div>;
  return <StudioFrame title="Programme" subtitle="Cours · séances · formations · ateliers" onBack={onBack} leftLabel="Bibliothèque des programmes" rightLabel="Édition du programme" actions={actions}
    left={<>
      <h2 className="mb-3 text-sm font-semibold">Mes programmes</h2>
      <input aria-label="Rechercher un programme" className={studioInput+" mb-3"} placeholder="Rechercher…" value={filter} onChange={e=>setFilter(e.target.value)}/>
      <div className="space-y-2">
        {store.programmes.filter(p=>p.title.toLowerCase().includes(filter.toLowerCase())).map(p=>
          <button key={p.id} type="button" onClick={()=>{setSelectedId(p.id);setSessionId(null);setRightMode("programme");}}
            aria-pressed={selectedId===p.id}
            className={"block w-full rounded-[6px] border p-3 text-left "+(selectedId===p.id?"border-white/50 bg-white/15":"border-white/15 bg-white/[.05] hover:bg-white/10")}>
            <span className="block truncate text-xs font-semibold">{p.title}</span>
            <span className="mt-1 block text-[11px] text-white/60">{p.kind} · {p.sessions.length} séance(s)</span>
          </button>)}
      </div>
      <div className="mt-5 border-t border-white/10 pt-4">
        <h3 className="text-xs font-semibold">Nouveau programme</h3>
        <input className={studioInput+" mt-3"} aria-label="Nom du nouveau programme" value={addTitle} onChange={e=>setAddTitle(e.target.value)} placeholder="Nom du programme"/>
        <label className="mt-3 block text-xs text-white/75">Type
          <select className={studioInput+" mt-1"} value={addKind} onChange={e=>setAddKind(e.target.value as ProgrammeKind)}>
            <option value="formation">Formation</option><option value="cours">Cours</option><option value="atelier">Atelier</option><option value="seance">Séance</option>
          </select>
        </label>
        <label className="mt-3 block text-xs text-white/75">Démarrage
          <select aria-label="Modèle de programme" className={studioInput+" mt-1"} value={template} onChange={e=>setTemplate(e.target.value)}>
            <option value="vide">Vide</option>
            {TEMPLATES.map(t=><option key={t.name} value={t.name}>{t.name} ({t.topics.length} étapes)</option>)}
          </select>
        </label>
        <button type="button" onClick={createProgramme} className={studioButton+" mt-3 w-full"}><Plus size={15}/> Créer</button>
      </div>
      <p className="mt-5 text-[11px] leading-relaxed text-white/55">Projets conservés sur cet appareil. Exports JSON, calendrier ICS et programme HTML imprimable.</p>
    </>}
    right={<>
      {!programme?<p className="text-xs text-white/65">Créez ou choisissez un programme à gauche.</p>:<>
        <div className="mb-3 grid grid-cols-2 gap-1">
          <button onClick={()=>setRightMode("programme")} className={(rightMode==="programme"?"bg-white text-black":"bg-white/10 text-white/80")+" min-h-9 rounded-[5px] text-xs font-semibold"}>Programme</button>
          <button disabled={!chosenSession} onClick={()=>setRightMode("seance")} className={(rightMode==="seance"?"bg-white text-black":"bg-white/10 text-white/80")+" min-h-9 rounded-[5px] text-xs font-semibold disabled:opacity-40"}>Séance</button>
        </div>
        {rightMode==="programme"||!chosenSession?<div className="space-y-3">
          <label className="block text-xs text-white/70">Titre
            <input aria-label="Titre du programme" className={studioInput+" mt-1"} value={programme.title} maxLength={180} onChange={e=>updateProgramme({title:e.target.value})}/>
          </label>
          <label className="block text-xs text-white/70">Public
            <input aria-label="Public du programme" className={studioInput+" mt-1"} value={programme.audience} maxLength={300} onChange={e=>updateProgramme({audience:e.target.value})}/>
          </label>
          <label className="block text-xs text-white/70">Objectifs pédagogiques
            <textarea aria-label="Objectifs pédagogiques" className={studioInput+" mt-1"} rows={4} value={programme.objective} maxLength={2000} onChange={e=>updateProgramme({objective:e.target.value})}/>
          </label>
          <label className="block text-xs text-white/70">Projet associé
            <select aria-label="Projet associé au programme" className={studioInput+" mt-1"} value={programme.projectId} onChange={e=>updateProgramme({projectId:e.target.value})}>
              <option value="">Sans projet</option>{availableProjects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="block text-xs text-white/70">Notes internes
            <textarea className={studioInput+" mt-1"} rows={3} value={programme.notes} maxLength={5000} onChange={e=>updateProgramme({notes:e.target.value})}/>
          </label>
          <button className={studioButton+" mt-3 w-full"} onClick={removeProgramme}><Trash2 size={14}/> Supprimer le programme</button>
        </div>:<div className="space-y-3">
          <label className="block text-xs text-white/70">Titre de séance
            <input aria-label="Titre de séance" className={studioInput+" mt-1"} value={chosenSession.title} maxLength={180} onChange={e=>updateSession(chosenSession.id,{title:e.target.value})}/>
          </label>
          <label className="block text-xs text-white/70">Date
            <input aria-label="Date de séance" type="date" className={studioInput+" mt-1"} value={chosenSession.date} onChange={e=>updateSession(chosenSession.id,{date:e.target.value})}/>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs text-white/70">Début
              <input aria-label="Heure de séance" type="time" className={studioInput+" mt-1"} value={chosenSession.start} onChange={e=>updateSession(chosenSession.id,{start:e.target.value})}/>
            </label>
            <label className="block text-xs text-white/70">Minutes
              <input aria-label="Durée de séance" type="number" min={10} max={1440} className={studioInput+" mt-1"} value={chosenSession.minutes} onChange={e=>updateSession(chosenSession.id,{minutes:Math.min(1440,Math.max(10,Number(e.target.value)||10))})}/>
            </label>
          </div>
          <label className="block text-xs text-white/70">Lieu ou lien de séance
            <input className={studioInput+" mt-1"} value={chosenSession.location} maxLength={300} onChange={e=>updateSession(chosenSession.id,{location:e.target.value})}/>
          </label>
          <label className="block text-xs text-white/70">Objectif
            <textarea className={studioInput+" mt-1"} rows={2} value={chosenSession.objective} maxLength={2000} onChange={e=>updateSession(chosenSession.id,{objective:e.target.value})}/>
          </label>
          <label className="block text-xs text-white/70">Déroulé de séance
            <textarea aria-label="Déroulé de séance" className={studioInput+" mt-1"} rows={4} value={chosenSession.description} maxLength={5000} onChange={e=>updateSession(chosenSession.id,{description:e.target.value})}/>
          </label>
          <label className="block text-xs text-white/70">Matériel
            <textarea className={studioInput+" mt-1"} rows={2} value={chosenSession.materials} maxLength={2000} onChange={e=>updateSession(chosenSession.id,{materials:e.target.value})}/>
          </label>
          <label className="block text-xs text-white/70">État
            <select aria-label="État de la séance" className={studioInput+" mt-1"} value={chosenSession.status} onChange={e=>updateSession(chosenSession.id,{status:e.target.value as SessionState})}>
              <option value="prévue">Prévue</option><option value="réalisée">Réalisée</option><option value="annulée">Annulée</option>
            </select>
          </label>
          <button onClick={cloneNext} className={studioButton+" w-full"}><Copy size={14}/> Dupliquer semaine suivante</button>
          <button onClick={removeSession} className={studioButton+" w-full"}><Trash2 size={14}/> Supprimer cette séance</button>
        </div>}
      </>}
    </>}
  >
    <div className="mx-auto max-w-[980px]">
      {!programme?<div className="mx-auto mt-[10vh] max-w-md rounded-[7px] border border-white/15 bg-[#09090b] p-6 text-center">
        <CalendarDays size={34} className="mx-auto mb-4 text-white/80"/><h2 className="text-xl font-semibold">Créer un programme</h2>
        <p className="mt-2 text-sm text-white/65">À gauche : choisissez un modèle de cours, de séance ou de formation, puis organisez les séances ici.</p>
        <button className={studioButton+" mt-4"} onClick={createProgramme}><Plus size={15}/> Commencer</button>
      </div>:<>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div><p className="text-[11px] font-semibold uppercase tracking-[.1em] text-white/65">Planning pédagogique</p>
            <h2 className="mt-1 text-2xl font-semibold">{programme.title||"Sans titre"}</h2></div>
          <button className={studioButton} onClick={addSession}><Plus size={15}/> Ajouter une séance</button>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <SummaryTile name="Séances" value={String(programme.sessions.length)}/>
          <SummaryTile name="Durée prévue" value={hoursFor(programme).toLocaleString("fr-FR")+" h"}/>
        </div>
        <article aria-label="Programme imprimable" className="rounded-[8px] border border-black/10 bg-white px-5 py-7 text-[#18181b] shadow-xl sm:px-8">
          <header className="mb-6 border-b border-black/15 pb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-black/45">POINTZERO · {programme.kind}</p>
            <h3 className="mt-2 text-2xl font-bold">{programme.title||"Programme sans titre"}</h3>
            {programme.audience&&<p className="mt-2 text-sm text-black/65">{programme.audience}</p>}
            {programme.objective&&<p className="mt-3 whitespace-pre-wrap text-sm text-black/75">{programme.objective}</p>}
          </header>
          <div className="space-y-2">
            {sortedSessions(programme).map((s,i)=><button key={s.id} type="button" onClick={e=>{e.stopPropagation();setSessionId(s.id);setRightMode("seance");}}
              aria-pressed={sessionId===s.id}
              className={"w-full rounded-[6px] border p-4 text-left "+(sessionId===s.id?"border-black/70 bg-[#f5f5f5]":"border-black/10 hover:bg-[#fafafa]")}>
              <div className="flex flex-wrap justify-between gap-2 text-[11px] font-medium text-black/55"><span>{s.date} · {s.start} · {s.minutes} min</span><span>{s.status}</span></div>
              <h4 className="mt-2 text-sm font-semibold">{i+1}. {s.title||"Séance sans titre"}</h4>
              {s.objective&&<p className="mt-1 text-xs text-black/75">{s.objective}</p>}
              {s.description&&<p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs text-black/65">{s.description}</p>}
              {s.location&&<p className="mt-2 text-[11px] text-black/50">{s.location}</p>}
            </button>)}
            {!programme.sessions.length&&<p className="py-10 text-center text-sm text-black/45">Aucune séance. Ajoutez-en une pour construire le programme.</p>}
          </div>
        </article>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className={studioButton} onClick={()=>downloadSelected("html")}><FileText size={15}/> Document imprimable</button>
          <button className={studioButton} onClick={()=>downloadSelected("ics")}><CalendarDays size={15}/> Calendrier .ics</button>
          <button className={studioButton} onClick={()=>downloadSelected("csv")}><Download size={15}/> Export CSV</button>
        </div>
        <p className="mt-3 text-[11px] text-white/60">Le document HTML peut être ouvert dans un navigateur puis imprimé en PDF. Les séances restent enregistrées localement.</p>
      </>}
      {message&&<p role="status" className="mt-4 rounded-[5px] bg-[#09090b] p-3 text-sm text-white">{message}</p>}
    </div>
    <input ref={filePicker} type="file" accept="application/json,.json" className="sr-only" aria-label="Choisir un programme JSON" onChange={e=>void importJSON(e)}/>
  </StudioFrame>;
}
