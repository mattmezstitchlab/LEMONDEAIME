import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { ArrowLeft, ArrowRight, CheckSquare, Download, FileText, RotateCcw, RotateCw, Scissors, Trash2, Upload } from "lucide-react";
import { jsPDF } from "jspdf";
import { StudioFrame, studioButton, saveStudioFile } from "./StudioFrame";
import PdfPrep from "./PdfPrep";
import type { Pattern } from "../lib/pattern";
import { openPdf } from "../lib/pdfimport";
import { exportablePages, MAX_PDF_PAGES, outputPageDims, pageRotation, pdfSummary, repositionPage, rotatedCanvas, type PDFPage, type PDFSource } from "../lib/pdfStudioCore";

const unique=()=>globalThis.crypto?.randomUUID?.()??Math.random().toString(36).slice(2);
interface Props {onBack:()=>void;onConvertToPattern?:(file:File)=>void;onUsePattern?:(pattern:Pattern)=>void}
export default function PDFStudio({onBack,onConvertToPattern,onUsePattern}:Props){
  const [sources,setSources]=useState<PDFSource[]>([]);
  const [pages,setPages]=useState<PDFPage[]>([]);
  const [selected,setSelected]=useState<string|null>(null);
  const [preview,setPreview]=useState("");
  const [busy,setBusy]=useState("");
  const [notice,setNotice]=useState("");
  const [mode,setMode]=useState<"pages"|"magnetic">("pages");
  const [magneticSourceId,setMagneticSourceId]=useState<string|null>(null);
  const picker=useRef<HTMLInputElement>(null);
  const sourcesRef=useRef<PDFSource[]>([]);
  const drag=useRef<string|null>(null);
  const importing=useRef(false);
  useEffect(()=>{sourcesRef.current=sources;},[sources]);
  useEffect(()=>()=>{sourcesRef.current.forEach(s=>s.handle.destroy());},[]);
  const current=pages.find(p=>p.id===selected)??null;
  const summary=pdfSummary(pages);
  const magneticSource=sources.find(s=>s.id===magneticSourceId)??sources[0]??null;
  useEffect(()=>{
    if(!current){setPreview("");return;}
    const source=sources.find(s=>s.id===current.sourceId);
    if(!source)return;
    let cancelled=false;
    setPreview("");
    void source.handle.render(current.page,880).then(canvas=>{
      if(!cancelled)setPreview(rotatedCanvas(canvas,current.rotation).toDataURL("image/jpeg",.85));
    }).catch(()=>{if(!cancelled)setNotice("Impossible de prévisualiser cette page.");});
    return ()=>{cancelled=true;};
  },[current?.id,current?.rotation,sources]);
  const upload=async(e:ChangeEvent<HTMLInputElement>)=>{
    const files=Array.from(e.target.files??[]);e.target.value="";
    if(importing.current)return;
    importing.current=true;setBusy("Import des PDF…");setNotice("");
    try{
      for(const file of files){
        if(!file.name.toLowerCase().endsWith(".pdf")&&file.type!=="application/pdf"){
          setNotice("Seuls les fichiers PDF sont acceptés.");continue;
        }
        if(file.size>35*1024*1024){setNotice("PDF trop volumineux : limite de 35 Mo par fichier.");continue;}
        let handle;
        try{handle=await openPdf(file);}
        catch{setNotice("Impossible d'ouvrir « "+file.name+" » (PDF protégé, corrompu ou non pris en charge).");continue;}
        const currentLength=sourcesRef.current.reduce((sum,s)=>sum+s.handle.pages,0);
        if(handle.pages>MAX_PDF_PAGES||currentLength+handle.pages>MAX_PDF_PAGES){handle.destroy();setNotice("Limite de "+MAX_PDF_PAGES+" pages par montage. Exportez un document avant d'en ajouter d'autres.");continue;}
        const id=unique(),info:PDFSource={id,name:file.name,file,handle};
        sourcesRef.current=[...sourcesRef.current,info];
        setSources(prev=>[...prev,info]);
        const newPages:PDFPage[]=[];
        for(let n=1;n<=handle.pages;n++){
          try{
            const dims=await handle.dims(n);
            if(dims.w<=0||dims.h<=0||Math.max(dims.w,dims.h)>14000)throw Error("Dimensions PDF invalides");
            newPages.push({id:unique(),sourceId:id,page:n,name:file.name,width:dims.w,height:dims.h,rotation:0,enabled:true,thumb:""});
          }catch{setNotice("Certaines pages de « "+file.name+" » ont été ignorées.");}
        }
        setPages(old=>[...old,...newPages]);
        setSelected(old=>old??newPages[0]?.id??null);
        setMagneticSourceId(old=>old??id);
        for(const item of newPages) {
          try {
            const thumb=await handle.render(item.page,180);
            const data=thumb.toDataURL("image/jpeg",.72);
            setPages(old=>old.map(p=>p.id===item.id?{...p,thumb:data}:p));
          } catch {/* Still allow extraction of pages even without thumbnails. */}
          await new Promise<void>(resolve=>window.setTimeout(resolve,0));
        }
      }
    }finally{setBusy("");importing.current=false;}
  };
  const reorder=(id:string,target:number)=>setPages(current=>repositionPage(current,id,target));
  const change=(id:string,patch:Partial<PDFPage>)=>setPages(old=>old.map(p=>p.id===id?{...p,...patch}:p));
  const removeSource=(id:string)=>{
    if(!window.confirm("Retirer ce PDF du montage ? Le fichier original ne sera pas modifié."))return;
    const target=sources.find(s=>s.id===id);
    setSources(old=>old.filter(s=>s.id!==id));
    sourcesRef.current=sourcesRef.current.filter(s=>s.id!==id);
    setPages(old=>old.filter(p=>p.sourceId!==id));
    setSelected(pages.find(p=>p.sourceId!==id)?.id??null);
    if(magneticSourceId===id){setMagneticSourceId(sources.find(s=>s.id!==id)?.id??null);setMode("pages");}
    target?.handle.destroy();
  };
  const exportRaster=async()=>{
    const kept=exportablePages(pages);
    if(!kept.length){setNotice("Sélectionnez au moins une page.");return;}
    setBusy("Préparation PDF…");setNotice("");
    try{
      let output:jsPDF|null=null;
      for(let i=0;i<kept.length;i++){
        const page=kept[i],source=sources.find(s=>s.id===page.sourceId);
        if(!source)throw Error("Une source PDF manque.");
        const dims=outputPageDims(page);
        setBusy("Conversion page "+(i+1)+" / "+kept.length+"…");
        // The existing toolchain does not embed source PDF objects losslessly:
        // explicitly export raster pages with the original physical page size.
        const canvas=await source.handle.render(page.page,Math.min(2000,Math.max(950,page.width*2)));
        const rotated=rotatedCanvas(canvas,page.rotation);
        const orientation=dims.width>dims.height?"landscape":"portrait";
        if(!output)output=new jsPDF({unit:"pt",format:[dims.width,dims.height],orientation,compress:true});
        else output.addPage([dims.width,dims.height],orientation);
        output.addImage(rotated.toDataURL("image/jpeg",.9),"JPEG",0,0,dims.width,dims.height,undefined,"FAST");
        await new Promise<void>(resolve=>window.setTimeout(resolve,0));
      }
      output!.save("pointzero-document.pdf");
      setNotice("PDF exporté. Pages converties en images : le texte n'est plus sélectionnable et les liens du PDF source ne sont pas conservés.");
    }catch(error){setNotice(error instanceof Error?error.message:"Impossible d'exporter le PDF.");}
    finally{setBusy("");}
  };
  const extractText=async()=>{
    const kept=exportablePages(pages);
    if(!kept.length)return;
    setBusy("Lecture du texte…");setNotice("");
    try{
      const lines:string[]=[];
      for(const [i,p] of kept.entries()){
        const src=sources.find(s=>s.id===p.sourceId);
        if(!src)continue;
        const content=await src.handle.text(p.page,1000);
        lines.push("=== "+src.name+" · page "+p.page+" (ordre "+(i+1)+") ===");
        lines.push(content.map(v=>v.str).join(" "));
        lines.push("");
      }
      saveStudioFile("pointzero-texte-pdf.txt",lines.join("\n"),"text/plain;charset=utf-8");
      setNotice("Texte PDF extrait si disponible. Les documents scannés nécessitent un OCR, non inclus.");
    }catch(error){setNotice(error instanceof Error?error.message:"Extraction de texte impossible.");}
    finally{setBusy("");}
  };
  const actions=<div className="flex gap-1">
    <button disabled={!!busy} className={studioButton+" !px-2"} onClick={()=>picker.current?.click()} aria-label="Importer des PDF" title="Ajouter des PDF"><Upload size={16}/></button>
    <button disabled={!summary.kept||!!busy} className="inline-flex min-h-9 items-center gap-1.5 rounded-[5px] bg-white px-3 text-xs font-semibold text-black disabled:opacity-35" onClick={()=>void exportRaster()}><Download size={15}/> PDF</button>
  </div>;
  return <StudioFrame title="PDF" subtitle="Assembler, déplacer, pivoter et extraire des pages — local" onBack={onBack}
    leftLabel="Documents PDF" rightLabel="Propriétés PDF" actions={actions}
    left={<>
      <h2 className="mb-3 text-sm font-semibold">Mes documents</h2>
      <button onClick={()=>picker.current?.click()} disabled={!!busy} className={studioButton+" w-full"}><Upload size={15}/> Importer un ou plusieurs PDF</button>
      <p className="mt-2 text-[11px] text-white/55">PDF jusqu'à 35 Mo chacun, 80 pages au total. Fichiers ouverts uniquement dans ce navigateur.</p>
      <div className="mt-4 space-y-2">{sources.map(source=><div key={source.id} className="flex items-start gap-2 rounded-[5px] border border-white/15 p-3 text-xs">
        <FileText size={17} className="shrink-0 text-white/70"/>
        <div className="min-w-0 flex-1"><p className="truncate font-semibold" title={source.name}>{source.name}</p><p className="mt-1 text-[11px] text-white/55">{source.handle.pages} page(s)</p>
          <button type="button" className="mt-2 block text-left text-[11px] font-semibold text-white underline underline-offset-2"
            onClick={()=>{setMagneticSourceId(source.id);setMode("magnetic");}}>Recomposer la grille ↗</button>
          {onConvertToPattern&&<button className="mt-2 text-[11px] text-white underline" onClick={()=>onConvertToPattern(source.file)}>Ouvrir dans Broderie (ancien parcours) ↗</button>}
        </div>
        <button type="button" aria-label={"Retirer "+source.name} title="Retirer ce PDF" onClick={()=>removeSource(source.id)} className="text-white/60 hover:text-white"><Trash2 size={15}/></button>
      </div>)}</div>
      {sources.length>0&&<p className="mt-4 text-[11px] text-white/65">Glissez les pages au centre pour les réordonner. Utilisez les flèches pour un déplacement précis.</p>}
    </>}
    right={<>
      <h2 className="mb-4 text-sm font-semibold">Pages et export</h2>
      <div className="rounded-[5px] border border-white/15 bg-white/5 p-3 text-xs"><p>{summary.kept} page(s) conservées</p>
        <p className="mt-1 text-white/60">{summary.excluded} exclue(s) · {summary.sources} fichier(s)</p></div>
      {mode==="magnetic"&&<div className="mt-4 rounded-[5px] border border-white/15 bg-white/5 p-3 text-xs leading-relaxed text-white/75"><p className="mb-2 font-semibold text-white">Recomposition magnétique</p>Les pages de grille deviennent des cartes à déplacer sur un plateau. Aimantation des bords, zoom, mosaïque, lecture des symboles et correspondances DMC sont conservés. La conversion en patron reste distincte de l’assemblage PDF.</div>}
      {mode==="pages"&&current&&<div className="mt-4 space-y-3">
        <h3 className="text-xs font-semibold">Page {current.page}</h3>
        <p className="truncate text-[11px] text-white/60">{current.name}</p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={()=>change(current.id,pageRotation(current,-90))} className={studioButton}><RotateCcw size={15}/> -90°</button>
          <button onClick={()=>change(current.id,pageRotation(current,90))} className={studioButton}><RotateCw size={15}/> +90°</button>
        </div>
        <button onClick={()=>change(current.id,{enabled:!current.enabled})} aria-pressed={current.enabled} className={studioButton+" w-full"}><CheckSquare size={15}/>{current.enabled?"Incluse dans l'export":"Exclue de l'export"}</button>
        <p className="text-[11px] text-white/55">Rotation : {current.rotation}° · format : {Math.round(current.width)} × {Math.round(current.height)} pt</p>
      </div>}
      {mode==="pages"&&<div className="mt-5 space-y-2 border-t border-white/15 pt-4">
        <button disabled={!summary.kept||!!busy} onClick={()=>void exportRaster()} className={studioButton+" w-full"}><Download size={15}/> Assembler et exporter PDF</button>
        <button disabled={!summary.kept||!!busy} onClick={()=>void extractText()} className={studioButton+" w-full"}><Scissors size={15}/> Extraire le texte .txt</button>
      </div>}
      {mode==="pages"&&<p className="mt-4 text-[11px] leading-relaxed text-white/60"><strong className="text-white">Limite importante :</strong> l'export PDF reconstruit les pages comme images. Il conserve l'apparence, mais pas les textes vectoriels, champs, signatures ni liens interactifs du PDF original.</p>}
      {mode==="pages"&&<p className="mt-2 text-[11px] text-white/55">Aucune modification des fichiers originaux. Pas de signature, de suppression définitive de contenu ou d'OCR.</p>}
    </>}
  >
    <div className="mx-auto max-w-[1000px]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-[11px] font-semibold uppercase tracking-widest text-white/60">Planche de pages</p><h2 className="mt-1 text-lg font-semibold">{pages.length?"Organiser le PDF":"Importer un document"}</h2></div>
        {pages.length>0&&<p className="text-xs text-white/60">{summary.kept} / {summary.total} pages sélectionnées</p>}
      </div>
      <div className="mb-4 inline-flex gap-1 rounded-[5px] border border-white/20 bg-[#09090b] p-1" role="group" aria-label="Mode du Studio PDF">
        <button type="button" aria-pressed={mode==="pages"} onClick={()=>setMode("pages")}
          className={`rounded-[4px] px-3 py-2 text-xs ${mode==="pages"?"bg-white font-semibold text-black":"text-white/75 hover:bg-white/10"}`}>Assembler les pages</button>
        <button type="button" aria-label="Grilles magnétiques" aria-pressed={mode==="magnetic"} disabled={!sources.length} onClick={()=>setMode("magnetic")}
          className={`rounded-[4px] px-3 py-2 text-xs disabled:opacity-30 ${mode==="magnetic"?"bg-white font-semibold text-black":"text-white/75 hover:bg-white/10"}`}>Grilles magnétiques</button>
      </div>
      {mode==="magnetic"&&magneticSource
        ? <div aria-label="Tableau des cartes magnétiques" className="min-w-0">
            <PdfPrep key={magneticSource.id} file={magneticSource.file} embedded studioEmbedded
              onClose={()=>setMode("pages")}
              onImport={p=>{
                if(onUsePattern)onUsePattern(p);
                else if(onConvertToPattern)onConvertToPattern(magneticSource.file);
                else setNotice("Patron prêt. Activez l’atelier Broderie pour l’importer.");
              }}/>
          </div>
        : null}
      {mode==="pages"&&(!pages.length?<div className="mx-auto mt-[8vh] max-w-md rounded-[7px] border border-white/15 bg-[#09090b] p-7 text-center">
        <FileText className="mx-auto mb-4 text-white/70" size={34}/>
        <h3 className="text-lg font-semibold">Votre Studio PDF</h3>
        <p className="mt-2 text-sm text-white/60">Regroupez des PDF, choisissez les pages, réorganisez-les puis exportez votre document.</p>
        <button onClick={()=>picker.current?.click()} className="mt-5 rounded-[5px] bg-white px-5 py-3 text-sm font-semibold text-black">Importer des PDF</button>
      </div>:<>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4" aria-label="Pages PDF à organiser">
          {pages.map((page,i)=><article key={page.id} draggable onDragStart={(e:DragEvent<HTMLElement>)=>{drag.current=page.id;e.dataTransfer.effectAllowed="move";}}
            onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(drag.current)reorder(drag.current,i);drag.current=null;}}
            className={"min-w-0 overflow-hidden rounded-[6px] border bg-white text-black "+(selected===page.id?"border-white ring-2 ring-white/60":"border-white/20")+(page.enabled?"":" opacity-55")}>
            <button aria-label={"Sélectionner page "+(i+1)} type="button" onClick={()=>setSelected(page.id)} className="block w-full">
              <div className="flex h-[190px] items-center justify-center bg-[#efeff0] p-3">
                {page.thumb?<img src={page.thumb} alt={"Page "+page.page} style={{transform:"rotate("+page.rotation+"deg)"}} className="max-h-full max-w-full object-contain shadow-md"/>:<div className="text-xs text-black/50">{busy?"Chargement…":"Sans aperçu"}</div>}
              </div>
              <div className="flex items-center justify-between gap-2 px-2 py-2 text-[11px]"><span>Page {i+1}</span><span className="truncate text-black/55">{page.name}</span></div>
            </button>
            <div className="flex justify-between border-t border-black/10 px-2 py-1">
              <button aria-label={"Déplacer page "+(i+1)+" à gauche"} disabled={i===0} onClick={()=>reorder(page.id,i-1)} className="p-1 disabled:opacity-25"><ArrowLeft size={15}/></button>
              <button aria-label={(page.enabled?"Exclure":"Inclure")+" page "+(i+1)} onClick={()=>change(page.id,{enabled:!page.enabled})} className="p-1 text-[10px] font-semibold">{page.enabled?"Incluse":"Exclue"}</button>
              <button aria-label={"Déplacer page "+(i+1)+" à droite"} disabled={i===pages.length-1} onClick={()=>reorder(page.id,i+1)} className="p-1 disabled:opacity-25"><ArrowRight size={15}/></button>
            </div>
          </article>)}
        </div>
        {current&&<section className="mt-6 rounded-[7px] border border-white/15 bg-[#09090b] p-4" aria-label="Aperçu de la page sélectionnée">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Page sélectionnée · {current.page}</h3><span className="text-xs text-white/60">{current.rotation}°</span></div>
          {preview?<img className="mx-auto max-h-[65vh] max-w-full rounded-[4px] bg-white object-contain" src={preview} alt={"Aperçu page "+current.page}/>:<div className="py-10 text-center text-xs text-white/60">Préparation de l'aperçu…</div>}
        </section>}
      </>)}
      {busy&&<p role="status" className="mt-4 rounded-[5px] bg-[#09090b] p-3 text-xs text-white">{busy}</p>}
      {notice&&<p role="status" className="mt-4 rounded-[5px] bg-[#09090b] p-3 text-xs text-white">{notice}</p>}
    </div>
    <input ref={picker} className="sr-only" type="file" accept=".pdf,application/pdf" multiple aria-label="Choisir des PDF" onChange={e=>void upload(e)}/>
  </StudioFrame>;
}
