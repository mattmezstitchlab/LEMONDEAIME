import {writeStoredJSON} from "../lib/storageSafety";
import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from "react";
import { Accessibility, Download, Mic, Music2, Pause, Play, Plus, RotateCcw, Save, SkipBack, Sparkles, Trash2, Upload, Users, Volume2, VolumeX } from "lucide-react";
import { StudioFrame, saveStudioFile, studioButton, studioInput } from "./StudioFrame";
import { MusicAudio } from "../lib/musicStudioAudio";
import { BASE_FLOSS } from "../lib/dmc";
import { ART_DMC_FAVORITES } from "../lib/artWorldCore";
import {
  colorFor, emptyMusicScore, EMOTIONS, formatMusicTime, GESTURES, intentionGesture, makeMusicNote,
  makeMusicScore, MUSIC_KEY, MUSIC_SECONDS, musicToMidi, safeMusicScore, snapMusicTime,
  type Emotion, type Gesture, type MusicAudience, type MusicNote, type MusicScore
} from "../lib/musicStudioCore";

const VBW=960,VBH=460;
const laneY=[125,235,350] as const;
const safeLoad=():MusicScore=>{try{return safeMusicScore(JSON.parse(localStorage.getItem(MUSIC_KEY)??"null"))??makeMusicScore();}catch{return makeMusicScore();}};
const timeToX=(t:number)=>18+(t/MUSIC_SECONDS)*(VBW-36);
const xToTime=(x:number)=>snapMusicTime((x-18)/(VBW-36)*MUSIC_SECONDS);
const stepButtons="min-h-9 rounded-[5px] border border-white/20 px-3 text-xs text-white/85 hover:bg-white/10 disabled:opacity-35";
function GestureShape({note,selected,onSelect}:{note:MusicNote;selected:boolean;onSelect:(id:string)=>void}){
  const x=timeToX(note.time),y=laneY[note.pitch],c=(note.dmcCode?BASE_FLOSS.find(f=>f.code===note.dmcCode)?.hex:undefined)??colorFor(note.emotion),big=note.gesture==="circle"?24:note.gesture==="point"?8:16;
  const backdrop=<circle cx={x} cy={y} r={big+13} fill={c} opacity=".12"/>;
  const shape=(()=>{
    switch(note.gesture){
      case "point":case "circle":return <><circle cx={x} cy={y} r={big} fill={c} stroke="#ffffff" strokeWidth="2"/><circle cx={x-big/3} cy={y-big/3} r={Math.max(2,big*.27)} fill="#fff" opacity=".55"/></>;
      case "square":return <rect x={x-16} y={y-16} width="32" height="32" rx="5" fill={c}/>;
      case "star":return <text x={x} y={y+14} fontSize="45" textAnchor="middle" fill={c}>✦</text>;
      case "group":return <><circle cx={x-10} cy={y} r="10" fill={c}/><circle cx={x+11} cy={y+4} r="9" fill={c} opacity=".8"/><circle cx={x} cy={y-14} r="10" fill={c} opacity=".9"/></>;
      case "wave":return <path d={"M "+(x-42)+" "+y+" q 20 -25 42 0 t 42 0"} fill="none" stroke={c} strokeWidth="9" strokeLinecap="round"/>;
      case "line":return <path d={"M "+(x-34)+" "+(y+20)+" L "+(x+34)+" "+(y-20)} fill="none" stroke={c} strokeWidth="6" strokeLinecap="round"/>;
      case "text":return <><rect x={x-38} y={y-19} width="76" height="36" rx="6" fill={c} opacity=".22"/><text x={x} y={y+5} fontSize="15" textAnchor="middle" fill="#18181b">{(note.label||"Texte").slice(0,9)}</text></>;
    }
  })();
  return <g data-music-note={note.id} role="button" tabIndex={0} aria-label={GESTURES.find(g=>g.id===note.gesture)?.label+" · "+note.emotion+" · "+formatMusicTime(note.time)}
    className="cursor-grab focus:outline-none focus:ring-2" opacity={.98} onClick={()=>onSelect(note.id)}
    onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onSelect(note.id);}}}>
    {backdrop}{selected&&<circle cx={x} cy={y} r={big+18} fill="none" stroke="#6d5bca" strokeWidth="3" strokeDasharray="5 4"/>}
    {shape}
    <circle cx={x} cy={y} r="43" fill="transparent"/>
    <title>{note.gesture+" · "+note.emotion+" · "+formatMusicTime(note.time)}</title>
  </g>;
}
interface Props {onBack:()=>void}
export default function MusicStudio({onBack}:Props){
  const [score,setScore]=useState<MusicScore>(safeLoad);
  const [activeGesture,setActiveGesture]=useState<Gesture>("point");
  const [emotion,setEmotion]=useState<Emotion>("Sérénité");
  const [position,setPosition]=useState(0);
  const [playing,setPlaying]=useState(true);
  const [soundActive,setSoundActive]=useState(true);
  const [audioOn,setAudioOn]=useState(false);
  const [dmcCode,setDmcCode]=useState<string|null>(null);
  const [dmcSearch,setDmcSearch]=useState("");
  const [selected,setSelected]=useState<string|null>(null);
  const [intention,setIntention]=useState("");
  const [participant,setParticipant]=useState("");
  const [large,setLarge]=useState(false);
  const [contrast,setContrast]=useState(false);
  const [quiet,setQuiet]=useState(false);
  const [status,setStatus]=useState("");
  const [voiceUrl,setVoiceUrl]=useState("");
  const [recording,setRecording]=useState(false);
  const jsonInput=useRef<HTMLInputElement>(null);
  const svgRef=useRef<SVGSVGElement>(null);
  const audioRef=useRef<MusicAudio|null>(null);
  const tick=useRef<number|null>(null);
  const drag=useRef<string|null>(null);
  const media=useRef<MediaRecorder|null>(null);
  const micStream=useRef<MediaStream|null>(null);
  const voiceRef=useRef("");
  const positionRef=useRef(0);
  const playingRef=useRef(true);
  const lastAt=useRef(0);
  const scoreRef=useRef(score);
  const soundRef=useRef(true);
  if(!audioRef.current)audioRef.current=new MusicAudio();
  useEffect(()=>{try{writeStoredJSON(MUSIC_KEY,JSON.stringify(score),safeMusicScore);}catch{setStatus("Stockage saturé. Exportez votre partition JSON.");}},[score]);
  useEffect(()=>{voiceRef.current=voiceUrl;},[voiceUrl]);
  useEffect(()=>{scoreRef.current=score;},[score]);
  useEffect(()=>{soundRef.current=soundActive;if(!soundActive)audioRef.current?.stopVoices();},[soundActive]);
  useEffect(()=>{playingRef.current=playing;lastAt.current=performance.now();},[playing]);
  // Visual transport starts on mount, without bypassing browser audio autoplay restrictions.
  useEffect(()=>{
    lastAt.current=performance.now();
    tick.current=window.setInterval(()=>{
      const now=performance.now(),delta=Math.max(0,(now-lastAt.current)/1000);
      lastAt.current=now;
      if(!playingRef.current)return;
      const old=positionRef.current;
      const next=(old+delta)%MUSIC_SECONDS;
      if(next<old)audioRef.current?.nextLap();
      positionRef.current=next;
      setPosition(next);
      if(soundRef.current&&audioRef.current?.soundEnabled)
        audioRef.current.queue(scoreRef.current,next);
    },60);
    return ()=>{if(tick.current!==null)window.clearInterval(tick.current);tick.current=null;};
  },[]);
  useEffect(()=>()=>{
    if(tick.current!==null)window.clearInterval(tick.current);
    audioRef.current?.dispose();
    if(media.current?.state==="recording")media.current.stop();
    micStream.current?.getTracks().forEach(track=>track.stop());
    if(voiceRef.current)URL.revokeObjectURL(voiceRef.current);
  },[]);
  const stop=()=>{playingRef.current=false;setPlaying(false);audioRef.current?.stopVoices();};
  const updateScore=(patch:Partial<MusicScore>)=>{setScore(s=>({...s,...patch}));};
  const updateNotes=(fn:(notes:MusicNote[])=>MusicNote[])=>{
    setScore(s=>({...s,notes:fn(s.notes)}));
  };
  const current=score.notes.find(n=>n.id===selected)??null;
  const dmcList=(dmcSearch.trim()?
    BASE_FLOSS.filter(f=>f.code.toLowerCase().includes(dmcSearch.trim().toLowerCase())||f.name.toLowerCase().includes(dmcSearch.trim().toLowerCase())).slice(0,35):
    ART_DMC_FAVORITES.map(code=>BASE_FLOSS.find(f=>f.code===code)).filter((f):f is typeof BASE_FLOSS[number]=>!!f));
  const preview=async(note:MusicNote)=>{
    if(!soundRef.current||note.gesture==="text")return;
    try{await audioRef.current?.preview(note);setAudioOn(true);}
    catch(e){setStatus(e instanceof Error?e.message:"Son indisponible. Le dessin reste possible.");}
  };
  const chooseDMC=async(code:string)=>{
    setDmcCode(code);
    if(current)updateNotes(notes=>notes.map(n=>n.id===current.id?{...n,dmcCode:code}:n));
    if(!soundRef.current)return;
    try{await audioRef.current?.previewDMC(code);setAudioOn(true);}
    catch(e){setStatus(e instanceof Error?e.message:"Aperçu DMC indisponible.");}
  };
  const play=async()=>{
    if(playing){stop();return;}
    try{
      if(soundRef.current){await audioRef.current!.activate();setAudioOn(true);}
      setPlaying(true);playingRef.current=true;lastAt.current=performance.now();
      setStatus("Lecture continue, en boucle. Le son est actif après votre interaction.");
    }catch(e){setStatus(e instanceof Error?e.message:"Lecture audio indisponible.");setPlaying(false);}
  };
  const seek=(p:number)=>{positionRef.current=p%MUSIC_SECONDS;setPosition(positionRef.current);lastAt.current=performance.now();audioRef.current?.stopVoices();};
  const addNote=(gesture:Gesture,time:number,pitch:0|1|2,fromText="")=>{
    if(score.notes.length>=150){setStatus("La partition est limitée à 150 gestes.");return;}
    const n={...makeMusicNote(gesture,time,pitch,emotion,participant,fromText),...(dmcCode?{dmcCode}:{})};
    updateNotes(notes=>[...notes,n]);setSelected(n.id);
    void preview(n);
  };
  const pt=(e:ReactPointerEvent<SVGSVGElement>)=>{
    const box=e.currentTarget.getBoundingClientRect();
    const x=(e.clientX-box.left)/Math.max(1,box.width)*VBW;
    const y=(e.clientY-box.top)/Math.max(1,box.height)*VBH;
    const pitch=(y<180?0:y<294?1:2) as 0|1|2;
    return {x,y,pitch,time:xToTime(x)};
  };
  const pointerDown=(e:ReactPointerEvent<SVGSVGElement>)=>{
    if(e.button!==0)return;
    const target=e.target as Element;
    const element=target.closest("[data-music-note]");const id=element?.getAttribute("data-music-note");
    if(id){setSelected(id);drag.current=id;e.currentTarget.setPointerCapture?.(e.pointerId);const existing=score.notes.find(n=>n.id===id);if(existing)void preview(existing);return;}
    const point=pt(e);addNote(activeGesture,point.time,point.pitch,intention.trim().slice(0,100));
  };
  const pointerMove=(e:ReactPointerEvent<SVGSVGElement>)=>{
    if(!drag.current)return;
    const point=pt(e),id=drag.current;
    updateNotes(notes=>notes.map(n=>n.id===id?{...n,time:point.time,pitch:point.pitch}:n));
  };
  const pointerUp=(e:ReactPointerEvent<SVGSVGElement>)=>{
    if(drag.current){drag.current=null;try{e.currentTarget.releasePointerCapture(e.pointerId);}catch{/* uncaptured */}}
  };
  const transform=()=>{
    if(!intention.trim()){setStatus("Écrivez une intention avant de la transformer.");return;}
    if(score.notes.length>=150)return;
    const candidate=intentionGesture(intention,emotion,position,participant);
    updateNotes(notes=>[...notes,candidate]);setSelected(candidate.id);void preview(candidate);
    setStatus("LUMI a proposé un geste par une règle locale. Vous pouvez le déplacer, modifier ou supprimer.");
  };
  const saveJson=()=>saveStudioFile("pointzero-partition.json",JSON.stringify(score,null,2));
  const exportMidi=()=>{
    const bytes=musicToMidi(score);
    const blob=new Blob([new Uint8Array(bytes)],{type:"audio/midi"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download="pointzero-orchestre.mid";document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),500);
    setStatus("MIDI exporté : toutes les notes sont enregistrées sans voix humaine ni diffusion en ligne.");
  };
  const importJson=async(e:ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0];e.target.value="";if(!file)return;
    if(file.size>1000000){setStatus("Fichier JSON trop volumineux.");return;}
    try{
      const parsed=safeMusicScore(JSON.parse(await file.text()));
      if(!parsed)throw Error("Format de partition non reconnu.");
      audioRef.current?.stopVoices();seek(0);setScore(parsed);setSelected(null);setStatus("Partition importée dans ce navigateur.");
    }catch(e){setStatus(e instanceof Error?e.message:"Import impossible.");}
  };
  const newScore=()=>{if(!window.confirm("Créer une partition vierge ? Exportez le projet actuel avant de le remplacer."))return;
    audioRef.current?.stopVoices();seek(0);setScore(emptyMusicScore());setSelected(null);};
  const resetDemo=()=>{if(!window.confirm("Charger la partition de démonstration et remplacer le projet en cours ?"))return;
    audioRef.current?.stopVoices();seek(0);setScore(makeMusicScore());setSelected(null);};
  const record=async()=>{
    if(recording){media.current?.stop();setRecording(false);micStream.current?.getTracks().forEach(t=>t.stop());return;}
    try{
      if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined")throw Error("Enregistrement du microphone indisponible.");
      const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
      micStream.current=stream;
      const recorder=new MediaRecorder(stream),parts:Blob[]=[];
      media.current=recorder;recorder.ondataavailable=event=>{if(event.data.size)parts.push(event.data);};
      recorder.onstop=()=>{
        const blob=new Blob(parts,{type:recorder.mimeType||"audio/webm"});
        if(voiceRef.current)URL.revokeObjectURL(voiceRef.current);
        const url=URL.createObjectURL(blob);voiceRef.current=url;setVoiceUrl(url);
        stream.getTracks().forEach(t=>t.stop());
        setStatus("Voix enregistrée localement dans cette session, non ajoutée automatiquement à la partition.");
      };
      recorder.start();setRecording(true);setStatus("Enregistrement local en cours. Arrêtez-le pour réécouter.");
    }catch(e){setStatus(e instanceof Error?e.message:"Microphone refusé.");setRecording(false);}
  };
  const actions=<div className="flex gap-1">
    <button onClick={newScore} title="Nouvelle partition" aria-label="Nouvelle partition" className={studioButton+" !px-2"}><Plus size={16}/></button>
    <button onClick={()=>jsonInput.current?.click()} title="Importer un projet" aria-label="Importer une partition" className={studioButton+" !px-2"}><Upload size={16}/></button>
    <button onClick={saveJson} title="Sauvegarder en JSON" aria-label="Exporter la partition JSON" className={studioButton+" !px-2"}><Save size={16}/></button>
    <button onClick={exportMidi} title="Exporter en MIDI" aria-label="Exporter la partition MIDI" className="inline-flex min-h-9 items-center gap-1.5 rounded-[5px] bg-white px-3 text-xs font-semibold text-black"><Download size={15}/> MIDI</button>
  </div>;
  const filtered=score.audience==="decouverte"?GESTURES.filter(g=>["point","circle","square","wave","text"].includes(g.id)):GESTURES;
  return <StudioFrame title="Musique inclusive" subtitle="Créer ensemble, par des formes, des couleurs et des sons"
    onBack={()=>{stop();onBack();}} leftLabel="Gestes et participants" rightLabel="LUMI et accessibilité" actions={actions}
    left={<div className="pb-28">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Music2 size={17}/> Mon geste</h2>
      <div className="grid grid-cols-1 gap-1.5" aria-label="Choix des gestes musicaux">
        {filtered.map(g=><button type="button" key={g.id} aria-pressed={activeGesture===g.id} onClick={()=>setActiveGesture(g.id)}
          className={"flex min-h-[48px] items-center gap-3 rounded-[5px] border px-3 text-left "+(activeGesture===g.id?"border-white bg-white text-black":"border-white/15 text-white/85 hover:bg-white/10")}>
          <span aria-hidden="true" className="w-7 text-center text-xl font-semibold">{g.symbol}</span>
          <span><span className="block text-xs font-semibold">{g.label}</span><span className={"block text-[10px] "+(activeGesture===g.id?"text-black/65":"text-white/55")}>{g.description}</span></span>
        </button>)}
      </div>
      <div className="mt-5 border-t border-white/15 pt-4">
        <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold"><Users size={14}/> Pour toutes les générations</h3>
        <div className="space-y-2">{([["ensemble","Ensemble","Tous les gestes"],["decouverte","Découverte","Gestes essentiels"],["transmission","Transmission","Créer à partir d’un souvenir"]] as const).map(([id,label,detail])=>
          <button key={id} aria-pressed={score.audience===id} onClick={()=>updateScore({audience:id as MusicAudience})}
            className={"block w-full rounded-[5px] border px-3 py-2.5 text-left text-xs "+(score.audience===id?"border-white bg-white/15":"border-white/15 hover:bg-white/10")}>
            <span className="block font-semibold">{label}</span><span className="mt-0.5 block text-[10px] text-white/60">{detail}</span>
          </button>)}</div>
        <label className="mt-3 block text-[11px] text-white/70">Prénom ou pseudonyme (facultatif)
          <input aria-label="Participant à la partition" className={studioInput+" mt-1"} value={participant} maxLength={70} onChange={e=>setParticipant(e.target.value)}/>
        </label>
        <button type="button" aria-label="Ajouter un geste musical au curseur" onClick={()=>addNote(activeGesture,position,1)} className={studioButton+" mt-3 w-full"}>
          <Plus size={15}/> Ajouter au curseur (sans glisser)
        </button>
      </div>
      <div className="mt-5 flex flex-wrap gap-2 border-t border-white/15 pt-4">
        <button onClick={resetDemo} className={studioButton}><RotateCcw size={15}/> Exemple</button>
        <button onClick={()=>{if(score.notes.length&&window.confirm("Effacer tous les gestes de cette partition ?"))updateScore({notes:[]});setSelected(null);}} className={studioButton}><Trash2 size={15}/> Effacer</button>
      </div>
    </div>}
    right={<div className="pb-28">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold"><Sparkles size={17}/> LUMI</h2>
      <p className="mb-3 text-[11px] text-white/60">Guide de création doux. Suggestions locales, modifiables, sans intelligence artificielle distante.</p>
      <div className="rounded-[5px] border border-white/15 bg-[#1b1b1e] p-3 text-xs leading-relaxed">
        <span className="font-medium">Bonjour !</span><p className="mt-1 text-white/70">Quelle émotion ou quel souvenir voulez-vous partager en musique ?</p>
      </div>
      <label className="mt-4 block text-[11px] text-white/70">Votre intention
        <textarea aria-label="Intention musicale" rows={5} maxLength={300} value={intention} onChange={e=>setIntention(e.target.value)}
          placeholder="Je pense à ma grand-mère, à sa douceur et sa lumière…"
          className={studioInput+" mt-1 resize-y"}/>
      </label>
      <button type="button" onClick={transform} className="mt-2 flex min-h-10 w-full items-center justify-center gap-2 rounded-[5px] bg-white text-xs font-semibold text-black">
        <Sparkles size={16}/> Transformer en geste
      </button>
      {current&&<section aria-label="Propriétés du geste choisi" className="mt-5 border-t border-white/15 pt-4">
        <div className="flex items-center justify-between"><h3 className="text-xs font-semibold">Geste sélectionné</h3><button aria-label="Supprimer le geste sélectionné" onClick={()=>{updateNotes(list=>list.filter(n=>n.id!==selected));setSelected(null);}} className="text-white/75"><Trash2 size={15}/></button></div>
        <p className="mt-1 text-[11px] text-white/60">{formatMusicTime(current.time)} · {current.author||"Anonyme"}</p>
        <label className="mt-3 block text-[11px] text-white/70">Type de geste
          <select aria-label="Type du geste choisi" className={studioInput+" mt-1"} value={current.gesture} onChange={e=>updateNotes(list=>list.map(n=>n.id===current.id?{...n,gesture:e.target.value as Gesture}:n))}>
            {GESTURES.map(g=><option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
        </label>
        <label className="mt-3 block text-[11px] text-white/70">Intensité
          <input aria-label="Intensité du geste" type="range" min={10} max={100} step={5} value={Math.round(current.intensity*100)}
            onChange={e=>updateNotes(list=>list.map(n=>n.id===current.id?{...n,intensity:Number(e.target.value)/100}:n))} className="mt-2 w-full accent-white"/>
        </label>
        <label className="mt-3 block text-[11px] text-white/70">Texte / souvenir
          <input aria-label="Texte du geste" className={studioInput+" mt-1"} value={current.label} maxLength={120} onChange={e=>updateNotes(list=>list.map(n=>n.id===current.id?{...n,label:e.target.value}:n))}/>
        </label>
      </section>}
      <section className="mt-5 border-t border-white/15 pt-4">
        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold"><Accessibility size={16}/> Accessibilité</h3>
        <div className="space-y-3 text-xs">{[
          ["Grandes commandes",large,setLarge],
          ["Contraste renforcé",contrast,setContrast],
          ["Limiter les animations",quiet,setQuiet]
        ].map(([title,checked,setter])=><label key={title as string} className="flex items-center justify-between gap-2 text-white/75">
          <span>{title as string}</span>
          <input type="checkbox" checked={checked as boolean} onChange={e=>(setter as (v:boolean)=>void)(e.target.checked)} className="size-4 accent-white"/>
        </label>)}</div>
        <p className="mt-3 text-[11px] text-white/55">Les gestes se distinguent par leur forme et leur couleur. L’ajout au curseur fonctionne aussi sans glisser-déposer.</p>
      </section>
      <section className="mt-5 border-t border-white/15 pt-4">
        <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold"><Mic size={15}/> Votre voix</h3>
        <button type="button" onClick={()=>void record()} className={studioButton+" w-full"}>
          <Mic size={15}/>{recording?"Arrêter l’enregistrement":"Enregistrer une voix"}
        </button>
        {voiceUrl&&<div className="mt-2 space-y-2">
          <audio aria-label="Écouter la voix enregistrée" controls src={voiceUrl} className="max-w-full"/>
          <a href={voiceUrl} download="pointzero-ma-voix.webm" className="block text-xs underline">Exporter mon enregistrement</a>
        </div>}
        <p className="mt-2 text-[11px] text-white/55">Microphone sur autorisation. Audio conservé uniquement dans cette session, non ajouté à la partition et non transmis.</p>
      </section>
    </div>}
  >
    <div className={"mx-auto max-w-[1320px] pb-32 "+(large?" text-[16px]":"")+(quiet?" [&_*]:!animate-none [&_*]:!transition-none":"")}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-white/65">Partition sensible · expérience locale</p>
          <input aria-label="Titre de la partition" maxLength={150} value={score.title} onChange={e=>updateScore({title:e.target.value})}
            className="mt-1 min-w-0 max-w-full bg-transparent text-xl font-semibold text-white outline-none focus:border-b focus:border-white"/>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>seek(0)} aria-label="Revenir au début" className={stepButtons}><SkipBack size={16}/></button>
          <button onClick={()=>void play()} aria-label={playing?"Mettre en pause":"Lire la partition"} className="flex min-h-10 items-center gap-2 rounded-[5px] bg-white px-4 text-sm font-semibold text-black">
            {playing?<Pause size={16}/>:<Play size={16}/>} {playing?"Pause":"Reprendre"}
          </button>
          <span className="min-w-[72px] font-mono text-xs text-white/70">{formatMusicTime(position)} / 3:45</span>
          <button type="button" aria-label={soundActive?"Couper le son musical":"Activer le son musical"} aria-pressed={soundActive}
            onClick={()=>{const next=!soundActive;soundRef.current=next;setSoundActive(next);if(!next)audioRef.current?.stopVoices();else void audioRef.current?.activate().then(()=>setAudioOn(true)).catch(()=>setStatus("Audio indisponible."));}}
            className={stepButtons+" !px-2"} title={soundActive?"Désactiver le son":"Activer le son"}>
            {soundActive?<Volume2 size={16}/>:<VolumeX size={16}/>}
          </button>
        </div>
      </div>
      <div className="rounded-[7px] border border-black/10 bg-white text-[#1f2030] shadow-[0_20px_55px_#0002]">
        <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 text-[11px]">
          <span className="font-semibold">{score.notes.length} gestes dans la partition</span>
          <span className="text-black/60">Grave ↓ · Aigu ↑ · Posez et écoutez une note en direct</span>
        </div>
        <div className="overflow-x-auto" aria-label="Partition temporelle interactive">
          <svg ref={svgRef} viewBox="0 0 960 460" className={"block min-w-[760px] w-full touch-none select-none "+(contrast?"bg-white":"bg-[#fcfbfe]")}
            role="application" aria-label="Partition musicale tactile : cliquer pour ajouter, déplacer les formes avec le doigt ou la souris"
            onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
            <rect x="0" y="0" width="960" height="460" fill={contrast?"#fff":"#fcfbfe"}/>
            {Array.from({length:8},(_,i)=>i).map(i=><g key={i}>
              <line x1={18+(i/7)*(VBW-36)} y1="45" x2={18+(i/7)*(VBW-36)} y2="423" stroke="#d8d6e0" strokeWidth={i===0?0:1}/>
              <text x={18+(i/7)*(VBW-36)} y="25" textAnchor="middle" fontSize="12" fill="#6b6875">{formatMusicTime(i*MUSIC_SECONDS/7)}</text>
            </g>)}
            {[125,235,350].map((y,i)=><g key={y}>
              <line x1="18" x2="942" y1={y} y2={y} stroke="#e9e8ee" strokeWidth="1"/>
              <text x="22" y={y+52} fontSize="12" fill="#7d7989">{["Aigu","Médium","Grave"][i]}</text>
            </g>)}
            <rect x={timeToX(position)} y="42" width="3" height="385" fill="#7061c3" opacity=".95" pointerEvents="none"/>
            {score.notes.map(n=><GestureShape key={n.id} note={n} selected={selected===n.id} onSelect={setSelected}/>)}
          </svg>
        </div>
        <div className="border-t border-black/10 p-3 sm:p-4">
          <label className="mb-2 flex items-center justify-between gap-3 text-xs font-medium">
            <span>Déplacer la tête de lecture</span><span>{formatMusicTime(position)}</span>
          </label>
          <input aria-label="Position dans la partition" type="range" min="0" max={MUSIC_SECONDS} step=".5" value={position}
            onChange={e=>seek(Number(e.target.value))} className="w-full accent-[#7061c3]"/>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-white/60">La lecture visuelle tourne en continu. Chaque nouveau geste sonne dès sa création ; l’audio s’active après votre premier clic ou toucher.</p>
        <div className="flex items-center gap-2 text-[11px] text-white/65"><Volume2 size={14}/> {audioOn?"Son prêt":"Audio en attente du premier geste"} · synthèse locale</div>
      </div>
      {status&&<p className="mt-3 rounded-[5px] border border-white/15 bg-[#09090b] p-3 text-xs text-white" role="status">{status}</p>}
    </div>
    <div aria-label="Palette des émotions musicales" className="fixed inset-x-0 bottom-0 z-30 flex h-[148px] flex-col overflow-hidden border-t border-white/15 bg-[#09090b] text-white">
      <div className="flex h-[36px] shrink-0 items-center gap-3 border-b border-white/10 px-3">
        <strong className="text-[11px]">Émotions & DMC</strong>
        <span className="hidden text-[10px] text-white/55 sm:inline">La couleur influence la note et sa sonorité</span>
        <span className="ml-auto text-[10px] text-white/60">{dmcCode?"Fil "+dmcCode:"Timbres émotionnels"}</span>
      </div>
      <div className="no-scrollbar flex h-[54px] shrink-0 items-center gap-1 overflow-x-auto px-2" role="group" aria-label="Émotions musicales">
        {EMOTIONS.map(e=><button type="button" key={e.id} aria-label={"Émotion "+e.id} aria-pressed={emotion===e.id&&!dmcCode}
          onClick={()=>{setEmotion(e.id);setDmcCode(null);if(current)updateNotes(notes=>notes.map(n=>n.id===current.id?{...n,emotion:e.id,dmcCode:undefined}:n));}}
          className={"flex min-w-[76px] shrink-0 items-center gap-1.5 rounded-[5px] px-2 py-2 text-[10px] "+(emotion===e.id&&!dmcCode?"bg-white/15 ring-1 ring-white/60":"hover:bg-white/10")}>
          <span className="size-5 shrink-0 rounded-full border border-white/30" style={{backgroundColor:e.hex}}/><span>{e.id}</span>
        </button>)}
      </div>
      <div className="flex min-h-0 flex-1 items-center gap-2 border-t border-white/10 px-2">
        <label className="relative w-[108px] shrink-0 sm:w-[170px]">
          <span className="sr-only">Rechercher un fil DMC musical</span>
          <input type="search" aria-label="Rechercher un fil DMC musical" value={dmcSearch} onChange={e=>setDmcSearch(e.target.value)}
            placeholder="DMC · code ou nom" className="h-8 w-full rounded-[5px] border border-white/20 bg-white/10 px-2 text-[10px] text-white outline-none placeholder:text-white/50"/>
        </label>
        <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto" role="group" aria-label="Nuancier sonore DMC">
          {dmcList.map(f=><button type="button" key={f.code} aria-label={"Jouer et choisir DMC "+f.code} aria-pressed={dmcCode===f.code}
            onClick={()=>void chooseDMC(f.code)} title={"DMC "+f.code+" · "+f.name}
            className={"flex min-w-[56px] shrink-0 flex-col items-center gap-1 rounded-[5px] px-1 py-1 text-[10px] "+(dmcCode===f.code?"bg-white/15 ring-1 ring-white/65":"hover:bg-white/10")}>
            <span className="h-5 w-9 rounded-[4px] border border-white/20" style={{backgroundColor:f.hex}}/><span className="font-mono">{f.code}</span>
          </button>)}
          {dmcList.length===0&&<p className="text-[11px] text-white/60">Aucun fil trouvé.</p>}
        </div>
      </div>
    </div>
    <input ref={jsonInput} type="file" accept=".json,application/json" aria-label="Choisir une partition JSON" className="sr-only" onChange={e=>void importJson(e)}/>
  </StudioFrame>;
}
