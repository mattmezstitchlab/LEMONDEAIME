import { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, CircleDot, Plus, Radio, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { StudioFrame, saveStudioFile, studioButton, studioInput } from "./StudioFrame";
import {
  readWorld, writeWorld, selectedWorld, setSpace, newSpace, newMoment, newPerson, newSignal,
  previewImpact, validateSignal, type WorldSpace, type WorldStore, type SignalKind
} from "../lib/oneSpaceCore";

/** Native, focused integration of the RIPPLECIRCLE principles inside the POINTZERO kernel.
 * Shares the very same spaces, moments, people and provenance as Studio Causal. */
const accents=["#DCA5B8","#86A8CF","#A8C4A5","#E8C48A","#AEA4DC","#C9B19F"];
const angles=(i:number,n:number,r:number)=>{const a=2*Math.PI*(i/Math.max(n,1))-Math.PI/2;return{x:400+Math.cos(a)*r,y:400+Math.sin(a)*r}};
function sample():WorldSpace {
 const s=newSpace("mariage","RIPPLECIRCLE · Démonstration");
 const people=[newPerson("Organisateur fictif","organisateur"),newPerson("Famille démo","famille"),newPerson("Musicien démo","prestataire")];
 const moments=["Accueil","Cérémonie","Cocktail","Soirée"].map((name,i)=>newMoment(name,["14:00","15:00","17:00","21:00"][i]));
 for(let i=0;i<moments.length;i++){
  moments[i].personIds=people.map(p=>p.id);
  if(i>0)moments[i].followsMomentIds=[moments[i-1].id];
 }
 people.forEach(p=>{p.notificationsOptIn=false;p.subscribedMomentIds=[];});
 s.people=people;s.moments=moments;
 return s;
}
export default function RippleCircleStudio({onBack,onMetamorphose,onGame}:{onBack:()=>void;onMetamorphose:()=>void;onGame:()=>void}){
 const [db,setDb]=useState<WorldStore>(readWorld);
 const [selection,setSelection]=useState("");
 const [zoom,setZoom]=useState(1);
 const [label,setLabel]=useState("");
 const [time,setTime]=useState("18:00");
 const [signalKind,setSignalKind]=useState<SignalKind>("retard");
 const [delay,setDelay]=useState(12);
 const [message,setMessage]=useState("");
 const [notice,setNotice]=useState("");
 const space=selectedWorld(db);
 const moment=space?.moments.find(m=>m.id===selection)??space?.moments[0]??null;
 const draft=space&&moment?newSignal(moment.id,"",signalKind,signalKind==="retard"?delay:0,message):null;
 const impact=useMemo(()=>space&&draft?previewImpact(space,draft):null,[space,moment?.id,signalKind,delay,message]);
 useEffect(()=>{try{writeWorld(db);}catch{setNotice("Sauvegarde impossible. Exportez vos données.")}},[db]);
 function patch(fn:(s:WorldSpace)=>WorldSpace){if(space)setDb(old=>setSpace(old,fn(space)))}
 function makeDemo(){
  const s=sample();setDb(d=>({...d,spaces:[...d.spaces,s].slice(-30),selectedSpaceId:s.id}));setSelection(s.moments[0].id);
  setNotice("Démonstration locale créée. Aucun message envoyé aux personnes.");
 }
 function addMoment(){
  if(!space||label.trim().length<2||space.moments.length>=100)return;
  const next=newMoment(label.trim().slice(0,100),time);
  if(space.moments.length)next.followsMomentIds=[space.moments[space.moments.length-1].id];
  patch(s=>({...s,moments:[...s.moments,next]}));setSelection(next.id);setLabel("");
 }
 function propose(){
  if(!space||!moment||!message.trim())return setNotice("Décrivez d'abord le changement observé.");
  const next=newSignal(moment.id,"",signalKind,signalKind==="retard"?delay:0,message.trim().slice(0,500));
  patch(s=>({...s,signals:[next,...s.signals]}));setNotice("Observation enregistrée comme brouillon ; propagation simulée uniquement.");
 }
 function confirmSignal(id:string){patch(s=>validateSignal(s,id));setNotice("Impact validé localement. Aucune notification extérieure envoyée.");}
 const R=space?.moments??[];
 const people=space?.people??[];
 const currentIdx=R.findIndex(m=>m.id===moment?.id);
 const left=<div className="space-y-4 text-white">
  <h2 className="text-sm font-semibold">POINT ZÉRO / L'ONDE</h2>
  <p className="text-xs leading-relaxed text-white/55">Le cadran visualise les moments, les personnes, les dépendances et leurs conséquences.</p>
  <label className="block text-xs text-white/75">Espace partagé avec Studio Causal
   <select aria-label="Espace RippleCircle" className={studioInput+" mt-2"} value={space?.id||""} onChange={e=>{setDb(d=>({...d,selectedSpaceId:e.target.value}));setSelection("");}}>
    {!space&&<option value="">Aucun espace</option>}
    {db.spaces.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}
   </select>
  </label>
  <button className={studioButton+" w-full"} onClick={makeDemo}><Plus size={14}/> Démonstration fictive</button>
  {space&&<div className="space-y-2 border-t border-white/15 pt-4">
   <h3 className="text-xs font-semibold">Ajouter un moment</h3>
   <input aria-label="Nouveau moment" className={studioInput} placeholder="Ex. Dîner" maxLength={100} value={label} onChange={e=>setLabel(e.target.value)}/>
   <input type="time" aria-label="Heure du nouveau moment" className={studioInput} value={time} onChange={e=>setTime(e.target.value)}/>
   <button className={studioButton+" w-full"} disabled={label.trim().length<2} onClick={addMoment}>Ajouter à la chronologie</button>
  </div>}
  <div className="border-t border-white/15 pt-4 text-[11px] leading-relaxed text-white/55">
   <strong className="block text-white/80">Moteur d'origine : RIPPLECIRCLE</strong>
   Réutilisation des principes de cadran 2D et de propagation causale. Les données et validations utilisent le modèle natif POINTZERO — pas d'iframe, ni de deuxième compte.
  </div>
  <div className="grid grid-cols-2 gap-2">
   <button className={studioButton} onClick={onMetamorphose}>Métamorphose ↗</button>
   <button className={studioButton} onClick={onGame}>Studio Game ↗</button>
  </div>
 </div>;
 const right=<div className="space-y-4 text-white">
  <h2 className="text-sm font-semibold">Inspecteur d'impact</h2>
  {moment&&space?<><div className="rounded-[5px] border border-white/15 p-3">
   <p className="text-[10px] text-white/50">MOMENT SÉLECTIONNÉ</p><p className="mt-2 text-base font-semibold">{moment.title}</p><p className="mt-1 text-xs text-white/60">{moment.time||"Heure non définie"}</p>
  </div>
  <label className="block text-xs text-white/65">Type de signal
   <select className={studioInput+" mt-1"} value={signalKind} onChange={e=>setSignalKind(e.target.value as SignalKind)}>
    <option value="retard">Retard</option><option value="changement">Changement</option><option value="information">Information</option>
   </select>
  </label>
  {signalKind==="retard"&&<label className="block text-xs text-white/65">Minutes de retard · {delay}
   <input aria-label="Minutes de retard" className="mt-2 w-full accent-white" type="range" min="0" max="120" value={delay} onChange={e=>setDelay(Number(e.target.value))}/>
  </label>}
  <textarea className={studioInput+" min-h-[70px]"} aria-label="Description du signal" value={message} maxLength={500} onChange={e=>setMessage(e.target.value)} placeholder="Quel fait ou changement est observé ?"/>
  <div className="rounded-[5px] border border-white/15 p-3 text-[11px]">
   <span className="font-semibold text-white/75">Prévision · non confirmée</span>
   <p className="mt-2 leading-relaxed text-white/65">{impact?.summary}</p>
   <p className="mt-2 text-white/45">Destinataires sans opt-in : {impact?.notOptedIn.length??0}</p>
  </div>
  <button className={studioButton+" w-full"} onClick={propose}><Radio size={14}/> Enregistrer l'observation</button>
  <h3 className="border-t border-white/15 pt-3 text-xs font-semibold">Journal causal</h3>
  <div className="max-h-[34dvh] space-y-2 overflow-y-auto">
   {space.signals.slice(0,16).map(signal=><div key={signal.id} className="rounded-[5px] border border-white/15 p-2 text-[11px]">
    <p className="font-medium">{signal.kind} · {signal.status}</p><p className="mt-1 text-white/60">{signal.message}</p>
    {signal.status==="brouillon"&&<button className="mt-2 underline" onClick={()=>confirmSignal(signal.id)}>Valider localement</button>}
   </div>)}
  </div>
  </>:<p className="text-xs leading-relaxed text-white/60">Choisissez un espace ou créez la démonstration pour manipuler les relations et les impacts.</p>}
  {notice&&<p role="status" className="rounded-[5px] border border-white/20 p-2 text-xs text-white/70">{notice}</p>}
 </div>;
 return <StudioFrame title="RIPPLECIRCLE" subtitle="Le cadran 2D · une relation produit une onde"
  onBack={onBack} left={left} right={right} leftLabel="Chronologie et nœuds" rightLabel="Impact et causalité"
  actions={<button className={studioButton} onClick={()=>space&&saveStudioFile("ripplecircle-"+space.id+".json",JSON.stringify({version:1,spaces:[space],selectedSpaceId:space.id},null,2))} disabled={!space}><ArrowDownToLine size={15}/></button>}>
  <div className="mx-auto max-w-[900px]">
   <div className="mb-3 flex items-center justify-between gap-3">
    <div><p className="text-[10px] tracking-[.14em] text-white/50">RIPPLECIRCLE / CADRAN UNIVERSEL</p>
     <h2 className="mt-1 text-base font-semibold">{space?.title||"Aucun espace actif"}</h2></div>
    <div className="flex items-center gap-1">
     <button aria-label="Dézoomer" className={studioButton} onClick={()=>setZoom(v=>Math.max(.65,+(v-.15).toFixed(2)))}><ZoomOut size={15}/></button>
     <span className="min-w-10 text-center font-mono text-xs text-white/55">{Math.round(zoom*100)}%</span>
     <button aria-label="Zoomer" className={studioButton} onClick={()=>setZoom(v=>Math.min(2.5,+(v+.15).toFixed(2)))}><ZoomIn size={15}/></button>
     <button aria-label="Centrer" className={studioButton} onClick={()=>setZoom(1)}><RotateCcw size={15}/></button>
    </div>
   </div>
   <div className="relative mx-auto aspect-square w-full max-w-[760px] overflow-hidden rounded-[8px] border border-white/10 bg-[#f7f7f4]">
    <svg viewBox="0 0 800 800" className="h-full w-full touch-pan-x touch-pan-y" role="img" aria-label="Cadran RippleCircle interactif et zoomable"
      onWheel={e=>{if(e.ctrlKey||e.metaKey)setZoom(v=>Math.max(.65,Math.min(2.5,v+(e.deltaY<0?.1:-.1))))}}>
     <rect x="0" y="0" width="800" height="800" fill="#f8f7f5"/>
     <g transform={"translate(400 400) scale("+zoom+") translate(-400 -400)"}>
      {[340,280,212,140,86].map((r,i)=><circle key={r} cx="400" cy="400" r={r} stroke={["#d9dcda","#dededb","#dfdbdd","#e0dfdd","#e7dfe2"][i]} fill="none" strokeWidth={i===4?2:1}/>)}
      {R.map((m,i)=>{
       const to=angles(i,R.length,265);
       return m.followsMomentIds.map(prev=>{
        const prevIdx=R.findIndex(x=>x.id===prev);
        if(prevIdx<0)return null;
        const from=angles(prevIdx,R.length,265);
        return <path key={m.id+"-"+prev} d={"M"+from.x+" "+from.y+" Q400 400 "+to.x+" "+to.y} stroke="#cfa3b2" strokeWidth="1.8" strokeDasharray="5 6" fill="none" opacity=".8"/>;
       });
      })}
      {people.map((p,i)=>{const xy=angles(i,people.length,330);return <g key={p.id}>
       <circle cx={xy.x} cy={xy.y} r="7" fill="#96adb8"/><title>{p.name}</title>
       <text x={xy.x} y={xy.y+19} textAnchor="middle" fontSize="11" fill="#64727a">{p.name.slice(0,17)}</text>
      </g>})}
      {R.map((m,i)=>{const xy=angles(i,R.length,265);const selected=moment?.id===m.id;const activeSignal=space?.signals.some(x=>x.momentId===m.id);
       return <g key={m.id} role="button" tabIndex={0} aria-label={"Sélectionner "+m.title} onClick={()=>setSelection(m.id)}
        onKeyDown={e=>{if(e.key==="Enter")setSelection(m.id)}} style={{cursor:"pointer"}}>
        <circle cx={xy.x} cy={xy.y} r={selected?31:25} fill={activeSignal?"#f7e7df":"#fff"} stroke={selected?"#222":accents[i%accents.length]} strokeWidth={selected?3:2}/>
        <text x={xy.x} y={xy.y-1} fontSize="10" textAnchor="middle" fill="#292929" fontWeight="700">{m.time||"—"}</text>
        <text x={xy.x} y={xy.y+11} fontSize="9" textAnchor="middle" fill="#5d5d5d">{(i+1).toString().padStart(2,"0")}</text>
        <text x={xy.x} y={xy.y+45} fontSize="13" fontWeight={selected?700:500} textAnchor="middle" fill="#353535">{m.title.slice(0,20)}</text>
       </g>})}
      <circle cx="400" cy="400" r="85" fill="#fff" stroke="#e5dce0" strokeWidth="2"/>
      <text x="400" y="375" textAnchor="middle" fontSize="13" fill="#9b7b85" letterSpacing="2">POINT ZÉRO</text>
      <text x="400" y="411" textAnchor="middle" fontSize="25" fontWeight="600" fill="#27272a">{moment?.time||"∞"}</text>
      <text x="400" y="436" textAnchor="middle" fontSize="12" fill="#89838a">{R.length} moments · {people.length} personnes</text>
     </g>
    </svg>
    {!space&&<div className="pointer-events-none absolute inset-x-0 bottom-5 text-center text-xs text-[#7c7c7c]">Créez une démonstration dans le panneau gauche pour voir la propagation.</div>}
   </div>
   <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-white/50">
    <span><CircleDot size={12} className="mr-1 inline"/> Mom. · Personnes · Liens de dépendance</span>
    <span>Observé → Prédit → Proposé → Validé</span>
   </div>
   {currentIdx>=0&&<p className="mt-3 text-xs text-white/70">Nœud actif : {R[currentIdx].title}. Sélectionnez un moment pour simuler une conséquence.</p>}
  </div>
 </StudioFrame>;
}
