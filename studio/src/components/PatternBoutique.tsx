import { useMemo, useState, useRef, useEffect } from "react";
import { ArrowLeft, ArrowRight, Search, SlidersHorizontal, Sparkles, ShieldCheck, X, LockKeyhole, Scissors } from "lucide-react";
import { FLOSS } from "../lib/dmc";
import type { Pattern } from "../lib/pattern";
import { COLLECTIONS, EDITIONS, fabriquerEdition, type EditionProduct } from "../lib/editions";
import "./PatternBoutique.css";

type Product = EditionProduct;
export const PRODUCT_CATALOG: Product[] = EDITIONS;
const euro=(c:number)=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"}).format(c/100);
const collections=["Tout",...COLLECTIONS] as const;
const cm=(points:number)=>(points/14*2.54).toFixed(1).replace(".",",");

/** Patrons fabriqués une seule fois par session : l'aperçu et le studio lisent les mêmes cases. */
const cache=new Map<string,Pattern>();
function patternOf(id:string){let p=cache.get(id);if(!p){p=fabriquerEdition(id);cache.set(id,p)}return p}

/** Aperçu fidèle : chaque case du patron est dessinée en croix sur une toile Aïda. */
function MotifVisual({item,large=false}:{item:Product;large?:boolean}){
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const el=ref.current;const ctx=el?.getContext?.("2d");if(!el||!ctx)return;
    const p=patternOf(item.id),step=large?6:4;
    el.width=p.w*step;el.height=p.h*step;
    ctx.fillStyle="#f4f0e6";ctx.fillRect(0,0,el.width,el.height);
    ctx.fillStyle="rgba(120,104,80,.07)";
    for(let y=0;y<p.h;y++)for(let x=0;x<p.w;x++)ctx.fillRect(x*step+step/2-.5,y*step+step/2-.5,1,1);
    ctx.lineCap="round";ctx.lineWidth=step*.34;
    for(let y=0;y<p.h;y++)for(let x=0;x<p.w;x++){
      const idx=p.cross[y*p.w+x];if(idx<0)continue;
      ctx.strokeStyle=FLOSS[idx]?.hex??"#555";
      const l=x*step+step*.18,t=y*step+step*.18,r=x*step+step*.82,b=y*step+step*.82;
      ctx.beginPath();ctx.moveTo(l,t);ctx.lineTo(r,b);ctx.moveTo(r,t);ctx.lineTo(l,b);ctx.stroke();
    }
  },[item.id,large]);
  return <div className="pb-motif" aria-hidden="true"><canvas ref={ref}/></div>;
}
export default function PatternBoutique({onBack,onCreate,onGenerate,onOpenPattern}:{onBack:()=>void;onCreate:()=>void;onGenerate:()=>void;onOpenPattern?:(pattern:Pattern)=>void}){
 const [query,setQuery]=useState("");const [category,setCategory]=useState<string>("Tout");const [level,setLevel]=useState("Tout");const [selected,setSelected]=useState<Product|null>(null);
 const railRef=useRef<HTMLDivElement>(null);
 const [view,setView]=useState<"mosaic"|"horizontal">("mosaic");
 const [photo,setPhoto]=useState<string|null>(null);
 useEffect(()=>()=>{if(photo)URL.revokeObjectURL(photo)},[photo]);
 const filtered=useMemo(()=>PRODUCT_CATALOG.filter(p=>(category==="Tout"||p.collection===category)&&(level==="Tout"||p.level===level)&&((p.title+" "+p.collection).toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr")))),[category,level,query]);
 return <div className="pattern-boutique">
  <header className="pb-header"><button onClick={onBack} className="pb-back"><ArrowLeft size={17}/> Point Zéro</button><span className="pb-mark">× ÉDITIONS</span><button className="pb-create" onClick={onGenerate}><LockKeyhole size={15}/> Atelier privé</button></header>
  <main><section className="pb-hero"><p className="pb-eyebrow">POINT ZÉRO / ÉDITIONS</p><h1>Des motifs qui<br/><em>ont quelque chose à dire.</em></h1><p>Des collections originales à transformer en patrons de point de croix. Explorez les 24 premiers patrons, dessinés case par case en fils DMC.</p><div className="pb-actions"><button onClick={onCreate}>Créer mon propre motif <ArrowRight size={16}/></button><a href="#catalogue">Explorer les collections <ArrowRight size={16}/></a></div><p className="pb-disclosure"><ShieldCheck size={15}/> Collection pilote : 24 patrons originaux à ouvrir dans le studio. La vente n'est pas encore ouverte.</p></section>
  <section className="pb-catalog" id="catalogue"><div className="pb-section-heading"><div><p className="pb-eyebrow">BIBLIOTHÈQUE ÉDITORIALE</p><h2>Les collections <span>({filtered.length})</span></h2></div><span className="pb-aside-note">24 patrons · 6 collections</span></div>
  <div className="pb-filters"><label className="pb-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher un motif…" aria-label="Rechercher un motif"/></label><label className="pb-select"><SlidersHorizontal size={16}/><select aria-label="Difficulté" value={level} onChange={e=>setLevel(e.target.value)}><option>Tout</option><option>Débutant</option><option>Intermédiaire</option><option>Expert</option></select></label></div>
  <nav className="pb-categories" aria-label="Collections">{collections.map(c=><button key={c} aria-pressed={category===c} onClick={()=>setCategory(c)}>{c}</button>)}</nav>
  <section className="pb-featured" aria-labelledby="featured-title"><div className="pb-featured-header"><div><p className="pb-eyebrow">À DÉCOUVRIR</p><h2 id="featured-title">Des histoires à broder.</h2></div><div className="pb-rail-controls"><button aria-label="Défiler les patrons vers la gauche" onClick={()=>railRef.current?.scrollBy({left:-370,behavior:"smooth"})}><ArrowLeft size={19}/></button><button aria-label="Défiler les patrons vers la droite" onClick={()=>railRef.current?.scrollBy({left:370,behavior:"smooth"})}><ArrowRight size={19}/></button></div></div><div className="pb-featured-rail" ref={railRef}>{PRODUCT_CATALOG.filter((_,i)=>i%4===0).map(item=><button key={item.id} className="pb-featured-card" onClick={()=>setSelected(item)}><MotifVisual item={item}/><span>{item.collection}</span><strong>{item.title}</strong><small>{item.width} × {item.height} points · {patternOf(item.id).palette.length} fils</small></button>)}</div></section>
  <div className="pb-view-choice" role="group" aria-label="Présentation du catalogue"><span>Explorer les 24 patrons</span><div><button aria-pressed={view==="mosaic"} onClick={()=>setView("mosaic")}>Mosaïque</button><button aria-pressed={view==="horizontal"} onClick={()=>setView("horizontal")}>Défilement</button></div></div>
  <div className={view==="horizontal"?"pb-grid pb-grid-horizontal":"pb-grid"}>{filtered.map(item=><button key={item.id} className="pb-product" onClick={()=>setSelected(item)} aria-label={"Découvrir le patron "+item.title}><MotifVisual item={item}/><div className="pb-product-info"><span>{item.collection} / {item.level}</span><h3>{item.title}</h3><small>{item.width} × {item.height} points · prix envisagé {euro(item.price)}</small></div></button>)}</div>
  {!filtered.length&&<p>Aucun patron ne correspond à ces filtres.</p>}</section>
  <section className="pb-human" aria-labelledby="pb-human-title"><div className="pb-human-copy"><p className="pb-eyebrow">DERRIÈRE CHAQUE CROIX</p><h2 id="pb-human-title">Et surtout,<br/><em>des mains, des histoires.</em></h2><p>La broderie n'est pas seulement un fichier : c'est du temps, une matière, un geste et une personne. Les prochains portraits et ouvrages seront réalisés avec des brodeuses participantes, avec leur accord.</p><p className="pb-human-note">Prévisualisez votre ouvrage ici, sans publication ni transfert de photo.</p><label className="pb-human-upload">Montrer mon ouvrage<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{const file=e.target.files?.[0];e.target.value="";if(!file)return;if(file.size>8*1024*1024){alert("Image limitée à 8 Mo.");return}setPhoto(URL.createObjectURL(file))}}/></label></div><div className="pb-human-frame">{photo?<img src={photo} alt="Photographie de votre ouvrage choisie sur cet appareil"/>:<div className="pb-human-placeholder"><span>×</span><strong>Les ouvrages ont une histoire.</strong><p>Votre photo apparaîtra ici.</p></div>}</div></section>
  <section className="pb-process"><p className="pb-eyebrow">DE L'IDÉE AU PATRON</p><h2>Créer. Vérifier. Éditer.</h2><div>{[["01","Imaginer","Une composition, une intention, un motif."],["02","Composer","Une grille, une palette DMC, des points maîtrisés."],["03","Contrôler","Lisibilité, confettis, tailles et quantité de fils."],["04","Publier","Un PDF testé, une fiche produit et les droits clarifiés."]].map(x=><article key={x[0]}><span>{x[0]}</span><h3>{x[1]}</h3><p>{x[2]}</p></article>)}</div><button onClick={onGenerate}><Sparkles size={17}/> Accéder au générateur réservé</button></section>
  <footer>POINT ZÉRO · ÉDITIONS <span>Catalogue de prépublication — aucun paiement en ligne activé.</span></footer></main>
  {selected&&<div className="pb-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><section tabIndex={-1} className="pb-detail" role="dialog" aria-modal="true" aria-labelledby="pb-detail-title" onKeyDown={e=>{if(e.key==="Escape"){e.preventDefault();setSelected(null)}if(e.key==="Tab"){const nodes=Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("button:not([disabled])"));if(!nodes.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}}}><button className="pb-close" onClick={()=>setSelected(null)} aria-label="Fermer"><X size={20}/></button><MotifVisual item={selected} large/><div><p className="pb-eyebrow">{selected.collection} · {selected.level}</p><h2 id="pb-detail-title">{selected.title}</h2><p>{selected.description}</p><dl><div><dt>Grille</dt><dd>{selected.width} × {selected.height} points</dd></div><div><dt>Fils DMC</dt><dd>{patternOf(selected.id).palette.length} couleurs</dd></div><div><dt>Taille brodée</dt><dd>{cm(selected.width)} × {cm(selected.height)} cm sur Aïda 14</dd></div><div><dt>Prix envisagé</dt><dd>{euro(selected.price)}</dd></div></dl><p className="pb-disclosure"><LockKeyhole size={15}/> Vente pas encore ouverte : ouvrez le patron dans le studio pour l'essayer, usage personnel uniquement.</p><div className="pb-detail-actions">{onOpenPattern&&<button onClick={()=>{const p=patternOf(selected.id);setSelected(null);onOpenPattern(p)}}>Ouvrir dans le studio <Scissors size={16}/></button>}<button className="pb-ghost" onClick={()=>{setSelected(null);onGenerate()}}>Créer un patron dans cet esprit <Sparkles size={16}/></button></div></div></section></div>}
 </div>
}
