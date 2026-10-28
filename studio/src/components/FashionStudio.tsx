import {writeStoredJSON} from "../lib/storageSafety";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, RotateCcw, Shirt, X } from "lucide-react";
import { GARMENTS, GARMENT_COLORS, createGarment, fashionTechSheet, fashionToSVG, validGarment, type GarmentProject, type GarmentSide } from "../lib/fashionStudio";
import { MOTIF_PRESETS } from "../lib/motifPresets";
import { StitchThumbnail } from "./MotifLibrary";

const KEY="pointzero:fashion-draft:v1";
const field="w-full rounded-[5px] border border-white/20 bg-[#202023] px-3 py-2 text-xs text-white outline-none focus:border-white/70";
const button="flex min-h-9 items-center justify-center gap-2 rounded-[5px] border border-white/20 bg-white/[.06] px-3 text-xs font-medium text-white hover:bg-white/15";
const restore=():GarmentProject=>{
  try{return validGarment(JSON.parse(localStorage.getItem(KEY)??""))??createGarment();}
  catch{return createGarment();}
};
function download(name:string,blob:Blob){
  const url=URL.createObjectURL(blob),link=document.createElement("a");
  link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),300);
}
async function svgToPng(markup:string):Promise<Blob>{
  const uri=URL.createObjectURL(new Blob([markup],{type:"image/svg+xml"}));
  try {
    const image=await new Promise<HTMLImageElement>((resolve,reject)=>{
      const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error("Impossible de convertir la maquette."));img.src=uri;
    });
    const canvas=document.createElement("canvas");
    canvas.width=1200;canvas.height=1300;
    const ctx=canvas.getContext("2d");
    if(!ctx)throw Error("Export PNG non disponible.");
    ctx.drawImage(image,0,0,1200,1300);
    return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error("Impossible de créer le PNG.")),"image/png"));
  }finally{URL.revokeObjectURL(uri);}
}
export default function FashionStudio({onBack,onUse}:{onBack:()=>void;onUse?:(dataUrl:string)=>void}){
  const [project,setProject]=useState<GarmentProject>(restore);
  const [notice,setNotice]=useState("");
  const [busy,setBusy]=useState(false);
  const [tab,setTab]=useState<"modeles"|"motifs">("modeles");
  const [showOptions,setShowOptions]=useState(false);
  const previews=useMemo(()=>MOTIF_PRESETS.map(p=>({...p,pattern:p.make()})),[]);
  const update=(patch:Partial<GarmentProject>)=>setProject(p=>({...p,...patch}));
  useEffect(()=>{
    try{writeStoredJSON(KEY,JSON.stringify(project),validGarment);}
    catch{setNotice("Enregistrement local indisponible : exportez le projet JSON.");}
  },[project]);
  const source=fashionToSVG(project,project.view);
  const svgUrl="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(source);
  const useInDesign=async()=>{
    if(!onUse||busy)return;
    setBusy(true);setNotice("");
    try {
      const png=await svgToPng(fashionToSVG(project,project.view));
      if(png.size>4_000_000)throw Error("Maquette trop volumineuse pour la composition.");
      const reader=new FileReader();
      const data=await new Promise<string>((resolve,reject)=>{
        reader.onload=()=>resolve(String(reader.result??""));
        reader.onerror=()=>reject(Error("Impossible de lire l'illustration."));
        reader.readAsDataURL(png);
      });
      onUse(data);
    }catch(err){setNotice(err instanceof Error?err.message:"Impossible d'utiliser la maquette.");}
    finally{setBusy(false);}
  };
  const exportIt=async(kind:"svg"|"png"|"json"|"fiche")=>{
    setBusy(true);setNotice("");setShowOptions(false);
    try {
      const name=(project.name.toLowerCase().replace(/[^a-z0-9]+/g,"-")||"stylisme");
      if(kind==="json"){
        download(name+".pointzero-fashion.json",new Blob([JSON.stringify(project,null,2)],{type:"application/json"}));return;
      }
      if(kind==="fiche"){
        download(name+"-fiche-concept.json",new Blob([JSON.stringify(fashionTechSheet(project),null,2)],{type:"application/json"}));return;
      }
      const sides:GarmentSide[]=["front","back"];
      for(const side of sides) {
        const svg=fashionToSVG(project,side);
        if(kind==="svg")download(name+"-"+side+".svg",new Blob([svg],{type:"image/svg+xml"}));
        else download(name+"-"+side+".png",await svgToPng(svg));
      }
      setNotice("Vues devant/dos exportées. Maquette de stylisme, pas patron de couture.");
    }catch(err){setNotice(err instanceof Error?err.message:"Export impossible.");}
    finally{setBusy(false);}
  };
  return <div className="pz-fashion fixed inset-0 flex h-[100dvh] flex-col overflow-hidden bg-[#151517] text-white">
    <header className="flex h-[58px] shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-[#09090b] px-3">
      <div className="flex items-center gap-3">
        <button onClick={onBack} aria-label="Retour aux supports graphiques" className={button}><ArrowLeft size={16}/></button>
        <div><h1 className="text-[14px] font-semibold"><span className="hidden sm:inline">× POINTZERO </span><span className="font-normal text-white/80">Stylisme</span></h1>
          <p className="hidden text-[10px] text-white/55 sm:block">Vêtement · composition · motif</p></div>
      </div>
      <div className="flex gap-2">
        <button onClick={()=>{setProject(createGarment());setNotice("Nouveau concept créé.");}} className={button} title="Nouveau concept"><RotateCcw size={15}/></button>
        {onUse&&<button type="button" disabled={busy} onClick={()=>void useInDesign()} aria-label="Utiliser la maquette dans un support" className={button}><span className="hidden sm:inline">Utiliser</span><span className="sm:hidden">↗</span></button>}
        <div className="relative">
          <button disabled={busy} onClick={()=>setShowOptions(o=>!o)} className="flex min-h-9 items-center gap-2 rounded-[5px] bg-white px-3 text-xs font-semibold text-black disabled:opacity-30"><Download size={15}/> Exporter</button>
          {showOptions&&<div className="pz-design-menu absolute right-0 top-[calc(100%+8px)] z-50 w-[200px] p-2">
            <p className="px-2 py-1 text-[11px] text-white/60">Devant et dos</p>
            <button className={button+" my-1 w-full justify-start"} onClick={()=>void exportIt("svg")}>SVG vectoriels</button>
            <button className={button+" my-1 w-full justify-start"} onClick={()=>void exportIt("png")}>PNG des maquettes</button>
            <button className={button+" my-1 w-full justify-start"} onClick={()=>void exportIt("json")}>Projet modifiable JSON</button>
            <button className={button+" my-1 w-full justify-start"} onClick={()=>void exportIt("fiche")}>Fiche concept JSON</button>
          </div>}
        </div>
      </div>
    </header>
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <aside aria-label="Bibliothèque de vêtements et motifs" className="thin-scroll max-h-[25dvh] shrink-0 overflow-y-auto border-b border-white/10 bg-[#09090b] p-3 lg:max-h-none lg:w-[250px] lg:border-b-0 lg:border-r">
        <div className="grid grid-cols-2 gap-1 border-b border-white/10 pb-2">
          <button type="button" onClick={()=>setTab("modeles")} className={(tab==="modeles"?"bg-white text-black":"bg-white/10 text-white")+" min-h-9 rounded-[5px] text-xs font-semibold"}>Vêtements</button>
          <button type="button" onClick={()=>setTab("motifs")} className={(tab==="motifs"?"bg-white text-black":"bg-white/10 text-white")+" min-h-9 rounded-[5px] text-xs font-semibold"}>Motifs</button>
        </div>
        {tab==="modeles"?<div className="mt-3 grid grid-cols-3 gap-2 lg:grid-cols-2">{GARMENTS.map(g=>
          <button key={g.id} onClick={()=>update({garment:g.id})} aria-pressed={project.garment===g.id}
            className={(project.garment===g.id?"border-white/70 bg-white/15":"border-white/15 bg-white/[.045]")+" flex min-h-20 flex-col items-center justify-center gap-2 rounded-[5px] border text-[11px] text-white hover:bg-white/10"}>
            <Shirt size={24} strokeWidth={1.5}/>{g.label}
          </button>)}</div>:<div className="mt-3 grid max-h-[180px] grid-cols-3 gap-2 overflow-auto lg:max-h-none lg:grid-cols-2">{previews.map(p=>
          <button key={p.id} onClick={()=>update(project.view==="front"?{motifId:p.id}:{backMotifId:p.id})} className="overflow-hidden rounded-[5px] border border-white/15 bg-white/[.05] hover:border-white/60">
            <span className="block bg-[#f8f4ee]"><StitchThumbnail pattern={p.pattern}/></span><span className="block truncate p-2 text-[11px]">{p.name}</span>
          </button>)}</div>}
        <p className="mt-3 text-[11px] leading-relaxed text-white/60">Choisissez un vêtement puis appliquez un motif indépendant sur chaque face.</p>
      </aside>
      <main aria-label="Maquette de vêtement" className="pz-design-stage flex min-h-[165px] min-w-0 flex-1 flex-col items-center justify-center overflow-auto p-3 sm:p-6 lg:min-h-[280px]">
        <div className="mb-3 flex gap-1 rounded-[5px] border border-white/20 bg-[#09090b] p-1">
          <button aria-pressed={project.view==="front"} className={(project.view==="front"?"bg-white text-black":"text-white/80")+" min-h-9 rounded-[4px] px-5 text-xs font-semibold"} onClick={()=>update({view:"front"})}>Devant</button>
          <button aria-pressed={project.view==="back"} className={(project.view==="back"?"bg-white text-black":"text-white/80")+" min-h-9 rounded-[4px] px-5 text-xs font-semibold"} onClick={()=>update({view:"back"})}>Dos</button>
        </div>
        <img alt={"Maquette "+project.garment+" "+(project.view==="front"?"devant":"dos")} src={svgUrl} className="block max-h-[65dvh] w-auto max-w-full shadow-[0_18px_60px_#0006]"/>
        <p className="mt-2 text-center text-[11px] text-white/65">Simulation graphique : proportions, couleurs et placement à valider avec un fabricant.</p>
      </main>
      <aside aria-label="Propriétés du vêtement" className="thin-scroll max-h-[26dvh] w-full shrink-0 overflow-y-auto border-t border-white/10 bg-[#09090b] p-4 lg:max-h-none lg:w-[270px] lg:border-l lg:border-t-0">
        <h2 className="mb-3 text-[13px] font-semibold">Vêtement</h2>
        <label className="block text-[11px] text-white/70">Nom de la collection
          <input aria-label="Nom de la collection" value={project.name} maxLength={120} className={field+" mt-1"} onChange={e=>update({name:e.target.value})}/>
        </label>
        <h3 className="mt-4 text-xs font-semibold">Couleurs du tissu</h3>
        <div className="mt-2 grid grid-cols-8 gap-1">{GARMENT_COLORS.map(c=>
          <button key={c} aria-label={"Couleur "+c} aria-pressed={project.baseColor===c} onClick={()=>update({baseColor:c})} className={"aspect-square rounded-[4px] border "+(project.baseColor===c?"border-white ring-2 ring-white/60":"border-white/25")} style={{background:c}}/>)}</div>
        <label className="mt-2 flex items-center justify-between gap-3 text-xs text-white/75">Couleur personnalisée
          <input aria-label="Couleur du tissu" type="color" value={project.baseColor} onChange={e=>update({baseColor:e.target.value})}/></label>
        <label className="mt-3 block text-xs text-white/70">Coupe
          <select aria-label="Coupe du vêtement" value={project.fit} onChange={e=>update({fit:e.target.value as GarmentProject["fit"]})} className={field+" mt-1"}>
            <option value="standard">Standard</option><option value="ample">Ample</option>
          </select>
        </label>
        <h3 className="mt-4 text-xs font-semibold">Décor · {project.view==="front"?"devant":"dos"}</h3>
        <label className="mt-2 block text-[11px] text-white/70">Texte sur le vêtement
          <input value={project.view==="front"?project.text:project.backText} maxLength={150} className={field+" mt-1"}
            onChange={e=>update(project.view==="front"?{text:e.target.value}:{backText:e.target.value})} placeholder="Nom, collection, message…"/>
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2"><label className="text-[11px] text-white/70">Taille du motif
            <input type="range" min="50" max="220" step="5" aria-label="Taille du motif" value={project.motifSize} className="mt-2 w-full accent-white" onChange={e=>update({motifSize:Number(e.target.value)})}/></label>
          <label className="text-[11px] text-white/70">Technique
            <select value={project.technique} aria-label="Technique décorative" className={field+" mt-1"} onChange={e=>update({technique:e.target.value as GarmentProject["technique"]})}>
              <option value="embroidery">Broderie</option><option value="print">Impression</option>
            </select></label></div>
        <div className="mt-3 grid grid-cols-2 gap-2">{(["motifX","motifY"] as const).map(k=>
          <label key={k} className="block text-[11px] text-white/70">{k==="motifX"?"Horizontal":"Vertical"}
            <input type="range" min={170} max={430} value={project[k]} aria-label={"Placement "+k} onChange={e=>update({[k]:Number(e.target.value)})} className="mt-1 w-full accent-white"/>
          </label>)}</div>
        <details className="mt-4 border-t border-white/15 pt-2" open>
          <summary className="min-h-9 cursor-pointer text-xs font-semibold">Fiche concept</summary>
          <label className="mt-2 block text-xs text-white/70">Matière
            <select className={field+" mt-1"} value={project.fabric} onChange={e=>update({fabric:e.target.value as GarmentProject["fabric"]})}>
              <option value="coton">Coton</option><option value="molleton">Molleton</option><option value="autre">Autre / à préciser</option>
            </select>
          </label>
          <p className="mt-3 text-[11px] text-white/70">Tailles</p>
          <div className="mt-1 grid grid-cols-6 gap-1">{["XS","S","M","L","XL","XXL"].map(s=>
            <button key={s} onClick={()=>update({sizes:project.sizes.includes(s)?project.sizes.filter(x=>x!==s):[...project.sizes,s]})}
              aria-pressed={project.sizes.includes(s)} className={(project.sizes.includes(s)?"bg-white text-black":"bg-white/10 text-white")+" min-h-8 rounded-[4px] text-[10px]"}>{s}</button>)}</div>
          <textarea className={field+" mt-3 w-full"} rows={3} value={project.notes} onChange={e=>update({notes:e.target.value.slice(0,3000)})} placeholder="Notes de conception" aria-label="Notes de conception"/>
        </details>
        <p className="mt-3 text-[11px] text-white/55">Les dimensions sont celles d'une maquette, pas celles d'un patron de couture industriel. L'export ne contient pas de gradation des tailles.</p>
      </aside>
    </div>
    {notice&&<div role="status" className="absolute bottom-3 left-1/2 z-40 flex max-w-[90vw] -translate-x-1/2 items-center gap-3 rounded-[5px] border border-white/20 bg-[#09090b] px-4 py-3 text-xs">{notice}<button aria-label="Fermer le message" onClick={()=>setNotice("")}><X size={14}/></button></div>}
  </div>;
}
