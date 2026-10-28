import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Disc3, FileAudio, Pause, Play, Radio, SkipForward, Upload } from "lucide-react";
import { studioButton } from "./StudioFrame";
import { MusicRadio } from "../lib/musicRadio";
import type { MusicTrack } from "../lib/musicLabelCore";
interface Props {tracks:MusicTrack[];fileURLs:Map<string,string>;assetVersion:number;onAdd:(files:File[])=>void;eventTitle:string}
export default function MusicRadioPanel({tracks,fileURLs,assetVersion,onAdd,eventTitle}:Props){
 const radio=useRef<MusicRadio|null>(null);
 const picker=useRef<HTMLInputElement>(null);
 const [playing,setPlaying]=useState(false),[current,setCurrent]=useState(""),[seconds,setSeconds]=useState(0),[status,setStatus]=useState("");
 const [fade,setFade]=useState(6),[sync,setSync]=useState(true);
 if(!radio.current)radio.current=new MusicRadio();
 useEffect(()=>{
   const r=radio.current!;
   r.setStateListener(v=>{setPlaying(v.playing);setCurrent(v.trackId);setSeconds(v.seconds);if(v.status)setStatus(v.status);});
   return ()=>r.dispose();
 },[]);
 useEffect(()=>{radio.current?.setSources(tracks,fileURLs);},[tracks,fileURLs,assetVersion]);
 useEffect(()=>{if(radio.current){radio.current.fadeSeconds=fade;radio.current.matchBPM=sync;}},[fade,sync]);
 const available=useMemo(()=>tracks.filter(t=>fileURLs.has(t.id)),[tracks,fileURLs,assetVersion]);
 const start=async(index=0)=>{try{await radio.current?.start(index);}catch{setStatus("Lecture impossible. Sélectionnez un fichier local pris en charge.");}};
 const receive=(e:ChangeEvent<HTMLInputElement>)=>{const files=[...e.target.files??[]];e.target.value="";if(files.length)onAdd(files.slice(0,15));};
 const now=tracks.find(t=>t.id===current);
 return <div className="space-y-5">
  <div><p className="text-[11px] font-semibold uppercase tracking-widest text-white/55">Radio · Mix</p><h2 className="mt-1 text-2xl font-semibold">Une playlist qui prend vie.</h2>
   <p className="mt-2 text-xs leading-relaxed text-white/60">Les titres approuvés pour l'événement se retrouvent ici. Pour les écouter et les mixer, importez vos propres fichiers audio ou des fichiers autorisés.</p></div>
  <section className="rounded-[12px] border border-white/15 bg-gradient-to-br from-[#362d52] via-[#202036] to-[#0e151b] p-5 sm:p-8">
   <div className="flex flex-wrap items-center gap-6">
    <div className="grid size-[145px] shrink-0 place-items-center rounded-[14px] border border-white/10 bg-[#47406e] shadow-[0_12px_45px_#0005]"><Disc3 size={75} className={playing?"animate-[spin_5s_linear_infinite] text-[#d9c7fa]":"text-[#d9c7fa]"}/></div>
    <div className="min-w-0 flex-1">
     <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#8beac5]"><Radio size={16}/> RADIO · LOCALE</div>
     <h3 className="mt-4 truncate text-[clamp(18px,3vw,29px)] font-semibold">{now?.title??"La musique commence ici."}</h3>
     <p className="mt-1 truncate text-sm text-white/65">{now?.artistName??eventTitle}</p>
     <div className="mt-5 flex flex-wrap items-center gap-2">
      <button aria-label={playing?"Arrêter la radio":"Démarrer la radio"} className="flex min-h-11 items-center gap-2 rounded-[5px] bg-white px-4 text-sm font-semibold text-black disabled:opacity-40"
       onClick={()=>playing?radio.current?.stop():void start(0)} disabled={!available.length}>{playing?<Pause size={17}/>:<Play size={17}/>} {playing?"Arrêter":"Écouter"}</button>
      <button aria-label="Mixer le morceau suivant" onClick={()=>void radio.current?.mixNext()} disabled={!playing||available.length<2} className={studioButton}><SkipForward size={16}/> Mixer suivant</button>
      <span className="font-mono text-xs text-white/60">{Math.floor(seconds/60)}:{String(Math.floor(seconds%60)).padStart(2,"0")}</span>
     </div>
    </div>
   </div>
  </section>
  <div className="grid gap-3 rounded-[8px] border border-white/15 p-4 sm:grid-cols-2">
   <label className="text-xs text-white/75">Fondu enchaîné : {fade} secondes
    <input aria-label="Durée du fondu DJ" className="mt-3 w-full accent-white" type="range" min={2} max={12} value={fade} onChange={e=>setFade(Number(e.target.value))}/>
   </label>
   <label className="flex items-center gap-2 text-xs text-white/75">
    <input type="checkbox" aria-label="Alignement approximatif du tempo" checked={sync} onChange={e=>setSync(e.target.checked)} className="accent-white"/>
    Ajuster le BPM renseigné (±6 % maximum)
   </label>
   <p className="text-[11px] leading-relaxed text-white/55 sm:col-span-2">Fondu à puissance constante. Le tempo est saisi manuellement dans le Label : ce premier moteur n'analyse pas les transitoires et ne garantit pas un calage beat-perfect.</p>
  </div>
  <section className="rounded-[8px] border border-white/15 p-4">
   <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-semibold">À l'antenne · {eventTitle}</h3>
    <button onClick={()=>picker.current?.click()} className={studioButton}><Upload size={14}/> Importer mes audios</button></div>
   <div className="space-y-1.5">{tracks.map((t,i)=><div key={t.id+"-"+i} className={"flex flex-wrap items-center gap-3 rounded-[5px] px-3 py-2 text-xs "+(current===t.id?"bg-white/15":"bg-white/5")}>
     <span className="font-mono text-white/50">{i+1}</span><div className="min-w-0 flex-1"><strong>{t.title}</strong><span className="ml-2 text-white/55">{t.artistName}</span></div>
     <span className="text-[10px] text-white/50">{t.bpm?t.bpm+" BPM":"BPM ?"}</span>
     <button aria-label={"Écouter "+t.title} className={studioButton+" !px-2"} disabled={!fileURLs.has(t.id)} onClick={()=>void start(available.findIndex(v=>v.id===t.id))}><Play size={14}/></button>
   </div>)}
   {!tracks.length&&<p className="rounded-[6px] border border-dashed border-white/15 p-7 text-center text-xs text-white/55">Aucun titre approuvé. Ajoutez vos propositions dans « Playlist & invités ».</p>}
   </div>
  </section>
  <p className="flex items-start gap-2 text-[11px] text-white/55"><FileAudio size={15} className="shrink-0"/>Les fichiers audio ne sont pas téléchargés vers le serveur et doivent être réimportés à chaque session. Une fiche musicale persistante n'est pas un droit de diffusion.</p>
  {status&&<p role="status" className="rounded-[5px] border border-white/15 bg-white/5 p-3 text-xs">{status}</p>}
  <input aria-label="Choisir les fichiers audio de la radio" ref={picker} type="file" multiple accept="audio/*,.wav,.flac,.mp3,.m4a,.ogg" onChange={receive} className="sr-only"/>
 </div>;
}
