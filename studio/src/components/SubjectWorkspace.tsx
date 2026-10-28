import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { ArrowDown, ArrowUp, Check, Copy, Download, Eye, EyeOff, FileJson, GitMerge, Lock, LockOpen, ScanSearch, Scissors, Save, Trash2, X, ZoomIn, ZoomOut } from "lucide-react";
import StitchMagnifier, { clampFocus, type StitchFocus } from "./StitchMagnifier";
import { FLOSS, flossIndex } from "../lib/dmc";
import { downloadBlob, saveProjectFile } from "../lib/io";
import { buildPdf, pdfFileName } from "../lib/pdf";
import { fromObject, type Pattern } from "../lib/pattern";
import {
  affectedBounds, attachSubject, changeSubject, detectSubjects, duplicateSubject, mergeSubjects,
  recomposeSubjects, removeSubject, reorderSubject, sceneFromPattern, splitSubject, spriteForExport,
  type Bounds, type SubjectLayer, type SubjectScene,
} from "../lib/subjectEngine";
import { multiSubjectDemo } from "../lib/subjectDemo";
import { deleteLibrarySubject, loadSubjectLibrary, openLibrarySubject, storeSubject } from "../lib/subjectLibrary";
import { addSuggestedLeaves, floralBird, floralDemo } from "../lib/floralComposition";
import { adaptPatternToProfile, loadBrodeuseProfile, type AdaptationMode } from "../lib/brodeuseProfile";
import BrodeuseProfilePanel from "./BrodeuseProfilePanel";

const inkColor=(idx:number)=>FLOSS[idx]?.hex??"#555";
function SubjectPreview({pattern,scene,selected,onChoose,onMove,zoom=1,onInspect}:{
  pattern:Pattern;scene:SubjectScene;selected:string|null;
  onChoose:(id:string)=>void;onMove:(id:string,x:number,y:number)=>void;
  zoom?:number;onInspect?:(point:StitchFocus)=>void;
}) {
  const canvas=useRef<HTMLCanvasElement>(null);
  const dragging=useRef<{id:string;startX:number;startY:number;x:number;y:number}|null>(null);
  useEffect(()=>{
    const c=canvas.current,ctx=c?.getContext("2d");
    if(!c||!ctx)return;
    const scale=Math.max(2,Math.min(9,720/Math.max(pattern.w,pattern.h)));
    c.width=Math.ceil(pattern.w*scale);c.height=Math.ceil(pattern.h*scale);
    ctx.fillStyle=pattern.fabric?.color??"#f7f2e8";
    ctx.fillRect(0,0,c.width,c.height);
    for(let i=0;i<pattern.cross.length;i++) {
      const color=pattern.cross[i];if(color<0)continue;
      ctx.fillStyle=inkColor(color);
      ctx.fillRect(i%pattern.w*scale,Math.floor(i/pattern.w)*scale,scale,scale);
    }
    for(const [array,reverse] of [[pattern.fwd,false],[pattern.bwd,true]] as const)
      for(let i=0;i<array.length;i++){if(array[i]<0)continue;
        const x=i%pattern.w*scale,y=Math.floor(i/pattern.w)*scale;
        ctx.strokeStyle=inkColor(array[i]);ctx.lineWidth=Math.max(1,scale*.2);ctx.beginPath();
        if(reverse){ctx.moveTo(x,y);ctx.lineTo(x+scale,y+scale);}
        else{ctx.moveTo(x,y+scale);ctx.lineTo(x+scale,y);}
        ctx.stroke();
      }
    for(let k=0;k<4;k++)for(let i=0;i<pattern.q[k].length;i++){
      const color=pattern.q[k][i];if(color<0)continue;
      const x=(i%pattern.w+(k===1||k===2?1:0))*scale;
      const y=(Math.floor(i/pattern.w)+(k>=2?1:0))*scale;
      ctx.strokeStyle=inkColor(color);ctx.lineWidth=Math.max(1,scale*.25);ctx.beginPath();
      ctx.moveTo(x,y);ctx.lineTo((i%pattern.w+.5)*scale,(Math.floor(i/pattern.w)+.5)*scale);ctx.stroke();
    }
    for(const seg of pattern.back){
      ctx.strokeStyle=inkColor(seg.c);ctx.lineWidth=Math.max(1,scale*.22);ctx.beginPath();
      ctx.moveTo(seg.x1*scale,seg.y1*scale);ctx.lineTo(seg.x2*scale,seg.y2*scale);ctx.stroke();
    }
    for(const k of pattern.knots){
      ctx.fillStyle=inkColor(k.c);ctx.beginPath();
      ctx.arc(k.x*scale,k.y*scale,Math.max(1,scale*.2),0,Math.PI*2);ctx.fill();
    }
    for(const k of pattern.special??[]){
      ctx.strokeStyle=inkColor(k.c);ctx.fillStyle=inkColor(k.c);
      if(k.kind==="bead"){ctx.beginPath();ctx.ellipse(k.x*scale,k.y*scale,Math.max(1,scale*.17),Math.max(1,scale*.28),0,0,Math.PI*2);ctx.fill();}
      else{const r=Math.max(1,scale*.2);ctx.beginPath();ctx.moveTo(k.x*scale-r,k.y*scale-r);ctx.lineTo(k.x*scale+r,k.y*scale+r);ctx.moveTo(k.x*scale+r,k.y*scale-r);ctx.lineTo(k.x*scale-r,k.y*scale+r);ctx.stroke();}
    }
    // Bounded regions help selection, without modifying the actual motif.
    for(const layer of scene.layers){
      const sprite=JSON.parse(layer.sprite) as {w:number;h:number};
      const w=sprite.w*layer.scale,h=sprite.h*layer.scale;
      ctx.strokeStyle=selected===layer.id?"#111114":"rgba(30,30,30,.28)";
      ctx.lineWidth=selected===layer.id?2:1;ctx.setLineDash(selected===layer.id?[]:[5,4]);
      ctx.strokeRect(layer.x*scale,layer.y*scale,w*scale,h*scale);
    }
    ctx.setLineDash([]);
  },[pattern,scene,selected]);
  const point=(e:PointerEvent<HTMLCanvasElement>)=>{
    const box=e.currentTarget.getBoundingClientRect();
    return {
      x:(e.clientX-box.left)/Math.max(1,box.width)*pattern.w,
      y:(e.clientY-box.top)/Math.max(1,box.height)*pattern.h,
    };
  };
  const scale=Math.max(2,Math.min(9,720/Math.max(pattern.w,pattern.h)));
  return <canvas ref={canvas} role="img" aria-label="Grille de sujets : cliquer ou faire glisser pour sélectionner et déplacer"
    className={`mx-auto block cursor-move touch-none rounded-[5px] border border-black/15 bg-white ${zoom===1?"w-full max-w-[720px]":"max-w-none"}`}
    style={{aspectRatio:pattern.w+"/"+pattern.h,imageRendering:"pixelated",width:zoom>1?Math.ceil(pattern.w*scale*zoom):undefined}}
    onPointerDown={e=>{
      const p=point(e);
      onInspect?.(clampFocus(pattern,p));
      const target=[...scene.layers].reverse().find(l=>{
        const sprite=JSON.parse(l.sprite) as {w:number;h:number};
        return l.visible&&p.x>=l.x&&p.y>=l.y&&p.x<l.x+sprite.w*l.scale&&p.y<l.y+sprite.h*l.scale;
      });
      if(!target)return;
      onChoose(target.id);
      if(target.locked)return;
      dragging.current={id:target.id,startX:p.x,startY:p.y,x:target.x,y:target.y};
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }}
    onPointerMove={e=>{
      const p=point(e);
      onInspect?.(clampFocus(pattern,p));
      const d=dragging.current;if(!d)return;
      onMove(d.id,d.x+Math.round(p.x-d.startX),d.y+Math.round(p.y-d.startY));
    }}
    onPointerUp={()=>{dragging.current=null;}}
    onPointerCancel={()=>{dragging.current=null;}}/>;
}

const fieldClass="w-full rounded-[5px] border border-white/25 bg-[#1c1c20] px-2 py-2 text-sm text-white placeholder:text-white/75";
export default function SubjectWorkspace({pattern,onCancel,onUse}:{
  pattern:Pattern;onCancel:()=>void;onUse:(p:Pattern)=>void;
}) {
  const [scene,setScene]=useState<SubjectScene>(()=>sceneFromPattern(pattern)??detectSubjects(pattern).scene);
  const [selectedId,setSelectedId]=useState<string|null>(()=>scene.layers[0]?.id??null);
  const [message,setMessage]=useState("");
  const [zoom,setZoom]=useState(1);
  const [loupe,setLoupe]=useState(true);
  const [focus,setFocus]=useState<StitchFocus>(()=>({x:Math.floor(pattern.w/2),y:Math.floor(pattern.h/2)}));
  const [busy,setBusy]=useState(false);
  const [library,setLibrary]=useState(loadSubjectLibrary);
  const [split,setSplit]=useState({x:0,y:0,w:10,h:10});
  const [mergeId,setMergeId]=useState("");
  const [showSource,setShowSource]=useState(false);
  const [confirmed,setConfirmed]=useState(false);
  const [profile,setProfile]=useState(loadBrodeuseProfile);
  const [mode,setMode]=useState<AdaptationMode>(pattern.adaptation?.mode??"original");
  const selected=scene.layers.find(l=>l.id===selectedId)??null;
  const lastRender=useRef<{scene:SubjectScene;pattern:Pattern}|null>(null);
  const original=useMemo(()=>{try{return fromObject(JSON.parse(scene.source));}catch{return null;}},[scene.source]);
  const result=useMemo(()=>{
    try{
      const last=lastRender.current;
      let dirty:Bounds|undefined;
      if(last && last.scene.source===scene.source && last.scene.backdrop===scene.backdrop &&
          last.scene.layers.length===scene.layers.length &&
          last.scene.layers.every((layer,i)=>layer.id===scene.layers[i].id)){
        const diffs=scene.layers.map((next,i)=>({old:last.scene.layers[i],next})).filter(({old,next})=>
          old.x!==next.x || old.y!==next.y || old.scale!==next.scale ||
          old.sprite!==next.sprite || old.visible!==next.visible || old.tint!==next.tint);
        if(diffs.length===1)dirty=affectedBounds(diffs[0].old,diffs[0].next);
      }
      const pattern=recomposeSubjects(scene,last?.pattern,dirty);
      lastRender.current={scene,pattern};
      return {pattern,error:""};
    }catch(e){return {pattern:null,error:e instanceof Error?e.message:"Recomposition impossible."};}
  },[scene]);
  const composed=result.pattern;
  const adapted=useMemo(()=>{
    if(!composed)return null;
    try{return adaptPatternToProfile(composed,profile,mode);}
    catch{return null;}
  },[composed,profile,mode]);
  const output=adapted?.pattern??composed;
  const risks=(adapted?.report.maxDeltaE??0)>12 || !!adapted?.report.weakBoundaries || (!!adapted?.report.missing.length&&mode==="stock");
  const adjust=(id:string,patch:Partial<Pick<SubjectLayer,"name"|"x"|"y"|"scale"|"visible"|"locked"|"tint">>)=>{
    setScene(old=>changeSubject(old,id,patch));setConfirmed(false);
  };
  const operation=(fn:()=>void)=>{try{fn();setMessage("");setConfirmed(false);}catch(e){setMessage(e instanceof Error?e.message:"Modification impossible.");}};
  const resetDemo=()=>{
    const p=multiSubjectDemo(),next=detectSubjects(p).scene;
    // Labels are fixture annotations based on known positions, never claimed
    // as the output of semantic recognition.
    next.layers=next.layers.map(l=>({
      ...l,name:l.x<45?"Oiseau":l.x<85?"Fleur":"Maisonnette"
    }));
    setScene(next);setSelectedId(next.layers[0]?.id??null);setMessage("Démo originale : les noms sont fournis par le scénario, non détectés par une IA.");setConfirmed(false);
  };
  const loadFloral=()=>{
    const next=floralDemo();
    setScene(next);setSelectedId(next.layers.find(l=>l.name.startsWith("Rose"))?.id??null);
    setMessage("Bouquet original : trois fleurs indépendantes, quatre feuilles et une branche. Labels rédigés, sans reconnaissance IA.");
    setConfirmed(false);
  };
  const suggest=()=>operation(()=>{
    const next=addSuggestedLeaves(scene,2);
    if(next.layers.length===scene.layers.length)throw new Error("Aucun espace adapté repéré pour ajouter des feuilles.");
    setScene(next);setMessage("Feuilles proposées dans les vides, modifiables et supprimables par annulation du projet.");
  });
  const saveSelected=()=>{
    if(!selected)return;
    operation(()=>{setLibrary(storeSubject(spriteForExport(selected)));setMessage("Sujet enregistré localement (pas publié en boutique).");});
  };
  const exportSelected=()=>{
    if(selected)saveProjectFile(spriteForExport(selected));
  };
  const currentCount=composed?.cross.reduce((n,c)=>n+Number(c>=0),0)??0;
  const offscreen=composed?.subjectScene?.warnings.some(w=>w.includes("hors de la grille"))??false;
  const hiddenCount=scene.layers.filter(l=>!l.visible).length;
  const finish=()=>{
    if(!output)return;
    if((offscreen||hiddenCount>0||risks)&&!confirmed){setMessage("Confirmez les éléments masqués et les risques de substitution avant d'utiliser ce motif.");return;}
    onUse(output);
  };
  const exportPdf=async()=>{
    if(!output||busy)return;
    setBusy(true);
    try{
      const opts={bw:false,paper:"a4" as const};
      downloadBlob(await buildPdf(output,opts),pdfFileName(output,opts));
      setMessage("PDF calculé à partir du même Pattern recomposé que la grille.");
    }catch(e){setMessage(e instanceof Error?e.message:"Erreur PDF.");}
    finally{setBusy(false);}
  };
  const useLibrary=(itemId:string)=>{
    const item=library.find(x=>x.id===itemId);if(!item)return;
    operation(()=>{
      const next=attachSubject(scene,openLibrarySubject(item),Math.floor((composed?.w??120)*.3),Math.floor((composed?.h??75)*.3));
      setScene(next);setSelectedId(next.layers.at(-1)!.id);
    });
  };
  return <div className="pz-decomposition fixed inset-0 z-[79] flex flex-col bg-[#09090b] text-white" role="dialog" aria-modal="true" aria-label="Décomposer et recomposer les sujets">
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/15 bg-[#09090b] px-4 py-3">
      <div><p className="text-[10px] uppercase tracking-[.16em] text-white/70">Point Zéro · Atelier · Moteur de sujets</p>
        <h2 className="text-lg font-semibold">Décomposer → Composer</h2></div>
      <div className="flex items-center gap-2">
        <button className="rounded-[5px] border border-white/25 px-3 py-2 text-xs text-white hover:bg-white/10" onClick={onCancel}><X size={14} className="mr-1 inline"/> Fermer</button>
        <button className="pz-decomposition-primary rounded-[5px] bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-40" disabled={!output||busy||((offscreen||hiddenCount>0||risks)&&!confirmed)} onClick={finish}>
          <Check size={15} className="mr-1 inline"/> Utiliser dans l'atelier
        </button>
      </div>
    </header>
    <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[252px_minmax(320px,1fr)_252px] lg:overflow-hidden">
      <aside className="thin-scroll space-y-3 border-b border-white/15 bg-[#09090b] p-4 lg:overflow-y-auto lg:border-b-0 lg:border-r" aria-label="Bibliothèque et outils de décomposition">
        <h3 className="text-sm font-semibold">Détection et extraction</h3>
        <p className="text-xs leading-relaxed text-white/70">Segmentation géométrique des groupes colorés. La reconnaissance sémantique des objets par IA n'est pas encore activée.</p>
        <button className="w-full rounded-[5px] border border-white/30 bg-white/10 px-3 py-3 text-left text-sm font-medium text-white hover:bg-white/15" onClick={loadFloral}>
          Tester un bouquet · 3 fleurs + 4 feuilles + branche
        </button>
        <button className="w-full rounded-md border border-white/30 px-3 py-2 text-left text-sm" onClick={resetDemo}>Ancienne démo : oiseau, fleur, maison</button>
        <button className="w-full rounded-md border border-white/20 px-3 py-2 text-left text-sm" onClick={()=>operation(()=>{
          const next=attachSubject(scene,floralBird(),125,24);setScene(next);
          setSelectedId(next.layers.at(-1)!.id);setMessage("Petit oiseau ajouté, éditable indépendamment.");
        })}>+ Petit oiseau facultatif</button>
        <label className="block text-xs text-white/70">Profondeur brodable
          <select className="mt-2 w-full rounded-[5px] border border-white/25 bg-[#1c1c20] p-2 text-sm text-white" value={scene.depth??"naturelle"}
            onChange={e=>{setScene(prev=>({...prev,depth:e.target.value as "naturelle"|"renforcee"}));setConfirmed(false);}}>
            <option value="naturelle">Naturelle : superposition seule</option>
            <option value="renforcee">Renforcée : contours d'appui ciblés</option>
          </select>
        </label>
        <button className="w-full rounded-md border border-white/20 px-3 py-2 text-left text-sm" onClick={suggest}>
          + Proposer deux feuilles dans les vides
        </button>
        <button className="w-full rounded-md border border-white/20 px-3 py-2 text-sm" onClick={()=>operation(()=>{
          const next=detectSubjects(composed??pattern).scene;
          setScene(next);setSelectedId(next.layers[0]?.id??null);
        })}>Décomposer ce motif</button>
        <details className="border-t border-white/10 pt-3">
          <summary className="cursor-pointer text-sm font-semibold">Profil et stock de fils</summary>
          <div className="mt-3"><BrodeuseProfilePanel profile={profile} onChange={p=>{setProfile(p);setConfirmed(false);}}/></div>
        </details>
        <div className="border-t border-white/10 pt-3">
          <h4 className="mb-2 text-sm font-medium">Bibliothèque personnelle</h4>
          <p className="mb-2 text-xs text-white/70">Composants enregistrés sur cet appareil. Les droits d'auteur de chaque source restent applicables.</p>
          <button className="w-full rounded-md border border-white/20 px-3 py-2 text-xs" onClick={saveSelected} disabled={!selected}><Save size={13} className="mr-1 inline"/> Enregistrer le sujet choisi</button>
          {library.slice(0,12).map(item=><div key={item.id} className="mt-2 flex items-center gap-2 text-xs">
            <button className="min-w-0 flex-1 truncate text-left text-white/80 underline underline-offset-2" onClick={()=>useLibrary(item.id)} title={item.name}>+ {item.name}</button>
            <button aria-label={"Supprimer "+item.name} onClick={()=>operation(()=>setLibrary(deleteLibrarySubject(item.id)))}><Trash2 size={13}/></button>
          </div>)}
          {library.length===0&&<p className="mt-2 text-xs text-white/70">Bibliothèque vide</p>}
        </div>
      </aside>
      <main className="thin-scroll min-h-[450px] space-y-4 overflow-y-auto bg-[#0d0d10] p-4" aria-label="Grille de composition des sujets">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div><p className="text-[11px] uppercase tracking-[.12em] text-white/70">Composition interactive</p><h3 className="text-base font-semibold">{composed?.name??"Motif"}</h3></div>
          <span className="text-xs text-white/65">{output?.w} × {output?.h} points · {scene.layers.length} éléments · {currentCount} croix</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-white/75">Ma version :</span>
          {(["original","stock","debutant","expert","reduite","petit"] as AdaptationMode[]).map(m=>
            <button type="button" key={m} aria-pressed={mode===m}
              className={"rounded-[5px] border px-2 py-1.5 capitalize "+(mode===m?"border-white bg-white text-black":"border-white/25 bg-white/[.04] text-white/80 hover:bg-white/10")}
              onClick={()=>{setMode(m);setConfirmed(false);}}>{m==="stock"?"Mes fils":m==="debutant"?"Débutant":m==="reduite"?"Peu de couleurs":m==="petit"?"Petit format":m==="expert"?"Expert":"Original"}</button>)}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[5px] border border-white/15 bg-[#09090b] p-2" role="group" aria-label="Contrôle du zoom des sujets">
          <span className="text-[11px] text-white/65">Inspecter les points</span>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Zoom arrière sujets" disabled={zoom===1} onClick={()=>setZoom(v=>Math.max(1,v/2))}
              className="grid size-9 place-items-center rounded-[4px] text-white/80 hover:bg-white/10 disabled:opacity-25"><ZoomOut size={16}/></button>
            <span className="w-[35px] text-center font-mono text-xs">{zoom}×</span>
            <button type="button" aria-label="Zoom avant sujets" disabled={zoom===8} onClick={()=>setZoom(v=>Math.min(8,v*2))}
              className="grid size-9 place-items-center rounded-[4px] text-white/80 hover:bg-white/10 disabled:opacity-25"><ZoomIn size={16}/></button>
            <button type="button" aria-label="Activer la loupe des sujets" aria-pressed={loupe} onClick={()=>setLoupe(v=>!v)}
              className={`ml-2 flex min-h-9 items-center gap-1 rounded-[4px] px-2 text-xs ${loupe?"bg-white text-black":"text-white/75 hover:bg-white/10"}`}><ScanSearch size={15}/> Loupe</button>
          </div>
        </div>
        <div className="relative rounded-[6px] border border-white/15 bg-[#f8f4ee]">
          <div className="thin-scroll max-h-[65dvh] min-h-[260px] overflow-auto p-3" aria-label="Zone de zoom des sujets">
            {output&&<div className="flex min-w-max items-center justify-center"><SubjectPreview pattern={output} scene={scene} selected={selectedId}
              onChoose={setSelectedId} onMove={(id,x,y)=>adjust(id,{x,y})} zoom={zoom} onInspect={setFocus}/></div>}
          </div>
          {loupe&&output&&<div className="pointer-events-none absolute right-2 top-2 z-10 max-w-[min(252px,70%)]">
            <StitchMagnifier pattern={output} focus={focus}/>
          </div>}
        </div>
        <p className="text-[11px] text-white/55">Déplacez les sujets directement sur la grille, zoom 1×–8× et loupe de contrôle des points. Le patron source reste intact.</p>
        {adapted&&<div className="space-y-1 text-xs text-white/70">
          <p>{adapted.report.afterColors} références DMC · {adapted.report.substitutions.length} substitutions · {adapted.report.estimatedMeters} m de brin simple estimés</p>
          {adapted.report.substitutions.length>0&&<details className="rounded-md border border-white/10 p-2">
            <summary className="cursor-pointer">Voir les substitutions DMC</summary>
            <p className="mt-2">{adapted.report.substitutions.slice(0,35).map(t=>t.from+" → "+t.to+" (ΔE "+t.deltaE+")").join(" · ")}</p>
          </details>}
          {adapted.report.warnings.map((w,i)=><p role="status" key={i} className="rounded-md border border-amber-300/25 bg-amber-300/10 p-2 text-amber-100">{w}</p>)}
          {mode==="stock"&&adapted.report.missing.map(x=><p key={x.code} className="text-amber-200">{x.code} : {x.requiredMeters} m nécessaires, {x.ownedMeters} m disponibles (brin simple)</p>)}
        </div>}
        <div className="flex flex-wrap justify-center gap-2 text-xs">
          <button className="rounded-md border border-white/20 px-3 py-2" onClick={()=>setShowSource(v=>!v)}>{showSource?"Masquer":"Voir"} la source originale</button>
          <button className="rounded-md border border-white/20 px-3 py-2" onClick={()=>output&&saveProjectFile(output)} disabled={!output}><FileJson size={14} className="mr-1 inline"/> Exporter JSON</button>
          <button className="rounded-md border border-white/20 px-3 py-2" onClick={()=>void exportPdf()} disabled={!output||busy}><Download size={14} className="mr-1 inline"/> Exporter PDF</button>
        </div>
        {showSource&&original&&<section className="space-y-2 rounded-md border border-white/10 p-3 text-xs">
          <h4 className="font-semibold">Source originale · non modifiée</h4>
          <div className="max-w-[480px] bg-[#f7f2e8] p-2">
            <SubjectPreview pattern={original} scene={{...scene,layers:[]}} selected={null}
              onChoose={()=>{}} onMove={()=>{}} />
          </div>
          <p className="text-white/70">Le patron source est conservé indépendamment des positions actuelles des sujets.</p>
        </section>}
        {scene.warnings.map((w,i)=><p key={i} className="rounded-md border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">{w}</p>)}
        {composed?.subjectScene?.warnings.filter(w=>!scene.warnings.includes(w)).map((w,i)=><p key={i} className="rounded-md border border-red-300/25 p-2 text-xs text-red-200">{w}</p>)}
        {(hiddenCount>0||offscreen||risks)&&<label className="flex items-center gap-2 text-xs text-amber-200">
          <input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>
          Je confirme les éléments cachés, les points hors-grille ou les risques de remplacement des fils.
        </label>}
        {result.error&&<p role="alert" className="text-sm text-red-200">{result.error}</p>}
        {message&&<p role="status" className="text-xs text-white/70">{message}</p>}
      </main>
      <aside className="thin-scroll space-y-3 border-t border-white/15 bg-[#09090b] p-4 lg:overflow-y-auto lg:border-l lg:border-t-0" aria-label="Calques et propriétés des sujets">
        <h3 className="text-sm font-semibold">Sujets indépendants</h3>
        <p className="text-xs text-white/70">Cliquez sur une zone de la grille, puis déplacez-la. L'ordre des sujets contrôle les chevauchements.</p>
        <div className="space-y-1.5">
          {scene.layers.map((layer,i)=><div key={layer.id} className={"flex items-center gap-2 rounded-md border p-2 text-xs "+(selectedId===layer.id?"border-white/50 bg-white/15":"border-white/15 bg-white/[.035]")}>
            <button className="min-w-0 flex-1 truncate text-left" onClick={()=>setSelectedId(layer.id)}>{i+1}. {layer.name}</button>
            <button aria-label={"Monter "+layer.name} disabled={i===0} className="disabled:opacity-20" onClick={()=>setScene(s=>reorderSubject(s,layer.id,-1))}><ArrowUp size={14}/></button>
            <button aria-label={"Descendre "+layer.name} disabled={i===scene.layers.length-1} className="disabled:opacity-20" onClick={()=>setScene(s=>reorderSubject(s,layer.id,1))}><ArrowDown size={14}/></button>
            <button aria-label={layer.visible?"Masquer "+layer.name:"Afficher "+layer.name} onClick={()=>adjust(layer.id,{visible:!layer.visible})}>{layer.visible?<Eye size={15}/>:<EyeOff size={15}/>}</button>
          </div>)}
        </div>
        {selected&&<div className="space-y-3 border-t border-white/15 pt-3">
          <label className="block text-xs text-white/65">Nom du sujet<input className={"mt-1 "+fieldClass} value={selected.name} maxLength={80} onChange={e=>adjust(selected.id,{name:e.target.value})}/></label>
          <div className="grid grid-cols-2 gap-2">
            {(["x","y"] as const).map(k=><label key={k} className="text-xs text-white/75">{k==="x"?"Colonne":"Rangée"}
              <input type="number" className={"mt-1 "+fieldClass} value={selected[k]} disabled={selected.locked} onChange={e=>adjust(selected.id,{[k]:+e.target.value||0})}/>
            </label>)}
          </div>
          <label className="block text-xs text-white/65">Taille du sujet ({Math.round(selected.scale*100)} %)
            <input type="range" min={50} max={200} step={10} value={selected.scale*100} disabled={selected.locked} className="mt-2 w-full" onChange={e=>adjust(selected.id,{scale:+e.target.value/100})}/>
          </label>
          <label className="block text-xs text-white/65">Teinte DMC (facultatif)
            <input className={"mt-1 "+fieldClass} list="subject-dmc" value={selected.tint??""} placeholder="ex. 321" disabled={selected.locked} onChange={e=>adjust(selected.id,{tint:e.target.value.trim().toUpperCase()})}/>
            <datalist id="subject-dmc">{FLOSS.slice(0,489).map(f=><option key={f.code} value={f.code}/>)}</datalist>
          </label>
          {!!selected.tint&&flossIndex(selected.tint)<0&&<p className="text-xs text-amber-200">Code DMC inconnu : teintes d'origine conservées.</p>}
          <div className="grid grid-cols-2 gap-2">
            <button className="rounded-md border border-white/20 px-2 py-2 text-xs" onClick={()=>adjust(selected.id,{locked:!selected.locked})}>{selected.locked?<LockOpen size={14} className="mr-1 inline"/>:<Lock size={14} className="mr-1 inline"/>}{selected.locked?"Déverrouiller":"Verrouiller"}</button>
            <button className="rounded-md border border-white/20 px-2 py-2 text-xs" onClick={()=>operation(()=>setScene(s=>duplicateSubject(s,selected.id)))}><Copy size={14} className="mr-1 inline"/> Dupliquer</button>
          </div>
          <button className="w-full rounded-md border border-white/20 px-3 py-2 text-xs" onClick={exportSelected}><FileJson size={14} className="mr-1 inline"/> Exporter ce sujet seul</button>
          <button type="button" className="w-full rounded-md border border-white/20 px-3 py-2 text-xs text-white/75" disabled={selected.locked}
            onClick={()=>operation(()=>{
              const next=removeSubject(scene,selected.id);setScene(next);
              setSelectedId(next.layers[0]?.id??null);
              setMessage("Élément retiré de la proposition. Le patron source reste enregistré.");
            })}><Trash2 size={14} className="mr-1 inline"/> Retirer cet élément</button>
          <div className="border-t border-white/10 pt-3 text-xs">
            <h4 className="mb-2 font-medium">Fusionner avec un autre sujet</h4>
            <select className={fieldClass} value={mergeId} onChange={e=>setMergeId(e.target.value)}>
              <option value="">Choisir un autre sujet</option>
              {scene.layers.filter(l=>l.id!==selected.id).map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <button className="mt-2 w-full rounded-md border border-white/20 p-2" disabled={!mergeId} onClick={()=>operation(()=>{
              const next=mergeSubjects(scene,selected.id,mergeId);
              setScene(next);setSelectedId(next.layers.find(l=>l.name.includes("+"))?.id??next.layers[0]?.id??null);setMergeId("");
            })}><GitMerge size={14} className="mr-1 inline"/> Fusionner</button>
          </div>
          <details className="border-t border-white/10 pt-3 text-xs">
            <summary className="cursor-pointer font-medium">Séparer une zone rectangulaire</summary>
            <p className="mt-2 text-white/70">Coordonnées internes au sujet, en cases. Les fractions/contours à la frontière doivent être vérifiés.</p>
            <div className="mt-2 grid grid-cols-4 gap-1">
              {(["x","y","w","h"] as const).map(k=><label key={k} className="text-[10px] text-white/75">{k}<input type="number" className={"mt-1 "+fieldClass} min={0} value={split[k]} onChange={e=>setSplit(s=>({...s,[k]:+e.target.value||0}))}/></label>)}
            </div>
            <button className="mt-2 w-full rounded-md border border-white/20 p-2" onClick={()=>operation(()=>{
              const next=splitSubject(scene,selected.id,split);setScene(next);setSelectedId(next.layers.find(l=>l.name.endsWith("· extrait"))?.id??selected.id);
            })}><Scissors size={14} className="mr-1 inline"/> Séparer</button>
          </details>
        </div>}
        <p className="border-t border-white/10 pt-3 text-[11px] leading-relaxed text-white/70">Aucune vente en ligne n'est activée. Extraction géométrique réelle, classification sémantique IA à ajouter et valider séparément. Tous les fichiers natifs restent soumis à leurs licences.</p>
      </aside>
    </div>
  </div>;
}
