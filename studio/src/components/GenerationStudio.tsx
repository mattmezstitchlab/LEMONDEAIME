import { useRef, useState } from "react";
import { Check, Dices, ImagePlus, LoaderCircle, Send, Sparkles, WandSparkles } from "lucide-react";
import { StudioFrame, studioButton, studioInput } from "./StudioFrame";
import { createMiniSite, type MiniSite } from "../lib/miniSiteCore";
import { DETAILS, FORMATS, STYLES, buildPrompt, gridHeightFor, pollinationsUrl, type DetailId, type FormatId, type StyleId } from "../lib/promptcraft";
import { imageToDmc } from "../lib/dither";
import { createPattern, ensurePalette, type Pattern } from "../lib/pattern";
import { loadRemoteImage } from "../lib/convert";
import { validDataImage } from "../lib/designStudio";
export type GenerationTarget="visuel"|"motif"|"mini-site";
export const GEN_PRESETS = [
  {label:"Botanique",text:"un bouquet de fleurs poétiques aux couleurs douces"},
  {label:"Animalier",text:"un petit oiseau posé sur une branche fleurie"},
  {label:"Éditorial",text:"une composition contemporaine abstraite, formes organiques, équilibre et élégance"},
  {label:"Célébration",text:"des fleurs élégantes, feuillage délicat, ambiance de célébration"},
] as const;
const maxGeneratedPixels=1400;
function rasterToDataURL(image:HTMLImageElement):string{
  const canvas=document.createElement("canvas");
  const scale=Math.min(1,maxGeneratedPixels/Math.max(image.naturalWidth,image.naturalHeight));
  canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
  canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const ctx=canvas.getContext("2d");if(!ctx)throw Error("Export graphique indisponible.");
  ctx.drawImage(image,0,0,canvas.width,canvas.height);
  const url=canvas.toDataURL("image/jpeg",.85);
  if(!validDataImage(url))throw Error("Image trop volumineuse pour les autres studios.");
  return url;
}
export function siteDraftFromPrompt(prompt:string,imageURL=""):MiniSite{
  const next=createMiniSite("presentation");
  const subject=prompt.trim().slice(0,140);
  next.name="Mini-site · "+(subject||"Nouveau projet");
  next.title=subject||"Votre univers";
  next.eyebrow="POINTZERO · MINI-SITE";
  next.subtitle="Un espace personnel à composer et à enrichir.";
  next.sections[0].body="Présentez votre projet : "+(subject||"votre intention")+".\nPersonnalisez les informations, les sections et la mise en page.";
  if(validDataImage(imageURL))next.heroImage=imageURL;
  return next;
}
interface Props {
  onBack:()=>void;
  onPattern:(p:Pattern)=>void;
  onImage:(dataURL:string)=>void;
  onMiniSite:(site:MiniSite)=>void;
}
export default function GenerationStudio({onBack,onPattern,onImage,onMiniSite}:Props){
  const [target,setTarget]=useState<GenerationTarget>("visuel");
  const [prompt,setPrompt]=useState("");
  const [style,setStyle]=useState<StyleId>("botanique");
  const [detail,setDetail]=useState<DetailId>("equilibre");
  const [format,setFormat]=useState<FormatId>("carre");
  const [width,setWidth]=useState(200);
  const [colors,setColors]=useState(40);
  const [flat,setFlat]=useState(false);
  const [seed,setSeed]=useState(()=>Math.floor(Math.random()*1000000));
  const [busy,setBusy]=useState("");
  const [error,setError]=useState("");
  const [generated,setGenerated]=useState("");
  const image=useRef<HTMLImageElement|null>(null);
  const generate=async()=>{
    if(prompt.trim().length<3){setError("Décrivez votre création en quelques mots.");return;}
    setError("");setBusy("Génération de l'illustration distante…");image.current=null;setGenerated("");
    try{
      const f=FORMATS.find(x=>x.id===format)!;
      const enginePrompt=buildPrompt({subject:prompt,main:"",second:"",relation:"",style,detail,format});
      const src=pollinationsUrl(enginePrompt,f.w,f.h,seed);
      const img=await loadRemoteImage(src);
      const data=rasterToDataURL(img);
      image.current=img;
      setGenerated(data);
    }catch(e){setError(e instanceof Error?e.message:"Image indisponible. Réessayez ou modifiez la description.");}
    finally{setBusy("");}
  };
  const toMotif=()=>{
    if(!image.current){setError("Générez une image avant sa conversion en grille DMC.");return;}
    setBusy("Conversion en points et couleurs DMC…");setError("");
    try{
      const h=gridHeightFor(width,format);
      const {cross,palette}=imageToDmc(image.current,width,h,{mode:flat?"flat":"dither",maxColors:colors,dropWhite:true});
      const p=createPattern(prompt.trim().slice(0,60)||"Motif généré",width,h,14,2);
      p.cross=cross;
      for(const idx of palette)ensurePalette(p,idx);
      p.provenance={kind:"image",source:"Image générée par service distant (Pollinations / Flux), conversion DMC locale",author:"",license:"Vérifiez originalité et droits avant diffusion",personalOnly:false};
      p.notes="Généré depuis : "+prompt.trim()+". Couleurs calculées localement : "+palette.length+" fils.";
      onPattern(p);
    }catch(e){setError(e instanceof Error?e.message:"Conversion DMC impossible.");}
    finally{setBusy("");}
  };
  const buildSite=()=>{
    if(prompt.trim().length<3){setError("Précisez au moins l'intention du mini-site.");return;}
    try{onMiniSite(siteDraftFromPrompt(prompt,generated));}
    catch(e){setError(e instanceof Error?e.message:"Création du mini-site indisponible.");}
  };
  const modes:[GenerationTarget,string][]=[["visuel","Graphisme"],["motif","Broderie DMC"],["mini-site","Mini-site"]];
  const actions=<button type="button" disabled={!!busy} onClick={()=>void generate()} className="inline-flex min-h-9 items-center gap-2 rounded-[5px] bg-white px-3 text-xs font-semibold text-black disabled:opacity-35">
    <WandSparkles size={15}/> Générer l'image
  </button>;
  return <StudioFrame title="Génération" subtitle="Description → image → visuel, patron DMC ou mini-site"
    onBack={onBack} leftLabel="Types et idées" rightLabel="Paramètres de génération" actions={actions}
    left={<>
      <h2 className="mb-3 text-xs font-semibold">Destination</h2>
      <div className="space-y-1.5">{modes.map(([id,label])=><button key={id} aria-label={label} onClick={()=>setTarget(id)}
        aria-pressed={target===id} className={"w-full rounded-[5px] border px-3 py-3 text-left text-xs "+(target===id?"border-white bg-white text-black":"border-white/15 bg-white/[.05] text-white/80 hover:bg-white/10")}>{label}</button>)}</div>
      <div className="mt-5 border-t border-white/10 pt-4">
        <h3 className="mb-3 text-xs font-semibold">Inspirations</h3>
        {GEN_PRESETS.map(p=><button type="button" key={p.label} onClick={()=>setPrompt(p.text)}
          className="mb-2 block min-h-10 w-full rounded-[5px] border border-white/15 px-3 text-left text-xs text-white/85 hover:bg-white/10">
          <span className="font-semibold">{p.label}</span><span className="mt-1 block text-[10px] text-white/55">{p.text}</span></button>)}
      </div>
      <p className="mt-5 text-[11px] leading-relaxed text-white/55">La génération d'image nécessite le service externe Pollinations : la description lui est transmise. La conversion DMC et l'export vers les autres studios ont lieu localement.</p>
    </>}
    right={<>
      <h2 className="mb-4 text-sm font-semibold">Réglages</h2>
      <label className="block text-xs text-white/70">Style
        <select className={studioInput+" mt-1"} value={style} onChange={e=>setStyle(e.target.value as StyleId)}>
          {STYLES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </label>
      <label className="mt-3 block text-xs text-white/70">Détail
        <select className={studioInput+" mt-1"} value={detail} onChange={e=>{const id=e.target.value as DetailId;setDetail(id);setColors(DETAILS.find(x=>x.id===id)?.colors??40);}}>
          {DETAILS.map(d=><option key={d.id} value={d.id}>{d.label}</option>)}
        </select>
      </label>
      <label className="mt-3 block text-xs text-white/70">Format d'image
        <select className={studioInput+" mt-1"} value={format} onChange={e=>setFormat(e.target.value as FormatId)}>
          {FORMATS.map(f=><option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
      </label>
      <label className="mt-3 block text-xs text-white/70">Graine
        <div className="mt-1 flex gap-1"><input aria-label="Graine de génération" type="number" min={0} value={seed} onChange={e=>setSeed(Math.max(0,Math.floor(Number(e.target.value)||0)))} className={studioInput+" min-w-0 flex-1"}/>
          <button className={studioButton+" !px-2"} onClick={()=>setSeed(Math.floor(Math.random()*1000000))} aria-label="Nouvelle graine"><Dices size={16}/></button></div>
      </label>
      {target==="motif"&&<div className="mt-4 space-y-3 border-t border-white/10 pt-4">
        <label className="block text-xs text-white/70">Grille DMC · largeur
          <select aria-label="Grille DMC · largeur" className={studioInput+" mt-1"} value={width} onChange={e=>setWidth(Number(e.target.value))}>
            {[120,160,200,240,280,320].map(v=><option key={v} value={v}>{v} points</option>)}
          </select>
        </label>
        <label className="block text-xs text-white/70">Fils DMC maximum : {colors}
          <input type="range" min={8} max={64} value={colors} onChange={e=>setColors(Number(e.target.value))} className="mt-2 w-full accent-white"/>
        </label>
        <label className="flex items-center gap-2 text-xs text-white/75"><input type="checkbox" checked={flat} onChange={e=>setFlat(e.target.checked)} className="accent-white"/>Aplats nets, sans dithering</label>
      </div>}
      <p className="mt-5 text-[11px] leading-relaxed text-white/55">
        {target==="mini-site"?"Le mini-site est créé à partir d'un modèle éditable. Son contenu n'est pas rédigé par un modèle de langage et la publication reste manuelle.":
        target==="motif"?"Les couleurs sont rapprochées des fils DMC. Contrôlez les détails et les correspondances avant de broder.":
        "L'image est transférée comme un calque dans le studio graphique, sans supprimer les autres éléments."}
      </p>
    </>}
  >
    <div className="mx-auto max-w-[950px]">
      <div><p className="text-[11px] font-semibold uppercase tracking-[.1em] text-white/60">Créer à partir d'une intention</p>
        <h2 className="mt-1 text-2xl font-semibold">Décrivez ce que vous imaginez.</h2></div>
      <textarea aria-label="Description pour génération universelle" value={prompt} onChange={e=>setPrompt(e.target.value)} maxLength={300} rows={4}
        className="mt-4 w-full rounded-[6px] border border-white/20 bg-[#09090b] p-4 text-sm text-white placeholder:text-white/50 focus:border-white focus:outline-none"
        placeholder="Une composition florale élégante, fleurs roses et feuillage…"/>
      <div className="mt-3 flex flex-wrap gap-2">
        <button disabled={!!busy} onClick={()=>void generate()} className="inline-flex min-h-10 items-center gap-2 rounded-[5px] bg-white px-4 text-sm font-semibold text-black disabled:opacity-30">
          <Sparkles size={16}/> Générer une illustration
        </button>
        {target==="mini-site"&&<button onClick={buildSite} disabled={!prompt.trim()} className={studioButton}><Send size={15}/> Créer le mini-site</button>}
      </div>
      <div className="mt-5 grid min-h-[320px] place-items-center overflow-hidden rounded-[7px] border border-white/20 bg-[#f7f5f2] p-3">
        {generated?<img src={generated} alt="Illustration générée" className="max-h-[65dvh] max-w-full object-contain"/>:
          <div className="max-w-sm text-center text-[#71717a]"><ImagePlus className="mx-auto mb-3" size={32}/>
            <p className="text-sm font-medium">L'illustration apparaîtra ici.</p>
            <p className="mt-2 text-xs">Elle pourra être réutilisée dans plusieurs studios.</p></div>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {target==="visuel"&&<button disabled={!generated||!!busy} onClick={()=>onImage(generated)} className={studioButton}><Check size={15}/> Utiliser en graphisme</button>}
        {target==="motif"&&<button disabled={!generated||!!busy} onClick={toMotif} className={studioButton}><Check size={15}/> Convertir en DMC et ouvrir Broderie</button>}
        {target==="mini-site"&&<button disabled={!prompt.trim()||!!busy} onClick={buildSite} className={studioButton}><Check size={15}/> Construire un mini-site avec cette intention</button>}
      </div>
      {busy&&<p role="status" className="mt-3 flex items-center gap-2 text-xs text-white/75"><LoaderCircle size={15} className="animate-spin"/>{busy}</p>}
      {error&&<p role="alert" className="mt-3 rounded-[5px] border border-white/20 bg-[#09090b] p-3 text-xs text-white">{error}</p>}
    </div>
  </StudioFrame>;
}
