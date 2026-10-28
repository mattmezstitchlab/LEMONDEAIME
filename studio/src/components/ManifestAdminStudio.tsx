import { useState, type FormEvent } from "react";
import { ArrowLeft, CalendarDays, CheckCircle2, FilePen, LockKeyhole, RefreshCw, Save, ShieldCheck } from "lucide-react";
import { AIME_SIGNATURES } from "../lib/aimeEditorial";
import { DEFAULT_LAUNCH, LAUNCH_STATUSES, STATUS_LABELS, validLaunch, type LaunchConfig, type LaunchJournal } from "../lib/launchManifest";

interface Dashboard {config:LaunchConfig|null;draft:LaunchConfig|null;confirmed:number;interests:Record<string,number>}
const field="mt-1 block min-h-10 w-full rounded-[5px] border border-[#ddd] bg-white px-3 py-2 text-[13px] text-[#333] outline-none focus:border-[#a98b95]";
const small="text-[11px] font-semibold text-[#777]";
const outline="inline-flex min-h-10 items-center justify-center gap-2 rounded-[5px] border border-[#d6d3d1] bg-white px-4 text-xs font-semibold text-[#333]";
const dateLocal=(raw:string|null)=>raw?new Date(new Date(raw).getTime()-new Date(raw).getTimezoneOffset()*60000).toISOString().slice(0,16):"";
const toISO=(raw:string)=>raw?new Date(raw).toISOString():null;
export default function ManifestAdminStudio({onBack}:{onBack:()=>void}){
 const [code,setCode]=useState(""),[authenticated,setAuthenticated]=useState(false);
 const [draft,setDraft]=useState<LaunchConfig>(DEFAULT_LAUNCH);
 const [stats,setStats]=useState<Dashboard|null>(null);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
 const [journalStatus,setJournalStatus]=useState<LaunchJournal["status"]>("Développé");
 const [journalTitle,setJournalTitle]=useState(""),[journalSource,setJournalSource]=useState("");
 const [journalDate,setJournalDate]=useState(()=>new Date().toISOString().slice(0,10));
 const patch=<K extends keyof LaunchConfig>(key:K,value:LaunchConfig[K])=>setDraft(c=>({...c,[key]:value}));
 const studio=(id:string,partial:Partial<LaunchConfig["studios"][number]>)=>
  setDraft(c=>({...c,studios:c.studios.map(s=>s.id===id?{...s,...partial}:s)}));
 async function load(e?:FormEvent){e?.preventDefault();setBusy(true);setError("");setMessage("");
  try{
   const res=await fetch("/api/pointzero-launch?admin=1",{headers:{"X-Pointzero-Admin":code}});
   const result=await res.json() as Dashboard&{error?:string};
   if(!res.ok)throw Error(result.error||"Accès refusé.");
   setAuthenticated(true);setStats(result);
   const loaded=result.draft&&validLaunch(result.draft)?result.draft:result.config&&validLaunch(result.config)?result.config:DEFAULT_LAUNCH;
   setDraft(loaded);
   setMessage("Administration chargée. Les modifications restent privées jusqu'à la publication.");
  }catch(e){setAuthenticated(false);setError(e instanceof Error?e.message:"Connexion impossible.");}
  finally{setBusy(false)}
 }
 async function save(publish:boolean){
  if(!validLaunch(draft)){setError("Vérifiez les états, dates et textes avant de sauvegarder.");return}
  if(publish&&!window.confirm("Publier cette configuration ? Les visiteurs verront immédiatement les nouveaux statuts, dates et textes. La mise en ligne du code reste une opération distincte."))return;
  setBusy(true);setError("");setMessage("");
  try{
   const res=await fetch("/api/pointzero-launch",{
    method:"POST",headers:{"Content-Type":"application/json","X-Pointzero-Admin":code},
    body:JSON.stringify({action:publish?"admin-publish":"admin-save",config:draft})
   });
   const data=await res.json() as {saved?:boolean;error?:string};
   if(!res.ok||!data.saved)throw Error(data.error||"Sauvegarde non confirmée.");
   setMessage(publish?"Configuration publiée sur le serveur (sans déploiement de code).":"Brouillon sauvegardé. La version publique reste inchangée.");
  }catch(e){setError(e instanceof Error?e.message:"Sauvegarde impossible.");}
  finally{setBusy(false)}
 }
 function addJournal(e:FormEvent){
  e.preventDefault();
  if(!journalTitle.trim()||!journalSource.trim())return setError("Chaque entrée du journal nécessite un titre et une source vérifiable.");
  patch("journal",[...draft.journal,{id:crypto.randomUUID?.()||String(Date.now()),date:journalDate,title:journalTitle.trim(),source:journalSource.trim(),status:journalStatus}].slice(-80));
  setJournalTitle("");setJournalSource("");setError("");
 }
 if(!authenticated)return <div className="fixed inset-0 z-50 overflow-y-auto bg-[#faf9f8] p-5 text-[#262629]">
  <div className="mx-auto max-w-[470px] pt-[min(17vh,150px)]">
   <button onClick={onBack} className={outline}><ArrowLeft size={15}/> Retour au manifeste</button>
   <div className="mt-12 rounded-[8px] border border-[#e3dfdd] bg-white p-8 shadow-[0_20px_60px_#00000009]">
    <LockKeyhole size={25} className="mb-6 text-[#a18490]"/>
    <h1 className="text-[29px] font-semibold tracking-[-.055em]">Administration POINTZERO .0</h1>
    <p className="mt-3 text-[13px] leading-relaxed text-[#858585]">Cette interface utilise un secret d'administration vérifié côté serveur. Aucun code n'est conservé sur cet appareil.</p>
    <form onSubmit={e=>void load(e)} className="mt-7">
     <label className={small}>Code administrateur
      <input type="password" autoComplete="off" required aria-label="Code d'administration de la landing" value={code} onChange={e=>setCode(e.target.value)} className={field}/>
     </label>
     <button disabled={busy} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-[5px] bg-[#252528] text-sm font-semibold text-white disabled:opacity-50">
      <ShieldCheck size={15}/> {busy?"Vérification…":"Accéder à l'administration"}</button>
     {error&&<p role="alert" className="mt-3 text-xs text-red-700">{error}</p>}
    </form>
   </div>
  </div>
 </div>;
 return <div className="fixed inset-0 z-50 overflow-y-auto bg-[#f7f6f4] text-[#2c2c30]" aria-label="Administration du manifeste POINTZERO">
  <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-[#e7e3e0] bg-white/95 px-5 py-3 backdrop-blur-xl">
   <div className="flex items-center gap-3"><button aria-label="Retour au manifeste" onClick={onBack} className={outline}><ArrowLeft size={15}/></button>
    <div><p className="text-sm font-semibold">POINTZERO .0 / Publication</p><p className="text-[11px] text-[#999]">Brouillon privé et publication contrôlée</p></div></div>
   <div className="flex flex-wrap gap-2"><button onClick={()=>void load()} className={outline}><RefreshCw size={14}/> Actualiser</button>
    <button disabled={busy} onClick={()=>void save(false)} className={outline}><Save size={15}/> Enregistrer le brouillon</button>
    <button disabled={busy} onClick={()=>void save(true)} className="inline-flex min-h-10 items-center gap-2 rounded-[5px] bg-[#26262a] px-4 text-xs font-semibold text-white disabled:opacity-40"><CheckCircle2 size={15}/> Publier la configuration</button></div>
  </header>
  <div className="mx-auto max-w-[1170px] space-y-10 px-5 pb-24 pt-8">
   <div><p className="text-[11px] font-bold tracking-[.13em] text-[#a48192]">RÉGIE / LANCEMENT</p>
    <h1 className="mt-3 text-[clamp(32px,5vw,62px)] font-semibold tracking-[-.075em]">Le temps retrouvé.</h1>
    <p className="mt-2 text-sm text-[#888]">La configuration publiée ne change qu'après validation explicite. Les studios ne s'ouvrent pas automatiquement à la fin d'un compte à rebours.</p>
   </div>
   {error&&<p role="alert" className="rounded-[5px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
   {message&&<p role="status" className="rounded-[5px] border border-[#d4e5da] bg-[#f0f8f3] p-4 text-sm text-[#426e4e]">{message}</p>}
   <section className="grid gap-4 sm:grid-cols-3" aria-label="Statistiques d'inscription">
    <div className="rounded-[6px] border border-[#e5e2e0] bg-white p-5"><p className={small}>Inscrits confirmés</p><strong className="mt-2 block text-4xl">{stats?.confirmed??"—"}</strong></div>
    <div className="rounded-[6px] border border-[#e5e2e0] bg-white p-5"><p className={small}>Studios</p><strong className="mt-2 block text-4xl">{draft.studios.length}</strong></div>
    <div className="rounded-[6px] border border-[#e5e2e0] bg-white p-5"><p className={small}>Dates annoncées</p><strong className="mt-2 block text-4xl">{draft.studios.filter(s=>s.openAt).length+(draft.mainDate?1:0)}</strong></div>
   </section>
   <section className="rounded-[7px] border border-[#e6e1de] bg-white p-5 sm:p-7">
    <div className="flex items-center gap-2"><FilePen size={17}/><h2 className="text-xl font-semibold tracking-tight">Le manifeste public</h2></div>
    <div className="mt-6 grid gap-5 sm:grid-cols-2">
     {([["title","Titre principal"],["eyebrow","Sur-titre"],["subtitle","Sous-titre"],["mainLabel","Nature du lancement"]] as const).map(([key,lbl])=>
      <label key={key} className={small}>{lbl}<input className={field} value={draft[key]} onChange={e=>patch(key,e.target.value)}/></label>)}
     <label className={small+" sm:col-span-2"}>Texte introductif<textarea className={field+" min-h-[92px]"} value={draft.introduction} onChange={e=>patch("introduction",e.target.value)}/></label>
     <label className={small+" sm:col-span-2"}>Annonce publiée<textarea className={field+" min-h-[72px]"} value={draft.announcement} onChange={e=>patch("announcement",e.target.value)}/></label>
     <label className={small+" sm:col-span-2"}><CalendarDays size={14} className="mr-2 inline"/>Date du compte à rebours principal
      <input type="datetime-local" className={field} value={dateLocal(draft.mainDate)} onChange={e=>patch("mainDate",toISO(e.target.value))}/>
      <span className="mt-1 block text-[11px] font-normal text-[#999]">Vide : aucune date inventée. La date ne déclenche jamais une publication automatique.</span>
     </label>
    </div>
   </section>
   <section className="rounded-[7px] border border-[#e6e1de] bg-white p-5 sm:p-7" aria-label="Signatures évolutives AIME">
    <h2 className="text-xl font-semibold tracking-tight">AIME · Signatures éditoriales</h2>
    <p className="mt-2 text-xs leading-relaxed text-[#888]">Une signature complète par ligne. Les mots « Architecture Intelligente » restent fixes ; seuls les mots suivants varient. Les changements demeurent en brouillon jusqu'à une publication explicite.</p>
    <label className={small+" mt-5 block"}>Signatures (1 à 8 lignes)
     <textarea className={field+" min-h-[150px]"} value={(draft.aimeSignatures??[...AIME_SIGNATURES]).join("\n")}
       onChange={e=>patch("aimeSignatures",e.target.value.split("\n").map(x=>x.trim()).filter(Boolean).slice(0,8))}/>
    </label>
   </section>
   <section aria-label="Ouverture progressive des studios" className="rounded-[7px] border border-[#e6e1de] bg-white p-5 sm:p-7">
    <h2 className="text-xl font-semibold tracking-tight">Studios et autorisations de publication</h2>
    <p className="mt-2 text-xs text-[#999]">La disponibilité est une décision explicite. Réglez l'état, puis autorisez l'ouverture ou l'aperçu après les tests.</p>
    <div className="mt-7 space-y-3">{draft.studios.map(s=><div key={s.id} className="rounded-[6px] border border-[#e6e3e0] p-4">
     <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">{s.number} — {s.title}</h3>
      <span className="text-[11px] text-[#999]">{stats?.interests?.[s.id]??0} inscrit(s) intéressé(s)</span></div>
     <div className="mt-4 grid gap-3 md:grid-cols-[1.1fr_1fr_1fr]">
      <label className={small}>Titre<input className={field} maxLength={120} value={s.title} onChange={e=>studio(s.id,{title:e.target.value})}/></label>
      <label className={small}>Statut<select className={field} value={s.status} onChange={e=>studio(s.id,{status:e.target.value as typeof s.status})}>
       {LAUNCH_STATUSES.map(status=><option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></label>
      <label className={small}>Date d'ouverture (optionnelle)<input type="datetime-local" className={field} value={dateLocal(s.openAt)} onChange={e=>studio(s.id,{openAt:toISO(e.target.value)})}/></label>
     </div>
     <label className={small+" mt-3 block"}>Description<textarea className={field+" min-h-[60px]"} maxLength={550} value={s.description} onChange={e=>studio(s.id,{description:e.target.value})}/></label>
     <label className={small+" mt-3 block"}>Évolutions documentées (une entrée par ligne, maximum 20)
      <textarea className={field+" min-h-[65px]"} value={s.history.join("\n")}
        onChange={e=>studio(s.id,{history:e.target.value.split("\n").map(x=>x.trim().slice(0,300)).filter(Boolean).slice(0,20)})}/>
     </label>
     <div className="mt-4 flex flex-wrap gap-7">
      <label className="flex items-center gap-2 text-xs text-[#777]"><input type="checkbox" checked={s.published} onChange={e=>studio(s.id,{published:e.target.checked})}/>Ouverture validée (uniquement si « Disponible »)</label>
      <label className="flex items-center gap-2 text-xs text-[#777]"><input type="checkbox" checked={s.preview} onChange={e=>studio(s.id,{preview:e.target.checked})}/>Autoriser la prévisualisation expérimentale</label>
     </div>
    </div>)}</div>
   </section>
   <section className="rounded-[7px] border border-[#e6e1de] bg-white p-5 sm:p-7">
    <h2 className="text-xl font-semibold tracking-tight">Journal de création sourcé</h2>
    <p className="mt-2 text-xs text-[#999]">Ne publiez que des événements dont vous connaissez la date et la source. Le champ peut contenir un lien de commit, une version ou un document vérifié.</p>
    <form onSubmit={addJournal} className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr]">
     <label className={small}>Date<input required type="date" className={field} value={journalDate} onChange={e=>setJournalDate(e.target.value)}/></label>
     <label className={small}>État<select className={field} value={journalStatus} onChange={e=>setJournalStatus(e.target.value as LaunchJournal["status"])}>
      {(["Conçu","Développé","Testé","Publié","Prévu"] as const).map(s=><option key={s}>{s}</option>)}</select></label>
     <label className={small+" sm:col-span-2"}>Étape<input required className={field} value={journalTitle} maxLength={240} onChange={e=>setJournalTitle(e.target.value)}/></label>
     <label className={small+" sm:col-span-2"}>Source vérifiable<input required className={field} value={journalSource} maxLength={900} onChange={e=>setJournalSource(e.target.value)} placeholder="Lien du commit ou document versionné"/></label>
     <button className={outline+" sm:col-span-2"} type="submit">Ajouter au journal (brouillon)</button>
    </form>
    <div className="mt-6 space-y-2">{draft.journal.map(j=><div key={j.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-[#eee] py-3 text-xs">
     <span>{j.date} · {j.status} · {j.title}</span><button onClick={()=>patch("journal",draft.journal.filter(x=>x.id!==j.id))} className="underline text-[#9f7587]">Retirer</button>
    </div>)}</div>
   </section>
   <p className="text-xs leading-relaxed text-[#999]">Cette console ne remplace pas une authentification et une gestion des droits des membres de l'application. Le code administrateur protège uniquement les réglages de lancement et les statistiques agrégées.</p>
  </div>
 </div>;
}
