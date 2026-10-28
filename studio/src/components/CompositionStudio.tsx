import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { ArrowDown, ArrowUp, Check, Download, Eye, EyeOff, FileJson, LoaderCircle, RefreshCw, ScanSearch, ZoomIn, ZoomOut, X } from "lucide-react";
import StitchMagnifier, { clampFocus, type StitchFocus } from "./StitchMagnifier";
import { FLOSS, flossIndex } from "../lib/dmc";
import { buildPdf, pdfFileName } from "../lib/pdf";
import { downloadBlob, saveProjectFile } from "../lib/io";
import {
  composePattern, compositionSource, initialSettings, segmentRegions, type ComposeSettings,
  type Detail, type RegionCard, type CompositionResult,
} from "../lib/composition";
import { COUNTS, type Pattern } from "../lib/pattern";
import SubjectWorkspace from "./SubjectWorkspace";

function StitchPreview({ pattern, max = 520, zoom = 1, onInspect }: { pattern: Pattern; max?: number; zoom?: number; onInspect?: (focus: StitchFocus) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const cell = Math.max(1, Math.min(12, max / Math.max(pattern.w, pattern.h)));
    c.width = Math.ceil(pattern.w * cell);
    c.height = Math.ceil(pattern.h * cell);
    ctx.fillStyle = pattern.fabric?.color ?? "#f7f2e8";
    ctx.fillRect(0, 0, c.width, c.height);
    for (let i=0;i<pattern.cross.length;i++){
      const color=FLOSS[pattern.cross[i]];
      if (!color)continue;
      ctx.fillStyle=color.hex;
      ctx.fillRect(i%pattern.w*cell,Math.floor(i/pattern.w)*cell,cell,cell);
    }
    for (const [arr,flip] of [[pattern.fwd,false],[pattern.bwd,true]] as const) {
      for(let i=0;i<arr.length;i++){
        const color=FLOSS[arr[i]];
        if(!color)continue;
        const x=i%pattern.w*cell,y=Math.floor(i/pattern.w)*cell;
        ctx.strokeStyle=color.hex; ctx.lineWidth=Math.max(1,cell*.4);
        ctx.beginPath();
        if(flip){ctx.moveTo(x,y);ctx.lineTo(x+cell,y+cell);} else {ctx.moveTo(x,y+cell);ctx.lineTo(x+cell,y);}
        ctx.stroke();
      }
    }
    for (let k=0;k<4;k++) for(let i=0;i<pattern.q[k].length;i++) {
      const color=FLOSS[pattern.q[k][i]];
      if(!color)continue;
      const x=(i%pattern.w+(k===1||k===2?1:0))*cell;
      const y=(Math.floor(i/pattern.w)+(k>=2?1:0))*cell;
      ctx.strokeStyle=color.hex;ctx.lineWidth=Math.max(1,cell*.23);
      ctx.beginPath();ctx.moveTo(x,y);
      ctx.lineTo((i%pattern.w+.5)*cell,(Math.floor(i/pattern.w)+.5)*cell);ctx.stroke();
    }
    ctx.lineWidth=Math.max(.8,cell*.15);ctx.lineJoin="round";ctx.lineCap="round";
    for(const seg of pattern.back){
      ctx.strokeStyle=FLOSS[seg.c]?.hex??"#222";
      ctx.beginPath();ctx.moveTo(seg.x1*cell,seg.y1*cell);ctx.lineTo(seg.x2*cell,seg.y2*cell);ctx.stroke();
    }
  }, [pattern,max]);
  const inspect=(e:RPointerEvent<HTMLCanvasElement>)=>{
    if(!onInspect)return;
    const bounds=e.currentTarget.getBoundingClientRect();
    if(bounds.width===0||bounds.height===0)return;
    onInspect(clampFocus(pattern,{
      x:Math.floor((e.clientX-bounds.left)/bounds.width*pattern.w),
      y:Math.floor((e.clientY-bounds.top)/bounds.height*pattern.h)
    }));
  };
  // Zoom purely optical: canvas pixel data remains unchanged and the source is never edited.
  const baseline=Math.max(1,Math.min(12,max/Math.max(pattern.w,pattern.h)));
  return <canvas ref={ref} onPointerMove={inspect} onPointerDown={inspect}
    style={{width:zoom>1?Math.ceil(pattern.w*baseline*zoom):undefined,maxWidth:zoom===1?max:undefined,maxHeight:zoom===1?max:undefined,imageRendering:zoom>1?"pixelated":"auto"}}
    className={`mx-auto block h-auto object-contain ${zoom===1?"w-full":"max-w-none"} ${onInspect?"cursor-crosshair touch-pan-x touch-pan-y":""}`}
    aria-label={"Aperçu du patron "+pattern.name}/>;
}

const DETAIL: Array<{id:Detail;label:string}>=[
  {id:"simple",label:"Simple"},{id:"equilibree",label:"Équilibré"},{id:"precise",label:"Précis"},
];
const startCard = (source:Pattern, saved?: Pattern["composition"]):RegionCard[] => {
  const current=segmentRegions(source);
  const chosen=saved?.cards;
  if(!chosen?.length)return current;
  const byId=new Map(current.map(c=>[c.id,c]));
  const merged:RegionCard[]=[];
  for(const selected of chosen){
    const c=byId.get(selected.id);
    if(c)merged.push({...c,name:selected.name,visible:selected.visible,overrideCode:selected.overrideCode});
  }
  for(const card of current)if(!merged.some(c=>c.id===card.id))merged.push(card);
  return merged;
};

/**
 * Non destructive. The source is kept until "Use this version" is explicitly
 * pressed; Canvas, JSON, PDF all share the selected Pattern afterwards.
 */
export default function CompositionStudio({ pattern, onCancel, onUse, embedded = false }: {
  embedded?:boolean;
  pattern:Pattern;
  onCancel:()=>void;
  onUse:(p:Pattern)=>void;
}) {
  const source=useMemo(()=>compositionSource(pattern)??pattern,[pattern]);
  const [settings,setSettings]=useState<ComposeSettings>(
    ()=>pattern.composition?.settings ?? initialSettings(source)
  );
  const [cards,setCards]=useState<RegionCard[]>(()=>startCard(source,pattern.composition));
  const [generated,setGenerated]=useState(true);
  const [compare,setCompare]=useState(false);
  const [subjectsOpen,setSubjectsOpen]=useState(false);
  const [working,setWorking]=useState(false);
  const [message,setMessage]=useState("");
  const [zoom,setZoom]=useState(1);
  const [loupe,setLoupe]=useState(true);
  const [focus,setFocus]=useState<StitchFocus>(()=>({x:Math.floor(source.w/2),y:Math.floor(source.h/2)}));
  const dragged=useRef<string|null>(null);
  const [confirmedReduction,setConfirmedReduction]=useState(false);
  const choose = <K extends keyof ComposeSettings>(key:K,value:ComposeSettings[K])=>{
    setSettings(s=>({...s,[key]:value}));setGenerated(true);setConfirmedReduction(false);
  };
  const moveCard=(index:number,next:number)=>{
    if(next<0||next>=cards.length||index===next)return;
    setCards(prev=>{const out=prev.slice(),[item]=out.splice(index,1);out.splice(next,0,item);return out;});
  };
  const patchCard=(id:string,p:Partial<RegionCard>)=>{
    setCards(prev=>prev.map(c=>c.id===id?{...c,...p}:c));setGenerated(true);
  };
  const { result, error }=useMemo(()=>{
    if(!generated)return {result:null,error:null};
    try{return {result:composePattern(source,settings,cards),error:null};}
    catch(e){return {result:null,error:e instanceof Error?e.message:"Composition impossible."};}
  },[source,settings,cards,generated]);
  const variants=useMemo(()=>{
    if(!compare)return [];
    return DETAIL.map(d=>{
      try{return {detail:d.id,result:composePattern(source,{...settings,detail:d.id},cards)};}
      catch{return null;}
    }).filter((v):v is {detail:Detail;result:CompositionResult}=>!!v);
  },[compare,settings,source,cards]);
  const reductionRisk=source.w>settings.width || source.h>settings.height;
  const accept=()=> {
    if(!result)return;
    if(reductionRisk&&!confirmedReduction) {setMessage("Vérifiez le risque de perte de détails avant de valider une réduction.");return;}
    onUse(result.pattern);
  };
  const exportPdf=async()=>{
    if(!result||working)return;
    setWorking(true);setMessage("Génération du PDF…");
    try{
      const options={bw:false,paper:"a4" as const,overlap:true};
      const blob=await buildPdf(result.pattern,options);
      downloadBlob(blob,pdfFileName(result.pattern,options));
      setMessage("PDF produit depuis le même motif que l’aperçu.");
    }catch(e){setMessage(e instanceof Error?e.message:"Export impossible.");}
    finally{setWorking(false);}
  };
  return (
    <div className={`${embedded ? "fixed inset-x-0 bottom-0 top-[58px] z-[35]" : "fixed inset-0 z-[76]"} flex flex-col bg-[#111114] text-white`} role="dialog" aria-modal="true" aria-label="Composition intelligente Point Zéro">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[.17em] text-[#b7b0d9]">Point Zéro · Atelier</p>
          <h2 className="truncate text-[18px] font-semibold">Composition intelligente <span className="text-[12px] font-normal text-white/50">V1</span></h2>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="rounded-md border border-white/20 px-3 py-2 text-sm" onClick={onCancel}><X size={15} className="mr-1 inline"/> Fermer</button>
          <button type="button" className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-40" disabled={!result||working||reductionRisk&&!confirmedReduction} onClick={accept}>
            <Check size={16} className="mr-1 inline"/> Utiliser cette version
          </button>
        </div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[255px_minmax(290px,1fr)_290px] lg:overflow-hidden">
        <aside className="space-y-5 border-b border-white/10 p-4 lg:overflow-y-auto lg:border-b-0 lg:border-r" aria-label="Paramètres de composition">
          <div><h3 className="font-semibold">Le résultat souhaité</h3><p className="mt-1 text-xs leading-relaxed text-white/55">Les calculs de grille sont déterministes. Les détails sémantiques restent à vérifier.</p></div>
          <fieldset className="space-y-2"><legend className="text-xs font-medium">Niveau de détail</legend>
            <div className="grid grid-cols-3 gap-1">
              {DETAIL.map(d=><button key={d.id} className={"rounded-md border px-2 py-2 text-xs "+(settings.detail===d.id?"border-[#ad99ff] bg-[#ad99ff]/20 text-white":"border-white/15 text-white/65")} aria-pressed={settings.detail===d.id} onClick={()=>choose("detail",d.id)}>{d.label}</button>)}
            </div>
          </fieldset>
          <label className="block text-xs font-medium">Palette
            <select className="mt-2 w-full rounded-md border border-white/20 bg-[#28282e] p-2 text-sm" value={settings.palette} onChange={e=>choose("palette",e.target.value as ComposeSettings["palette"])}>
              <option value="originale">Originale</option><option value="harmonisee">Harmonisée (moins de nuances)</option>
              <option value="complementaire">Complémentaire</option>
              <option value="douce">Douce / pastel</option>
              <option value="contrastee">Contrastée</option><option value="personnalisee">Personnalisée · codes DMC</option>
            </select>
          </label>
          {settings.palette==="personnalisee" && <label className="block text-xs">Mes codes DMC
            <textarea value={settings.codes} onChange={e=>choose("codes",e.target.value)} placeholder="310, 321, 703, 907…" className="mt-2 h-20 w-full rounded-md border border-white/20 bg-[#28282e] p-2 text-xs"/>
          </label>}
          <label className="block text-xs font-medium">Difficulté
            <select className="mt-2 w-full rounded-md border border-white/20 bg-[#28282e] p-2 text-sm" value={settings.difficulty} onChange={e=>choose("difficulty",e.target.value as ComposeSettings["difficulty"])}>
              <option value="debutant">Débutant</option><option value="intermediaire">Intermédiaire</option><option value="expert">Expert (fractions proposées)</option>
            </select>
          </label>
          <label className="block text-xs font-medium">Comptage de la toile
            <select className="mt-2 w-full rounded-md border border-white/20 bg-[#28282e] p-2 text-sm"
              value={settings.count??source.count}
              onChange={e=>choose("count",Number(e.target.value) as Pattern["count"])}>
              {COUNTS.map(c=><option key={c} value={c}>{c} points par pouce (ct)</option>)}
            </select>
          </label>
          <fieldset className="space-y-2"><legend className="text-xs font-medium">Dimensions de la grille</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["width","height"] as const).map(k=><label key={k} className="text-xs text-white/70">{k==="width"?"Largeur":"Hauteur"}
                <input className="mt-1 w-full rounded-md border border-white/20 bg-[#28282e] p-2 text-sm" type="number" min={8} max={1000} value={settings[k]} onChange={e=>choose(k,Math.max(8,Math.min(1000,+e.target.value||8)))}/>
              </label>)}
            </div>
            <p className="text-[11px] text-white/55">Source : {source.w} × {source.h} points · comptage de toile préservé</p>
          </fieldset>
          {reductionRisk&&<label className="flex items-start gap-2 rounded-md border border-[#e9b96e]/40 bg-[#e9b96e]/10 p-3 text-xs text-[#f0c989]">
            <input type="checkbox" checked={confirmedReduction} onChange={e=>setConfirmedReduction(e.target.checked)}/>
            J'ai comparé avec la source : une grille plus petite peut fusionner des détails.
          </label>}
          <div className="space-y-2 border-t border-white/10 pt-4">
            <button type="button" className="w-full rounded-md bg-[#c3b9f8] p-3 text-sm font-semibold text-[#18151f]" onClick={()=>setSubjectsOpen(true)}>
              Décomposer en sujets → Composer
            </button>
            <button type="button" className="w-full rounded-md border border-white/20 p-2.5 text-sm" onClick={()=>setCompare(v=>!v)}>
              {compare?"Masquer la comparaison":"Comparer les 3 variantes"}
            </button>
            <button type="button" className="w-full rounded-md border border-white/20 p-2.5 text-sm" onClick={()=>{setGenerated(true);setMessage("Composition recalculée sur la source d'origine.");}}>
              <RefreshCw size={15} className="mr-1 inline"/> Générer mon motif
            </button>
          </div>
        </aside>

        <main className="flex min-h-[400px] min-w-0 flex-col items-center justify-center gap-3 bg-[#1b1a1d] px-3 py-5 lg:overflow-y-auto" aria-label="Aperçu central de la composition">
          {error && <p role="alert" className="max-w-lg rounded-md border border-red-400/40 p-4 text-sm text-red-200">{error}</p>}
          {result && <>
            <div className="flex w-full max-w-[620px] flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 rounded-[5px] border border-white/15 bg-[#09090b] p-1" role="group" aria-label="Contrôle du zoom">
                <button type="button" aria-label="Zoom arrière composition" disabled={zoom===1} onClick={()=>setZoom(z=>Math.max(1,z/2))}
                  className="grid size-8 place-items-center rounded-[4px] text-white hover:bg-white/10 disabled:opacity-25"><ZoomOut size={16}/></button>
                <span className="w-[38px] text-center font-mono text-xs">{zoom}×</span>
                <button type="button" aria-label="Zoom avant composition" disabled={zoom===8} onClick={()=>setZoom(z=>Math.min(8,z*2))}
                  className="grid size-8 place-items-center rounded-[4px] text-white hover:bg-white/10 disabled:opacity-25"><ZoomIn size={16}/></button>
                <button type="button" aria-label="Activer la loupe des points" aria-pressed={loupe} onClick={()=>setLoupe(v=>!v)}
                  className={`ml-1 flex min-h-8 items-center gap-1 rounded-[4px] px-2 text-xs ${loupe?"bg-white text-black":"text-white/75 hover:bg-white/10"}`}><ScanSearch size={15}/> Loupe</button>
              </div>
            </div>
            <div className="flex w-full max-w-[620px] items-start justify-between gap-4">
              <div><p className="text-[10px] uppercase tracking-[.18em] text-white/45">Aperçu central</p><h3 className="text-lg font-semibold">{result.pattern.name}</h3></div>
              <span className="text-right text-xs text-white/60">{result.pattern.w} × {result.pattern.h} points<br/>{result.pattern.palette.length} fils DMC</span>
            </div>
            <div className="relative w-full max-w-[620px] rounded-[6px] border border-white/10 bg-[#fbf8f2]">
              <div className="thin-scroll max-h-[60dvh] min-h-[240px] w-full overflow-auto p-3" aria-label="Zone de zoom des points">
                <div className="flex min-h-[210px] min-w-max items-center justify-center">
                  <StitchPreview pattern={result.pattern} zoom={zoom} onInspect={setFocus}/>
                </div>
              </div>
              {loupe&&<div className="absolute right-2 top-2 z-10 pointer-events-none max-w-[min(252px,70%)]">
                <StitchMagnifier pattern={result.pattern} focus={focus}/>
              </div>}
            </div>
            <p className="max-w-[620px] text-center text-[11px] text-white/55">Survolez ou touchez la grille : la loupe montre les croix, fractions et contours. Le zoom 1× à 8× ne modifie pas votre motif.</p>
            <div className="flex max-w-[620px] flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-white/65">
              <span>{result.pattern.back.length} segments arrière</span>
              <span>Difficulté indicative : {result.estimatedDifficulty}</span>
              <span>{result.coverage.source} croix source · {result.coverage.result} résultat</span>
              <span>{[...result.pattern.fwd,...result.pattern.bwd].filter(x=>x>=0).length} demi-points</span>
              <span>{result.decisions.find(x=>x.kind==="confetti")?.count??0} confettis réharmonisés</span>
            </div>
            {result.warnings.map((w,i)=><p key={i} className="max-w-[620px] rounded-md border border-amber-300/30 bg-amber-300/10 p-2 text-xs text-amber-100">{w}</p>)}
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" className="rounded-md border border-white/20 px-3 py-2 text-xs" disabled={working} onClick={()=>void exportPdf()}><Download size={14} className="mr-1 inline"/> PDF du résultat</button>
              <button type="button" className="rounded-md border border-white/20 px-3 py-2 text-xs" onClick={()=>saveProjectFile(result.pattern)}><FileJson size={14} className="mr-1 inline"/> JSON réutilisable</button>
            </div>
            {message&&<p role="status" className="text-xs text-white/65">{working&&<LoaderCircle size={12} className="mr-1 inline animate-spin"/>}{message}</p>}
            {compare&&<div className="grid w-full max-w-[740px] grid-cols-2 gap-2 pt-4 sm:grid-cols-4">
              <div className="rounded-md border border-white/15 p-2 text-xs">
                <StitchPreview pattern={source} max={150}/>
                <span className="mt-2 block">Source originale</span>
                <span className="mt-1 block text-white/50">Non modifiée</span>
              </div>
              {variants.map(v=><button type="button" key={v.detail} onClick={()=>choose("detail",v.detail)} className={"rounded-md border p-2 text-xs "+(settings.detail===v.detail?"border-[#ad99ff]":"border-white/15")}>
                <StitchPreview pattern={v.result.pattern} max={150}/>
                <span className="mt-2 block capitalize">{v.detail==="equilibree"?"Équilibré":v.detail}</span>
                <span className="mt-1 block text-white/50">{v.result.pattern.palette.length} fils · {v.result.pattern.back.length} contours</span>
              </button>)}
            </div>}
          </>}
        </main>

        <aside className="space-y-3 border-t border-white/10 p-4 lg:overflow-y-auto lg:border-l lg:border-t-0" aria-label="Cartes des régions">
          <h3 className="font-semibold">Cartes de composition</h3>
          <p className="text-xs leading-relaxed text-white/55">Régions détectées par connexité des couleurs DMC. Leur ordre organise le travail, sans déplacer physiquement les couches. Les titres sont modifiables.</p>
          {cards.map((c,i)=><div key={c.id} draggable
            onDragStart={e=>{dragged.current=c.id;e.dataTransfer.effectAllowed="move";}}
            onDragOver={e=>{if(dragged.current)e.preventDefault();}}
            onDrop={e=>{e.preventDefault();const from=cards.findIndex(x=>x.id===dragged.current);moveCard(from,i);dragged.current=null;}}
            onDragEnd={()=>{dragged.current=null;}}
            className="space-y-2 rounded-md border border-white/15 bg-white/[.035] p-3">
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-white/10 text-[11px]">{i+1}</span>
              <span className="h-4 w-4 shrink-0 rounded-sm" style={{background:FLOSS[c.color]?.hex??"#888"}}/>
              <input className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none focus:ring-1 focus:ring-purple-300" aria-label={"Nom de la carte "+(i+1)} value={c.name} maxLength={120} onChange={e=>patchCard(c.id,{name:e.target.value})}/>
              <button type="button" aria-label={c.visible?"Masquer la région":"Afficher la région"} onClick={()=>patchCard(c.id,{visible:!c.visible})}>{c.visible?<Eye size={16}/>:<EyeOff size={16}/>}</button>
            </div>
            <div className="flex items-center justify-between text-[11px] text-white/50"><span>{c.count} croix · {c.box.w}×{c.box.h}</span><span>Glisser pour trier</span></div>
            <div className="flex gap-2">
              <label className="flex-1 text-[11px] text-white/60">DMC (optionnel)
                <input className="mt-1 w-full rounded border border-white/20 bg-[#28282e] px-2 py-1 text-xs" value={c.overrideCode??""} placeholder={FLOSS[c.color]?.code??"Code"} onChange={e=>patchCard(c.id,{overrideCode:e.target.value.trim().toUpperCase()})}/>
              </label>
              <button type="button" className="self-end rounded-md border border-white/15 p-1.5 disabled:opacity-20" disabled={i===0} aria-label={"Monter la carte "+(i+1)} onClick={()=>moveCard(i,i-1)}><ArrowUp size={15}/></button>
              <button type="button" className="self-end rounded-md border border-white/15 p-1.5" disabled={i===cards.length-1} aria-label={"Descendre la carte "+(i+1)} onClick={()=>moveCard(i,i+1)}><ArrowDown size={15}/></button>
            </div>
            {!!c.overrideCode&&flossIndex(c.overrideCode)<0&&<p className="text-[11px] text-amber-200">Code DMC non reconnu : teinte source conservée.</p>}
          </div>)}
          {result&&<details className="border-t border-white/10 pt-3 text-xs text-white/60"><summary className="cursor-pointer font-medium text-white">Décisions proposées</summary>
            {result.decisions.map(x=><p key={x.kind} className="mt-2"><strong className="text-white">{x.kind} · {x.count}</strong> · confiance indicative {Math.round(x.confidence*100)} % : {x.reason}</p>)}
          </details>}
          <p className="border-t border-white/10 pt-3 text-[11px] leading-relaxed text-white/45">Les contours et fractions suggérés ne sont pas une reconnaissance certaine des objets. La source reste enregistrée ; l'édition manuelle de l'Atelier reste disponible.</p>
        </aside>
      </div>
      {subjectsOpen&&<SubjectWorkspace
        pattern={pattern}
        onCancel={()=>setSubjectsOpen(false)}
        onUse={p=>{setSubjectsOpen(false);onUse(p);}}
      />}
    </div>
  );
}
