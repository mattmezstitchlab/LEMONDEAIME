import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { ArrowDown, ArrowRight, ArrowUp, BookOpen, Check, CheckCircle2, ChevronRight, CircleHelp, Clock3, Download, GitBranch, GraduationCap, LayoutGrid, Plus, Shield, Upload } from "lucide-react";
import { StudioFrame, studioButton, studioInput, saveStudioFile } from "./StudioFrame";
import ExternalEmbed from "./ExternalEmbed";
import {RIPPLECIRCLE,addExternal,externalById,readExternal,writeExternal} from "../lib/externalProjects";
import {
 KINDS,ROLES,TILES,readWorld,writeWorld,newSpace,newPerson,newMoment,newSignal,selectedWorld,setSpace,
 linkedModuleInfo,sourcesForTile,previewImpact,validateSignal,journeySteps,ids,safeWorld,type WorldSpace,type SpaceKind,type TileKind,type RelationRole,
 type SignalKind
} from "../lib/oneSpaceCore";
type Screen="espace"|"causal"|"formation";
interface Props {initialScreen?:"espace"|"causal";onBack:()=>void;onStudio:(target:string)=>void}
const titles:{kind:SpaceKind;label:string}[]=[
 {kind:"mariage",label:"Mariage / Jour J"},{kind:"famille",label:"Famille"},
 {kind:"association",label:"Association"},{kind:"professionnel",label:"Professionnel"},{kind:"personnel",label:"Personnel"}
];
const truncate=(s:string,n:number)=>s.slice(0,n);
const icons:Record<TileKind,string>={"academy":"🎓","broderie":"🪡","musique":"♫","programme":"◷","mini-site":"◇","documents":"▤","atelier-art":"✳","causal":"↗","photo":"▧","design":"◈","external":"↗"};
const stamp=(iso:string)=>Number.isNaN(Date.parse(iso))?iso:new Date(iso).toLocaleString("fr-FR");
export default function OneSpaceStudio({initialScreen="espace",onBack,onStudio}:Props){
 const [db,setDb]=useState(readWorld);
 const [screen,setScreen]=useState<Screen>(initialScreen);
 const [kind,setKind]=useState<SpaceKind>("mariage"),[title,setTitle]=useState("");
 const [personName,setPersonName]=useState(""),[personRole,setPersonRole]=useState<RelationRole>("participant");
 const [momentName,setMomentName]=useState(""),[momentTime,setMomentTime]=useState("");
 const [momentId,setMomentId]=useState("");
 const [authorId,setAuthorId]=useState("");
 const [signalKind,setSignalKind]=useState<SignalKind>("retard");
 const [delay,setDelay]=useState(20),[message,setMessage]=useState("");
 const [activeSignalId,setActiveSignalId]=useState("");
 const [notice,setNotice]=useState("");
 const [externalRegistry,setExternalRegistry]=useState(readExternal);
 const [externalTitle,setExternalTitle]=useState("");
 const [externalURL,setExternalURL]=useState("");
 const spaceImport=useRef<HTMLInputElement>(null);
 const space=selectedWorld(db);
 const training=journeySteps(space);
 const done=training.filter(s=>s.passed).length;
 const selectedMoment=space?.moments.find(m=>m.id===momentId)??space?.moments[0]??null;
 const activeSignal=space?.signals.find(s=>s.id===activeSignalId)??null;
 const draft=selectedMoment?newSignal(selectedMoment.id,authorId,signalKind,signalKind==="retard"?delay:0,message):null;
 const impact=useMemo(()=>space&&draft?previewImpact(space,draft):null,[space,selectedMoment?.id,authorId,signalKind,delay,message]);
 useEffect(()=>{try{writeWorld(db);}catch{setNotice("Impossible de conserver cet espace. Exportez une copie.");}},[db]);
 const patch=(fn:(s:WorldSpace)=>WorldSpace)=>{
  if(!space)return;
  setDb(db=>setSpace(db,fn(space)));
 };
 const create=()=>{
  if(!title.trim())return setNotice("Donnez un nom à votre espace.");
  if(db.spaces.length>=30)return setNotice("Limite de 30 espaces atteinte.");
  const next=newSpace(kind,truncate(title.trim(),180));
  setDb(s=>({...s,spaces:[...s.spaces,next],selectedSpaceId:next.id}));
  setTitle("");setMomentId("");setAuthorId("");setActiveSignalId("");setNotice("Espace privé créé sur cet appareil.");
 };
 const importSpace=async(e:ChangeEvent<HTMLInputElement>)=>{
  const file=e.target.files?.[0];e.target.value="";
  if(!file)return;
  if(file.size>350_000)return setNotice("Fichier trop volumineux (350 Ko maximum).");
  try{
    const parsed=safeWorld(JSON.parse(await file.text()));
    if(!parsed||parsed.spaces.length!==1)throw Error("Fichier invalide : une seule page est attendue.");
    if(db.spaces.length>=30)throw Error("Limite de 30 espaces atteinte.");
    if(!window.confirm("Importer cette page et ses personnes dans votre navigateur ? Vérifiez que le partage est autorisé."))return;
    const source=parsed.spaces[0];
    const copy={...source,id:ids(),title:truncate(source.title+" (copie)",180)};
    setDb(d=>({...d,spaces:[...d.spaces,copy],selectedSpaceId:copy.id}));
    setMomentId("");setAuthorId("");setActiveSignalId("");
    setNotice("Copie importée localement. Aucune synchronisation avec la page d'origine.");
  }catch(err){setNotice(err instanceof Error?err.message:"Fichier illisible.");}
 };
 const exportSpace=()=>{
  if(!space)return;
  if(space.people.length>0&&!window.confirm("Ce fichier comporte des noms, moments et décisions. Partagez-le seulement avec leur accord. Continuer ?"))return;
  saveStudioFile("pointzero-espace-prive.json",JSON.stringify({version:1,spaces:[space],selectedSpaceId:space.id},null,2));
 };
 const makeExample=()=>{
  if(db.spaces.length>=30)return setNotice("Limite de 30 espaces atteinte.");
  const next=newSpace("mariage","Jour J — exemple de formation");
  const planner=newPerson("Organisateur démo","organisateur");
  const family=newPerson("Famille démo","famille");
  const provider=newPerson("Prestataire démo","prestataire");
  const ceremony=newMoment("Cérémonie","15:00"),cocktail=newMoment("Cocktail","16:00");
  ceremony.personIds=[planner.id,family.id,provider.id];
  cocktail.personIds=[planner.id,family.id,provider.id];cocktail.followsMomentIds=[ceremony.id];
  next.people=[planner,family,provider];next.moments=[ceremony,cocktail];
  next.tiles.push({id:ids(),kind:"external",title:"RIPPLECIRCLE",visible:true,refId:RIPPLECIRCLE.id});
  setDb(s=>({...s,spaces:[...s.spaces,next],selectedSpaceId:next.id}));
  setMomentId(ceremony.id);setAuthorId(planner.id);setScreen("formation");
  setNotice("Exemple fictif prêt : activez d'abord un consentement avant de préparer une onde.");
 };
 const addPerson=()=>{
  if(!space||!personName.trim()||space.people.length>=200)return setNotice("Précisez un nom (200 personnes maximum).");
  const p=newPerson(truncate(personName,100),personRole);patch(s=>({...s,people:[...s.people,p]}));setPersonName("");
 };
 const addMoment=()=>{
  if(!space||!momentName.trim()||space.moments.length>=200)return setNotice("Précisez un moment (200 maximum).");
  const m=newMoment(truncate(momentName,180),momentTime);
  patch(s=>({...s,moments:[...s.moments,m]}));setMomentId(m.id);setMomentName("");
 };
 const addTile=(kind:TileKind)=>{
  if(!space||space.tiles.length>=35)return setNotice("Limite de modules atteinte.");
  const existing=kind==="external"?undefined:space.tiles.find(t=>t.kind===kind);
  if(existing){patch(s=>({...s,tiles:s.tiles.map(t=>t.id===existing.id?{...t,visible:true}:t)}));return;}
  const info=TILES.find(t=>t.id===kind)!;
  patch(s=>({...s,tiles:[...s.tiles,{id:ids(),kind,visible:true,title:info.label,refId:""}]}));
 };
 const saveExternal=()=>{
   if(!space)return setNotice("Créez d'abord un espace.");
   if(space.tiles.length>=35)return setNotice("Cette page a atteint sa limite de modules.");
   try{
     const next=addExternal(externalRegistry,externalTitle,externalURL);
     writeExternal(next);setExternalRegistry(next);
     const added=next.resources[next.resources.length-1];
     patch(s=>({...s,tiles:[...s.tiles,{id:ids(),kind:"external",title:added.title,visible:true,refId:added.id}]}));
     setExternalURL("");setExternalTitle("");
     setNotice("Projet externe référencé. Le contenu ne sera chargé que sur demande.");
   }catch(e){setNotice(e instanceof Error?e.message:"URL invalide.");}
 };
 const moveTile=(id:string,dir:-1|1)=>{
  if(!space)return;const i=space.tiles.findIndex(t=>t.id===id),j=i+dir;
  if(i<0||j<0||j>=space.tiles.length)return;
  patch(s=>{const tiles=[...s.tiles];[tiles[i],tiles[j]]=[tiles[j],tiles[i]];return {...s,tiles};});
 };
 const addSignal=()=>{
  if(!space||!selectedMoment)return setNotice("Choisissez un moment pour préparer votre information.");
  if(space.signals.length>=300)return setNotice("Limite de signaux atteinte.");
  const s=newSignal(selectedMoment.id,authorId,signalKind,signalKind==="retard"?delay:0,truncate(message,500));
  patch(v=>({...v,signals:[s,...v.signals]}));
  setActiveSignalId(s.id);
  setNotice("Brouillon d'onde ajouté. Aucun message n'a été envoyé.");
 };
 const approveSignal=()=>{
  if(!space||!activeSignal)return;
  patch(v=>validateSignal(v,activeSignal.id));
  setNotice("Plan validé et enregistré localement. Aucune notification externe ni modification d'horaires.");
 };
 const selectedRecipients=space&&activeSignal?previewImpact(space,activeSignal):impact;
 const left=<div className="space-y-4 pb-24">
   <h2 className="flex items-center gap-2 text-sm font-semibold"><LayoutGrid size={18}/> Mes espaces</h2>
   <div className="space-y-1">{db.spaces.map(s=><button key={s.id} type="button" aria-label={"Choisir espace "+s.title} aria-pressed={space?.id===s.id}
     onClick={()=>{setDb(d=>({...d,selectedSpaceId:s.id}));setMomentId("");setAuthorId("");setActiveSignalId("");}}
     className={"w-full rounded-[5px] border p-3 text-left text-xs "+(space?.id===s.id?"border-white bg-white text-black":"border-white/15 hover:bg-white/10")}>
     <strong>{s.title}</strong><span className="mt-1 block text-[10px] opacity-70">{titles.find(k=>k.kind===s.kind)?.label}</span></button>)}</div>
   <div className="space-y-2 border-t border-white/15 pt-4">
     <h3 className="text-xs font-semibold">Nouvel espace</h3>
     <select aria-label="Type du nouvel espace" value={kind} onChange={e=>setKind(e.target.value as SpaceKind)} className={studioInput}>
       {KINDS.map(k=><option key={k} value={k}>{titles.find(t=>t.kind===k)?.label}</option>)}
     </select>
     <input aria-label="Nom du nouvel espace" className={studioInput} placeholder="Notre famille, notre événement..." maxLength={180} value={title} onChange={e=>setTitle(e.target.value)}/>
     <button aria-label="Créer mon espace" onClick={create} className={studioButton+" w-full"}><Plus size={14}/> Créer ma page</button>
     <button aria-label="Essayer le Jour J fictif" onClick={makeExample} className={studioButton+" w-full"}><GraduationCap size={14}/> Essayer le Jour J fictif</button>
   </div>
   <div className="space-y-2 border-t border-white/15 pt-4">
     <h3 className="text-xs font-semibold">Mon parcours</h3>
     <div role="progressbar" aria-label="Progression de formation Jour J" aria-valuemin={0} aria-valuemax={training.length} aria-valuenow={done}
       className="h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#a5e1cb]" style={{width:(done/training.length*100)+"%"}}/></div>
     <p className="text-[11px] text-white/55">{done}/{training.length} étapes préparées · valable pour les familles, mariages et associations.</p>
     <button aria-label="Ouvrir la formation Jour J" onClick={()=>setScreen("formation")} className={studioButton+" w-full"}><BookOpen size={14}/> Formation Jour J</button>
   </div>
   {space&&<button type="button" aria-label="Exporter cet espace JSON" onClick={exportSpace} className={studioButton+" w-full"}><Download size={14}/> Exporter une copie privée</button>}
   <button type="button" aria-label="Importer un espace partagé" onClick={()=>spaceImport.current?.click()} className={studioButton+" w-full"}><Upload size={14}/> Importer une copie</button>
 </div>;
 const right=<div className="space-y-4 pb-28">
   <h2 className="text-sm font-semibold">Relations et moments</h2>
   {!space?<p className="text-xs text-white/60">Créez une page ou ouvrez l'exemple de formation.</p>:<>
     <label className="block text-xs text-white/75">Nom de la page
       <input aria-label="Modifier le titre de l'espace" className={studioInput+" mt-1"} value={space.title} maxLength={180} onChange={e=>patch(s=>({...s,title:e.target.value}))}/></label>
     <label className="block text-xs text-white/75">Intention
       <textarea aria-label="Intention de l'espace" className={studioInput+" mt-1 min-h-20 resize-y"} value={space.description} maxLength={1200}
         onChange={e=>patch(s=>({...s,description:e.target.value}))}/></label>
     <details open className="space-y-2 border-t border-white/15 pt-3">
       <summary className="cursor-pointer text-xs font-semibold">Personnes · {space.people.length}</summary>
       <div className="space-y-2 pt-2">
         <input aria-label="Nom d'une personne à relier" value={personName} onChange={e=>setPersonName(e.target.value)} maxLength={100} className={studioInput} placeholder="Prénom ou pseudo"/>
         <select aria-label="Rôle de la personne" className={studioInput} value={personRole} onChange={e=>setPersonRole(e.target.value as RelationRole)}>
           {ROLES.map(r=><option key={r} value={r}>{r}</option>)}</select>
         <button aria-label="Ajouter une personne" className={studioButton+" w-full"} onClick={addPerson}><Plus size={14}/> Ajouter</button>
         {space.people.map(p=><div key={p.id} className="space-y-2 rounded-[5px] border border-white/15 p-2 text-[11px]">
           <div className="flex justify-between gap-2"><strong>{p.name}</strong><span className="text-white/50">{p.role}</span></div>
           <label className="flex items-start gap-2 text-white/70">
             <input type="checkbox" aria-label={"Consentement de "+p.name} checked={p.notificationsOptIn}
               onChange={e=>patch(s=>({...s,people:s.people.map(v=>v.id===p.id?{...v,notificationsOptIn:e.target.checked,
                 subscribedMomentIds:e.target.checked?v.subscribedMomentIds:[]}:v)}))} className="mt-0.5 accent-white"/>
             Accord explicite noté pour la réception d'informations
           </label>
           {p.notificationsOptIn&&<div className="space-y-1"><p className="text-white/55">Moments suivis :</p>
             {space.moments.map(m=><label key={m.id} className="flex items-center gap-2">
               <input type="checkbox" aria-label={"Abonner "+p.name+" au moment "+m.title} checked={p.subscribedMomentIds.includes(m.id)}
                 onChange={e=>patch(s=>({...s,people:s.people.map(v=>v.id===p.id?
                   {...v,subscribedMomentIds:e.target.checked?[...v.subscribedMomentIds,m.id]:v.subscribedMomentIds.filter(id=>id!==m.id)}:v)}))}
                 className="accent-white"/>{m.title}</label>)}</div>}
         </div>)}
       </div>
     </details>
     <details open className="space-y-2 border-t border-white/15 pt-3">
       <summary className="cursor-pointer text-xs font-semibold">Moments · {space.moments.length}</summary>
       <div className="space-y-2 pt-2">
         <input aria-label="Nom d'un nouveau moment" className={studioInput} value={momentName} maxLength={180} onChange={e=>setMomentName(e.target.value)} placeholder="Arrivée, cérémonie, séance…"/>
         <input aria-label="Heure du nouveau moment" className={studioInput} type="time" value={momentTime} onChange={e=>setMomentTime(e.target.value)}/>
         <button aria-label="Ajouter un moment" className={studioButton+" w-full"} onClick={addMoment}><Plus size={14}/> Ajouter le moment</button>
         {space.moments.map(m=><div key={m.id} className="rounded-[5px] border border-white/15 p-2 text-[11px]">
           <strong>{m.time||"Heure à définir"} · {m.title}</strong>
           <p className="mt-2 text-white/55">Personnes concernées</p>
           {space.people.map(p=><label key={p.id} className="mt-1 flex items-center gap-2">
             <input type="checkbox" aria-label={"Associer "+p.name+" au moment "+m.title} checked={m.personIds.includes(p.id)}
               onChange={e=>patch(s=>({...s,moments:s.moments.map(v=>v.id===m.id?
                 {...v,personIds:e.target.checked?[...v.personIds,p.id]:v.personIds.filter(id=>id!==p.id)}:v)}))}
               className="accent-white"/>{p.name}</label>)}
           {space.moments.length>1&&<label className="mt-2 block text-white/55">Dépend de :
             <select aria-label={"Dépendance du moment "+m.title} value={m.followsMomentIds[0]??""} className={studioInput+" mt-1"}
               onChange={e=>patch(s=>({...s,moments:s.moments.map(v=>v.id===m.id?
                 {...v,followsMomentIds:e.target.value?[e.target.value]:[]}:v)}))}>
               <option value="">Aucun</option>
               {space.moments.filter(v=>v.id!==m.id).map(v=><option key={v.id} value={v.id}>{v.title}</option>)}
             </select></label>}
         </div>)}
       </div>
     </details>
     <p className="border-t border-white/15 pt-3 text-[11px] leading-relaxed text-white/55"><Shield size={13} className="mr-1 inline"/>
       Ces personnes sont des fiches locales, pas des comptes authentifiés. Un consentement coché ici sert à tester les règles : un système connecté devra le recueillir et le vérifier réellement.</p>
   </>}
 </div>;
 const screenButtons=<div className="flex flex-wrap gap-1 rounded-[7px] border border-white/15 bg-[#09090b] p-1" role="group" aria-label="Vues de mon espace">
   {([{id:"espace",label:"Ma page",icon:LayoutGrid},{id:"causal",label:"Studio Causal",icon:GitBranch},{id:"formation",label:"Formation Jour J",icon:GraduationCap}] as const).map(t=>
     <button key={t.id} aria-label={"Afficher "+t.label} aria-pressed={screen===t.id} onClick={()=>setScreen(t.id)}
       className={"inline-flex min-h-9 items-center gap-2 rounded-[5px] px-3 text-xs "+(screen===t.id?"bg-white text-black":"text-white/75 hover:bg-white/10")}><t.icon size={15}/>{t.label}</button>)}
 </div>;
 const causal=<div className="space-y-5">
   <div><p className="text-[10px] font-semibold uppercase tracking-widest text-white/50">RIPPLE · CAUSALITÉ</p>
     <h2 className="mt-2 text-[clamp(22px,3vw,32px)] font-semibold">Un geste. Les bonnes personnes.</h2>
     <p className="mt-2 text-sm text-white/60">Préparer une information, suivre ses dépendances et vérifier qui pourrait être concerné. Aucun message envoyé, aucun horaire changé automatiquement.</p></div>
   {!space||!space.moments.length?<div className="rounded-[8px] border border-dashed border-white/20 p-7 text-center text-sm text-white/70">
     Ajoutez un espace et un moment, ou essayez le Jour J fictif.</div>:
   <>
     <section className="grid gap-3 rounded-[8px] border border-white/15 bg-white/5 p-4 sm:grid-cols-2">
       <label className="text-xs text-white/70">Moment concerné
         <select aria-label="Moment du signal causal" value={selectedMoment?.id??""} onChange={e=>setMomentId(e.target.value)} className={studioInput+" mt-2"}>
           {space.moments.map(m=><option key={m.id} value={m.id}>{m.time} · {m.title}</option>)}</select></label>
       <label className="text-xs text-white/70">Émetteur (simulation)
         <select aria-label="Émetteur du signal causal" value={authorId} onChange={e=>setAuthorId(e.target.value)} className={studioInput+" mt-2"}>
           <option value="">Non précisé</option>{space.people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
       <label className="text-xs text-white/70">Information
         <select aria-label="Type de signal causal" className={studioInput+" mt-2"} value={signalKind} onChange={e=>setSignalKind(e.target.value as SignalKind)}>
           <option value="retard">Retard</option><option value="changement">Changement</option><option value="information">Information</option></select></label>
       {signalKind==="retard"&&<div><p className="mb-2 text-xs text-white/70">Retard estimé</p><div className="flex flex-wrap gap-1">
         {[10,20,30,45].map(v=><button key={v} aria-label={"Retard "+v+" minutes"} aria-pressed={delay===v} onClick={()=>setDelay(v)}
           className={"rounded-[5px] border px-3 py-2 text-xs "+(delay===v?"border-white bg-white text-black":"border-white/25")}>{v} min</button>)}</div></div>}
       <label className="text-xs text-white/70 sm:col-span-2">Précision facultative
         <textarea aria-label="Description du signal causal" className={studioInput+" mt-2 min-h-20 resize-y"} value={message} maxLength={500} onChange={e=>setMessage(e.target.value)} placeholder="Je serai en retard à la cérémonie…"/></label>
     </section>
     {impact&&<section aria-label="Aperçu de l'onde causale" className="space-y-3 rounded-[8px] border border-[#7c7ca5]/60 p-4">
       <div className="flex items-center gap-2"><GitBranch size={17}/><h3 className="text-sm font-semibold">Onde causale · simulation</h3></div>
       <p className="text-xs text-white/75">{impact.summary}</p>
       <div className="flex flex-wrap gap-2">{impact.moments.map((m,i)=><span key={m.id} className="flex items-center gap-2 rounded-[6px] border border-white/20 bg-white/5 px-3 py-2 text-xs">
         {i>0&&<ArrowRight size={13}/>} {m.title}</span>)}</div>
       <p className="text-[11px] text-white/70">{impact.direct.length} personne(s) directement concernée(s) · {impact.indirect.length} indirectement concernée(s)</p>
       <div className="grid gap-2 sm:grid-cols-2">
         <div className="rounded-[6px] border border-white/15 p-3"><h4 className="text-xs font-semibold">Réception potentielle ({impact.recipients.length})</h4>
           {impact.recipients.map(p=><p key={p.id} className="mt-2 text-[11px] text-white/75"><Check size={12} className="mr-1 inline"/>{p.name}</p>)}
           {!impact.recipients.length&&<p className="mt-2 text-[11px] text-white/55">Aucun consentement et abonnement suffisants.</p>}</div>
         <div className="rounded-[6px] border border-white/15 p-3"><h4 className="text-xs font-semibold">Non destinataires ({impact.notOptedIn.length})</h4>
           {impact.notOptedIn.map(p=><p key={p.id} className="mt-2 text-[11px] text-white/60">{p.name} · non abonné ou sans accord</p>)}
           {!impact.notOptedIn.length&&<p className="mt-2 text-[11px] text-white/55">Aucune autre personne reliée.</p>}</div>
       </div>
       <button aria-label="Enregistrer un brouillon causal" onClick={addSignal} className="inline-flex min-h-10 items-center gap-2 rounded-[5px] bg-white px-4 text-xs font-semibold text-black"><Plus size={15}/> Enregistrer comme brouillon</button>
     </section>}
     <section className="space-y-3 rounded-[8px] border border-white/15 p-4">
       <h3 className="text-sm font-semibold">Journal des décisions</h3>
       {space.signals.map(s=><div key={s.id} className={"rounded-[6px] border p-3 text-xs "+(activeSignalId===s.id?"border-white/70":"border-white/15")}>
         <div className="flex flex-wrap items-center justify-between gap-2"><strong>{s.kind==="retard"?"Retard de "+s.delayMinutes+" min":s.kind}</strong>
           <span className="text-[10px] text-white/55">{stamp(s.created)} · {s.status}</span></div>
         <p className="mt-1 text-white/70">{space.moments.find(m=>m.id===s.momentId)?.title} · {s.message||"Sans précision"}</p>
         {s.status==="brouillon"?<button aria-label={"Sélectionner brouillon "+s.id} onClick={()=>setActiveSignalId(s.id)} className={studioButton+" mt-2"}>Examiner ce brouillon <ChevronRight size={14}/></button>:
           <p className="mt-2 text-[11px] text-[#b9e7ce]">Plan validé localement · {s.plannedRecipientIds.length} destinataire(s) potentiels figés · aucun envoi</p>}
       </div>)}
       {!space.signals.length&&<p className="text-xs text-white/50">Aucun signal. Enregistrez une simulation ci-dessus.</p>}
       {activeSignal?.status==="brouillon"&&<div className="rounded-[6px] border border-[#a9dcce]/45 bg-[#162a26] p-3">
         <p className="text-xs text-white/80">Vous allez valider un plan de {selectedRecipients?.recipients.length??0} destinataire(s) potentiels. Aucune notification ne partira.</p>
         <button aria-label="Valider le plan causal sans envoyer" onClick={approveSignal} className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-[5px] bg-white px-4 text-xs font-semibold text-black"><CheckCircle2 size={15}/> Valider le plan uniquement</button>
       </div>}
     </section>
   </>}
 </div>;
 const page=<div className="space-y-5">
   <div><p className="text-[10px] font-semibold uppercase tracking-widest text-white/55">UNE PAGE, TOUS LES MONDES</p>
     <h2 className="mt-2 text-[clamp(23px,3vw,34px)] font-semibold">{space?.title??"Tout commence par un espace."}</h2>
     <p className="mt-2 text-sm text-white/60">{space?.description||"Composez une page avec les studios dont vous avez besoin. Les ressources liées restent dans leur studio d'origine."}</p></div>
   {!space?<div className="rounded-[9px] border border-dashed border-white/20 p-10 text-center">
     <LayoutGrid size={33} className="mx-auto text-white/50"/><h3 className="mt-3 text-lg font-semibold">Votre page est encore vide.</h3>
     <p className="mt-2 text-xs text-white/60">Choisissez un type de page à gauche, ou lancez le parcours Jour J fictif.</p>
     <button aria-label="Démarrer le parcours Jour J" onClick={makeExample} className={studioButton+" mt-5"}><GraduationCap size={14}/> Découvrir un exemple Jour J</button>
   </div>:<>
     <div className="grid gap-3 sm:grid-cols-2">
       {space.tiles.filter(t=>t.visible).map(t=>{
         const info=TILES.find(v=>v.id===t.kind)!;const linked=linkedModuleInfo(t);const sources=sourcesForTile(t.kind);
         return <article key={t.id} className={"flex min-h-[155px] flex-col justify-between rounded-[8px] border border-white/15 bg-white/5 p-4 hover:bg-white/10 "+(t.kind==="external"?"sm:col-span-2":"")}>
           <div><span className="text-2xl" aria-hidden="true">{icons[t.kind]}</span><h3 className="mt-2 text-sm font-semibold">{t.title}</h3>
             <p className="mt-1 text-[11px] text-white/55">{linked?"Source liée : "+linked.label:info.description}</p></div>
           {sources.length>0&&<label className="mt-3 block text-[11px] text-white/65">Brancher un projet existant
             <select aria-label={"Relier le module "+t.title} className={studioInput+" mt-1"} value={t.refId}
               onChange={e=>patch(s=>({...s,tiles:s.tiles.map(v=>v.id===t.id?{...v,refId:e.target.value}:v)}))}>
               <option value="">Non relié</option>
               {sources.map(source=><option key={source.id} value={source.id}>{source.label}</option>)}
             </select>
           </label>}
           {t.refId&&!linked&&<p className="mt-2 text-[11px] text-[#ffd2a7]">Cette source n'est plus disponible sur l'appareil.</p>}
           {t.kind==="external"&&t.refId&&externalById(t.refId)&&
             <div className="mt-3"><ExternalEmbed key={t.refId} resource={externalById(t.refId)!} compact/></div>}
           <div className="mt-4 flex items-center justify-between gap-2">{t.kind!=="external"&&<button aria-label={"Ouvrir le module "+t.title} className="inline-flex items-center gap-1.5 text-xs font-semibold text-white underline underline-offset-2"
               onClick={()=>onStudio(info.studio)}>Ouvrir <ArrowRight size={13}/></button>}
             <button aria-label={"Masquer le module "+t.title} onClick={()=>patch(s=>({...s,tiles:s.tiles.map(v=>v.id===t.id?{...v,visible:false}:v)}))}
               className="text-[11px] text-white/60 hover:text-white">Masquer</button></div>
         </article>;
       })}
     </div>
     <section className="space-y-2 rounded-[8px] border border-white/15 p-4">
       <h3 className="text-sm font-semibold">Composer ma page</h3>
       <p className="text-[11px] text-white/60">Réorganisez, affichez ou liez les studios. La page affiche les références existantes sans écraser leur contenu.</p>
       {space.tiles.map((t,i)=><div key={t.id} className="flex flex-wrap items-center gap-2 rounded-[5px] bg-white/5 p-2 text-xs">
         <label className="flex min-w-0 flex-1 items-center gap-2">
           <input type="checkbox" aria-label={"Afficher le module "+t.title} checked={t.visible}
             onChange={e=>patch(s=>({...s,tiles:s.tiles.map(v=>v.id===t.id?{...v,visible:e.target.checked}:v)}))} className="accent-white"/>
           <span className="truncate">{t.title}</span>
         </label>
         <button aria-label={"Monter le module "+t.title} disabled={i===0} onClick={()=>moveTile(t.id,-1)} className={studioButton+" !px-2"}><ArrowUp size={13}/></button>
         <button aria-label={"Descendre le module "+t.title} disabled={i===space.tiles.length-1} onClick={()=>moveTile(t.id,1)} className={studioButton+" !px-2"}><ArrowDown size={13}/></button>
       </div>)}
       <label className="block text-xs text-white/70">Ajouter un studio
         <select aria-label="Ajouter un studio à ma page" className={studioInput+" mt-2"} defaultValue="" onChange={e=>{if(e.target.value)addTile(e.target.value as TileKind);e.target.value="";}}>
           <option value="">Choisir un module…</option>{TILES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
       <div className="mt-4 space-y-2 rounded-[6px] border border-white/15 p-3">
         <h4 className="text-xs font-semibold">Ajouter une application déjà créée</h4>
         <p className="text-[11px] text-white/60">Une URL HTTPS suffit pour référencer l'application. Aucun accès à ses données internes.</p>
         <input aria-label="Nom du projet externe" className={studioInput} maxLength={130} placeholder="Nom du projet" value={externalTitle} onChange={e=>setExternalTitle(e.target.value)}/>
         <input aria-label="URL HTTPS du projet externe" className={studioInput} maxLength={1000} placeholder="https://exemple.vercel.app/" value={externalURL} onChange={e=>setExternalURL(e.target.value)}/>
         <button aria-label="Brancher un projet externe" type="button" onClick={saveExternal} className={studioButton}><Plus size={14}/> Référencer ce projet</button>
       </div>
     </section>
     <div className="rounded-[7px] border border-[#aea4d6]/40 bg-[#211e2d] p-4">
       <h3 className="text-sm font-semibold">Un espace vivant, sans duplication.</h3>
       <p className="mt-2 text-xs leading-relaxed text-white/65">Un site modifié dans Academy apparaît sous son titre actualisé ici ; les studios Programme et Music conservent leurs données d'origine. Les autres modules ouvrent directement leur atelier.</p>
       <button aria-label="Aller au Studio Causal" onClick={()=>setScreen("causal")} className={studioButton+" mt-3"}><GitBranch size={14}/> Explorer la causalité</button>
     </div>
   </>}
 </div>;
 const course=<div className="space-y-5">
   <div><p className="text-[10px] font-semibold uppercase tracking-widest text-white/50">ACADEMY · AVANT / PENDANT / APRÈS</p>
     <h2 className="mt-2 text-[clamp(22px,3vw,34px)] font-semibold">Apprendre pour le Jour J. Réutiliser partout.</h2>
     <p className="mt-2 text-sm text-white/60">Six exercices construits autour de votre vrai espace. Le même parcours peut servir à une famille, une association, un cours ou un mariage.</p></div>
   <div className="grid gap-3 sm:grid-cols-2">{training.map((t,i)=><article key={t.id} className="rounded-[8px] border border-white/15 bg-white/5 p-4">
     <div className="flex items-center gap-3"><span className={"grid size-8 place-items-center rounded-full border text-xs "+(t.passed?"border-[#8ad5b9] bg-[#265746]":"border-white/30")}>{t.passed?<Check size={16}/>:i+1}</span>
       <h3 className="text-sm font-semibold">{t.title}</h3></div>
     <p className="mt-3 text-xs leading-relaxed text-white/65">{t.description}</p>
     <p className="mt-3 text-[11px] text-white/65">{t.passed?"Étape accomplie dans votre espace.":"En attente d'une action réelle."}</p>
   </article>)}</div>
   <div className="flex flex-wrap gap-2">
     <button aria-label="Composer mon espace depuis la formation" onClick={()=>setScreen("espace")} className={studioButton}><LayoutGrid size={14}/> Composer ma page</button>
     <button aria-label="Simuler un retard pour le Jour J" onClick={()=>setScreen("causal")} className={studioButton}><Clock3 size={14}/> Simuler Retard XX</button>
     <button aria-label="Ouvrir Academy pour bâtir son site" onClick={()=>onStudio("academy")} className={studioButton}><GraduationCap size={14}/> Construire mon site No Code</button>
     <button aria-label="Ouvrir la broderie depuis le parcours" onClick={()=>onStudio("embroidery")} className={studioButton}>Broderie <ArrowRight size={14}/></button>
   </div>
   <p className="text-xs leading-relaxed text-white/55"><CircleHelp size={15} className="mr-1 inline"/> Aucune attestation de formation ni certification professionnelle n'est délivrée : l'avancement mesure uniquement les actions effectuées dans l'espace local.</p>
 </div>;
 return <StudioFrame title={initialScreen==="causal"?"Studio Causal":"Mon Espace"} subtitle="Une page personnelle, des créations reliées, une formation utile le Jour J et après"
   onBack={onBack} leftLabel="Espaces et parcours" rightLabel="Personnes et moments" left={left} right={right}
   actions={<button aria-label="Ouvrir le Studio Causal rapidement" onClick={()=>setScreen("causal")} className={studioButton}><GitBranch size={15}/><span className="hidden sm:inline">Causal</span></button>}>
   <div className="mx-auto max-w-[1100px] space-y-5 pb-20">
     {screenButtons}
     {screen==="espace"?page:screen==="causal"?causal:course}
     {notice&&<div role="status" className="rounded-[6px] border border-white/20 bg-[#09090b] p-3 text-xs text-white">{notice}</div>}
     <p className="flex items-start gap-2 text-[11px] leading-relaxed text-white/45"><Shield size={14} className="shrink-0"/> Aucune mise en ligne ni transmission réelle de notifications. Les espaces et les consentements sont uniquement conservés sur cet appareil jusqu'à l'activation d'une authentification et de contrôles d'accès.</p>
   </div>
   <input type="file" className="sr-only" ref={spaceImport} accept=".json,application/json" aria-label="Fichier d’espace partagé" onChange={e=>void importSpace(e)}/>
 </StudioFrame>;
}
