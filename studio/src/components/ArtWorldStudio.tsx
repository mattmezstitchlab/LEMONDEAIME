import {writeStoredJSON} from "../lib/storageSafety";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ChangeEvent } from "react";
import { ArrowLeftRight, Download, FolderOpen, Frame, Image, PenLine, Plus, Redo2, Save, Search, Sparkles, Undo2, Volume2, VolumeX, WandSparkles } from "lucide-react";
import { StudioFrame, saveStudioFile, studioButton, studioInput } from "./StudioFrame";
import { BASE_FLOSS, flossIndex } from "../lib/dmc";
import { imageToDmc } from "../lib/dither";
import { createPattern, ensurePalette, type Pattern } from "../lib/pattern";
import {
  ART_KEY, ART_W, ART_H, GALLERY_KEY, ART_DMC_FAVORITES, ART_PAPERS, ART_TOOLS,
  artColor, artId, artMarkSVG, artPaletteAnalysis, artToSVG, dmcSound,
  makeArt, requestArtTool, safeArt, safeGallery, type ArtPoint, type ArtProject,
  type ArtMark, type ArtTool, type GalleryItem
} from "../lib/artWorldCore";

const validStoredGallery=(v:unknown)=>Array.isArray(v)&&safeGallery(v).length===v.length;
const today=()=>new Date().toISOString().slice(0,10);
const readArt=()=>{try{return safeArt(JSON.parse(localStorage.getItem(ART_KEY)??"null"))??makeArt();}catch{return makeArt();}};
const readGallery=()=>{try{return safeGallery(JSON.parse(localStorage.getItem(GALLERY_KEY)??"null"));}catch{return [];}};
const toURL=(p:ArtProject,framed=false)=>"data:image/svg+xml;charset=utf-8,"+encodeURIComponent(artToSVG(p,{framed}));
const loadSVGImage=(p:ArtProject)=>new Promise<HTMLImageElement>((resolve,reject)=>{
  const img=new window.Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error("Aperçu de l'œuvre indisponible."));img.src=toURL(p);
});
const artToPNG=async(p:ArtProject,framed=false)=>{
  const image=await new Promise<HTMLImageElement>((resolve,reject)=>{
    const img=new window.Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error("Export image indisponible."));img.src=toURL(p,framed);
  });
  const canvas=document.createElement("canvas");canvas.width=ART_W;canvas.height=ART_H;
  const context=canvas.getContext("2d");if(!context)throw Error("Canvas indisponible.");
  context.drawImage(image,0,0,ART_W,ART_H);
  return canvas.toDataURL("image/png");
};
const downloadURL=(name:string,url:string)=>{
  const anchor=document.createElement("a");anchor.href=url;anchor.download=name;document.body.appendChild(anchor);anchor.click();anchor.remove();
};
const tone=(ctx:AudioContext,code:string,hex:string)=>{
  const {midi,duration}=dmcSound(code,hex),osc=ctx.createOscillator(),gain=ctx.createGain();
  const start=ctx.currentTime+.005;osc.type="sine";
  osc.frequency.setValueAtTime(440*2**((midi-69)/12),start);
  gain.gain.setValueAtTime(.0001,start);
  gain.gain.linearRampToValueAtTime(.075,start+.02);
  gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  osc.connect(gain);gain.connect(ctx.destination);osc.start(start);osc.stop(start+duration+.015);
  osc.onended=()=>{osc.disconnect();gain.disconnect();};
};
interface Props {onBack:()=>void;onPattern:(p:Pattern)=>void;onDesign:(dataURL:string)=>void;startInGallery?:boolean}
const lineDist=(p:ArtPoint,a:ArtPoint,b:ArtPoint)=>{
  const vx=b.x-a.x,vy=b.y-a.y,d=vx*vx+vy*vy||1;
  const t=Math.max(0,Math.min(1,((p.x-a.x)*vx+(p.y-a.y)*vy)/d));
  return Math.hypot(p.x-(a.x+vx*t),p.y-(a.y+vy*t));
};
const near=(p:ArtPoint,m:ArtMark)=>m.points.some((a,i)=>i===0?Math.hypot(p.x-a.x,p.y-a.y)<m.width/2+19:lineDist(p,m.points[i-1],a)<m.width/2+15);
export default function ArtWorldStudio({onBack,onPattern,onDesign,startInGallery=false}:Props){
  const [project,setProject]=useState<ArtProject>(readArt);
  const [gallery,setGallery]=useState<GalleryItem[]>(readGallery);
  const [tool,setTool]=useState<ArtTool>("pencil");
  const [active,setActive]=useState(()=>Math.max(0,flossIndex("820")));
  const [ink,setInk]=useState<string|null>(null);
  const [size,setSize]=useState(5);
  const [opacity,setOpacity]=useState(1);
  const [search,setSearch]=useState("");
  const [request,setRequest]=useState("");
  const [status,setStatus]=useState("");
  const [galleryMode,setGalleryMode]=useState(startInGallery);
  const [selected,setSelected]=useState<string|null>(null);
  const [draft,setDraft]=useState<ArtMark|null>(null);
  const [past,setPast]=useState<ArtProject[]>([]);
  const [future,setFuture]=useState<ArtProject[]>([]);
  const [sound,setSound]=useState(false);
  const [framed,setFramed]=useState(true);
  const [busy,setBusy]=useState(false);
  const picker=useRef<HTMLInputElement>(null);
  const interaction=useRef<{id:number;kind:"draw"|"move";start:ArtPoint;mark:ArtMark|null;original:ArtProject}|null>(null);
  const svg=useRef<SVGSVGElement>(null);
  const audio=useRef<AudioContext|null>(null);
  useEffect(()=>()=>{if(audio.current){void audio.current.close();audio.current=null;}},[]);
  useEffect(()=>{try{writeStoredJSON(ART_KEY,JSON.stringify(project),safeArt);}catch{setStatus("Stockage local saturé. Exportez votre œuvre JSON.");}},[project]);
  const analysis=useMemo(()=>artPaletteAnalysis(project),[project]);
  const currentColor=ink??artColor(active);
  const stepWidth=size;
  const stepOpacity=opacity;
  const choices=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return q?BASE_FLOSS.map((f,i)=>({...f,i})).filter(f=>f.code.toLowerCase().includes(q)||f.name.toLowerCase().includes(q)).slice(0,85):
      ART_DMC_FAVORITES.map(code=>flossIndex(code)).filter(i=>i>=0).map(i=>({...BASE_FLOSS[i],i}));
  },[search]);
  const commit=(next:ArtProject)=>{
    if(next===project)return;
    setPast(p=>[...p.slice(-29),project]);setFuture([]);setProject(next);
  };
  const undo=()=>{
    if(!past.length)return;const prev=past[past.length-1];setPast(p=>p.slice(0,-1));setFuture(f=>[project,...f].slice(0,30));setProject(prev);
  };
  const redo=()=>{
    if(!future.length)return;const [next,...rest]=future;setPast(p=>[...p.slice(-29),project]);setFuture(rest);setProject(next);
  };
  const point=(e:ReactPointerEvent<SVGSVGElement>):ArtPoint=>{
    const rect=e.currentTarget.getBoundingClientRect();
    return {x:Math.max(0,Math.min(ART_W,(e.clientX-rect.left)/Math.max(1,rect.width)*ART_W)),
      y:Math.max(0,Math.min(ART_H,(e.clientY-rect.top)/Math.max(1,rect.height)*ART_H))};
  };
  const down=(e:ReactPointerEvent<SVGSVGElement>)=>{
    if(e.button!==0||interaction.current)return;
    if(project.marks.length>=2000){setStatus("Limite de 2 000 éléments atteinte. Enregistrez votre œuvre avant d'en créer une autre.");return;}
    const p=point(e);
    const hit=[...project.marks].reverse().find(m=>near(p,m));
    if(tool==="eraser"){
      if(hit){commit({...project,marks:project.marks.filter(m=>m.id!==hit.id)});setSelected(null);}
      return;
    }
    if(tool==="move"){
      setSelected(hit?.id??null);
      if(hit){interaction.current={id:e.pointerId,kind:"move",start:p,mark:hit,original:project};e.currentTarget.setPointerCapture(e.pointerId);}
      return;
    }
    const mark:ArtMark={id:artId(),tool,color:currentColor,width:stepWidth,opacity:stepOpacity,points:[p]};
    interaction.current={id:e.pointerId,kind:"draw",start:p,mark,original:project};
    setDraft(mark);e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move=(e:ReactPointerEvent<SVGSVGElement>)=>{
    const drag=interaction.current;if(!drag||drag.id!==e.pointerId||!drag.mark)return;
    const p=point(e);
    if(drag.kind==="move"){
      const dx=p.x-drag.start.x,dy=p.y-drag.start.y;
      const points=drag.mark.points.map(pt=>({x:Math.max(0,Math.min(ART_W,pt.x+dx)),y:Math.max(0,Math.min(ART_H,pt.y+dy))}));
      setDraft({...drag.mark,points});
    }else if(["stencil","pin","cross"].includes(tool)){return;}
    else if(draft){
      const last=draft.points[draft.points.length-1];
      if(Math.hypot(p.x-last.x,p.y-last.y)<1.5)return;
      setDraft({...draft,points:[...draft.points.slice(-1499),p]});
    }
  };
  const finish=(e:ReactPointerEvent<SVGSVGElement>)=>{
    const drag=interaction.current;if(!drag||drag.id!==e.pointerId)return;
    const complete=draft??drag.mark;
    if(complete){
      const next=drag.kind==="move"?{...drag.original,marks:drag.original.marks.map(m=>m.id===complete.id?complete:m)}:
        {...drag.original,marks:[...drag.original.marks,complete]};
      if(drag.kind!=="move"||JSON.stringify(complete.points)!==JSON.stringify(drag.mark?.points)){
        commit(next);setSelected(complete.id);
      }
    }
    interaction.current=null;setDraft(null);
    try{e.currentTarget.releasePointerCapture(e.pointerId);}catch{/* browser released capture */ }
  };
  const chooseColor=(i:number)=>{
    setActive(i);setInk(null);
    if(!sound)return;
    try{
      const native=window.AudioContext;if(!native)return;
      const ctx=audio.current??(audio.current=new native());
      void ctx.resume().then(()=>tone(ctx,BASE_FLOSS[i].code,BASE_FLOSS[i].hex)).catch(()=>setStatus("Audio indisponible."));
    }catch{setStatus("Audio indisponible. Les couleurs restent accessibles sans son.");}
  };
  const applyToolRequest=()=>{
    const found=requestArtTool(request,{tool,color:currentColor,width:stepWidth,opacity:stepOpacity,message:""});
    if(!found){setStatus("Outil non reconnu. Essayez : « crayon bleu foncé », « aquarelle », « fusain » ou « ruban adhésif ».");return;}
    setTool(found.tool);setInk(found.color);setSize(found.width);setOpacity(found.opacity);setStatus(found.message);
  };
  const createNew=()=>{
    if(!window.confirm("Créer une nouvelle toile ? Exportez votre œuvre ou placez-la dans la galerie privée avant de continuer."))return;
    commit(makeArt());setSelected(null);
  };
  const savePrivateGallery=()=>{
    if(!project.marks.length){setStatus("Dessinez au moins un élément pour préparer une œuvre.");return;}
    const item:GalleryItem={id:artId(),title:project.title,created:today(),visibility:"private",project:structuredClone(project)};
    const next=[item,...gallery].slice(0,12);
    try{
      if(JSON.stringify(next).length>3_000_000)throw Error("Galerie volumineuse");
      writeStoredJSON(GALLERY_KEY,JSON.stringify(next),validStoredGallery);setGallery(next);setGalleryMode(true);
      setStatus("Œuvre ajoutée à votre galerie privée. Aucune publication ni vente en ligne.");
    }catch{setStatus("Espace local insuffisant. Exportez votre œuvre SVG ou JSON.");}
  };
  const importProject=async(e:ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0];e.target.value="";if(!file)return;
    if(file.size>3_000_000){setStatus("Fichier trop volumineux.");return;}
    try{
      const parsed=safeArt(JSON.parse(await file.text()));if(!parsed)throw Error("Format d'atelier invalide.");
      if(!window.confirm("Ouvrir cette œuvre ? Les changements non exportés du projet courant seront remplacés."))return;
      commit(parsed);setSelected(null);setStatus("Œuvre chargée localement.");
    }catch(err){setStatus(err instanceof Error?err.message:"Import impossible.");}
  };
  const saveSVG=()=>saveStudioFile("le-monde-aime-oeuvre.svg",artToSVG(project,{framed}),"image/svg+xml;charset=utf-8");
  const savePNG=async()=>{
    setBusy(true);
    try{downloadURL("le-monde-aime-oeuvre.png",await artToPNG(project,framed));}
    catch(err){setStatus(err instanceof Error?err.message:"Export PNG impossible.");}
    finally{setBusy(false);}
  };
  const toDesign=async()=>{
    setBusy(true);
    try{onDesign(await artToPNG(project));}
    catch(e){setStatus(e instanceof Error?e.message:"Transmission au Graphisme indisponible.");}
    finally{setBusy(false);}
  };
  const toPattern=async()=>{
    setBusy(true);
    try{
      const img=await loadSVGImage(project),w=120,h=76;
      const converted=imageToDmc(img,w,h,{mode:"dither",maxColors:32,dropWhite:true});
      const pattern=createPattern(project.title.slice(0,60),w,h,14,2);
      pattern.cross=converted.cross;
      for(const i of converted.palette)ensurePalette(pattern,i);
      pattern.notes="Œuvre personnelle du Studio LE MONDE AIME, conversion DMC locale. Vérifier les fils et points.";
      onPattern(pattern);
    }catch(e){setStatus(e instanceof Error?e.message:"Conversion en patron indisponible.");}
    finally{setBusy(false);}
  };
  const actions=<div className="flex items-center gap-1">
    <button type="button" aria-label="Annuler dans l'atelier libre" disabled={!past.length} onClick={undo} className={studioButton+" !px-2"}><Undo2 size={16}/></button>
    <button type="button" aria-label="Rétablir dans l'atelier libre" disabled={!future.length} onClick={redo} className={studioButton+" !px-2"}><Redo2 size={16}/></button>
    <button type="button" aria-label="Exporter l'œuvre en SVG" onClick={saveSVG} className={studioButton+" !px-2"}><Download size={16}/></button>
    <button type="button" aria-label="Enregistrer en galerie privée" onClick={savePrivateGallery} className="flex min-h-9 items-center gap-1.5 rounded-[5px] bg-white px-3 text-xs font-semibold text-black"><Frame size={15}/><span className="hidden sm:inline">Galerie</span></button>
  </div>;
  return <StudioFrame title="LE MONDE AIME" subtitle="Un amour, une toile, un monde · laboratoire libre"
    onBack={onBack} leftLabel="Outils et matières de l'atelier" rightLabel="Sens et transformations" actions={actions}
    left={<div className="pb-32">
      <h2 className="mb-3 text-sm font-semibold">Mon atelier</h2>
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-[5px] border border-white/10 p-1">
        <button type="button" aria-pressed={!galleryMode} onClick={()=>setGalleryMode(false)} className={(!galleryMode?"bg-white text-black":"text-white/70 hover:bg-white/10")+" rounded-[4px] py-2 text-xs"}>Créer</button>
        <button type="button" aria-pressed={galleryMode} onClick={()=>setGalleryMode(true)} className={(galleryMode?"bg-white text-black":"text-white/70 hover:bg-white/10")+" rounded-[4px] py-2 text-xs"}>Galerie privée</button>
      </div>
      {!galleryMode?<><h3 className="mb-2 text-xs font-semibold">Outils d'artiste</h3>
        <div className="grid grid-cols-2 gap-2" aria-label="Outils de l'atelier libre">
          {ART_TOOLS.map(t=><button key={t.id} type="button" aria-label={"Outil "+t.name} aria-pressed={tool===t.id}
            onClick={()=>{setTool(t.id);setSize(({pencil:4,brush:14,watercolor:34,pastel:19,charcoal:12,tape:34,stencil:28,cross:14,pin:12,eraser:25,move:12} as Record<ArtTool,number>)[t.id]);setOpacity(t.id==="watercolor"?.34:t.id==="pastel"?.64:t.id==="tape"?.5:1);}}
            className={"min-h-[61px] rounded-[5px] border px-2 py-2 text-left "+(tool===t.id?"border-white bg-white text-black":"border-white/15 bg-white/[.04] text-white/80 hover:bg-white/10")}>
            <span className="block text-xs font-semibold">{t.name}</span>
            <span className={"mt-1 block text-[10px] "+(tool===t.id?"text-black/60":"text-white/55")}>{t.description}</span>
          </button>)}
        </div>
        <div className="mt-4 border-t border-white/10 pt-4">
          <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold"><WandSparkles size={15}/> Demander un outil</h3>
          <p className="mb-2 text-[11px] text-white/60">Exemple : « Je veux un crayon bleu foncé » ou « Donne-moi de l'aquarelle ».</p>
          <input aria-label="Demander un outil d'artiste" value={request} maxLength={220} onChange={e=>setRequest(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter")applyToolRequest();}} className={studioInput} placeholder="Quel outil vous ferait plaisir ?"/>
          <button onClick={applyToolRequest} className={studioButton+" mt-2 w-full"}><Sparkles size={15}/> Préparer cet outil</button>
          <p className="mt-2 text-[10px] leading-relaxed text-white/50">Première version : les demandes configurent les outils existants localement. Elles ne créent pas encore de nouveaux moteurs physiques par IA.</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
          <button onClick={createNew} className={studioButton}><Plus size={14}/> Nouvelle toile</button>
          <button onClick={()=>picker.current?.click()} className={studioButton}><FolderOpen size={14}/> Import JSON</button>
        </div>
      </>:<div aria-label="Galerie privée d'œuvres" className="space-y-3">
        <p className="text-xs text-white/60">Œuvres visibles uniquement sur cet appareil. Aucun compte public ni mise en vente automatique.</p>
        {gallery.map(item=><button type="button" key={item.id} className="w-full overflow-hidden rounded-[6px] border border-white/15 text-left hover:bg-white/10"
          onClick={()=>{setProject(item.project);setPast([]);setFuture([]);setGalleryMode(false);}}>
          <img src={toURL(item.project,true)} alt={"Œuvre "+item.title} className="aspect-[12/7.6] w-full bg-white object-contain"/>
          <span className="block px-3 py-2 text-xs font-semibold">{item.title}</span>
          <span className="block px-3 pb-2 text-[10px] text-white/55">{item.created} · Privé · Ouvrir</span>
        </button>)}
        {!gallery.length&&<p className="text-xs text-white/55">Aucune œuvre exposée. Créez une toile puis choisissez « Galerie ».</p>}
      </div>}
    </div>}
    right={<div className="space-y-4 pb-32">
      <h2 className="text-sm font-semibold">Intention & transformation</h2>
      <label className="block text-xs text-white/70">Titre de l'œuvre
        <input className={studioInput+" mt-1"} aria-label="Titre de l'œuvre" value={project.title} maxLength={120} onChange={e=>setProject(p=>({...p,title:e.target.value}))}/>
      </label>
      <label className="block text-xs text-white/70">Signature ou pseudonyme (facultatif)
        <input className={studioInput+" mt-1"} aria-label="Signature de l'œuvre" value={project.alias} maxLength={80} onChange={e=>setProject(p=>({...p,alias:e.target.value}))}/>
      </label>
      <label className="block text-xs text-white/70">Toile
        <select className={studioInput+" mt-1"} value={project.paper} onChange={e=>commit({...project,paper:e.target.value as ArtProject["paper"]})}>
          {ART_PAPERS.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-white/70">Épaisseur <span className="text-white">{size}px</span>
          <input type="range" aria-label="Épaisseur du trait" min={1} max={80} value={size} onChange={e=>setSize(Number(e.target.value))} className="mt-2 w-full accent-white"/>
        </label>
        <label className="text-xs text-white/70">Opacité <span className="text-white">{Math.round(opacity*100)} %</span>
          <input type="range" aria-label="Opacité du trait" min={10} max={100} value={Math.round(opacity*100)}
            onChange={e=>setOpacity(Number(e.target.value)/100)} className="mt-2 w-full accent-white"/>
        </label>
      </div>
      <div className="rounded-[6px] border border-white/15 bg-white/5 p-3">
        <h3 className="text-xs font-semibold">Lecture artistique descriptive</h3>
        <p className="mt-2 text-[11px] leading-relaxed text-white/70">{analysis.marks} éléments · {analysis.colors.length} couleurs · {analysis.materials.length} matières utilisées.</p>
        <div className="mt-2 flex gap-1">{analysis.colors.slice(0,12).map(c=><span key={c} title={c} className="size-5 rounded-[4px] border border-white/20" style={{background:c}}/>)}</div>
        <p className="mt-3 text-[10px] leading-relaxed text-white/55">Description des choix visuels uniquement : pas de diagnostic, d'inférence psychologique, ni de valeur marchande calculée sur la personnalité.</p>
      </div>
      <div className="space-y-2 border-t border-white/10 pt-4">
        <h3 className="text-xs font-semibold">Transformer l'œuvre</h3>
        <button onClick={()=>void toPattern()} disabled={busy||!project.marks.length} className={studioButton+" w-full"}><ArrowLeftRight size={15}/> En patron DMC</button>
        <button onClick={()=>void toDesign()} disabled={busy||!project.marks.length} className={studioButton+" w-full"}><Image size={15}/> En graphisme</button>
        <button onClick={()=>void savePNG()} disabled={busy} className={studioButton+" w-full"}><Download size={15}/> Export PNG</button>
        <button onClick={saveSVG} className={studioButton+" w-full"}><PenLine size={15}/> Export SVG</button>
        <button onClick={()=>saveStudioFile("le-monde-aime-oeuvre.json",JSON.stringify(project,null,2))}
          className={studioButton+" w-full"}><Save size={15}/> Sauvegarde JSON</button>
        <label className="flex items-center gap-2 text-xs text-white/75"><input type="checkbox" checked={framed} onChange={e=>setFramed(e.target.checked)} className="accent-white"/>Encadrement à l'export</label>
      </div>
      <p className="text-[11px] leading-relaxed text-white/55">La galerie est privée sur cet appareil. La publication, la vente, les droits des auteurs mineurs et le partage nécessiteront des autorisations et un service distinct.</p>
      {selected&&<p className="text-[10px] text-white/55">Élément sélectionné. Utilisez « Déplacer » ou « Gomme » pour le modifier.</p>}
    </div>}
  >
    <div className="mx-auto flex max-w-[1280px] flex-col pb-28">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div><p className="text-[10px] font-semibold uppercase tracking-widest text-white/55">Un amour, une toile, un monde</p>
          <h2 className="mt-1 text-lg font-semibold">{project.title}</h2></div>
        <span className="text-xs text-white/60">{tool==="eraser"?"Effacer un objet":tool==="move"?"Déplacer un objet":"Dessiner librement"} · {BASE_FLOSS[active]?.code??"Couleur personnalisée"}</span>
      </div>
      <div className="relative overflow-hidden rounded-[6px] border border-white/15 bg-[#2b2b30] p-2 sm:p-5">
        <svg ref={svg} viewBox={"0 0 "+ART_W+" "+ART_H} role="application" aria-label="Toile libre tactile et souris"
          className="block aspect-[1200/760] w-full touch-none select-none rounded-[3px] bg-white shadow-xl"
          onPointerDown={down} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}>
          <defs><filter id="art-wash" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3.5"/></filter></defs>
          <rect width={ART_W} height={ART_H} fill={ART_PAPERS.find(p=>p.id===project.paper)?.color??"#faf8f3"}/>
          <g dangerouslySetInnerHTML={{__html:project.marks.filter(m=>m.id!==interaction.current?.mark?.id||interaction.current?.kind!=="move").map(artMarkSVG).join("")}}/>
          {draft&&<g dangerouslySetInnerHTML={{__html:artMarkSVG(draft)}}/>}
        </svg>
        {project.marks.length===0&&<div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 rounded-[5px] bg-white/90 px-4 py-2 text-center text-xs text-black/65 shadow-md">
          Dessinez, touchez ou posez votre premier point sur la toile.
        </div>}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-white/55">
        <p>Le dessin, les matériaux et les couleurs sont préservés dans le projet local.</p>
        <span>{project.marks.length} éléments</span>
      </div>
      {status&&<p role="status" className="mt-3 rounded-[5px] border border-white/20 bg-[#09090b] p-3 text-xs text-white">{status}</p>}
      {busy&&<p role="status" className="mt-2 text-xs text-white/70">Transformation en cours…</p>}
    </div>
    <div className="fixed inset-x-0 bottom-0 z-30 flex h-[108px] flex-col border-t border-white/15 bg-[#09090b] text-white" aria-label="Palette universelle de matières, couleurs et sons">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-white/10 px-3">
        <strong className="shrink-0 text-[11px]">Couleurs · DMC</strong>
        <label className="relative min-w-0 max-w-[220px] flex-1"><Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/50"/>
          <input type="search" aria-label="Rechercher une couleur DMC" placeholder="Code ou nom" value={search} onChange={e=>setSearch(e.target.value)}
            className="h-7 w-full rounded-[4px] border border-white/15 bg-white/10 pl-7 pr-2 text-[11px] text-white outline-none placeholder:text-white/50"/>
        </label>
        <button type="button" aria-label={sound?"Désactiver les sons des couleurs":"Activer les sons des couleurs"} aria-pressed={sound} onClick={()=>setSound(v=>!v)}
          className="ml-auto flex shrink-0 items-center gap-1 rounded-[4px] px-2 py-1 text-[11px] hover:bg-white/10">{sound?<Volume2 size={15}/>:<VolumeX size={15}/>}<span className="hidden sm:inline">{sound?"Son actif":"Couleur sonore"}</span></button>
      </div>
      <div className="no-scrollbar flex min-h-0 flex-1 items-center gap-2 overflow-x-auto px-3" role="group" aria-label="Nuancier horizontal universel">
        {choices.map(f=><button type="button" key={f.code} aria-label={"Choisir DMC "+f.code+" "+f.name} aria-pressed={active===f.i&&ink===null}
          onClick={()=>chooseColor(f.i)} title={"DMC "+f.code+" · "+f.name}
          className={"flex min-w-[58px] shrink-0 flex-col items-center gap-1 rounded-[4px] px-1 py-1 text-[10px] "+(active===f.i&&ink===null?"bg-white/15 ring-1 ring-white/60":"hover:bg-white/10")}>
          <span className="h-7 w-10 rounded-[4px] border border-white/30" style={{background:f.hex}}/>
          <span className="font-mono text-white/75">{f.code}</span>
        </button>)}
        {ink&&<button type="button" className="shrink-0 rounded-[4px] border border-white/50 px-2 py-1 text-[10px] text-white" title="Couleur sur demande" onClick={()=>setInk(null)}>
          <span className="mb-1 block h-7 w-10 rounded-[4px]" style={{background:ink}}/>{ink}</button>}
        {!choices.length&&<span className="text-xs text-white/60">Aucune référence DMC trouvée.</span>}
      </div>
    </div>
    <input type="file" ref={picker} accept=".json,application/json" className="sr-only" aria-label="Charger une œuvre JSON" onChange={e=>void importProject(e)}/>
  </StudioFrame>;
}
