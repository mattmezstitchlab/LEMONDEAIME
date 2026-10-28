import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ArrowLeft, Check, Download, FlipHorizontal2, ImagePlus, RotateCcw, RotateCw, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { autoLight, DEFAULT_RECIPE, PHOTO_PRESETS, photoDimensions, renderPhoto, type CropRatio, type PhotoRecipe } from "../lib/photoRecipe";

const button="flex min-h-9 items-center justify-center gap-2 rounded-[5px] border border-white/20 bg-white/[.06] px-3 text-xs font-medium text-white hover:bg-white/15 disabled:opacity-35";
const name = (fileName: string) => fileName.replace(/\.[^.]+$/,"").slice(0,110).replace(/[^a-zA-Z0-9 _-]/g,"") || "photo";
async function blobFromCanvas(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error("Export du fichier impossible.")),type,quality));
}
function save(blob:Blob,filename:string) {
  const url=URL.createObjectURL(blob),link=document.createElement("a");
  link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),300);
}
interface Props { onBack:()=>void; onUse:(dataUrl:string)=>void }
export default function PhotoStudio({onBack,onUse}:Props) {
  const [source,setSource]=useState<{name:string;width:number;height:number}|null>(null);
  const image=useRef<ImageBitmap|null>(null);
  const canvas=useRef<HTMLCanvasElement>(null);
  const picker=useRef<HTMLInputElement>(null);
  const [recipe,setRecipe]=useState<PhotoRecipe>(DEFAULT_RECIPE);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const update=(patch:Partial<PhotoRecipe>)=>setRecipe(prev=>({...prev,...patch}));
  useEffect(()=>{
    return ()=>{image.current?.close();image.current=null;};
  },[]);
  useEffect(()=>{
    if(!source||!image.current||!canvas.current)return;
    try {renderPhoto(canvas.current,image.current,source.width,source.height,recipe,1800);}
    catch(e){setMessage(e instanceof Error?e.message:"Impossible de prévisualiser cette photo.");}
  },[recipe,source]);
  const importPhoto=async(e:ChangeEvent<HTMLInputElement>)=>{
    const f=e.target.files?.[0];e.target.value="";
    if(!f)return;
    if(!["image/jpeg","image/png","image/webp"].includes(f.type)||f.size>12*1024*1024){
      setMessage("Choisissez un PNG, JPEG ou WebP de 12 Mo maximum.");return;
    }
    setBusy(true);setMessage("");
    try {
      const bitmap=await createImageBitmap(f);
      if(bitmap.width>7000||bitmap.height>7000||bitmap.width<10||bitmap.height<10) {
        bitmap.close();throw Error("Photo hors limites : 10 à 7 000 pixels par côté.");
      }
      image.current?.close();image.current=bitmap;
      setRecipe(DEFAULT_RECIPE);
      setSource({name:name(f.name),width:bitmap.width,height:bitmap.height});
    }catch(e){setMessage(e instanceof Error?e.message:"Impossible de décoder la photo.");}
    finally{setBusy(false);}
  };
  const automatic=()=>{
    if(!image.current||!source)return;
    try {
      const temp=document.createElement("canvas");temp.width=128;temp.height=128;
      const ctx=temp.getContext("2d",{willReadFrequently:true});
      if(!ctx)throw Error("Analyse indisponible.");
      ctx.drawImage(image.current,0,0,128,128);
      const values=ctx.getImageData(0,0,128,128).data;
      update(autoLight(values));setMessage("Lumière équilibrée automatiquement selon la luminosité moyenne de la photo.");
    }catch{setMessage("Réglage automatique indisponible dans ce navigateur.");}
  };
  const output=async(type:"image/png"|"image/jpeg"|"design")=>{
    if(!image.current||!source)return;
    setBusy(true);setMessage("");
    try {
      const final=document.createElement("canvas");
      renderPhoto(final,image.current,source.width,source.height,recipe,2200);
      if(type==="design"){
        const handoff=document.createElement("canvas");
        renderPhoto(handoff,image.current,source.width,source.height,recipe,1400);
        const png=handoff.toDataURL("image/png");
        if(png.length>5_500_000)throw Error("Photo trop volumineuse pour la composition. Essayez le JPEG ou un cadrage plus petit.");
        onUse(png);
      }else {
        const blob=await blobFromCanvas(final,type,type==="image/jpeg"?.9:undefined);
        save(blob,source.name+"-pointzero."+(type==="image/png"?"png":"jpg"));
        setMessage("Photo exportée : les changements ont été appliqués à une copie, l’original reste intact.");
      }
    }catch(e){setMessage(e instanceof Error?e.message:"Export indisponible.");}
    finally{setBusy(false);}
  };
  const exportPack=async()=>{
    if(!image.current||!source)return;
    setBusy(true);setMessage("");
    try {
      for(const crop of ["1:1","4:5","9:16","16:9"] as CropRatio[]){
        const canvas=document.createElement("canvas");
        renderPhoto(canvas,image.current,source.width,source.height,{...recipe,crop},1800);
        const blob=await blobFromCanvas(canvas,"image/jpeg",.9);
        save(blob,source.name+"-"+crop.replace(":","x")+".jpg");
      }
      setMessage("4 cadrages exportés. Si un fichier manque, autorisez les téléchargements multiples dans le navigateur.");
    }catch(error){setMessage(error instanceof Error?error.message:"Export du pack impossible.");}
    finally{setBusy(false);}
  };
  const rotations=photoDimensions(source?.width??100,source?.height??100,recipe,2200);
  return <div className="pz-photo fixed inset-0 flex h-[100dvh] flex-col overflow-hidden bg-[#151517] text-white">
    <header className="flex h-[58px] shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-[#09090b] px-3">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className={button} aria-label="Retour aux supports graphiques"><ArrowLeft size={16}/></button>
        <div><h1 className="text-[14px] font-semibold"><span className="hidden sm:inline">× POINTZERO </span><span className="font-normal text-white/80">Photo</span></h1><p className="hidden text-[10px] text-white/55 sm:block">Retouche locale · non destructive</p></div>
      </div>
      <div className="flex gap-2">
        <button onClick={()=>picker.current?.click()} className={button}><ImagePlus size={15}/><span className="hidden sm:inline">Importer</span></button>
        <button onClick={()=>void output("design")} disabled={!source||busy} className="flex min-h-9 items-center gap-2 rounded-[5px] bg-white px-3 text-xs font-semibold text-black disabled:opacity-35"><Check size={15}/> Utiliser</button>
      </div>
    </header>
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <aside aria-label="Préréglages photo" className="thin-scroll max-h-[25dvh] shrink-0 overflow-y-auto border-b border-white/10 bg-[#09090b] p-3 lg:max-h-none lg:w-[235px] lg:border-b-0 lg:border-r">
        <h2 className="mb-3 text-xs font-semibold">Préréglages</h2>
        <div className="flex gap-2 overflow-x-auto lg:flex-col">{PHOTO_PRESETS.map(p=>
          <button key={p.name} type="button" onClick={()=>update(p.patch)} disabled={!source}
            className={button+" shrink-0 justify-start"}>{p.name}</button>)}</div>
        <button onClick={automatic} disabled={!source||busy} className={button+" mt-3 w-full"}><Sparkles size={15}/> Auto lumière</button>
        <div className="mt-5 border-t border-white/10 pt-4">
          <h2 className="mb-2 text-xs font-semibold">Recadrer</h2>
          <div className="grid grid-cols-3 gap-1.5">{(["libre","1:1","4:5","9:16","16:9"] as CropRatio[]).map(r=>
            <button key={r} onClick={()=>update({crop:r})} disabled={!source} aria-pressed={recipe.crop===r} className={(recipe.crop===r?"bg-white text-black":"bg-white/10 text-white")+" min-h-9 rounded-[5px] text-xs disabled:opacity-30"}>{r==="libre"?"Libre":r}</button>)}</div>
          {(["centerX","centerY"] as const).map((key)=><label key={key} className="mt-3 block text-[11px] text-white/75">{key==="centerX"?"Centrage horizontal":"Centrage vertical"}
            <input type="range" min={0} max={100} disabled={!source} value={recipe[key]} onChange={e=>update({[key]:Number(e.target.value)})} className="mt-1 w-full accent-white"/>
          </label>)}
        </div>
      </aside>
      <main className="pz-design-stage flex min-h-[165px] min-w-0 flex-1 items-center justify-center overflow-auto p-5 lg:min-h-[210px]" aria-label="Prévisualisation photo">
        {source?<div className="flex max-h-full max-w-full flex-col items-center gap-3">
          <canvas ref={canvas} className="block max-h-[64dvh] max-w-full object-contain shadow-[0_15px_55px_#0008]" aria-label="Photo retouchée"/>
          <p className="text-xs text-white/65">{source.width} × {source.height} px · sortie {rotations.width} × {rotations.height} px</p>
        </div>:<div className="flex flex-col items-center gap-3 text-center">
          <ImagePlus size={36} className="text-white/70"/>
          <h2 className="text-lg font-semibold">Importer une photo</h2>
          <p className="max-w-sm text-sm text-white/60">Recadrer, corriger les couleurs et exporter, sans envoyer le fichier sur un serveur.</p>
          <button onClick={()=>picker.current?.click()} className="mt-2 rounded-[5px] bg-white px-5 py-3 text-sm font-semibold text-black">Choisir une photo</button>
        </div>}
      </main>
      <aside aria-label="Réglages de retouche" className="thin-scroll max-h-[26dvh] shrink-0 overflow-y-auto border-t border-white/10 bg-[#09090b] p-4 lg:max-h-none lg:w-[245px] lg:border-l lg:border-t-0">
        <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-xs font-semibold"><SlidersHorizontal size={15}/> Réglages</h2>
          <button type="button" title="Réinitialiser les réglages" aria-label="Réinitialiser les réglages" disabled={!source} className="text-xs text-white/70 hover:text-white" onClick={()=>setRecipe(DEFAULT_RECIPE)}>Réinitialiser</button></div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={()=>update({rotation:((recipe.rotation+270)%360) as PhotoRecipe["rotation"]})} disabled={!source} className={button}><RotateCcw size={14}/> -90°</button>
          <button onClick={()=>update({rotation:((recipe.rotation+90)%360) as PhotoRecipe["rotation"]})} disabled={!source} className={button}><RotateCw size={14}/> +90°</button>
        </div>
        <button onClick={()=>update({flip:!recipe.flip})} disabled={!source} aria-pressed={recipe.flip} className={button+" mt-2 w-full"}><FlipHorizontal2 size={14}/> Miroir horizontal</button>
        <div className="mt-3 space-y-3">
          {([{key:"brightness",label:"Lumière",min:40,max:160},{key:"contrast",label:"Contraste",min:40,max:170},{key:"saturation",label:"Saturation",min:0,max:180},{key:"warmth",label:"Chaleur",min:0,max:100}] as const).map(i=>
            <label key={i.key} className="block text-[11px] text-white/75"><span className="flex justify-between"><span>{i.label}</span><span>{recipe[i.key]}{i.key==="warmth"?"":" %"}</span></span>
              <input type="range" aria-label={i.label} min={i.min} max={i.max} value={recipe[i.key]} disabled={!source} onChange={e=>update({[i.key]:Number(e.target.value)})} className="mt-1 w-full accent-white"/>
            </label>)}
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-white/80"><input type="checkbox" disabled={!source} checked={recipe.grayscale} onChange={e=>update({grayscale:e.target.checked})} className="accent-white"/> Noir et blanc</label>
        <div className="mt-4 flex gap-2">
          <button onClick={()=>void output("image/png")} disabled={!source||busy} className={button+" flex-1"}><Download size={14}/> PNG</button>
          <button onClick={()=>void output("image/jpeg")} disabled={!source||busy} className={button+" flex-1"}><Download size={14}/> JPEG</button>
        </div>
        <button onClick={()=>void exportPack()} disabled={!source||busy} className={button+" mt-2 w-full"}><Sparkles size={14}/> Exporter le pack 4 formats</button>
        <p className="mt-3 text-[11px] leading-relaxed text-white/55">Auto lumière : correction déterministe de la luminosité moyenne, sans reconnaissance IA ni retouche du visage.</p>
      </aside>
    </div>
    <input ref={picker} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" aria-label="Importer une photo PNG JPEG ou WebP" onChange={e=>void importPhoto(e)}/>
    {message&&<div role="status" className="absolute bottom-3 left-1/2 z-40 flex max-w-[90vw] -translate-x-1/2 items-center gap-3 rounded-[6px] border border-white/20 bg-[#09090b] px-4 py-3 text-xs text-white shadow-lg">{message}<button aria-label="Fermer le message" onClick={()=>setMessage("")}><X size={14}/></button></div>}
  </div>;
}
