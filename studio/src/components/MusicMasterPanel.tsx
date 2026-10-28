import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Download, Headphones, Sparkles, Upload } from "lucide-react";
import { studioButton, studioInput } from "./StudioFrame";
import { MASTER_PRESETS, masterLocal, type MasterPreset } from "../lib/musicMastering";
export default function MusicMasterPanel(){
 const picker=useRef<HTMLInputElement>(null),urls=useRef<string[]>([]);
 const [file,setFile]=useState<File|null>(null),[preset,setPreset]=useState<MasterPreset>("transparent"),[intensity,setIntensity]=useState(.65);
 const [busy,setBusy]=useState(false),[original,setOriginal]=useState(""),[rendered,setRendered]=useState(""),[status,setStatus]=useState("");
 const clear=()=>{for(const u of urls.current)URL.revokeObjectURL(u);urls.current=[];setOriginal("");setRendered("");};
 useEffect(()=>()=>{for(const u of urls.current)URL.revokeObjectURL(u);},[]);
 const pick=(e:ChangeEvent<HTMLInputElement>)=>{const next=e.target.files?.[0]??null;e.target.value="";if(next){clear();setFile(next);}};
 const process=async()=>{
   if(!file)return;
   setBusy(true);setStatus("Traitement local en cours…");
   try{
     const result=await masterLocal(file,{preset,intensity});clear();
     const a=URL.createObjectURL(file),b=URL.createObjectURL(result.blob);
     urls.current=[a,b];setOriginal(a);setRendered(b);setStatus("Pré-master WAV disponible. "+result.peakNote);
   }catch(e){setStatus(e instanceof Error?e.message:"Traitement indisponible.");}
   finally{setBusy(false);}
 };
 return <div className="mx-auto max-w-[1000px] space-y-5">
   <div><p className="text-[11px] font-semibold uppercase tracking-widest text-white/55">Pré-mastering indépendant</p>
    <h2 className="mt-1 text-2xl font-semibold">Finaliser un morceau, avant sa sortie.</h2>
    <p className="mt-2 text-xs leading-relaxed text-white/65">Égalisation, compression douce et normalisation de crête. Le navigateur traite localement un fichier qui vous appartient ou que vous êtes autorisé à exploiter.</p></div>
   <div className="grid gap-5 rounded-[9px] border border-white/15 bg-white/5 p-5 sm:grid-cols-2">
     <div className="flex flex-col gap-3">
       <div className="grid aspect-[4/3] place-items-center rounded-[8px] bg-gradient-to-br from-[#554374] to-[#121b2d]"><Headphones size={68} className="text-white/75"/></div>
       <button onClick={()=>picker.current?.click()} className={studioButton}><Upload size={15}/> {file?"Changer l'original":"Choisir une piste audio"}</button>
       {file&&<p className="break-all text-xs text-white/60">{file.name} · {(file.size/1024/1024).toFixed(1)} Mo</p>}
     </div>
     <div className="space-y-5">
       <label className="block text-xs text-white/75">Type de rendu
         <select aria-label="Profil de pré-master" className={studioInput+" mt-2"} value={preset} onChange={e=>setPreset(e.target.value as MasterPreset)}>
           {MASTER_PRESETS.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
         </select>
       </label>
       <p className="text-[11px] text-white/55">{MASTER_PRESETS.find(p=>p.id===preset)?.description}</p>
       <label className="block text-xs text-white/75">Intensité : {Math.round(intensity*100)} %
         <input aria-label="Intensité du traitement audio" className="mt-3 w-full accent-white" type="range" min={0} max={1} step={.05} value={intensity} onChange={e=>setIntensity(Number(e.target.value))}/>
       </label>
       <button onClick={()=>void process()} disabled={busy||!file} className="flex min-h-11 items-center gap-2 rounded-[5px] bg-white px-4 text-xs font-semibold text-black disabled:opacity-35"><Sparkles size={15}/>{busy?"Traitement…":"Créer un pré-master WAV"}</button>
       <p className="text-[11px] text-white/55">4 minutes et 42 Mo maximum. WAV 16 bits, 44,1 kHz. Ce traitement ne garantit ni cible LUFS, ni True Peak, ni validation de diffusion.</p>
     </div>
   </div>
   {rendered&&<section aria-label="Comparaison des versions audio" className="space-y-4 rounded-[8px] border border-[#70d4b0]/30 bg-[#18382c]/30 p-4">
     <h3 className="text-sm font-semibold">Avant / après</h3>
     <div className="grid gap-3 sm:grid-cols-2"><div><p className="mb-2 text-xs">Original</p><audio controls src={original} className="w-full" aria-label="Écouter l'original"/></div>
       <div><p className="mb-2 text-xs">Pré-master</p><audio controls src={rendered} className="w-full" aria-label="Écouter le pré-master"/></div></div>
     <a className="inline-flex min-h-10 items-center gap-2 rounded-[5px] bg-white px-4 text-xs font-semibold text-black" download="pointzero-premaster.wav" href={rendered}><Download size={15}/> Télécharger le fichier WAV</a>
   </section>}
   {status&&<p role="status" className="rounded-[5px] border border-white/15 p-3 text-xs text-white/80">{status}</p>}
   <input type="file" accept="audio/*,.wav,.mp3,.ogg,.aiff,.flac" ref={picker} aria-label="Importer une piste à pré-masteriser" className="sr-only" onChange={pick}/>
 </div>;
}
