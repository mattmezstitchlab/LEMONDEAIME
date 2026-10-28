import { useEffect, useRef, useState, type PointerEvent as RPointerEvent, type WheelEvent } from "react";
import { ArrowDownToLine, ArrowRight, Focus, Magnet, Music2, Pause, Play, RotateCcw, Volume2, VolumeX, Waves, ZoomIn, ZoomOut } from "lucide-react";
import { StudioFrame, studioButton } from "./StudioFrame";
import { loadStored } from "../lib/store";
import { playableFromPattern, type PlayablePattern } from "../lib/gameFromPattern";
import { ARTISTS, GAME_SIZE, bestMove, clearGroup, finalScore, newGame, revealPercent, usePower, type Power } from "../lib/confettiGame";

type Phase="ready"|"playing"|"result"|"paused";
const CONFETTI=["#e99aab","#6caab5","#edca78","#a5bd91","#9b91c1"];
const timeFormat=(n:number)=>"00:"+String(Math.max(0,Math.ceil(n))).padStart(2,"0");
const clamp=(v:number,a:number,b:number)=>Math.min(b,Math.max(a,v));
export default function GameStudio({onBack,onMetamorphose,onCircle}:{onBack:()=>void;onMetamorphose:()=>void;onCircle:()=>void}){
 const [board,setBoard]=useState(()=>newGame(0,1042));
 const [custom,setCustom]=useState<PlayablePattern|null>(null);
 const [phase,setPhase]=useState<Phase>("ready");
 const [seconds,setSeconds]=useState(30);
 const [zoom,setZoom]=useState(1);
 const [pan,setPan]=useState({x:0,y:0});
 const [muted,setMuted]=useState(false);
 const [focus,setFocus]=useState(-1);
 const [message,setMessage]=useState("");
 const [best,setBest]=useState(()=>{try{return Number(localStorage.getItem("pointzero:confetti-best")||0)}catch{return 0}});
 const canvas=useRef<HTMLCanvasElement>(null);
 const boardRef=useRef(board);boardRef.current=board;
 const phaseRef=useRef(phase);phaseRef.current=phase;
 const pointers=useRef(new Map<number,{x:number;y:number}>());
 const lastCell=useRef(-1);
 const gesture=useRef<{distance:number;zoom:number;pan:{x:number;y:number}}|null>(null);
 const started=useRef(0);
 const timeLeft=useRef(30);
 const interval=useRef<number|null>(null);
 const audio=useRef<AudioContext|null>(null);
 const beat=useRef<number|null>(null);
 const artist=custom?{...ARTISTS[board.artist],name:custom.name,genre:"Motif POINTZERO",palette:custom.colors}:ARTISTS[board.artist];
 function stopAudio(){
  if(beat.current!==null)window.clearInterval(beat.current);
  beat.current=null;
  const ctx=audio.current;audio.current=null;
  if(ctx)void ctx.close().catch(()=>undefined);
 }
 function audioLoop(){
  if(muted)return;
  try{
   const ctx=new AudioContext();audio.current=ctx;
   let step=0;const notes=[0,7,10,7,3,7,12,10,0,5,10,5,2,5,7,10],base=164.81*Math.pow(2,boardRef.current.artist/12);
   const tick=()=>{
    if(phaseRef.current!=="playing"||ctx.state==="closed")return;
    const note=notes[step++%notes.length];
    const osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type=step%4===0?"triangle":"sine";osc.frequency.setValueAtTime(base*Math.pow(2,note/12),ctx.currentTime);
    gain.gain.setValueAtTime(.0001,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.055,ctx.currentTime+.018);
    gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.19);osc.connect(gain).connect(ctx.destination);
    osc.start();osc.stop(ctx.currentTime+.2);
   };
   tick();beat.current=window.setInterval(tick,250);
  }catch{setMessage("Audio non disponible sur cet appareil : le jeu reste jouable.")}
 }
 function stopTimer(){if(interval.current!==null)window.clearInterval(interval.current);interval.current=null;}
 function finish(){
  stopTimer();stopAudio();setPhase("result");setFocus(-1);
  const score=finalScore(boardRef.current,0);
  setBest(v=>{const next=Math.max(v,score);try{localStorage.setItem("pointzero:confetti-best",String(next))}catch{}return next});
 }
 function start(){
  stopTimer();stopAudio();
  const fresh=newGame(board.artist,Date.now()%1000000);
  setBoard(custom?{...fresh,portrait:custom.portrait}:fresh);
  setZoom(1);setPan({x:0,y:0});setSeconds(30);setFocus(-1);setMessage("");
  started.current=performance.now();timeLeft.current=30;phaseRef.current="playing";setPhase("playing");audioLoop();
  interval.current=window.setInterval(()=>{
    const left=Math.max(0,30-(performance.now()-started.current)/1000);
    timeLeft.current=left;setSeconds(left);
    if(left<=0)finish();
  },80);
 }
 function pause(){
  if(phase==="playing"){stopTimer();stopAudio();setPhase("paused");phaseRef.current="paused";}
  else if(phase==="paused"){started.current=performance.now()-(30-timeLeft.current)*1000;phaseRef.current="playing";setPhase("playing");audioLoop();interval.current=window.setInterval(()=>{
    const left=Math.max(0,30-(performance.now()-started.current)/1000);
    timeLeft.current=left;setSeconds(left);if(left<=0)finish();
  },80);}
 }
 useEffect(()=>()=>{stopTimer();stopAudio()},[]);
 useEffect(()=>{
  const onVisibility=()=>{if(document.hidden&&phaseRef.current==="playing"){
   stopTimer();stopAudio();setPhase("paused");phaseRef.current="paused";
  }};
  document.addEventListener("visibilitychange",onVisibility);return()=>document.removeEventListener("visibilitychange",onVisibility);
 },[]);
 function changeArtist(i:number){
  stopAudio();stopTimer();setCustom(null);setBoard(newGame(i,1042+i*100));setPhase("ready");phaseRef.current="ready";
  setSeconds(30);setZoom(1);setPan({x:0,y:0});setFocus(-1);setMessage("");
 }
 function activate(kind:Power){
  if(phase!=="playing")return;
  if(kind==="focus"){const idx=bestMove(boardRef.current);setFocus(idx);return}
  const idx=focus>=0?focus:bestMove(boardRef.current);
  if(idx<0)return;
  setBoard(v=>usePower(v,kind,idx));setFocus(-1);
 }
 function cellUnder(clientX:number,clientY:number){
  const c=canvas.current;if(!c)return -1;
  const box=c.getBoundingClientRect(),x=(clientX-box.left)/box.width*900,y=(clientY-box.top)/box.height*900;
  const gx=(x-450-pan.x)/zoom+450,gy=(y-450-pan.y)/zoom+450;
  const col=Math.floor((gx-42)/17),row=Math.floor((gy-42)/17);
  return col>=0&&col<GAME_SIZE&&row>=0&&row<GAME_SIZE?row*GAME_SIZE+col:-1;
 }
 function clearAt(e:{clientX:number;clientY:number}){
  if(phaseRef.current!=="playing")return;
  const idx=cellUnder(e.clientX,e.clientY);
  if(idx<0||idx===lastCell.current)return;
  lastCell.current=idx;
  setBoard(old=>clearGroup(old,idx));setFocus(-1);
 }
 const onDown=(e:RPointerEvent<HTMLCanvasElement>)=>{
  e.currentTarget.setPointerCapture(e.pointerId);
  pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});lastCell.current=-1;
  if(pointers.current.size===1)clearAt(e);
  if(pointers.current.size===2){
   const [a,b]=[...pointers.current.values()];
   gesture.current={distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),zoom,pan:{...pan}};
  }
 };
 const onMove=(e:RPointerEvent<HTMLCanvasElement>)=>{
  if(!pointers.current.has(e.pointerId))return;
  const previous=pointers.current.get(e.pointerId)!;
  pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.current.size===2&&gesture.current){
   const [a,b]=[...pointers.current.values()];
   const scale=Math.hypot(a.x-b.x,a.y-b.y)/gesture.current.distance;
   setZoom(clamp(gesture.current.zoom*scale,.7,5));
   const box=canvas.current?.getBoundingClientRect();
   if(box){setPan({x:gesture.current.pan.x+(e.clientX-previous.x)*900/box.width,y:gesture.current.pan.y+(e.clientY-previous.y)*900/box.height});}
   return;
  }
  if(e.shiftKey||phaseRef.current!=="playing"){
   const box=canvas.current?.getBoundingClientRect();
   if(box)setPan(v=>({x:clamp(v.x+(e.clientX-previous.x)*900/box.width,-1000,1000),y:clamp(v.y+(e.clientY-previous.y)*900/box.height,-1000,1000)}));
  }else clearAt(e);
 };
 const onUp=(e:RPointerEvent<HTMLCanvasElement>)=>{
  pointers.current.delete(e.pointerId);lastCell.current=-1;
  if(pointers.current.size<2)gesture.current=null;
 };
 function loadMyPattern(){
  const p=loadStored();
  if(!p){setMessage("Aucun patron enregistré. Créez ou ouvrez un motif dans l'atelier Broderie.");return;}
  const adapted=playableFromPattern(p);
  if(!adapted){setMessage("Le patron ne contient aucun point coloré exploitable.");return;}
  stopAudio();stopTimer();setCustom(adapted);
  const fresh=newGame(0,23019);setBoard({...fresh,portrait:adapted.portrait});
  setPhase("ready");phaseRef.current="ready";setSeconds(30);setZoom(1);setPan({x:0,y:0});
  setMessage("Motif importé depuis la broderie : le fichier d'origine reste intact.");
 }
 function exportCard(){
  const c=document.createElement("canvas");c.width=1080;c.height=1350;
  const ctx=c.getContext("2d");if(!ctx)return;
  ctx.fillStyle="#101015";ctx.fillRect(0,0,1080,1350);
  ctx.fillStyle="#fff";ctx.font="bold 55px Arial";ctx.fillText("CONFETTI 30",90,100);
  ctx.font="32px Arial";ctx.fillStyle="#cbb5c3";ctx.fillText("POINTZERO / STUDIO GAME",90,158);
  const cell=16.5,offset=145;
  for(let y=0;y<48;y++)for(let x=0;x<48;x++){
   ctx.fillStyle=artist.palette[board.portrait[y*48+x]];ctx.fillRect(offset+x*cell,230+y*cell,cell+.5,cell+.5);
  }
  ctx.fillStyle="#fff";ctx.font="bold 54px Arial";ctx.fillText(artist.name,90,1100);
  ctx.font="30px Arial";ctx.fillText("SCORE "+finalScore(board,0)+" · "+revealPercent(board)+"% RÉVÉLÉ",90,1170);
  ctx.fillStyle="#aeaab0";ctx.font="24px Arial";ctx.fillText("Le chaos devient une image · POINTZERO",90,1260);
  const a=document.createElement("a");a.download="confetti30-"+artist.id+".png";a.href=c.toDataURL("image/png");a.click();
 }
 useEffect(()=>{
  const c=canvas.current;if(!c)return;const ctx=c.getContext("2d");if(!ctx)return;
  ctx.clearRect(0,0,900,900);ctx.fillStyle="#faf8f6";ctx.fillRect(0,0,900,900);
  ctx.save();ctx.translate(450+pan.x,450+pan.y);ctx.scale(zoom,zoom);ctx.translate(-450,-450);
  const n=board.size;
  for(let i=0;i<board.portrait.length;i++){
   const x=42+i%n*17,y=42+Math.floor(i/n)*17;
   ctx.fillStyle=artist.palette[board.portrait[i]];ctx.fillRect(x,y,17.1,17.1);
   const v=board.confetti[i],show=phase!=="result"&&v>=0;
   if(show){
    ctx.fillStyle=CONFETTI[v];ctx.fillRect(x+.6,y+.6,15.8,15.8);
    ctx.fillStyle="rgba(255,255,255,.24)";ctx.fillRect(x+2,y+2,4,3);
   }
   if(zoom>2.3){ctx.strokeStyle="rgba(0,0,0,.15)";ctx.lineWidth=.5;ctx.strokeRect(x,y,17,17);}
  }
  if(focus>=0&&phase==="playing"){
   const x=42+focus%n*17,y=42+Math.floor(focus/n)*17;
   ctx.strokeStyle="#fff";ctx.lineWidth=4;ctx.strokeRect(x-5,y-5,27,27);
   ctx.strokeStyle="#202023";ctx.lineWidth=1.5;ctx.strokeRect(x-7,y-7,31,31);
  }
  ctx.restore();
 },[board,zoom,pan,phase,focus,artist]);
 const left=<div className="space-y-4 text-white">
  <h2 className="text-sm font-semibold">CONFETTI / 30 SECONDS</h2>
  <p className="text-xs leading-relaxed text-white/60">Touchez des groupes de couleur pour enlever les confettis et révéler l'icône cachée.</p>
  <button onClick={loadMyPattern} className={studioButton+" w-full"}>✳ Jouer avec mon motif de broderie</button>
  <div className="grid gap-1.5">{ARTISTS.map((a,i)=><button key={a.id} type="button" onClick={()=>changeArtist(i)}
   className={"min-h-11 rounded-[5px] border p-3 text-left text-xs "+(board.artist===i?"border-white bg-white text-black":"border-white/15 text-white/75 hover:bg-white/10")}>
   <span className="block font-semibold">{String(i+1).padStart(2,"0")} · {a.name}</span>
   <span className="text-[10px] opacity-60">{a.genre} · artiste fictif</span>
  </button>)}</div>
  <div className="border-t border-white/15 pt-4">
   <h3 className="mb-2 text-xs font-semibold">Trois actions</h3>
   <p className="text-[11px] leading-relaxed text-white/60">1. Tap : retirer un groupe. 2. Swipe : enchaîner les zones. 3. Pincer ou molette : explorer la grille.</p>
  </div>
  <button className={studioButton+" w-full"} onClick={onMetamorphose}>Métamorphose →</button>
  <button className={studioButton+" w-full"} onClick={onCircle}>RippleCircle →</button>
 </div>;
 const right=<div className="space-y-4 text-white">
  <div><h2 className="text-sm font-semibold">Performance</h2>
   <p className="mt-1 text-[11px] text-white/50">Chaque point effacé laisse apparaître la matière originale.</p></div>
  <div className="grid grid-cols-2 gap-2">{[["Révélé",revealPercent(board)+"%"],["Score",String(board.score)],["Combo","×"+board.combo],["Record",String(best)]].map(([k,v])=>
   <div key={k} className="rounded-[5px] border border-white/15 p-3"><p className="text-[10px] text-white/50">{k}</p><strong className="mt-1 block text-lg">{v}</strong></div>)}</div>
  <h3 className="border-t border-white/15 pt-4 text-xs font-semibold">Pouvoirs</h3>
  <p className="text-[11px] leading-relaxed text-white/55">Des actions concrètes sur la grille : balayage horizontal, aimant de couleur ou meilleure zone détectée.</p>
  {([["wave","WAVE",Waves],["magnet","MAGNET",Magnet],["focus","FOCUS",Focus]] as const).map(([id,name,Icon])=>
   <button key={id} disabled={phase!=="playing"} onClick={()=>activate(id)} className={studioButton+" w-full justify-start"}><Icon size={15}/>{name}</button>)}
  <div className="border-t border-white/15 pt-4">
   <h3 className="mb-2 text-xs font-semibold">Zoom</h3>
   <div className="grid grid-cols-2 gap-2">
    <button className={studioButton} onClick={()=>setZoom(v=>clamp(v/1.25,.7,5))}><ZoomOut size={15}/></button>
    <button className={studioButton} onClick={()=>setZoom(v=>clamp(v*1.25,.7,5))}><ZoomIn size={15}/></button>
   </div>
   <p className="mt-2 text-[11px] text-white/50">Zoom ×{zoom.toFixed(1)} · Shift + glisser pour déplacer</p>
  </div>
  {message&&<p role="status" className="rounded-[5px] border border-white/20 p-3 text-xs">{message}</p>}
 </div>;
 return <StudioFrame title="Game" subtitle="La grille devient un jeu · 30 secondes de musique et de confettis"
 onBack={onBack} left={left} right={right} leftLabel="Niveaux du jeu" rightLabel="Score et actions"
 actions={<button onClick={()=>setMuted(v=>!v)} aria-label={muted?"Activer le son":"Couper le son"} className={studioButton}>{muted?<VolumeX size={15}/>:<Volume2 size={15}/>}</button>}>
 <div className="mx-auto max-w-[720px] space-y-3">
  <div className="flex items-center justify-between gap-3">
   <div><p className="text-[10px] tracking-[.14em] text-white/50">CONFETTI 30 / POINTZERO</p><h2 className="mt-1 text-lg font-semibold">{artist.name}</h2></div>
   <div className="text-right"><strong className="font-mono text-[27px]">{timeFormat(seconds)}</strong><p className="text-[10px] text-white/55">30 SECONDES</p></div>
  </div>
  <div className="h-1 overflow-hidden rounded bg-white/10"><div className="h-full bg-[#dcb0c0] transition-[width] duration-100" style={{width:revealPercent(board)+"%"}}/></div>
  <div className="relative mx-auto aspect-square w-full max-w-[660px] overflow-hidden rounded-[6px] border border-white/10 bg-white">
   <canvas ref={canvas} width={900} height={900} aria-label="Grille de confettis interactive" role="application"
    className="h-full w-full touch-none select-none" style={{touchAction:"none"}}
    onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
    onWheel={(e:WheelEvent<HTMLCanvasElement>)=>{e.preventDefault();setZoom(v=>clamp(v*(e.deltaY<0?1.14:.88),.7,5));}}/>
   {phase!=="playing"&&<div className={"absolute inset-0 flex flex-col items-center p-6 text-center text-white "+(phase==="result"?"justify-end bg-gradient-to-t from-black/95 via-black/25 to-transparent":"justify-center bg-[#111116]/80")}>
    {phase==="ready"?<>
     <Music2 size={28} className="mb-4 text-[#dcaaba]"/>
     <h3 className="text-3xl font-semibold tracking-[-.04em]">30 secondes.</h3>
     <p className="mb-6 mt-2 max-w-[230px] text-sm text-white/70">Nettoie le chaos. Révèle l'icône.</p>
     <button onClick={start} className="flex min-h-12 items-center gap-2 rounded-[5px] bg-white px-7 font-semibold text-[#111116]"><Play size={17}/> PLAY</button>
    </>:phase==="paused"?<>
     <h3 className="mb-4 text-2xl font-semibold">PAUSE</h3><button onClick={pause} className="rounded-[5px] bg-white px-6 py-3 font-semibold text-black">Reprendre</button>
    </>:<>
     <p className="text-xs uppercase tracking-[.2em] text-[#f3b7c6]">Icon revealed</p>
     <h3 className="mt-3 text-3xl font-semibold">{artist.name}</h3>
     <p className="mb-5 mt-2 text-lg">{revealPercent(board)}% révélé · {finalScore(board,0)} points</p>
     <div className="flex flex-wrap justify-center gap-2">
      <button onClick={start} className="rounded-[5px] bg-white px-4 py-3 text-xs font-semibold text-black"><RotateCcw size={14} className="mr-1 inline"/>Rejouer</button>
      <button onClick={()=>changeArtist((board.artist+1)%ARTISTS.length)} className="rounded-[5px] border border-white/40 px-4 py-3 text-xs">Icône suivante <ArrowRight size={13} className="ml-1 inline"/></button>
      <button onClick={exportCard} className="rounded-[5px] border border-white/40 px-4 py-3 text-xs"><ArrowDownToLine size={14} className="mr-1 inline"/>Partager PNG</button>
     </div>
    </>}
   </div>}
  </div>
  <div className="flex items-center justify-between gap-2 text-[11px] text-white/55">
   <span>{revealPercent(board)}% nettoyé · Meilleur groupe : {board.largest} cases</span>
   <div className="flex items-center gap-2">{phase==="playing"&&<button onClick={pause} className={studioButton}><Pause size={14}/> Pause</button>}
    <span>Musique originale synthétisée · aucun titre commercial</span></div>
  </div>
 </div>
 </StudioFrame>;
}
