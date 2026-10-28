import {writeStoredJSON,everyStored} from "../lib/storageSafety";
import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent as RPointerEvent, type DragEvent as RDragEvent } from "react";
import { Accessibility, GraduationCap, GitBranch, Gamepad2, Sparkles, Layers3, Scale, ArrowLeft, BookOpen, Camera, ChevronDown, Copy, Download, FileText, Files, FolderOpen, Globe, HeartHandshake, ImagePlus, LayoutTemplate, Music2, Redo2, Save, Search, Shirt, Shapes, Trash2, Type, Undo2, Wallet, WandSparkles, X } from "lucide-react";
import { jsPDF } from "jspdf";
import { MOTIF_PRESETS } from "../lib/motifPresets";
import { StitchThumbnail } from "./MotifLibrary";
import FragmentGridWorkspace from "./FragmentGridWorkspace";
import {
  FORMATS, addDesignElement, colorOK, createDesign, designToHTML, designToSVG, duplicateDesign, safeDesign, specFor,
  validDataImage, type DesignDocument, type DesignElement, type DesignFormat
} from "../lib/designStudio";

const CURRENT = "pointzero:design-current:v1";
const DRAFTS = "pointzero:design-drafts:v1";
const mono = "rounded-[5px] border border-white/20 bg-[#1e1e21] px-3 py-2 text-[12px] text-white outline-none focus:border-white/70";
const action = "inline-flex min-h-9 items-center justify-center gap-2 rounded-[5px] border border-white/20 bg-white/[.065] px-3 text-xs font-medium text-white hover:bg-white/15";
const saveFile = (name: string, body: Blob) => {
  const url = URL.createObjectURL(body);
  const link = document.createElement("a"); link.href = url; link.download = name;
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 300);
};
const slug = (doc: DesignDocument) => (doc.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || "pointzero");
function restore(): DesignDocument {
  try { return safeDesign(JSON.parse(localStorage.getItem(CURRENT) ?? "")) ?? createDesign("affiche"); }
  catch { return createDesign("affiche"); }
}
function readDrafts(): DesignDocument[] {
  try { const value = JSON.parse(localStorage.getItem(DRAFTS) ?? "[]") as unknown;
    return Array.isArray(value) ? value.map(safeDesign).filter((d): d is DesignDocument => !!d).slice(0,12) : [];
  } catch { return []; }
}
async function imageFromSVG(svg: string, w: number, h: number): Promise<string> {
  const url = URL.createObjectURL(new Blob([svg], { type:"image/svg+xml;charset=utf-8" }));
  try {
    const bitmap = await new Promise<HTMLImageElement>((resolve,reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Impossible de convertir ce visuel en image."));
      image.src = url;
    });
    const canvas = document.createElement("canvas"); canvas.width=w; canvas.height=h;
    const context=canvas.getContext("2d");
    if (!context) throw new Error("Export image non disponible sur ce navigateur.");
    context.drawImage(bitmap,0,0,w,h);
    return canvas.toDataURL("image/png");
  } finally { URL.revokeObjectURL(url); }
}
function motifSVG(doc: DesignDocument, layer: Extract<DesignElement,{kind:"motif"}>): string {
  const fragment: DesignDocument = { ...doc, width: layer.w, height: layer.h, elements: [{ ...layer, x:0,y:0 }] };
  return "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(designToSVG(fragment,true));
}
interface Props {
  onEmbroidery: () => void;
  onPhoto?: () => void;
  onFashion?: () => void;
  onBudget?: () => void;
  onProgramme?: () => void;
  onAdmin?: () => void;
  onMiniSite?: () => void;
  onPDF?: () => void;
  onGeneration?: () => void;
  onMusic?: () => void;
  onMusicProduction?: () => void;
  onAccessibility?: () => void;
  onAcademy?: () => void;
  onSpace?: () => void;
  onCausal?: () => void;
  onMetamorphose?: () => void;
  onRippleCircle?: () => void;
  onGame?: () => void;
  onLegal?: () => void;
  onArtWorld?: () => void;
  onManifest?: () => void;
  onUniversal?: () => void;
  incomingPhoto?: {id:string;dataUrl:string}|null;
  onPhotoConsumed?: () => void;
}
export default function DesignStudio({ onEmbroidery, onPhoto, onFashion, onBudget, onProgramme, onAdmin, onMiniSite, onPDF, onGeneration, onMusic, onMusicProduction, onAccessibility, onAcademy, onSpace, onCausal, onMetamorphose, onRippleCircle, onGame, onLegal, onArtWorld, onManifest, onUniversal, incomingPhoto, onPhotoConsumed }: Props) {
  const [doc, setDoc] = useState<DesignDocument>(restore);
  const [past, setPast] = useState<DesignDocument[]>([]);
  const [future, setFuture] = useState<DesignDocument[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<"elements"|"formats"|"documents"|"fragments">("elements");
  const [search, setSearch] = useState("");
  const [sidebar, setSidebar] = useState(false);
  const [drafts, setDrafts] = useState<DesignDocument[]>(readDrafts);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [scale,setScale] = useState(.5);
  const [showExport,setShowExport] = useState(false);
  const [showDecline,setShowDecline] = useState(false);
  const [showStudios,setShowStudios] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const artboard = useRef<HTMLDivElement>(null);
  const imagePicker = useRef<HTMLInputElement>(null);
  const projectPicker = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{id:string;x:number;y:number;startX:number;startY:number}|null>(null);
  const receivedPhoto = useRef<string|null>(null);
  const element = doc.elements.find(e => e.id===selected) ?? null;
  const [patternPreviews] = useState(() => MOTIF_PRESETS.map(p => ({...p, pattern:p.make()})));

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const update = () => setScale(Math.min(1.4, Math.max(.12, Math.min((el.clientWidth-72)/doc.width,(el.clientHeight-72)/doc.height))));
    const observer = new ResizeObserver(update); observer.observe(el); update();
    return () => observer.disconnect();
  }, [doc.width,doc.height,leftTab]);
  useEffect(() => {
    try { writeStoredJSON(CURRENT,JSON.stringify(doc),safeDesign);window.dispatchEvent(new Event("aime:design-changed")); }
    catch { setNotice("Stockage local plein : exportez le fichier JSON pour conserver cette création."); }
  }, [doc]);
  useEffect(() => {
    if(!incomingPhoto || incomingPhoto.id===receivedPhoto.current)return;
    receivedPhoto.current=incomingPhoto.id;
    if(!validDataImage(incomingPhoto.dataUrl)){setNotice("Photo incompatible avec le studio de création.");onPhotoConsumed?.();return;}
    const id=globalThis.crypto?.randomUUID?.()??String(Date.now());
    setDoc(current=>{
      const w=current.width*.68,h=current.height*.5;
      const next:DesignElement={id,kind:"image",x:Math.round((current.width-w)/2),y:Math.round((current.height-h)/2),w,h,dataUrl:incomingPhoto.dataUrl};
      setPast(history=>[...history.slice(-39),current]);
      return {...current,elements:[...current.elements,next]};
    });
    setFuture([]);setSelected(id);setNotice("Photo retouchée ajoutée à votre composition.");
    onPhotoConsumed?.();
  },[incomingPhoto,onPhotoConsumed]);
  const change = (next: DesignDocument) => {
    setPast(history => [...history.slice(-39),doc]);
    setFuture([]);
    setDoc(next);
  };
  const patchDocument = (patch: Partial<Pick<DesignDocument,"name"|"background">>) => change({...doc,...patch});
  const patchElement = (id: string, patch: Partial<DesignElement>) => change({
    ...doc, elements: doc.elements.map(e => e.id===id ? {...e,...patch} as DesignElement : e),
  });
  const add = (kind: "text"|"shape"|"motif", presetId?: string, at?: {x:number;y:number}) => {
    const next=addDesignElement(doc,kind,presetId,at);
    change(next);setSelected(next.elements.at(-1)?.id??null);setSidebar(false);
  };
  const undo = () => { if(!past.length)return;setFuture(f=>[doc,...f]);setDoc(past.at(-1)!);setPast(h=>h.slice(0,-1));setSelected(null); };
  const redo = () => { if(!future.length)return;setPast(h=>[...h,doc]);setDoc(future[0]);setFuture(f=>f.slice(1));setSelected(null); };
  const newDocument=(format:DesignFormat) => {
    if(doc.elements.length && !window.confirm("Créer un nouveau document ? Le brouillon actuel est sauvegardé sur cet appareil."))return;
    change(createDesign(format));setSelected(null);setSidebar(false);
  };
  const decline = (format:DesignFormat) => {
    if(format===doc.format){setShowDecline(false);return;}
    // La déclinaison ne détruit jamais le support d'origine : le conserver
    // explicitement dans Mes créations, en plus de l'historique Annuler.
    const versions=[doc,...drafts.filter(d=>d.id!==doc.id)].slice(0,12);
    let preserved=false;
    try {
      writeStoredJSON(DRAFTS,JSON.stringify(versions),everyStored(safeDesign));
      setDrafts(versions);
      preserved=true;
    } catch { /* The user can still undo and export the original JSON. */ }
    change(duplicateDesign(doc,format));setSelected(null);setShowDecline(false);setSidebar(false);
    setNotice(preserved
      ? "Déclinaison créée. Original conservé dans Mes créations. Vérifiez la mise en page."
      : "Déclinaison créée. Stockage plein : annulez ou exportez l'original en JSON.");
  };
  const saveDraft = () => {
    const next=[doc,...drafts.filter(d=>d.id!==doc.id)].slice(0,12);
    try{writeStoredJSON(DRAFTS,JSON.stringify(next),everyStored(safeDesign));setDrafts(next);setNotice("Document ajouté à Mes créations.");}
    catch{setNotice("Espace local insuffisant. Utilisez Exporter → Projet JSON.");}
  };
  const loadDraft=(value:DesignDocument) => {change(value);setSelected(null);setSidebar(false);};
  const chooseImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file=e.target.files?.[0];e.target.value="";
    if(!file)return;
    if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>3.8*1024*1024){setNotice("Choisissez une image PNG, JPEG ou WebP de moins de 3,8 Mo.");return;}
    const reader=new FileReader();
    reader.onload=()=> {
      const data=String(reader.result??"");
      if(!validDataImage(data)){setNotice("Image invalide ou trop volumineuse.");return;}
      const w=doc.width*.37,h=doc.height*.26;
      const next:DesignElement={id:globalThis.crypto?.randomUUID?.()??Math.random().toString(36),kind:"image",x:doc.width*.32,y:doc.height*.32,w,h,dataUrl:data};
      change({...doc,elements:[...doc.elements,next]});setSelected(next.id);setSidebar(false);
    };
    reader.onerror=()=>setNotice("Impossible de lire cette image.");
    reader.readAsDataURL(file);
  };
  const openJSON = async (e:ChangeEvent<HTMLInputElement>) => {
    const file=e.target.files?.[0];e.target.value="";
    if(!file)return;
    if(file.size>8_000_000){setNotice("Projet JSON trop volumineux.");return;}
    try {
      const parsed=safeDesign(JSON.parse(await file.text()));
      if(!parsed)throw new Error("Document POINTZERO incompatible.");
      change(parsed);setSelected(null);setSidebar(false);setNotice("Projet chargé.");
    } catch (err) {setNotice(err instanceof Error?err.message:"Projet illisible.");}
  };
  const exportKind = async (kind:"svg"|"png"|"pdf"|"json"|"html") => {
    setShowExport(false);setBusy(true);
    try{
      const name=slug(doc);
      if(kind==="json"){saveFile(name+".pointzero.json",new Blob([JSON.stringify(doc,null,2)],{type:"application/json"}));return;}
      if(kind==="html"){saveFile(name+".html",new Blob([designToHTML(doc)],{type:"text/html;charset=utf-8"}));return;}
      const svg=designToSVG(doc);
      if(kind==="svg"){saveFile(name+".svg",new Blob([svg],{type:"image/svg+xml;charset=utf-8"}));return;}
      const data=await imageFromSVG(svg,doc.width,doc.height);
      if(kind==="png"){
        const response=await fetch(data);const blob=await response.blob();saveFile(name+".png",blob);return;
      }
      const widthMm=doc.format==="flyer"||doc.format==="faire-part"?148:210;
      const heightMm=widthMm*doc.height/doc.width;
      const pdf=new jsPDF({unit:"mm",format:[widthMm,heightMm],orientation:heightMm>=widthMm?"portrait":"landscape",compress:true});
      pdf.addImage(data,"PNG",0,0,pdf.internal.pageSize.getWidth(),pdf.internal.pageSize.getHeight());
      pdf.save(name+".pdf");
    }catch(err){setNotice(err instanceof Error?err.message:"Export impossible.");}
    finally{setBusy(false);}
  };
  const beginDrag=(event:RPointerEvent<HTMLDivElement>, e:DesignElement)=>{
    if(event.button!==0)return;
    event.stopPropagation();setSelected(e.id);
    dragRef.current={id:e.id,x:e.x,y:e.y,startX:event.clientX,startY:event.clientY};
    setPast(history=>[...history.slice(-39),doc]);setFuture([]);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const moveDrag=(event:RPointerEvent<HTMLDivElement>)=>{
    const d=dragRef.current;if(!d)return;
    const dx=(event.clientX-d.startX)/scale,dy=(event.clientY-d.startY)/scale;
    setDoc(current=>({...current,elements:current.elements.map(e=>e.id===d.id?{...e,x:Math.round(d.x+dx),y:Math.round(d.y+dy)}:e)}));
  };
  const endDrag=()=>{dragRef.current=null;};
  const onDrop=(event:RDragEvent<HTMLDivElement>)=>{
    const presetId=event.dataTransfer.getData("application/x-pointzero-design-motif");
    if(!presetId)return;
    event.preventDefault();
    const bounds=artboard.current?.getBoundingClientRect();
    if(!bounds)return;
    const x=(event.clientX-bounds.left)/scale,y=(event.clientY-bounds.top)/scale;
    add("motif",presetId,{x,y});
  };
  const layers=doc.elements;
  const filtered=patternPreviews.filter(x=>x.name.toLowerCase().includes(search.trim().toLowerCase()));

  return <div className="pz-design fixed inset-0 flex h-[100dvh] flex-col overflow-hidden bg-[#151517] text-white">
    <header className="z-20 flex h-[58px] shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#09090b] px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <span className="shrink-0 text-[13px] font-bold tracking-tight">× <span className="hidden sm:inline">POINTZERO</span></span>
        <span className="hidden text-[11px] text-white/40 sm:inline">/</span>
        <span className="hidden truncate text-[12px] text-white/75 sm:inline">Studio universel</span>
        {onManifest&&<button type="button" aria-label="Retour à l’accueil POINTZERO" onClick={onManifest} className={action+" whitespace-nowrap"}>Accueil</button>}
        <button onClick={onEmbroidery} className={action+" ml-1"} aria-label="Ouvrir l'atelier broderie"><ArrowLeft size={14}/><span className="hidden sm:inline">Broderie</span><span className="sm:hidden">Fil</span></button>
        <div className="relative">
          <button type="button" aria-label="Ouvrir le menu des studios" aria-expanded={showStudios}
            onClick={()=>{setShowStudios(x=>!x);setShowDecline(false);setShowExport(false);}} className={action}>
            <LayoutTemplate size={15}/><span className="hidden sm:inline">Studios</span><ChevronDown size={13}/>
          </button>
          {showStudios&&<div aria-label="Choix du studio" className="pz-design-menu absolute left-0 top-[calc(100%+8px)] z-50 w-[220px] max-h-[76dvh] overflow-y-auto p-2">
            {([
              {name:"Dossier Universel AIME",icon:<Layers3 size={16}/>,onClick:onUniversal},
              {name:"Photo",icon:<Camera size={16}/>,onClick:onPhoto},
              {name:"Stylisme",icon:<Shirt size={16}/>,onClick:onFashion},
              {name:"Budget",icon:<Wallet size={16}/>,onClick:onBudget},
              {name:"Programme",icon:<BookOpen size={16}/>,onClick:onProgramme},
              {name:"Admin / Documents",icon:<Files size={16}/>,onClick:onAdmin},
              {name:"Mini-site",icon:<Globe size={16}/>,onClick:onMiniSite},
              {name:"PDF",icon:<FileText size={16}/>,onClick:onPDF},
              {name:"Génération",icon:<WandSparkles size={16}/>,onClick:onGeneration},
              {name:"Musique inclusive",icon:<Music2 size={16}/>,onClick:onMusic},
              {name:"Music · Radio & Label",icon:<Music2 size={16}/>,onClick:onMusicProduction},
              {name:"Accessibilité & Design System",icon:<Accessibility size={16}/>,onClick:onAccessibility},
              {name:"POINTZERO Academy · UI/UX & No Code",icon:<GraduationCap size={16}/>,onClick:onAcademy},
              {name:"Mon Espace · Tous les mondes",icon:<Layers3 size={16}/>,onClick:onSpace},
              {name:"AIME MÉTAMORPHOSE · Grille",icon:<Sparkles size={16}/>,onClick:onMetamorphose},
              {name:"RIPPLECIRCLE · Cadran vivant",icon:<GitBranch size={16}/>,onClick:onRippleCircle},
              {name:"Studio Game · Confetti 30",icon:<Gamepad2 size={16}/>,onClick:onGame},
              {name:"Studio Causal · RIPPLE",icon:<GitBranch size={16}/>,onClick:onCausal},
              {name:"Juridique & RGPD",icon:<Scale size={16}/>,onClick:onLegal},
              {name:"LE MONDE AIME · Atelier libre",icon:<HeartHandshake size={16}/>,onClick:onArtWorld}
            ]).filter(i=>!!i.onClick).map(item=>
              <button type="button" key={item.name} aria-label={"Ouvrir le studio "+item.name}
                className="flex min-h-11 w-full items-center gap-2 rounded-[5px] px-3 text-left text-xs text-white/85 hover:bg-white/10 hover:text-white"
                onClick={()=>{setShowStudios(false);item.onClick?.();}}>{item.icon}{item.name}</button>)}
          </div>}
        </div>
      </div>
      {leftTab === "fragments"
        ? <span className="text-[10px] font-semibold tracking-[.12em] text-white/60">GRILLE · SAUVEGARDE LOCALE</span>
        :       <div className="flex min-w-0 items-center gap-1">
        <button type="button" onClick={undo} disabled={!past.length} className="grid size-9 place-items-center rounded-[5px] text-white/80 hover:bg-white/10 disabled:opacity-30" aria-label="Annuler"><Undo2 size={16}/></button>
        <button type="button" onClick={redo} disabled={!future.length} className="hidden size-9 place-items-center rounded-[5px] text-white/80 hover:bg-white/10 disabled:opacity-30 sm:grid" aria-label="Rétablir"><Redo2 size={16}/></button>
        <button onClick={saveDraft} aria-label="Enregistrer dans Mes créations" title="Enregistrer" className="grid size-9 place-items-center rounded-[5px] text-white/80 hover:bg-white/10"><Save size={16}/></button>
        <div className="relative">
          <button onClick={()=>setShowDecline(!showDecline)} className={action}><WandSparkles size={15}/><span className="hidden sm:inline">Décliner</span><ChevronDown size={13}/></button>
          {showDecline && <div className="pz-design-menu absolute right-0 top-[calc(100%+8px)] z-50 w-[205px] max-h-[65dvh] overflow-y-auto p-2">
            <p className="px-2 py-1 text-[11px] text-white/65">Même création, autre format</p>
            {FORMATS.map(f=><button key={f.id} onClick={()=>decline(f.id)} className="block w-full rounded-[5px] px-2 py-2 text-left text-[12px] hover:bg-white/10">{f.label}<span className="ml-1 text-white/50">{f.width}×{f.height}</span></button>)}
          </div>}
        </div>
        <div className="relative">
          <button onClick={()=>setShowExport(!showExport)} disabled={busy} className="flex min-h-9 items-center gap-1 rounded-[5px] bg-white px-3 text-xs font-semibold text-black disabled:opacity-40"><Download size={15}/><span className="hidden sm:inline">Exporter</span></button>
          {showExport&&<div className="pz-design-menu absolute right-0 top-[calc(100%+8px)] z-50 w-[170px] p-2">
            {(["png","svg","pdf","json",...(doc.format==="mini-site"||doc.format==="maquette"?["html"]:[])] as Array<"png"|"svg"|"pdf"|"json"|"html">).map(kind=>
              <button key={kind} className="block w-full rounded-[5px] px-2 py-2 text-left text-xs uppercase hover:bg-white/10" onClick={()=>void exportKind(kind)}>{kind==="html"?"HTML statique":kind==="json"?"Projet JSON":kind}</button>)}
          </div>}
        </div>
      </div>}
    </header>
    <div className="relative flex min-h-0 flex-1">
      <button onClick={()=>setSidebar(!sidebar)} className="absolute left-3 top-3 z-20 grid size-10 place-items-center rounded-[5px] border border-white/20 bg-[#09090b] lg:hidden" aria-label={sidebar?"Fermer les ressources":"Ouvrir les ressources"}><LayoutTemplate size={18}/></button>
      <aside aria-label="Ressources et formats" className={"pz-design-sidebar absolute bottom-0 left-0 top-0 z-20 flex w-[252px] flex-col border-r border-white/10 bg-[#0b0b0d] lg:relative lg:translate-x-0 "+(sidebar?"translate-x-0":"-translate-x-full")}>
        <div className="grid grid-cols-4 gap-1 border-b border-white/10 p-2">
          {([["elements","Éléments"],["formats","Formats"],["documents","Projets"],["fragments","Grille"]] as const).map(([id,label])=>
            <button key={id} onClick={()=>setLeftTab(id)} aria-pressed={leftTab===id} className={"min-h-9 rounded-[5px] text-[11px] font-semibold "+(leftTab===id?"bg-white text-black":"text-white/65 hover:bg-white/10")}>{label}</button>)}
        </div>
        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-3">
          {leftTab==="elements"&&<>
            <h2 className="mb-2 text-[12px] font-semibold">Ajouter</h2>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={()=>add("text")} className={action+" flex-col px-1 py-3"}><Type size={18}/> Texte</button>
              <button onClick={()=>add("shape")} className={action+" flex-col px-1 py-3"}><Shapes size={18}/> Forme</button>
              <button onClick={()=>imagePicker.current?.click()} className={action+" flex-col px-1 py-3"}><ImagePlus size={18}/> Image</button>
            </div>
            <h2 className="mb-2 mt-5 text-[12px] font-semibold">Bibliothèque florale et graphique</h2>
            <div className="relative"><Search size={14} className="absolute left-2.5 top-2.5 text-white/60"/>
              <input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Chercher un motif" className={mono+" w-full pl-8"} aria-label="Rechercher dans la bibliothèque graphique"/>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">{filtered.map(p=>
              <button type="button" key={p.id} draggable onDragStart={e=>{e.dataTransfer.setData("application/x-pointzero-design-motif",p.id);e.dataTransfer.effectAllowed="copy";}}
                onClick={()=>add("motif",p.id)} title="Cliquer pour ajouter, glisser pour placer" className="overflow-hidden rounded-[5px] border border-white/15 bg-white/[.06] text-left hover:border-white/50">
                <div className="bg-[#f8f4ee]"><StitchThumbnail pattern={p.pattern}/></div><span className="block truncate p-2 text-[11px]">{p.name}</span>
              </button>)}</div>
          </>}
          {leftTab==="formats"&&<>
            <h2 className="mb-2 text-xs font-semibold">Nouveau support</h2>
            <p className="mb-3 text-[11px] leading-relaxed text-white/65">Créez un nouveau document, ou utilisez « Décliner » pour conserver la composition.</p>
            {FORMATS.map(f=><button key={f.id} onClick={()=>newDocument(f.id)} className={"mb-1.5 flex w-full items-center justify-between gap-2 rounded-[5px] border px-3 py-3 text-left text-xs "+(f.id===doc.format?"border-white/60 bg-white/10":"border-white/15 hover:bg-white/10")}>
              <span className="font-semibold">{f.label}</span><span className="text-[10px] text-white/55">{f.description}</span>
            </button>)}
          </>}
          {leftTab==="fragments"&&<>
            <h2 className="mb-3 text-[12px] font-semibold">Grille universelle</h2>
            <p className="text-[11px] leading-relaxed text-white/65">Importez une collection JSON depuis AIME MÉTAMORPHOSE. Chaque case conserve sa source, son cadrage et son verrouillage.</p>
            <p className="mt-3 text-[11px] leading-relaxed text-white/65">La grille se recompose lorsque vous agrandissez un fragment. Ce format reste indépendant des points et des fils DMC.</p>
          </>}
          {leftTab==="documents"&&<>
            <button onClick={saveDraft} className={action+" w-full"}><Save size={15}/> Sauvegarder le projet</button>
            <button onClick={()=>projectPicker.current?.click()} className={action+" mt-2 w-full"}><FolderOpen size={15}/> Importer un JSON</button>
            <h2 className="mb-2 mt-5 text-[12px] font-semibold">Mes créations</h2>
            {drafts.map(d=><button key={d.id} onClick={()=>loadDraft(d)} className="mb-2 flex w-full flex-col rounded-[5px] border border-white/15 p-3 text-left hover:bg-white/10">
              <span className="text-xs font-semibold">{d.name}</span><span className="mt-1 text-[11px] text-white/55">{specFor(d.format).label} · {d.elements.length} éléments</span>
            </button>)}
            {!drafts.length&&<p className="text-xs text-white/60">Aucun projet enregistré dans la bibliothèque.</p>}
          </>}
        </div>

      </aside>
      {leftTab === "fragments" ? <FragmentGridWorkspace/> : <>
      <main ref={stage} aria-label="Canevas de création universel" className="pz-design-stage min-w-0 flex-1 overflow-auto p-4 pt-16 lg:p-5" onClick={()=>setSelected(null)}>
        <div className="mx-auto flex min-h-full w-fit flex-col items-center justify-center">
          <div className="mb-2 flex w-full items-center justify-between gap-3 text-[11px] text-white/65">
            <span>{specFor(doc.format).label} · {doc.width} × {doc.height} px</span><span>{Math.round(scale*100)} %</span>
          </div>
          <div style={{width:doc.width*scale,height:doc.height*scale}} className="relative shrink-0 bg-white shadow-[0_20px_70px_#0006]">
            <div ref={artboard} data-testid="design-artboard" onDrop={onDrop}
              onDragOver={e=>{if(Array.from(e.dataTransfer.types).includes("application/x-pointzero-design-motif")){e.preventDefault();e.dataTransfer.dropEffect="copy";}}}
              style={{width:doc.width,height:doc.height,background:doc.background,transform:"scale("+scale+")",transformOrigin:"top left"}} className="absolute left-0 top-0 overflow-hidden">
              {layers.map(e=><div key={e.id} data-element-id={e.id}
                className={"absolute select-none "+(selected===e.id?"outline outline-[2px] outline-offset-[3px] outline-blue-600":"")}
                style={{left:e.x,top:e.y,width:e.w,height:e.h,cursor:"move",touchAction:"none"}}
                onClick={event=>{event.stopPropagation();setSelected(e.id);}}
                onPointerDown={event=>beginDrag(event,e)}
                onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
                {e.kind==="text"&&<div style={{fontFamily:"Arial,Helvetica,sans-serif",fontSize:e.size,fontWeight:e.weight,color:e.color,textAlign:e.align,whiteSpace:"pre-wrap",lineHeight:1.2,overflow:"hidden",width:"100%",height:"100%"}}>{e.text}</div>}
                {e.kind==="shape"&&<div style={{width:"100%",height:"100%",background:e.color,borderRadius:e.shape==="ellipse"?"50%":0}}/>}
                {e.kind==="motif"&&<img alt="" draggable={false} src={motifSVG(doc,e)} style={{width:"100%",height:"100%",objectFit:"contain",pointerEvents:"none"}}/>}
                {e.kind==="image"&&<img alt="" draggable={false} src={e.dataUrl} style={{width:"100%",height:"100%",objectFit:"contain",pointerEvents:"none"}}/>}
              </div>)}
            </div>
          </div>
          <p className="mt-3 text-center text-[11px] text-white/45">Glissez les éléments pour composer. Cliquez pour les modifier.</p>
        </div>
      </main>
      <aside aria-label="Propriétés de la création" className="pz-design-properties hidden w-[245px] shrink-0 overflow-y-auto border-l border-white/10 bg-[#0b0b0d] p-4 xl:block">
        <h2 className="mb-4 text-[13px] font-semibold">{element?"Élément":"Document"}</h2>
        {!element?<>
          <label className="mb-3 block text-[11px] text-white/70">Nom du document
            <input className={mono+" mt-1 w-full"} aria-label="Nom du document" value={doc.name} onChange={e=>patchDocument({name:e.target.value.slice(0,150)})}/>
          </label>
          <label className="mb-3 block text-[11px] text-white/70">Fond
            <input type="color" value={doc.background} onChange={e=>colorOK(e.target.value)&&patchDocument({background:e.target.value})} className="mt-2 h-9 w-full cursor-pointer rounded-[5px]" aria-label="Couleur du fond"/>
          </label>
          <p className="text-[11px] leading-relaxed text-white/55">Un document source. Déclinez-le en un clic vers d'autres formats, puis ajustez les détails.</p>
        </>:<>
          <p className="mb-3 truncate text-xs font-medium text-white/80">{element.kind==="motif"?"Motif":element.kind==="text"?"Texte":element.kind==="shape"?"Forme":"Image"}</p>
          <div className="grid grid-cols-2 gap-2">{(["x","y","w","h"] as const).map(k=>
            <label key={k} className="text-[11px] text-white/65">{k.toUpperCase()}
              <input type="number" aria-label={"Propriété "+k} className={mono+" mt-1 w-full px-2"} value={Math.round(element[k])} onChange={event=>patchElement(element.id,{[k]:Math.max(k==="w"||k==="h"?1:-500,Math.min(4000,Number(event.target.value)||0))})}/>
            </label>)}</div>
          {element.kind==="text"&&<>
            <label className="mt-3 block text-[11px] text-white/65">Texte
              <textarea aria-label="Texte de l'élément" rows={4} className={mono+" mt-1 w-full resize-y"} value={element.text} onChange={e=>patchElement(element.id,{text:e.target.value.slice(0,3000)})}/>
            </label>
            <label className="mt-3 block text-[11px] text-white/65">Taille
              <input type="number" min={8} max={300} aria-label="Taille du texte" className={mono+" mt-1 w-full"} value={element.size} onChange={e=>patchElement(element.id,{size:Math.max(8,Math.min(300,Number(e.target.value)||8))})}/>
            </label>
            <label className="mt-3 block text-[11px] text-white/65">Alignement
              <select className={mono+" mt-1 w-full"} aria-label="Alignement du texte" value={element.align} onChange={e=>patchElement(element.id,{align:e.target.value as "left"|"center"|"right"})}>
                <option value="left">Gauche</option><option value="center">Centre</option><option value="right">Droite</option>
              </select>
            </label>
          </>}
          {element.kind==="shape"&&<label className="mt-3 block text-[11px] text-white/65">Forme
            <select className={mono+" mt-1 w-full"} aria-label="Type de forme" value={element.shape} onChange={e=>patchElement(element.id,{shape:e.target.value as "rectangle"|"ellipse"})}>
              <option value="rectangle">Rectangle</option><option value="ellipse">Ellipse</option>
            </select>
          </label>}
          {(element.kind==="text"||element.kind==="shape")&&<label className="mt-3 block text-[11px] text-white/65">Couleur
            <input className="mt-1 h-9 w-full" type="color" aria-label="Couleur de l'élément" value={element.color} onChange={e=>patchElement(element.id,{color:e.target.value})}/>
          </label>}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className={action} onClick={()=>{const next={...element,id:globalThis.crypto?.randomUUID?.()??Math.random().toString(36),x:element.x+20,y:element.y+20};change({...doc,elements:[...doc.elements,next]});setSelected(next.id);}}><Copy size={14}/> Copier</button>
            <button className={action} onClick={()=>{change({...doc,elements:layers.filter(x=>x.id!==element.id)});setSelected(null);}}><Trash2 size={14}/> Retirer</button>
          </div>
        </>}
        <div className="mt-5 border-t border-white/10 pt-4">
          <h3 className="mb-2 text-xs font-semibold">Calques</h3>
          {[...layers].reverse().map(e=><button key={e.id} onClick={()=>setSelected(e.id)} className={"mb-1 block min-h-9 w-full truncate rounded-[5px] px-2 text-left text-[11px] "+(selected===e.id?"bg-white text-black":"text-white/75 hover:bg-white/10")}>
            {e.kind==="text"?(e.text.split("\n")[0]||"Texte"):e.kind==="motif"?(MOTIF_PRESETS.find(p=>p.id===e.presetId)?.name??"Motif"):e.kind==="shape"?"Forme":"Image"}
          </button>)}
        </div>
      </aside>
      </>}
    </div>
    {leftTab !== "fragments" && <div className="pz-design-mobile-properties absolute bottom-4 right-4 z-30 xl:hidden">
      {element?<div className="pz-design-menu max-h-[36dvh] w-[220px] overflow-y-auto p-3">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold"><span>Élément sélectionné</span><button onClick={()=>setSelected(null)} aria-label="Fermer les propriétés"><X size={15}/></button></div>
        {element.kind==="text"&&<textarea aria-label="Texte de l'élément" className={mono+" w-full"} rows={2} value={element.text} onChange={e=>patchElement(element.id,{text:e.target.value})}/>}
        <label className="mt-2 block text-xs">Taille de l'élément
          <input type="range" min={10} max={Math.max(doc.width,doc.height)} value={element.w} onChange={e=>patchElement(element.id,{w:Number(e.target.value),h:Math.round(Number(e.target.value)*element.h/element.w)})} className="mt-2 w-full accent-white"/>
        </label>
        <button className={action+" mt-2 w-full"} onClick={()=>{change({...doc,elements:layers.filter(x=>x.id!==element.id)});setSelected(null);}}><Trash2 size={14}/> Supprimer</button>
      </div>:<div className="pz-design-menu p-2 text-xs text-white/70">{specFor(doc.format).label}</div>}
    </div>}
    <input ref={imagePicker} type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>void chooseImage(e)} className="sr-only" aria-label="Importer une image pour la création"/>
    <input ref={projectPicker} type="file" accept=".json,application/json" onChange={e=>void openJSON(e)} className="sr-only" aria-label="Importer une création POINTZERO JSON"/>
    {notice&&<div className="absolute bottom-3 left-1/2 z-40 max-w-[85vw] -translate-x-1/2 rounded-[6px] border border-white/20 bg-[#09090b] px-4 py-3 text-center text-xs text-white shadow-xl" role="status" onClick={()=>setNotice("")}>{notice}</div>}
  </div>;
}
