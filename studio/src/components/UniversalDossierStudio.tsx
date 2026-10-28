import AimeSymbol from "./AimeSymbol";
import DossierProjectionPanel from "./DossierProjectionPanel";
import type {MiniSite} from "../lib/miniSiteCore";
import {useEffect,useRef,useState,type ChangeEvent} from "react";
import {ArrowLeft,ArrowRight,BookOpen,Check,ChevronDown,Download,FileText,GraduationCap,History,Layers3,Plus,Save,Upload} from "lucide-react";
import {readWorld} from "../lib/oneSpaceCore";
import {AIME_WORLD_CHANGED,createWeddingDemo,academyReferenceHealth,addUniversalMoment,adoptLegacySpace,createUniversalDossier,exportUniversalJSON,importUniversalJSON,projectFormation,readDossier,understandIntent,updateUniversalField} from "../lib/universalDossier";
import type{EditKey,Inference} from "../lib/universalDossier";
import "./UniversalDossierStudio.css";
import DossierCapabilityPanel from "./DossierCapabilityPanel";
type Props={onBack:()=>void;onOpenAcademy:(id:string)=>void;onOpenMiniSite?:(site:MiniSite)=>void};
function download(text:string,name:string){const blob=new Blob([text],{type:"application/json;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);}
const readable=(s:string)=>{try{const v=JSON.parse(s);return Array.isArray(v)?v.join(", "):String(v??"");}catch{return s}};
export default function UniversalDossierStudio({onBack,onOpenAcademy,onOpenMiniSite}:Props){
 const [world,setWorld]=useState(readWorld),[activeId,setActiveId]=useState(()=>new URLSearchParams(window.location.search).get("id")||readWorld().selectedSpaceId);
 const [intent,setIntent]=useState(()=>{
   const temporary=(window.history.state as {aimeIntention?:unknown}|null)?.aimeIntention;
   return typeof temporary==="string"?temporary.slice(0,800):new URLSearchParams(window.location.search).get("intention")?.slice(0,800)??"";
  }),[preview,setPreview]=useState<Inference|null>(null);
 const [notice,setNotice]=useState(""),[editing,setEditing]=useState<EditKey|null>(null),[draft,setDraft]=useState("");
 const [historyOpen,setHistoryOpen]=useState(false),[showTraining,setShowTraining]=useState(true);
 const [momentTitle,setMomentTitle]=useState(""),[momentTime,setMomentTime]=useState("");
 const upload=useRef<HTMLInputElement>(null);
 useEffect(()=>{const update=()=>setWorld(readWorld());window.addEventListener(AIME_WORLD_CHANGED,update);window.addEventListener("storage",update);return()=>{window.removeEventListener(AIME_WORLD_CHANGED,update);window.removeEventListener("storage",update)}},[]);
 const current=world.spaces.find(s=>s.id===activeId)??null;
 const view=current?projectFormation(current):null;
 const saveEdit=(field:EditKey,v:string)=>{
  if(!current)return;
  try{updateUniversalField(current.id,field,v);setEditing(null);setNotice("Modification enregistrée dans la mémoire locale du dossier.");}
  catch(e){setNotice(e instanceof Error?e.message:"Échec de l'enregistrement.")}
 };
 const edit=(field:EditKey,value:string)=>{setEditing(field);setDraft(value);};
 const prepare=()=>{try{setPreview(understandIntent(intent));setNotice("");}catch(e){setNotice(String(e));}};
 const create=()=>{
  try{const saved=createUniversalDossier(intent);setActiveId(saved.id);setPreview(null);setIntent("");setNotice("Dossier créé localement. Champs proposés à relire avant utilisation.")}
  catch(e){setNotice(e instanceof Error?e.message:"Impossible de créer ce dossier.")}
 };
 const importFile=async(e:ChangeEvent<HTMLInputElement>)=>{
  const file=e.target.files?.[0];e.target.value="";if(!file)return;
  if(file.size>2_000_000){setNotice("Fichier trop volumineux (2 Mo max).");return}
  try{const parsed=JSON.parse(await file.text());
   const existing=parsed?.space?.id&&readDossier(parsed.space.id);
   const replace=existing?window.confirm("Cet identifiant existe déjà. Remplacer explicitement le dossier existant ? Les autres espaces restent inchangés."):false;
   if(existing&&!replace){setNotice("Import annulé : le dossier existant est conservé.");return}
   const saved=importUniversalJSON(parsed,replace);setActiveId(saved.id);setNotice("Dossier importé après validation stricte.");
  }catch(err){setNotice(err instanceof Error?err.message:"Import non valide.")}
 };
 const choose=(id:string)=>{
  try{const current=readDossier(id);if(current&&!current.dossier){if(!window.confirm("Ajouter les métadonnées du Dossier Universel à cet espace existant, sans effacer ses données ?"))return;adoptLegacySpace(id);}
  setActiveId(id);setEditing(null);setNotice("");
  }catch(err){setNotice(err instanceof Error?err.message:"Impossible d'ouvrir cet espace.")}
 };
 const field=(key:EditKey,label:string,value:string,placeholder="")=><div className="ud-field" key={key}>
  <div className="ud-field-label"><span>{label}</span><button type="button" onClick={()=>editing===key?setEditing(null):edit(key,value)}>{editing===key?"Annuler":"Modifier"}</button></div>
  {editing===key?<div className="ud-edit">{key==="dossier.training.context"?<select aria-label={label} value={draft} onChange={e=>setDraft(e.target.value)}>
   <option value="loisirs">Atelier de loisirs</option><option value="association">Transmission associative</option><option value="professionnelle">Formation professionnelle</option>
  </select>:key==="dossier.objectives"||key==="dossier.training.outline"||key==="dossier.intent"?<textarea aria-label={label} value={draft} onChange={e=>setDraft(e.target.value)} rows={4} />:<input aria-label={label} value={draft} onChange={e=>setDraft(e.target.value)}/>}
   <button className="ud-save" type="button" onClick={()=>saveEdit(key,draft)}><Save size={14}/> Enregistrer</button></div>
   :<p className="ud-field-value">{value||placeholder||"À renseigner"}</p>}
 </div>;
 return <div className="ud-shell" aria-label="Dossier Universel AIME">
  <header className="ud-top"><button onClick={onBack} aria-label="Retour à AIME" className="ud-back"><ArrowLeft size={17}/> AIME</button><span className="ud-logo"><AimeSymbol name="intention"/> <strong>Dossier Universel</strong></span>
   <div className="ud-header-actions"><button type="button" onClick={()=>upload.current?.click()}><Upload size={15}/> Importer</button>
    {current&&<button type="button" onClick={()=>{try{download(exportUniversalJSON(current),"aime-dossier-"+current.id.slice(0,8)+".json")}catch(e){setNotice(String(e))}}}><Download size={15}/> Exporter</button>}</div>
  </header>
  <main className="ud-main"><div className="ud-wrap">
   <div className="ud-intro"><p className="ud-kicker">INTENTION → COMPRÉHENSION → DOSSIER → STUDIO → ACTION → MÉMOIRE</p>
    <h1>Un même projet.<br/><em>Plusieurs usages.</em></h1>
    <p>Commencez par votre intention. Les données restent sur cet appareil ; aucune action réglementaire ou notification n'est envoyée.</p>
   </div>
   <button type="button" className="ud-primary" onClick={()=>{try{const s=createWeddingDemo();setActiveId(s.id);setNotice("Exemple fictif créé sur cet appareil. Aucun envoi ni partage.")}catch(e){setNotice(String(e))}}}>Essayer le mariage fictif — créer un dossier local</button>
   <label className="ud-intent-label" htmlFor="ud-intent">Votre intention</label>
   <div className="ud-compose"><textarea id="ud-intent" rows={3} value={intent} onChange={e=>{setIntent(e.target.value);setPreview(null)}} placeholder="Je suis saxophoniste et je souhaite transmettre l’improvisation à dix débutants."/>
    <div className="ud-compose-bottom"><span>Interprétation locale guidée, sans appel à une IA.</span><button type="button" disabled={intent.trim().length<8} onClick={prepare}>Comprendre mon projet <ArrowRight size={16}/></button></div>
   </div>
   {preview&&<section className="ud-inference" aria-label="Compréhension proposée">
    <span className="ud-kicker">PROPOSITION · À CONFIRMER</span><h2>{preview.title}</h2><p>Univers proposé : {preview.universe}. Les informations suivantes sont inférées et ne constituent pas des faits vérifiés.</p>
    {preview.training&&<p>{preview.training.participants??"Nombre inconnu"} participants proposés · Contexte « loisirs » par défaut, à confirmer.</p>}
    <div className="ud-inference-questions">{preview.questions.map(q=><span key={q}>? {q}</span>)}</div>
    <button type="button" onClick={create} className="ud-primary"><Plus size={16}/> Créer le dossier local</button>
   </section>}
   <div className="ud-selectrow"><label>Mes dossiers / espaces existants <select value={current?.id??""} onChange={e=>choose(e.target.value)} aria-label="Choisir un dossier existant">
    <option value="">Choisir un espace</option>{world.spaces.map(s=><option key={s.id} value={s.id}>{s.title||"Sans titre"}{s.dossier?"":" · ancien espace"}</option>)}</select></label>
    <span>{world.spaces.length} espace(s) · stockage navigateur</span>
   </div>
   {current&&<div className="ud-live" key={current.id}>
    <div className="ud-section-head"><div><span className="ud-kicker">DOSSIER CANONIQUE · {current.id.slice(0,8)}</span><h2>{current.title}</h2></div><span className="ud-local-tag"><Check size={13}/> Local · version 1</span></div>
    {current.dossier&&current.moments.length>0&&<DossierProjectionPanel space={current} onOpenMiniSite={onOpenMiniSite}/>}
    <div className="ud-grid">
     <section className="ud-sheet" aria-label="Dossier vivant"><div className="ud-pane-title"><FileText size={18}/><h3>Le dossier vivant</h3></div>
      {field("title","Titre canonique",current.title)}
      {field("dossier.intent","Intention initiale",current.dossier?.intent??current.description)}
      {field("description","Description",current.description)}
      {field("dossier.objectives","Objectifs",(current.dossier?.objectives??[]).join("\n"),"À relire et préciser")}
      <div className="ud-field"><div className="ud-field-label"><span>Univers</span></div><p className="ud-field-value">{current.dossier?.primaryUniverse||"À qualifier"}</p></div>
      {view&&<><div className="ud-pane-title ud-sub-title"><GraduationCap size={18}/><h3>Projection Formation</h3><button type="button" onClick={()=>setShowTraining(v=>!v)} aria-expanded={showTraining}><ChevronDown size={15}/></button></div>
       {showTraining&&<div className="ud-training">
        {field("dossier.training.context","Nature de l'atelier",view.kind)}
        {field("dossier.training.audience","Public",view.audience)}
        {field("dossier.training.participants","Participants",view.participants?.toString()??"")}
        {field("dossier.training.durationHours","Durée en heures",view.durationHours?.toString()??"")}
        {field("dossier.training.prerequisites","Prérequis",view.prerequisites)}
        {field("dossier.training.outline","Programme",(view.outline??[]).join("\n"))}
        {field("dossier.training.evaluation","Évaluation",view.evaluation)}
        <div className="ud-field"><div className="ud-field-label"><span>Créneaux du dossier</span></div>
         {view.moments.length?view.moments.map(m=><p className="ud-field-value" key={m.id}>{m.title} · {m.time||"Heure à définir"}</p>):<p className="ud-field-value">Aucun créneau défini.</p>}
         <div className="ud-edit"><input aria-label="Intitulé du créneau" placeholder="Séance découverte" maxLength={180} value={momentTitle} onChange={e=>setMomentTitle(e.target.value)}/>
          <input aria-label="Horaire du créneau" type="time" value={momentTime} onChange={e=>setMomentTime(e.target.value)}/>
          <button className="ud-save" type="button" onClick={()=>{try{addUniversalMoment(current.id,momentTitle,momentTime);setMomentTitle("");setMomentTime("");setNotice("Créneau ajouté à la chronologie canonique.");}catch(e){setNotice(e instanceof Error?e.message:"Horaire invalide.")}}}><Plus size={14}/> Ajouter un moment</button></div>
        </div>
        <p className="ud-warning">{view.disclaimer}</p>
        {view.missing.length>0&&<div className="ud-missing"><strong>À préciser</strong>{view.missing.map(v=><span key={v}>{v}</span>)}</div>}
       </div>}
      </>}
      <div className="ud-metadata">Personnes : {current.people.length} · Moments : {current.moments.length} · Sources liées : {current.dossier?.references.length??0}</div>
     </section>
     <aside className="ud-actions" aria-label="Prochaines actions"><div className="ud-pane-title"><Layers3 size={18}/><h3>Prochaines actions</h3></div>
      <p>Chaque Studio utilise l'identifiant du même dossier. Les données spécifiques restent sous sa propre responsabilité.</p>
      <button type="button" onClick={()=>onOpenAcademy(current.id)} className="ud-action-button"><BookOpen size={18}/><span><strong>{current.dossier?.references.some(r=>r.studio==="academy")?"Retrouver le support Academy":"Créer un support pédagogique"}</strong><small>Ouvrir l'éditeur existant sans ressaisir le titre</small></span><ArrowRight size={16}/></button>
      <button type="button" onClick={()=>{try{download(exportUniversalJSON(current),"aime-dossier-"+current.id.slice(0,8)+".json")}catch(e){setNotice(String(e))}}} className="ud-action-button"><Download size={18}/><span><strong>Exporter le dossier</strong><small>JSON complet, avec identifiant et mémoire</small></span><ArrowRight size={16}/></button>
      <DossierCapabilityPanel key={current.id} dossierId={current.id}/>
      <div className="ud-resources"><strong>Ressources reliées</strong>{current.dossier?.references.length?current.dossier.references.map(r=><p key={r.id}>{r.title} · {r.targetId.slice(0,8)} · {r.status}{r.studio==="academy"&&r.type==="studio"?" · "+({available:"support présent",missing:"support introuvable sur cet appareil",invalid:"référence ou fichier Academy invalide",none:"aucune référence"}[academyReferenceHealth(current)]):""}</p>):<p>Aucune ressource rattachée pour le moment.</p>}</div>
      <button className="ud-history-toggle" type="button" aria-expanded={historyOpen} onClick={()=>setHistoryOpen(v=>!v)}><History size={17}/> Mémoire des changements <ChevronDown size={15}/></button>
      {historyOpen&&<div className="ud-history">{current.dossier?.history.length?current.dossier.history.slice().reverse().map(h=><article key={h.id}><time dateTime={h.at}>{new Date(h.at).toLocaleString("fr-FR")}</time><strong>{h.field}</strong><p>{readable(h.before)||"—"} → {readable(h.after)||"—"}</p><small>{h.origin} · {h.validation}</small></article>):<p>Aucune modification confirmée.</p>}</div>}
     </aside>
    </div>
   </div>}
   {notice&&<p role="status" className="ud-notice">{notice}</p>}
   <input ref={upload} className="sr-only" type="file" accept=".json,application/json" aria-label="Importer Dossier Universel JSON" onChange={importFile}/>
  </div></main>
 </div>;
}
