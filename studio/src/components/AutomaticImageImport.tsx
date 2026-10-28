import { useEffect, useRef, useState } from "react";
import { FileImage, LoaderCircle, X } from "lucide-react";
import { asyncRasterToCells, loadImage } from "../lib/convert";
import { createPattern, ensurePalette, type Pattern } from "../lib/pattern";

/**
 * Simple entry point. Shares image import/quantisation with ImportStudio,
 * hands the result to the studio, which archives the previous project first.
 * The existing ImportStudio remains available for manual calibration.
 */
export default function AutomaticImageImport({ file, onCancel, onReady }: {
  file:File; onCancel:()=>void; onReady:(pattern:Pattern)=>void | Promise<void>;
}) {
  const [status,setStatus]=useState("Lecture de l'image…");
  const [error,setError]=useState("");
  const readyRef = useRef(onReady);
  readyRef.current = onReady;
  useEffect(()=>{
    let active=true;
    const run=async()=>{
      try{
        if(file.size > 25*1024*1024)throw new Error("Image trop volumineuse (25 Mo maximum).");
        if(!/^image\//.test(file.type) && !/\.(png|jpe?g|webp)$/i.test(file.name))
          throw new Error("Choisissez un fichier PNG, JPEG ou WebP.");
        const image=await loadImage(file);
        if(!active)return;
        setStatus("Conversion en grille DMC, sans suppression de détails…");
        const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
        if(!iw||!ih)throw new Error("Dimensions d'image impossibles à lire.");
        // Keep original proportions, conservative 120-stitch max side.
        const maxSide=120, ratio=Math.min(1,maxSide/Math.max(iw,ih));
        const w=Math.max(8,Math.min(200,Math.round(iw*ratio))),
              h=Math.max(8,Math.min(200,Math.round(ih*ratio)));
        const result=await asyncRasterToCells(image,w,h,{
          maxColors:36,dropWhite:true,confetti:false,pixelArt:false,
        });
        if(!active)return;
        if(!result.cross.some(v=>v>=0))throw new Error("L'image ne contient aucun point coloré identifiable. Essayez le calage manuel.");
        const p=createPattern(file.name.replace(/\.[^.]+$/,""),w,h);
        p.cross=result.cross;
        for(const idx of result.palette)ensurePalette(p,idx);
        p.provenance={kind:"image",source:file.name,author:"",personalOnly:true,license:"Fichier importé : vérifier vos droits avant redistribution."};
        p.notes="Import automatique en couleurs DMC. Vérifiez les détails dans la grille ; la composition reste facultative.";
        await readyRef.current(p);
      }catch(e){if(active)setError(e instanceof Error?e.message:"Conversion impossible.");}
    };
    void run();
    return()=>{active=false;};
  },[file]);
  return <div className="fixed inset-0 z-[74] grid place-items-center bg-black/85 p-4 text-white" role="dialog" aria-modal="true" aria-label="Importation automatique de l'image">
    <section className="w-full max-w-md space-y-4 rounded-lg border border-white/15 bg-[#19191d] p-6">
      <div className="flex items-center justify-between"><FileImage size={22}/><button type="button" onClick={onCancel} aria-label="Annuler l'import"><X size={18}/></button></div>
      <h2 className="text-xl font-semibold">Préparer mon motif</h2>
      <p className="text-sm text-white/60">{file.name}</p>
      {error ? <div role="alert" className="space-y-3">
        <p className="rounded-md border border-red-400/40 p-3 text-sm text-red-200">{error}</p>
        <button type="button" className="rounded-md border border-white/25 px-4 py-2 text-sm" onClick={onCancel}>Revenir à l'atelier</button>
      </div> : <p role="status" className="flex items-center gap-2 text-sm text-white/80"><LoaderCircle size={17} className="animate-spin"/>{status}</p>}
      <p className="text-xs leading-relaxed text-white/45">La photo n'est pas vendue ni envoyée à un moteur d'IA. La conversion utilise le moteur DMC existant, localement. Pour les fichiers difficiles, le calage manuel reste disponible.</p>
    </section>
  </div>;
}
