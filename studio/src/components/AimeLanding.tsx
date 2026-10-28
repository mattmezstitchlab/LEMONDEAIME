import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Brush, Frame, Heart, Music2, Palette, Sparkles, Users } from "lucide-react";
import { artToSVG, GALLERY_KEY, safeGallery } from "../lib/artWorldCore";

interface Props {onBack:()=>void;onPointzero:()=>void;onCreate:()=>void;onMusic:()=>void;onGallery:()=>void}
/** Light, inclusive, public-facing introduction — no fake sessions or fundraising. */
const accents=[
 {id:"bleu",name:"La sérénité",color:"#62a6f8",cx:130,cy:140,r:50},
 {id:"vert",name:"La nature",color:"#38cba7",cx:348,cy:198,r:19},
 {id:"rose",name:"Le lien",color:"#ed79b1",cx:590,cy:120,r:43},
 {id:"violet",name:"La mémoire",color:"#997bee",cx:755,cy:220,r:46},
 {id:"jaune",name:"La joie",color:"#ffc53c",cx:930,cy:148,r:26},
];
const modules=[
 {icon:Brush,name:"Créer librement",body:"Un pinceau, un pastel ou un point de croix : la création commence par un geste, à tout âge.",tag:"Atelier"},
 {icon:Music2,name:"Faire résonner",body:"La couleur se transforme en note. Les générations peuvent composer sans connaître le solfège.",tag:"Musique"},
 {icon:Palette,name:"Transformer",body:"Un dessin devient une image, une broderie ou un support à transmettre.",tag:"Création"},
 {icon:Frame,name:"Exposer",body:"Une première galerie privée pour préserver les œuvres avant toute publication autorisée.",tag:"Galerie"}
];
export default function AimeLanding({onBack,onPointzero,onCreate,onMusic,onGallery}:Props){
 const [active,setActive]=useState<string|null>(null);
 const gallery=useMemo(()=>{try{return safeGallery(JSON.parse(localStorage.getItem(GALLERY_KEY)??"null"));}catch{return [];}},[]);
 return <div className="fixed inset-0 h-[100dvh] overflow-y-auto bg-[#faf9f7] font-sans text-[#272631]" aria-label="Présentation LE MONDE AIME">
    <header className="sticky top-0 z-30 flex min-h-[72px] items-center justify-between gap-3 border-b border-[#e6e4ed] bg-[#faf9f7]/95 px-4 backdrop-blur-xl sm:px-8 lg:px-12">
      <div className="flex min-w-0 items-center gap-3">
        <button aria-label="Retour à AIME" onClick={onBack} className="grid size-10 shrink-0 place-items-center rounded-[7px] border border-[#dedce6] bg-white text-[#4f4774] hover:bg-[#f2eef9]"><ArrowLeft size={17}/></button>
        <a href="#accueil" className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-[10px] bg-gradient-to-br from-[#745bc7] to-[#9c84e4] text-white shadow-[0_4px_16px_#6f60c055]"><Heart size={21} strokeWidth={2.2}/></div>
          <div className="leading-tight"><span className="block truncate text-[13px] font-bold tracking-[.02em]">LE MONDE AIME</span><span className="hidden text-[10px] text-[#817d8b] sm:block">Association · Art, générations et transmission</span></div>
        </a>
      </div>
      <nav className="hidden items-center gap-1 rounded-[9px] border border-[#e9e6ef] bg-white p-1 text-xs text-[#655f73] md:flex" aria-label="Navigation LE MONDE AIME">
        <a href="#vision" className="rounded-[6px] px-3 py-2 hover:bg-[#f2eff8]">La vision</a>
        <a href="#ateliers" className="rounded-[6px] px-3 py-2 hover:bg-[#f2eff8]">Les ateliers</a>
        <a href="#galerie" className="rounded-[6px] px-3 py-2 hover:bg-[#f2eff8]">Galerie</a>
      </nav>
      <button onClick={onCreate} className="flex min-h-10 shrink-0 items-center gap-2 rounded-[7px] bg-[#6e58c5] px-3 text-xs font-semibold text-white shadow-[0_5px_16px_#6b57c533] hover:bg-[#5743b0] sm:px-5">
        <Sparkles size={15}/> Entrer dans l'atelier <ArrowRight size={15} className="hidden sm:block"/>
      </button>
    </header>
    <main id="accueil">
      <section className="relative overflow-hidden px-4 pb-10 pt-12 sm:px-8 sm:pt-20 lg:px-12" aria-labelledby="aime-heading">
        <div className="pointer-events-none absolute -right-[8%] -top-[110px] size-[350px] rounded-full bg-[#e6ddff]/40 blur-[75px]"/>
        <div className="pointer-events-none absolute -left-[12%] top-[240px] size-[280px] rounded-full bg-[#d5f5e8]/40 blur-[70px]"/>
        <div className="relative mx-auto max-w-[1100px] text-center">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#ded3f5] bg-white/90 px-4 py-2 text-[11px] font-semibold tracking-[.07em] text-[#6652aa]"><span className="size-1.5 rounded-full bg-[#52cba5]"/> ART · CULTURE · GÉNÉRATIONS · SOLIDARITÉ</p>
          <h1 id="aime-heading" className="mx-auto max-w-[900px] text-[clamp(36px,6vw,78px)] font-bold leading-[1.12] tracking-[-.055em]">
            Un amour, une toile,<br/><span className="bg-gradient-to-r from-[#7158cd] via-[#ca79b6] to-[#3dbea5] bg-clip-text text-transparent">un monde.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-[690px] text-[15px] leading-[1.8] text-[#6b6777] sm:text-[17px]">Un laboratoire d'art libre, pour les enfants et les grands. Créer, jouer avec les couleurs, faire de la musique et transmettre ce qui nous relie.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button aria-label="Créer une œuvre dans LE MONDE AIME" onClick={onCreate} className="flex min-h-12 items-center gap-2 rounded-[7px] bg-[#6e58c5] px-6 text-sm font-semibold text-white shadow-[0_8px_24px_#7057ba38] hover:bg-[#5945af]"><Brush size={17}/> Créer une œuvre <ArrowRight size={16}/></button>
            <button aria-label="Ouvrir la musique inclusive depuis LE MONDE AIME" onClick={onMusic} className="flex min-h-12 items-center gap-2 rounded-[7px] border border-[#ded9e9] bg-white px-6 text-sm font-semibold text-[#4d4562] hover:bg-[#f2eff9]"><Music2 size={17}/> Composer ensemble</button>
          </div>
        </div>
        <div className="relative mx-auto mt-12 max-w-[1120px] overflow-hidden rounded-[20px] border border-[#ece8f2] bg-white shadow-[0_28px_80px_#51417f1b] sm:mt-16">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#efedf4] px-5 py-4 text-xs">
            <div className="flex items-center gap-2 font-semibold"><span className="size-2 rounded-full bg-[#66cba8]"/> Atelier sensible</div>
            <span className="text-[11px] text-[#8b8697]">Une partition de couleurs et de gestes</span>
          </div>
          <svg viewBox="0 0 1060 340" role="img" aria-label="Illustration abstraite interactive de gestes musicaux pastel" className="h-auto w-full bg-[#fefeff]">
            {Array.from({length:9},(_,i)=><line key={i} x1={i*132+2} y1="0" x2={i*132+2} y2="340" stroke="#eae7f0"/>)}
            {Array.from({length:3},(_,i)=><line key={i} x1="0" y1={i*112+56} x2="1060" y2={i*112+56} stroke="#f0edf6"/>)}
            <path d="M 240 188 Q 285 135 329 185 T 424 181" stroke="#48cdb6" strokeWidth="11" strokeLinecap="round" fill="none" opacity=".88"/>
            <path d="M 690 278 L 805 220 L 889 186" fill="none" stroke="#ac94ef" strokeWidth="4" strokeDasharray="5 12" strokeLinecap="round"/>
            <rect x="480" y="145" width="37" height="37" rx="8" fill="#62a6f8" transform="rotate(45 498 163)"/>
            <rect x="956" y="228" width="26" height="26" rx="5" fill="#48cca9"/>
            <path d="M 720 72 l 9 25 25 9 -25 9 -9 25 -9 -25 -25 -9 25 -9z" fill="#30c5d7"/>
            {accents.map(a=><g key={a.id} tabIndex={0} role="button" aria-label={"Explorer "+a.name}
              className="cursor-pointer outline-none" onClick={()=>setActive(v=>v===a.id?null:a.id)}
              onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setActive(v=>v===a.id?null:a.id);}}}>
              <circle cx={a.cx} cy={a.cy} r={a.r+21} fill={a.color} opacity=".15"/>
              <circle cx={a.cx} cy={a.cy} r={a.r} fill={a.color}/>
              <circle cx={a.cx-a.r*.26} cy={a.cy-a.r*.3} r={Math.max(5,a.r*.24)} fill="#fff" opacity=".55"/>
              <circle cx={a.cx} cy={a.cy} r={a.r+23} fill="none" stroke={a.color} strokeWidth="2" strokeDasharray="6 7" opacity={active===a.id?1:0}/>
              <title>{a.name}</title>
              </g>)}
            <text x="22" y="40" fontSize="16" fill="#8b8796">Aigu</text><text x="22" y="172" fontSize="16" fill="#8b8796">Médium</text><text x="22" y="309" fontSize="16" fill="#8b8796">Grave</text>
          </svg>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#f0edf6] bg-[#fbfafd] px-5 py-3">
            <span className="text-[11px] text-[#827c90]">{active?"Vous explorez : "+accents.find(a=>a.id===active)?.name:"Touchez une couleur pour découvrir son intention."}</span>
            <button onClick={onMusic} className="flex items-center gap-1 text-xs font-semibold text-[#6a57bc]">Jouer avec les sons <ArrowRight size={14}/></button>
          </div>
        </div>
      </section>
      <section id="vision" className="border-y border-[#ece9f1] bg-white px-4 py-14 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1100px]">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div><p className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#7e65c2]">L'intention</p>
              <h2 className="mt-3 max-w-[720px] text-[clamp(28px,4vw,45px)] font-bold leading-[1.2] tracking-[-.04em]">L'art comme langage commun.</h2></div>
            <p className="max-w-[350px] text-sm leading-[1.8] text-[#6c6878]">Chaque génération, chaque histoire et chaque manière de créer a sa place. Le geste compte avant le résultat.</p>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {[{icon:Heart,title:"S'exprimer",body:"Offrir un espace libre et respectueux, sans jugement ni diagnostic."},
             {icon:Users,title:"Se rencontrer",body:"Faire dialoguer enfants, parents, seniors, artistes et habitants."},
             {icon:Sparkles,title:"Transmettre",body:"Transformer un dessin en objet, en souvenir ou en geste à partager."}].map(s=><article key={s.title} className="rounded-[12px] border border-[#ede9f2] bg-[#fbfafd] p-6">
                <s.icon className="text-[#7c67c4]" size={23}/>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3><p className="mt-2 text-sm leading-[1.7] text-[#787282]">{s.body}</p>
              </article>)}
          </div>
        </div>
      </section>
      <section id="ateliers" className="px-4 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1100px]">
          <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#7e65c2]">Les ateliers</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3"><h2 className="text-[clamp(28px,4vw,45px)] font-bold tracking-[-.04em]">Un geste, plusieurs mondes.</h2>
            <span className="text-xs text-[#837d8f]">Des créations d'abord privées, à partager par choix.</span></div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {modules.map((m,i)=><article key={m.name} className="group flex flex-col justify-between rounded-[14px] border border-[#e7e3ee] bg-white p-6 shadow-[0_12px_35px_#6759890b]">
              <div><div className={"grid size-11 place-items-center rounded-[11px] "+["bg-[#eae3fc] text-[#745bc7]","bg-[#dff5ef] text-[#36ad94]","bg-[#fbe5ec] text-[#d97eaa]","bg-[#fff2d8] text-[#b98934]"][i]}><m.icon size={23}/></div>
                <p className="mt-5 text-[10px] font-semibold uppercase tracking-[.12em] text-[#8c819b]">{m.tag}</p>
                <h3 className="mt-1 text-xl font-semibold">{m.name}</h3><p className="mt-3 max-w-[390px] text-sm leading-[1.8] text-[#777283]">{m.body}</p></div>
              <button onClick={i===1?onMusic:i===3?onGallery:onCreate} className="mt-6 flex items-center gap-2 self-start text-xs font-semibold text-[#725bc0] hover:underline">Découvrir <ArrowRight size={16}/></button>
            </article>)}
          </div>
        </div>
      </section>
      <section id="galerie" className="border-t border-[#ebe7f2] bg-[#eeebf8] px-4 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1100px]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><p className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#705ac0]">Galerie</p>
              <h2 className="mt-2 text-[clamp(28px,4vw,44px)] font-bold tracking-[-.04em]">Chaque toile raconte quelque chose.</h2></div>
            <button aria-label="Voir la galerie privée LE MONDE AIME" onClick={onGallery} className="flex min-h-10 items-center gap-2 rounded-[7px] border border-[#d6cde8] bg-white px-4 text-xs font-semibold text-[#5a478e] hover:bg-[#f9f7ff]"><Frame size={15}/> Mes œuvres privées</button>
          </div>
          {gallery.length>0?<div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{gallery.slice(0,6).map(item=><article key={item.id} className="overflow-hidden rounded-[11px] border border-[#e0dbe9] bg-white">
              <img className="aspect-[1200/760] w-full bg-white object-contain" alt={"Œuvre privée : "+item.title} src={"data:image/svg+xml;charset=utf-8,"+encodeURIComponent(artToSVG(item.project,{framed:true}))}/>
              <p className="p-3 text-xs font-semibold">{item.title}<span className="ml-2 text-[#938b9d]">· privée</span></p>
            </article>)}</div>:
            <div className="mt-8 flex flex-col items-center rounded-[13px] border border-dashed border-[#cbc2e4] bg-white/70 p-12 text-center">
              <Frame size={30} className="text-[#8e79cc]"/><h3 className="mt-4 text-lg font-semibold">Votre première œuvre vous attend.</h3>
              <p className="mt-2 max-w-md text-sm leading-[1.7] text-[#777080]">Dessinez une toile dans l'Atelier libre et préparez son encadrement. La galerie publique et les ventes ne sont pas encore activées.</p>
              <button onClick={onCreate} className="mt-5 flex items-center gap-2 text-xs font-semibold text-[#7058c2]">Commencer à créer <ArrowRight size={14}/></button>
            </div>}
          <p className="mt-4 text-[11px] text-[#736c81]">Cet aperçu présente uniquement les œuvres enregistrées localement sur cet appareil. Aucun compte, publication automatique ou vente active.</p>
        </div>
      </section>
    </main>
    <footer className="flex flex-wrap items-center justify-between gap-3 bg-[#201c30] px-5 py-7 text-xs text-[#dad6e6] sm:px-10">
      <div className="flex items-center gap-2"><Heart size={16} className="text-[#b59df0]"/> LE MONDE AIME · Un amour, une toile, un monde</div>
      <div className="flex flex-wrap gap-6"><button onClick={onBack} className="flex items-center gap-1 text-[#dcd7e9] hover:text-white">AIME · Maison mère <ArrowRight size={14}/></button><button onClick={onPointzero} className="flex items-center gap-1 text-[#dcd7e9] hover:text-white">POINTZERO · Studios <ArrowRight size={14}/></button></div>
    </footer>
  </div>;
}
