import {safeMusicLabel} from "../lib/musicLabelCore";
import {writeStoredJSON} from "../lib/storageSafety";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Album, Check, ChevronRight, Download, FileText, Plus, Radio, Upload, Users, WandSparkles } from "lucide-react";
import { StudioFrame, studioButton, studioInput, saveStudioFile } from "./StudioFrame";
import MusicRadioPanel from "./MusicRadioPanel";
import MusicMasterPanel from "./MusicMasterPanel";
import { loadProjectOptions } from "../lib/budgetCore";
import { PROGRAMME_STORAGE, safeProgrammeStore } from "../lib/programmeCore";
import {
 addRequest,eventPlaylist,guestEnvelope,guestToRequest,labelCSV,loadLabel,matchTrack,musicCSV,
 MUSIC_MOMENTS,newArtist,newMusicEvent,newMusicRequest,newTrack,safeGuestEnvelope,
 type MusicLabelStore,type MusicMoment,type MusicRight
} from "../lib/musicLabelCore";

type Page="radio"|"playlist"|"master"|"label"|"sacem";
type Props={onBack:()=>void;linkedProject?:{id:string;name:string}|null};
const pages:{id:Page;name:string;icon:typeof Radio}[]=[
 {id:"radio",name:"Radio & Mix",icon:Radio},{id:"playlist",name:"Playlists & invités",icon:Users},
 {id:"master",name:"Pré-mastering",icon:WandSparkles},{id:"label",name:"Artistes & Label",icon:Album},
 {id:"sacem",name:"Événements & SACEM",icon:FileText}
];
const clip=(s:string,n:number)=>s.slice(0,n);
const fileSafe=(s:string)=>s.replace(/[^a-z0-9-_]+/gi,"_").slice(0,55)||"musique";
export default function MusicProductionStudio({onBack,linkedProject}:Props){
 const [data,setData]=useState<MusicLabelStore>(loadLabel);
 const [page,setPage]=useState<Page>("radio");
 const [eventId,setEventId]=useState("");
 const [eventTitle,setEventTitle]=useState(""),[eventDate,setEventDate]=useState("");
 const [projectId,setProjectId]=useState(linkedProject?.id??"");
 const [guest,setGuest]=useState(""),[song,setSong]=useState(""),[performer,setPerformer]=useState("");
 const [moment,setMoment]=useState<MusicMoment>("soirée");
 const [notice,setNotice]=useState("");
 const [artistName,setArtistName]=useState(""),[artistId,setArtistId]=useState("");
 const [newSong,setNewSong]=useState(""),[newPerformer,setNewPerformer]=useState(""),[trackId,setTrackId]=useState("");
 const [assetsVersion,setAssetsVersion]=useState(0);
 const files=useRef(new Map<string,string>());
 const importRequest=useRef<HTMLInputElement>(null);
 const attachTrackFile=useRef<HTMLInputElement>(null);
 const projectChoices=useMemo(()=>loadProjectOptions(),[]);
 const sessions=useMemo(()=>{
   try{
     const store=safeProgrammeStore(JSON.parse(localStorage.getItem(PROGRAMME_STORAGE)??"null"));
     return (store?.programmes??[]).flatMap(p=>p.sessions.map(s=>({id:s.id,programmeId:p.id,programme:p.title,title:s.title,date:s.date}))).slice(0,60);
   }catch{return [];}
 },[]);
 const active=data.events.find(e=>e.id===eventId)??data.events[0]??null;
 const proposals=data.requests.filter(r=>r.eventId===active?.id);
 const approved=active?eventPlaylist(data,active.id):[];
 const playlist=active?approved.map(r=>r.track).filter((t):t is NonNullable<typeof t>=>!!t):data.tracks;
 const update=(fn:(s:MusicLabelStore)=>MusicLabelStore)=>setData(s=>fn(s));
 useEffect(()=>{try{writeStoredJSON("pointzero:music-label:v1",JSON.stringify(data),safeMusicLabel);}catch{setNotice("Stockage saturé. Sauvegardez le catalogue en JSON.");}},[data]);
 useEffect(()=>()=>{for(const url of files.current.values())URL.revokeObjectURL(url);},[]);
 const createEvent=()=>{
   if(!eventTitle.trim())return setNotice("Le nom de l'événement est nécessaire.");
   const e=newMusicEvent(eventTitle,eventDate,projectId);
   update(s=>({...s,events:[e,...s.events]}));setEventId(e.id);setEventTitle("");setEventDate("");
 };
 const linkProgramme=(id:string)=>{
   const p=sessions.find(s=>s.id===id);if(!p)return;
   const existing=data.events.find(e=>e.programmeSessionId===p.id);
   if(existing){setEventId(existing.id);setNotice("Événement existant réutilisé sans duplication.");return;}
   const e=newMusicEvent(p.programme+" · "+p.title,p.date,p.programmeId,p.id);
   update(s=>({...s,events:[e,...s.events]}));setEventId(e.id);setNotice("Programme lié à ce nouvel événement musical.");
 };
 const addChoice=()=>{
   if(!active)return setNotice("Créez ou sélectionnez un événement.");
   const related=matchTrack(data,song,performer);
   const result=addRequest(data,newMusicRequest(active.id,song,performer,guest,moment,related?.id??""));
   if(result.added){setData(result.store);setSong("");setPerformer("");}
   setNotice(result.reason);
 };
 const setRequestStatus=(id:string,status:"proposed"|"approved"|"rejected")=>
   update(s=>{
     const request=s.requests.find(r=>r.id===id);
     if(!request||status!=="approved")return {...s,requests:s.requests.map(r=>r.id===id?{...r,status}:r)};
     const found=matchTrack(s,request.title,request.artistName);
     const created=found??newTrack(request.title,request.artistName);
     const tracks=found?s.tracks:[...s.tracks,created];
     return {...s,tracks,requests:s.requests.map(r=>r.id===id?{...r,status,trackId:created.id}:r)};
   });
 const importGuestFile=async(e:ChangeEvent<HTMLInputElement>)=>{
   const file=e.target.files?.[0];e.target.value="";if(!file||!active)return;
   if(file.size>30000)return setNotice("Proposition trop volumineuse.");
   try{
     const request=safeGuestEnvelope(JSON.parse(await file.text()));
     if(!request)throw Error("Format de proposition invalide.");
     if(request.eventLabel!==active.title||request.eventDate!==active.date)throw Error("Cette proposition concerne un autre événement.");
     const result=addRequest(data,guestToRequest(request,active));setData(result.store);setNotice(result.reason);
   }catch(e){setNotice(e instanceof Error?e.message:"Fichier illisible.");}
 };
 const exportGuest=()=>{
   if(!active||!song.trim()||!performer.trim())return setNotice("Renseignez l'artiste et le morceau.");
   const draft=guestEnvelope(active,newMusicRequest(active.id,song,performer,guest,moment));
   saveStudioFile("proposition-musicale.json",JSON.stringify(draft,null,2));
   setNotice("Fichier local prêt à transmettre manuellement : la synchronisation invités n'est pas encore activée.");
 };
 const importAudios=(audios:File[])=>{
   let count=0,added=0;
   const fresh:MusicLabelStore={...data,tracks:[...data.tracks]};
   for(const file of audios){
     if(file.size>80_000_000||(!file.type.startsWith("audio/")&&!/\.(wav|mp3|flac|m4a|ogg)$/i.test(file.name)))continue;
     const parts=file.name.replace(/\.[^.]+$/,"").split(" - ");
     const artist=parts.length>1?parts.shift()!.trim():"Artiste à renseigner";
     const title=parts.join(" - ").trim();
     let matching=matchTrack(fresh,title,artist);
     if(!matching){matching=newTrack(title,artist);fresh.tracks.push(matching);added++;}
     const previous=files.current.get(matching.id);if(previous)URL.revokeObjectURL(previous);
     files.current.set(matching.id,URL.createObjectURL(file));count++;
   }
   setData(fresh);
   setAssetsVersion(v=>v+1);
   setNotice(count+" fichiers locaux chargés ; "+added+" nouvelles fiches. L'audio n'est pas conservé à la fermeture.");
 };
 const attachCurrentTrack=(e:ChangeEvent<HTMLInputElement>)=>{
   const file=e.target.files?.[0];e.target.value="";
   if(!file||!track)return;
   if(file.size>80_000_000||(!file.type.startsWith("audio/")&&!/\.(wav|mp3|flac|m4a|ogg)$/i.test(file.name)))
     return setNotice("Fichier audio invalide ou trop volumineux (80 Mo maximum).");
   const old=files.current.get(track.id);if(old)URL.revokeObjectURL(old);
   files.current.set(track.id,URL.createObjectURL(file));
   setAssetsVersion(v=>v+1);setNotice("Audio local associé à « "+track.title+" ». Il sera accessible dans la radio liée à l'événement.");
 };
 const createArtist=()=>{
   if(!artistName.trim())return;
   if(data.artists.some(a=>a.name.toLocaleLowerCase()===artistName.trim().toLocaleLowerCase()))return setNotice("Artiste déjà dans le catalogue.");
   const a=newArtist(artistName);update(s=>({...s,artists:[...s.artists,a]}));setArtistId(a.id);setArtistName("");
 };
 const createTrack=()=>{
   if(!newSong.trim()||!newPerformer.trim())return setNotice("Titre et interprète nécessaires.");
   const existing=matchTrack(data,newSong,newPerformer);
   if(existing){setTrackId(existing.id);setNotice("Fiche existante réutilisée.");return;}
   const t=newTrack(newSong,newPerformer);
   const artist=data.artists.find(a=>a.name.toLocaleLowerCase()===newPerformer.trim().toLocaleLowerCase());
   if(artist)t.artistId=artist.id;
   update(s=>({...s,tracks:[...s.tracks,t]}));setTrackId(t.id);setNewSong("");setNewPerformer("");
 };
 const artist=data.artists.find(a=>a.id===artistId)??data.artists[0]??null;
 const track=data.tracks.find(t=>t.id===trackId)??data.tracks[0]??null;
 const patchArtist=(field:"ipi"|"contact",value:string)=>{if(artist)update(s=>({...s,artists:s.artists.map(a=>a.id===artist.id?{...a,[field]:value}:a)}));};
 const patchTrack=(key:keyof NonNullable<typeof track>,value:string|number)=>{
   if(!track)return;update(s=>({...s,tracks:s.tracks.map(t=>t.id===track.id?{...t,[key]:value}:t)}));
 };
 const right=<div className="space-y-4 pb-20">
   <h2 className="text-sm font-semibold">Événements et liens</h2>
   <p className="text-[11px] leading-relaxed text-white/65">Une seule fiche d'événement pour les demandes, la playlist, la radio et les documents SACEM.</p>
   <label className="block text-xs text-white/75">Événement actif
     <select aria-label="Événement du Studio Music" className={studioInput+" mt-2"} value={active?.id??""} onChange={e=>setEventId(e.target.value)}>
       {!data.events.length&&<option value="">Aucun événement</option>}
       {data.events.map(e=><option key={e.id} value={e.id}>{e.title}{e.date?" · "+e.date:""}</option>)}
     </select></label>
   {active&&<div className="space-y-2 rounded-[6px] border border-white/15 p-3 text-xs text-white/75">
     <strong className="text-white">{active.title}</strong><p>{active.date||"Date à définir"} · {proposals.length} proposition(s)</p>
     <label className="block text-[11px]">Lieu<input aria-label="Lieu du Studio Music" className={studioInput+" mt-1"} value={active.venue}
       onChange={e=>update(s=>({...s,events:s.events.map(v=>v.id===active.id?{...v,venue:clip(e.target.value,250)}:v)}))}/></label>
     <label className="block text-[11px]">Organisateur<input aria-label="Organisateur du Studio Music" className={studioInput+" mt-1"} value={active.organizer}
       onChange={e=>update(s=>({...s,events:s.events.map(v=>v.id===active.id?{...v,organizer:clip(e.target.value,250)}:v)}))}/></label>
   </div>}
   <section className="space-y-2 border-t border-white/10 pt-4">
     <h3 className="text-xs font-semibold">Créer un événement</h3>
     <input aria-label="Nouveau nom d'événement musical" placeholder="Mariage de…" className={studioInput} value={eventTitle} onChange={e=>setEventTitle(clip(e.target.value,180))}/>
     <input aria-label="Date de l'événement musical" type="date" className={studioInput} value={eventDate} onChange={e=>setEventDate(e.target.value)}/>
     <select aria-label="Projet lié à l'événement" className={studioInput} value={projectId} onChange={e=>setProjectId(e.target.value)}>
       <option value="">Sans projet</option>{projectChoices.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
     </select>
     <button onClick={createEvent} className={studioButton+" w-full"}><Plus size={14}/> Créer l'événement</button>
   </section>
   {!!sessions.length&&<section className="space-y-2 border-t border-white/10 pt-4">
     <h3 className="text-xs font-semibold">Relier une séance du Programme</h3>
     {sessions.slice(0,7).map(s=><button key={s.id} onClick={()=>linkProgramme(s.id)} className="w-full rounded-[5px] border border-white/15 p-2 text-left text-[11px] text-white/80 hover:bg-white/10">
       {s.title} · {s.date}<span className="block text-white/50">{s.programme}</span>
     </button>)}
   </section>}
   <p className="border-t border-white/10 pt-4 text-[11px] leading-relaxed text-white/55">Les droits d'auteur et de diffusion restent soumis aux autorisations. Aucune connexion à une plateforme commerciale ou au portail SACEM n'est activée.</p>
 </div>;
 return <StudioFrame title="Music · Radio & Label" subtitle="Artistes, événements, playlist, mix et production dans un seul espace" onBack={onBack}
   leftLabel="Univers musicaux" rightLabel="Événements et liens"
   actions={<button aria-label="Exporter les fiches du label" onClick={()=>saveStudioFile("pointzero-music.json",JSON.stringify(data,null,2))} className={studioButton}><Download size={15}/> Catalogue</button>}
   left={<div className="space-y-2 pb-20">
     <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold"><Radio size={18}/> STUDIO MUSIC</h2>
     {pages.map(p=><button aria-label={"Ouvrir "+p.name} aria-pressed={page===p.id} onClick={()=>setPage(p.id)} key={p.id}
       className={"flex min-h-11 w-full items-center gap-3 rounded-[5px] border px-3 text-left text-xs "+(page===p.id?"border-white bg-white font-semibold text-black":"border-white/15 text-white/85 hover:bg-white/10")}>
       <p.icon size={16}/>{p.name}<ChevronRight size={14} className="ml-auto opacity-50"/></button>)}
     <div className="border-t border-white/10 pt-4 text-[11px] leading-relaxed text-white/60">
       <p><strong className="text-white">{data.tracks.length}</strong> titres · <strong className="text-white">{data.artists.length}</strong> artistes · <strong className="text-white">{data.events.length}</strong> événements</p>
       <p className="mt-2">Le même catalogue alimente le label, les playlists et les programmes préparatoires.</p>
     </div>
   </div>}
   right={right}>
   <div className="mx-auto max-w-[1120px] space-y-5 pb-20">
    {page==="radio"&&<MusicRadioPanel tracks={playlist} fileURLs={files.current} assetVersion={assetsVersion} eventTitle={active?.title??"Catalogue local"} onAdd={importAudios}/>}
    {page==="master"&&<MusicMasterPanel/>}
    {page==="playlist"&&<>
      <div><p className="text-[11px] font-semibold uppercase tracking-widest text-white/55">INVITÉS · MOMENTS</p>
       <h2 className="mt-1 text-2xl font-semibold">La playlist se compose au fil des participations.</h2>
       <p className="mt-2 text-xs leading-relaxed text-white/60">Un titre proposé est enregistré une seule fois par moment. L'organisateur approuve les morceaux avant leur diffusion dans la radio.</p></div>
      <div className="grid gap-3 rounded-[8px] border border-white/15 bg-white/5 p-4 sm:grid-cols-2">
       <label className="text-xs text-white/70">Participant<input aria-label="Nom du participant musical" value={guest} onChange={e=>setGuest(clip(e.target.value,90))} className={studioInput+" mt-1"} placeholder="Prénom ou pseudo"/></label>
       <label className="text-xs text-white/70">Moment<select aria-label="Moment musical" value={moment} onChange={e=>setMoment(e.target.value as MusicMoment)} className={studioInput+" mt-1"}>
         {MUSIC_MOMENTS.map(m=><option value={m} key={m}>{m}</option>)}</select></label>
       <label className="text-xs text-white/70">Morceau<input aria-label="Titre demandé par l'invité" value={song} onChange={e=>setSong(clip(e.target.value,180))} className={studioInput+" mt-1"} placeholder="Titre"/></label>
       <label className="text-xs text-white/70">Artiste<input aria-label="Artiste demandé par l'invité" value={performer} onChange={e=>setPerformer(clip(e.target.value,180))} className={studioInput+" mt-1"} placeholder="Interprète"/></label>
       <div className="flex flex-wrap gap-2 sm:col-span-2">
         <button aria-label="Ajouter la proposition musicale" onClick={addChoice} className="inline-flex min-h-10 items-center gap-2 rounded-[5px] bg-white px-4 text-xs font-semibold text-black"><Plus size={14}/> Proposer</button>
         <button aria-label="Exporter une proposition invitée" onClick={exportGuest} className={studioButton}><Download size={14}/> Partager une proposition JSON</button>
         <button aria-label="Importer une proposition invitée" onClick={()=>importRequest.current?.click()} className={studioButton}><Upload size={14}/> Importer une réponse JSON</button>
       </div>
      </div>
      <div className="rounded-[8px] border border-white/15 p-4">
       <h3 className="text-sm font-semibold">{proposals.length} proposition(s) pour {active?.title??"l'événement"}</h3>
       {MUSIC_MOMENTS.map(m=>{
         const list=proposals.filter(r=>r.moment===m);if(!list.length)return null;
         return <div key={m} className="mt-4 space-y-2"><h4 className="text-[11px] font-semibold uppercase tracking-widest text-white/50">{m}</h4>
          {list.map(r=><div key={r.id} className="flex flex-wrap items-center gap-2 rounded-[5px] bg-white/5 p-3 text-xs">
            <div className="min-w-0 flex-1"><strong>{r.title}</strong> · {r.artistName}<p className="mt-1 text-[10px] text-white/50">{r.guestAlias||"Invité"} · {r.status==="approved"?"Approuvé":r.status==="rejected"?"Écarté":"En attente"}</p></div>
            <button aria-label={"Approuver "+r.title} aria-pressed={r.status==="approved"} onClick={()=>setRequestStatus(r.id,"approved")} className={studioButton+" !px-2"}><Check size={14}/></button>
            <button aria-label={"Écarter "+r.title} onClick={()=>setRequestStatus(r.id,"rejected")} className={studioButton+" !px-2"}>Écarter</button>
          </div>)}
         </div>;
       })}
       {!proposals.length&&<p className="mt-4 text-xs text-white/55">Les titres proposés par les participants apparaîtront ici.</p>}
      </div>
      <p className="text-[11px] leading-relaxed text-white/55">Cette première version est locale. Les comptes invités et la synchronisation entre appareils ne sont pas encore activés : les propositions JSON doivent être transférées manuellement. Une vraie playlist collaborative nécessitera une authentification et un serveur.</p>
    </>}
    {page==="label"&&<>
      <div><p className="text-[11px] font-semibold uppercase tracking-widest text-white/55">RÉPERTOIRE · LABEL</p><h2 className="mt-1 text-2xl font-semibold">Un titre, une fiche, plusieurs usages.</h2>
       <p className="mt-2 text-xs text-white/60">Préparez les données artistes et enregistrements comme dans un dossier de distribution, sans publication automatique.</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
       <div className="space-y-3 rounded-[8px] border border-white/15 bg-white/5 p-4">
         <h3 className="text-sm font-semibold">Artistes</h3>
         <input aria-label="Ajouter un artiste musical" className={studioInput} placeholder="Nom de l'artiste" value={artistName} onChange={e=>setArtistName(clip(e.target.value,150))}/>
         <button onClick={createArtist} className={studioButton}><Plus size={14}/> Enregistrer l'artiste</button>
         <select aria-label="Sélectionner un artiste musical" className={studioInput} value={artist?.id??""} onChange={e=>setArtistId(e.target.value)}>
           {!artist&&<option value="">Aucun artiste</option>}
           {data.artists.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
         </select>
         {artist&&<>
           <label className="block text-xs text-white/75">IPI / CAE<input aria-label="IPI de l'artiste musical" value={artist.ipi} onChange={e=>patchArtist("ipi",clip(e.target.value,60))} className={studioInput+" mt-1"}/></label>
           <label className="block text-xs text-white/75">Contact<input aria-label="Contact de l'artiste musical" value={artist.contact} onChange={e=>patchArtist("contact",clip(e.target.value,250))} className={studioInput+" mt-1"}/></label>
         </>}
       </div>
       <div className="space-y-3 rounded-[8px] border border-white/15 bg-white/5 p-4">
         <h3 className="text-sm font-semibold">Morceaux</h3>
         <input aria-label="Titre du morceau du label" className={studioInput} placeholder="Titre" value={newSong} onChange={e=>setNewSong(clip(e.target.value,180))}/>
         <input aria-label="Interprète du morceau du label" className={studioInput} placeholder="Artiste" value={newPerformer} onChange={e=>setNewPerformer(clip(e.target.value,180))}/>
         <button onClick={createTrack} className={studioButton}><Plus size={14}/> Enregistrer le morceau</button>
         <select aria-label="Fiche du morceau musical" className={studioInput} value={track?.id??""} onChange={e=>setTrackId(e.target.value)}>
           {!track&&<option value="">Aucun titre</option>}
           {data.tracks.map(t=><option key={t.id} value={t.id}>{t.artistName} · {t.title}</option>)}
         </select>
         <button onClick={()=>saveStudioFile("musique-catalogue-label.csv",labelCSV(data),"text/csv;charset=utf-8")} className={studioButton}><Download size={14}/> Export catalogue CSV</button>
       </div>
      </div>
      {track&&<section className="grid gap-3 rounded-[8px] border border-white/15 bg-white/5 p-4 sm:grid-cols-2">
        <h3 className="text-sm font-semibold sm:col-span-2">Fiche de « {track.title} »</h3>
        {([
          ["Titre","title"],["Artiste","artistName"],["Auteurs","authors"],["Compositeurs","composers"],
          ["ISRC (enregistrement)","isrc"],["ISWC (œuvre)","iswc"],["IPI / CAE","ipi"],["Genre","genre"],
          ["Label","label"],["Distributeur","distributor"],["Date de sortie","releaseDate"]
        ] as const).map(([label,key])=><label key={key} className="text-xs text-white/75">{label}<input aria-label={"Métadonnée "+label} type={key==="releaseDate"?"date":"text"}
          value={track[key]} onChange={e=>patchTrack(key,clip(e.target.value,key==="authors"||key==="composers"?500:180))} className={studioInput+" mt-1"}/></label>)}
        <label className="text-xs text-white/75">BPM manuel<input aria-label="BPM musical" type="number" min={0} max={300} value={track.bpm} onChange={e=>patchTrack("bpm",Math.max(0,Math.min(300,Number(e.target.value)||0)))} className={studioInput+" mt-1"}/></label>
        <label className="text-xs text-white/75">Droits d'utilisation
          <select aria-label="Droits musicaux" className={studioInput+" mt-1"} value={track.rights} onChange={e=>patchTrack("rights",e.target.value as MusicRight)}>
            <option value="unknown">À vérifier</option><option value="own">Droits sur l'enregistrement détenus</option><option value="licensed">Licence d'usage acquise</option>
          </select>
        </label>
        <div className="sm:col-span-2"><button aria-label="Associer un fichier audio à ce titre" onClick={()=>attachTrackFile.current?.click()} className={studioButton}><Upload size={14}/> Associer un fichier à « {track.title} »</button>
          <p className="mt-1 text-[11px] text-white/50">L'enregistrement reste dans ce navigateur pour cette session. Aucun transfert vers un serveur.</p></div>
      </section>}
      <p className="text-[11px] text-white/55">ISRC : identifiant d'enregistrement ; ISWC : œuvre. Ces champs et les dates sont préparatoires. Rien n'est envoyé à DistroKid ou aux plateformes de streaming.</p>
    </>}
    {page==="sacem"&&<>
      <div><p className="text-[11px] font-semibold uppercase tracking-widest text-white/55">SACEM · ÉVÉNEMENT</p>
        <h2 className="mt-1 text-2xl font-semibold">Préparer le programme sans ressaisir.</h2>
        <p className="mt-2 text-xs text-white/60">Les morceaux approuvés sont repris avec les auteurs, compositeurs et identifiants disponibles. Le programme des œuvres effectivement interprétées ou diffusées reste à confirmer.</p></div>
      <div className="rounded-[8px] border border-white/15 bg-white/5 p-4">
        <h3 className="text-sm font-semibold">{active?.title??"Aucun événement"}</h3>
        <p className="mt-2 text-xs text-white/65">{active?.date||"Date non définie"} · {active?.venue||"Lieu à renseigner"} · {approved.length} titres approuvés</p>
        <button aria-label="Exporter un programme SACEM préparatoire" disabled={!active||!approved.length} className={studioButton+" mt-4"} onClick={()=>active&&saveStudioFile(fileSafe(active.title)+"-sacem-a-verifier.csv",musicCSV(data,active.id),"text/csv;charset=utf-8")}><Download size={15}/> Programme CSV préparatoire</button>
      </div>
      <div className="overflow-x-auto rounded-[8px] border border-white/15 p-3">
        <table className="w-full min-w-[540px] text-left text-xs"><thead className="text-white/55"><tr><th className="p-2">Moment</th><th className="p-2">Titre et interprète</th><th className="p-2">Auteurs / compositeurs</th><th className="p-2">ISWC</th></tr></thead>
          <tbody>{approved.map(r=><tr key={r.id} className="border-t border-white/10"><td className="p-2">{r.moment}</td><td className="p-2">{r.title}<span className="block text-white/50">{r.artistName}</span></td><td className="p-2">{r.track?.authors||"À renseigner"} / {r.track?.composers||"À renseigner"}</td><td className="p-2">{r.track?.iswc||"À vérifier"}</td></tr>)}</tbody></table>
        {!approved.length&&<p className="p-4 text-xs text-white/55">Approuvez un morceau dans la playlist pour le voir ici.</p>}
      </div>
      <p className="text-xs leading-relaxed text-white/55">Ce CSV n'est ni une déclaration SACEM, ni une autorisation de diffusion, ni une confirmation des œuvres jouées. L'organisateur et les professionnels compétents doivent accomplir les formalités applicables.</p>
      <a href="https://clients.sacem.fr" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs underline">Accéder à l'espace SACEM <ChevronRight size={15}/></a>
    </>}
    {notice&&<p role="status" className="rounded-[6px] border border-white/20 bg-white/5 p-3 text-xs">{notice}</p>}
   </div>
   <input aria-label="Importer un fichier audio pour la fiche titre" className="sr-only" type="file" ref={attachTrackFile} accept="audio/*,.wav,.mp3,.flac,.ogg,.m4a" onChange={attachCurrentTrack}/>
   <input aria-label="Charger une proposition musicale JSON" className="sr-only" ref={importRequest} type="file" accept=".json,application/json" onChange={e=>void importGuestFile(e)}/>
 </StudioFrame>;
}
