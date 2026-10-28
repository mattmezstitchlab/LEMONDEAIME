import {writeStoredJSON} from "../lib/storageSafety";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { ArrowDownLeft, ArrowUpRight, Download, FolderOpen, Plus, Trash2, Upload } from "lucide-react";
import { StudioFrame, studioInput, studioButton, SummaryTile, saveStudioFile } from "./StudioFrame";
import { BUDGET_STORAGE, budgetReport, euro, eurosToCents, loadProjectOptions, makeBudget, monthKey, newId, safeBudget, transactionsToCSV, type BudgetCategory, type BudgetEntry, type BudgetKind, type BudgetScope, type BudgetState } from "../lib/budgetCore";

const today=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
function load():BudgetState{
  try{return safeBudget(JSON.parse(localStorage.getItem(BUDGET_STORAGE)??"null"))??makeBudget();}
  catch{return makeBudget();}
}
const starter=(id:string):BudgetCategory[]=>[
  {id:newId(),name:"Production",scope:"project",projectId:id,kind:"expense",limitCents:0,color:"#94a3b8"},
  {id:newId(),name:"Fournitures",scope:"project",projectId:id,kind:"expense",limitCents:0,color:"#83b3a4"},
  {id:newId(),name:"Communication",scope:"project",projectId:id,kind:"expense",limitCents:0,color:"#bb9ea5"},
  {id:newId(),name:"Ventes / Prestations",scope:"project",projectId:id,kind:"income",limitCents:0,color:"#8abdaa"},
];
interface Props {onBack:()=>void;linkedProject?:{id:string;name:string}|null}
export default function BudgetStudio({onBack,linkedProject}:Props){
  const [data,setData]=useState<BudgetState>(load);
  const [scope,setScope]=useState<BudgetScope>(linkedProject?"project":"personal");
  const [projectId,setProjectId]=useState(linkedProject?.id??"");
  const [month,setMonth]=useState(today().slice(0,7));
  const [kind,setKind]=useState<BudgetKind>("expense");
  const [categoryId,setCategoryId]=useState("");
  const [amount,setAmount]=useState("");
  const [label,setLabel]=useState("");
  const [date,setDate]=useState(today);
  const [note,setNote]=useState("");
  const [categoryName,setCategoryName]=useState("");
  const [newLimit,setNewLimit]=useState("");
  const [showAddCategory,setShowAddCategory]=useState(false);
  const [notice,setNotice]=useState("");
  const filePicker=useRef<HTMLInputElement>(null);
  const projects=useMemo(()=>{
    const drafts=loadProjectOptions();
    if(linkedProject&&!drafts.some(d=>d.id===linkedProject.id))drafts.unshift(linkedProject);
    return drafts;
  },[linkedProject]);
  useEffect(()=>{if(scope!=="project"||!projectId)return;
    setData(current=>current.categories.some(c=>c.scope==="project"&&c.projectId===projectId)
      ?current:{...current,categories:[...current.categories,...starter(projectId)]});
  },[projectId,scope]);
  useEffect(()=>{try{writeStoredJSON(BUDGET_STORAGE,JSON.stringify(data),safeBudget);}
    catch{setNotice("Stockage local saturé : exportez le budget en JSON.");}},[data]);
  const relevant=data.categories.filter(c=>c.scope===scope&&(scope==="personal"||c.projectId===projectId));
  const available=relevant.filter(c=>c.kind===kind);
  const selectedCat=available.find(c=>c.id===categoryId)??available[0];
  const report=budgetReport(data,month,scope,projectId);
  const todayEntries=[...report.entries].sort((a,b)=>b.date.localeCompare(a.date));
  const addTransaction=()=>{
    const cents=eurosToCents(amount);
    if(!cents||!selectedCat||!label.trim()||!monthKey(date)){setNotice("Renseignez une catégorie, une date, un libellé et un montant positif.");return;}
    const entry:BudgetEntry={id:newId(),label:label.trim().slice(0,180),date,cents,kind,categoryId:selectedCat.id,scope,projectId:scope==="project"?projectId:"",note:note.slice(0,1500)};
    setData(previous=>({...previous,entries:[...previous.entries,entry]}));
    setAmount("");setLabel("");setNote("");setNotice("Opération ajoutée.");
  };
  const addCategory=()=>{
    if(!categoryName.trim()){setNotice("Nom de catégorie requis.");return;}
    const cents=eurosToCents(newLimit);
    if(cents===null){setNotice("Plafond invalide.");return;}
    const next:BudgetCategory={id:newId(),name:categoryName.trim().slice(0,120),kind,limitCents:cents,scope,projectId:scope==="project"?projectId:"",color:"#a1a1aa"};
    setData(prev=>({...prev,categories:[...prev.categories,next]}));
    setCategoryId(next.id);setCategoryName("");setNewLimit("");setShowAddCategory(false);
  };
  const updateLimit=(cat:BudgetCategory,value:string)=>{
    const cents=eurosToCents(value);
    if(cents===null){setNotice("Plafond invalide.");return;}
    setData(prev=>({...prev,categories:prev.categories.map(c=>c.id===cat.id?{...c,limitCents:cents}:c)}));
  };
  const deleteCategory=(cat:BudgetCategory)=>{
    if(data.entries.some(e=>e.categoryId===cat.id)){setNotice("Cette catégorie contient des opérations : supprimez-les d'abord.");return;}
    if(!window.confirm("Supprimer la catégorie « "+cat.name+" » ?"))return;
    setData(prev=>({...prev,categories:prev.categories.filter(c=>c.id!==cat.id)}));
  };
  const deleteEntry=(entry:BudgetEntry)=>{
    if(!window.confirm("Supprimer cette opération ?"))return;
    setData(prev=>({...prev,entries:prev.entries.filter(e=>e.id!==entry.id)}));
  };
  const importJson=async(e:ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0];e.target.value="";if(!file)return;
    if(file.size>3_000_000){setNotice("Fichier trop volumineux.");return;}
    try{
      const parsed=safeBudget(JSON.parse(await file.text()));
      if(!parsed)throw Error("Fichier Budget POINTZERO incompatible.");
      if(!window.confirm("Remplacer le budget local par celui du fichier importé ?"))return;
      setData(parsed);setNotice("Budget restauré.");
    }catch(error){setNotice(error instanceof Error?error.message:"Import impossible.");}
  };
  const actions=<div className="flex gap-1">
    <button className={studioButton+" !px-2"} title="Exporter CSV" aria-label="Exporter le budget CSV" onClick={()=>saveStudioFile("budget-"+month+".csv",transactionsToCSV(report.entries,data.categories),"text/csv;charset=utf-8")}><Download size={15}/></button>
    <button className={studioButton+" !px-2"} title="Exporter JSON" aria-label="Sauvegarder le budget JSON" onClick={()=>saveStudioFile("pointzero-budget.json",JSON.stringify(data,null,2))}><FolderOpen size={15}/></button>
    <button className={studioButton+" !px-2"} title="Importer JSON" aria-label="Importer un budget JSON" onClick={()=>filePicker.current?.click()}><Upload size={15}/></button>
  </div>;
  return <StudioFrame title="Budget" subtitle="Personnel et projets · stockage local · EUR" onBack={onBack}
    leftLabel="Espaces du budget" rightLabel="Ajouter une opération" actions={actions}
    left={<>
      <h2 className="mb-3 text-xs font-semibold">Espaces</h2>
      <div className="grid grid-cols-2 gap-1">
        {([["personal","Personnel"],["project","Projet"]] as const).map(([id,txt])=><button key={id} onClick={()=>{setScope(id);setCategoryId("");}} aria-pressed={scope===id}
          className={"min-h-10 rounded-[5px] text-xs "+(scope===id?"bg-white text-black":"bg-white/10 text-white/80")}>{txt}</button>)}
      </div>
      {scope==="project"&&<div className="mt-4">
        <label className="block text-xs text-white/75">Projet concerné
          <select className={studioInput+" mt-1"} value={projectId} onChange={e=>{setProjectId(e.target.value);setCategoryId("");}}>
            <option value="">Sans projet particulier</option>
            {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <p className="mt-2 text-[11px] text-white/60">Les créations POINTZERO sont proposées comme projets. Les coûts restent saisis manuellement.</p>
      </div>}
      <div className="mt-5 border-t border-white/10 pt-4">
        <h3 className="mb-3 text-xs font-semibold">Catégories</h3>
        {relevant.map(cat=><div key={cat.id} className="group mb-2 rounded-[5px] border border-white/10 p-2">
          <div className="flex items-center gap-2">
            <span className="size-2 shrink-0 rounded-full" style={{background:cat.color}}/>
            <span className="min-w-0 flex-1 truncate text-xs">{cat.name}</span>
            <span className="text-[10px] text-white/55">{cat.kind==="income"?"Recette":"Dépense"}</span>
            <button type="button" title="Supprimer la catégorie" aria-label={"Supprimer catégorie "+cat.name} onClick={()=>deleteCategory(cat)} className="text-white/55 hover:text-white"><Trash2 size={13}/></button>
          </div>
          {cat.kind==="expense"&&<label className="mt-2 block text-[10px] text-white/70">Plafond mensuel (€)
            <input type="number" min="0" step=".01" defaultValue={(cat.limitCents/100).toFixed(2)} key={cat.limitCents} onBlur={e=>{const entered=eurosToCents(e.target.value);if(entered!==null&&entered!==cat.limitCents)updateLimit(cat,e.target.value);}}
              className={studioInput+" mt-1 w-full !py-1.5"} aria-label={"Plafond "+cat.name}/>
          </label>}
        </div>)}
        <button type="button" className={studioButton+" mt-2 w-full"} onClick={()=>setShowAddCategory(o=>!o)}><Plus size={15}/> Catégorie</button>
        {showAddCategory&&<div className="mt-3 space-y-2 rounded-[5px] border border-white/15 p-3">
          <input aria-label="Nom de nouvelle catégorie" className={studioInput} value={categoryName} placeholder="Nom" onChange={e=>setCategoryName(e.target.value)}/>
          <input aria-label="Plafond de nouvelle catégorie" type="number" min="0" step=".01" className={studioInput} value={newLimit} placeholder="Plafond € (0 si aucun)" onChange={e=>setNewLimit(e.target.value)}/>
          <button className={studioButton+" w-full"} onClick={addCategory}>Créer la catégorie {kind==="expense"?"dépense":"recette"}</button>
        </div>}
      </div>
    </>}
    right={<>
      <h2 className="mb-4 text-sm font-semibold">Nouvelle opération</h2>
      <div className="mb-3 grid grid-cols-2 gap-1">
        {([["expense","Dépense"],["income","Recette"]] as const).map(([id,txt])=><button key={id} onClick={()=>{setKind(id);setCategoryId("");}} aria-pressed={kind===id} className={(kind===id?"bg-white text-black":"bg-white/10 text-white/75")+" min-h-10 rounded-[5px] text-xs font-semibold"}>{txt}</button>)}
      </div>
      <label className="mb-3 block text-xs text-white/70">Montant (€)
        <input aria-label="Montant de l'opération" type="number" min=".01" step=".01" className={studioInput+" mt-1"} value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0,00"/>
      </label>
      <label className="mb-3 block text-xs text-white/70">Description
        <input aria-label="Description de l'opération" className={studioInput+" mt-1"} value={label} maxLength={180} onChange={e=>setLabel(e.target.value)} placeholder="Ex. achat de tissu"/>
      </label>
      <label className="mb-3 block text-xs text-white/70">Catégorie
        <select aria-label="Catégorie de l'opération" className={studioInput+" mt-1"} value={selectedCat?.id??""} onChange={e=>setCategoryId(e.target.value)}>
          {available.length===0&&<option value="">Créer une catégorie</option>}
          {available.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <label className="mb-3 block text-xs text-white/70">Date
        <input aria-label="Date de l'opération" type="date" className={studioInput+" mt-1"} value={date} onChange={e=>setDate(e.target.value)}/>
      </label>
      <label className="mb-4 block text-xs text-white/70">Note (facultatif)
        <textarea className={studioInput+" mt-1"} rows={2} value={note} onChange={e=>setNote(e.target.value)} maxLength={1500}/>
      </label>
      <button onClick={addTransaction} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[5px] bg-white px-4 text-sm font-semibold text-black"><Plus size={16}/> Ajouter</button>
      <p className="mt-4 text-[11px] leading-relaxed text-white/60">Suivi manuel : aucune connexion bancaire, aucun prélèvement automatique.</p>
    </>}
  >
    <div className="mx-auto max-w-[1050px]">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-[11px] font-semibold uppercase tracking-[.12em] text-white/65">Vue financière</p>
          <h2 className="mt-1 text-2xl font-semibold">{scope==="personal"?"Budget personnel":"Budget projet"}</h2>
          <p className="mt-1 text-xs text-white/65">Dépenses enregistrées et plafonds mensuels, en euros</p></div>
        <label className="text-xs text-white/75">Mois <input type="month" aria-label="Mois du budget" className={studioInput+" ml-2"} value={month} onChange={e=>setMonth(e.target.value)}/></label>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryTile name="Prévu" value={euro(report.planned)}/>
        <SummaryTile name="Dépensé" value={euro(report.spent)}/>
        <SummaryTile name="Disponible" value={euro(report.available)}/>
        <SummaryTile name="Recettes" value={euro(report.income)}/>
      </div>
      <section className="mt-5 rounded-[7px] border border-black/10 bg-[#ffffff] p-4 text-black">
        <h3 className="mb-1 text-base font-semibold">Catégories et plafonds</h3>
        <p className="mb-3 text-xs text-black/55">Les plafonds se répètent chaque mois. Dépenses réelles selon les opérations enregistrées.</p>
        {report.rows.length?report.rows.map(row=><div key={row.id} className="border-b border-black/10 py-3 last:border-b-0">
          <div className="flex items-center justify-between gap-2 text-[13px]"><span className="font-semibold">{row.name}</span><span>{euro(row.actual)} / {row.limitCents?euro(row.limitCents):"Sans plafond"}</span></div>
          {row.limitCents>0&&<div className="mt-2 h-[7px] overflow-hidden rounded-full bg-[#e6e6e8]"><div className="h-full rounded-full" style={{width:Math.min(100,row.rate)+"%",background:row.rate>100?"#bf4755":row.color}}/></div>}
          <p className="mt-1 text-[11px] text-black/60">{row.limitCents>0?(row.remaining>=0?euro(row.remaining)+" restants":euro(-row.remaining)+" de dépassement"):"Renseignez un plafond à gauche."}</p>
        </div>):<p className="py-8 text-center text-sm text-black/50">Aucune catégorie pour cet espace.</p>}
      </section>
      <section className="mt-5 rounded-[7px] border border-black/10 bg-white p-4 text-black">
        <h3 className="mb-3 text-base font-semibold">Opérations · {month}</h3>
        {todayEntries.length?todayEntries.map(e=><div key={e.id} className="flex items-center gap-3 border-b border-black/10 py-3 last:border-b-0">
          <div className={"grid size-9 shrink-0 place-items-center rounded-[5px] "+(e.kind==="income"?"bg-[#e7f4ee] text-[#1e7558]":"bg-[#efeff0] text-[#343438]")}>
            {e.kind==="income"?<ArrowDownLeft size={17}/>:<ArrowUpRight size={17}/>}</div>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{e.label}</p>
            <p className="text-[11px] text-black/55">{data.categories.find(c=>c.id===e.categoryId)?.name} · {e.date}</p></div>
          <span className={"text-sm font-semibold "+(e.kind==="income"?"text-[#197451]":"text-black")}>{e.kind==="income"?"+":"−"}{euro(e.cents)}</span>
          <button aria-label={"Supprimer opération "+e.label} onClick={()=>deleteEntry(e)} className="text-black/40 hover:text-black"><Trash2 size={15}/></button>
        </div>):<p className="py-6 text-center text-sm text-black/50">Aucune opération enregistrée pour ce mois.</p>}
      </section>
      <section className="mt-5 rounded-[7px] border border-black/10 bg-white p-4 text-black">
        <h3 className="mb-2 text-base font-semibold">Observations</h3>
        {report.alerts.length?report.alerts.map((msg,i)=><p key={i} className="mb-2 text-sm text-black/75">{msg}</p>):<p className="text-sm text-black/70">Aucun dépassement identifié dans les catégories avec plafond.</p>}
        <p className="mt-3 text-[11px] text-black/50">Observations calculées à partir des montants saisis, sans IA ni synchronisation bancaire.</p>
      </section>
      {notice&&<p className="mt-3 rounded-[5px] border border-white/20 bg-[#19191c] p-3 text-sm text-white" role="status">{notice}</p>}
    </div>
    <input ref={filePicker} type="file" accept="application/json,.json" aria-label="Choisir un budget JSON" className="sr-only" onChange={e=>void importJson(e)}/>
  </StudioFrame>;
}
