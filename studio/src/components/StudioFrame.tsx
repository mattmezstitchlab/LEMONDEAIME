import { useState, type ReactNode } from "react";
import { ArrowLeft, PanelLeft, PanelRight } from "lucide-react";

interface Props {
  title:string; subtitle:string; onBack:()=>void;
  left:ReactNode; children:ReactNode; right:ReactNode;
  actions?:ReactNode;
  leftLabel?:string; rightLabel?:string;
}
export const studioInput="w-full rounded-[5px] border border-white/25 bg-[#202024] px-3 py-2 text-[13px] text-white placeholder:text-white/55 outline-none focus:border-white/80";
export const studioButton="inline-flex min-h-9 items-center justify-center gap-2 rounded-[5px] border border-white/20 bg-white/[.07] px-3 text-xs font-medium text-white hover:bg-white/15 disabled:opacity-35";
export function StudioFrame({title,subtitle,onBack,left,children,right,actions,leftLabel="Ressources",rightLabel="Propriétés"}:Props) {
  const [leftOpen,setLeftOpen]=useState(false),[rightOpen,setRightOpen]=useState(false);
  return <div className="pz-studio fixed inset-0 flex h-[100dvh] flex-col overflow-hidden bg-[#111114] text-white">
    <header className="flex h-[58px] shrink-0 items-center justify-between gap-2 border-b border-white/15 bg-[#09090b] px-3">
      <div className="flex min-w-0 items-center gap-2">
        <button type="button" aria-label="Retour au studio universel" onClick={onBack} className={studioButton+" !px-2"}><ArrowLeft size={17}/></button>
        <div className="min-w-0">
          <h1 className="truncate text-[14px] font-semibold">× POINTZERO <span className="font-normal text-white/80">/ {title}</span></h1>
          <p className="hidden truncate text-[11px] text-white/60 sm:block">{subtitle}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button type="button" aria-label={"Afficher "+leftLabel} onClick={()=>{setLeftOpen(v=>!v);setRightOpen(false);}} className={studioButton+" !px-2 lg:hidden"}><PanelLeft size={17}/></button>
        <button type="button" aria-label={"Afficher "+rightLabel} onClick={()=>{setRightOpen(v=>!v);setLeftOpen(false);}} className={studioButton+" !px-2 xl:hidden"}><PanelRight size={17}/></button>
        {actions}
      </div>
    </header>
    <div className="relative flex min-h-0 flex-1">
      <aside aria-label={leftLabel} className={"pz-studio-left thin-scroll absolute inset-y-0 left-0 z-20 w-[260px] overflow-y-auto border-r border-white/15 bg-[#09090b] p-3 transition-transform lg:relative lg:translate-x-0 "+(leftOpen?"translate-x-0":"-translate-x-full")}>
        {left}
      </aside>
      <main aria-label={"Espace "+title} className="pz-studio-stage thin-scroll min-w-0 flex-1 overflow-y-auto p-4 sm:p-6" onClick={()=>{if(leftOpen)setLeftOpen(false);if(rightOpen)setRightOpen(false);}}>
        {children}
      </main>
      <aside aria-label={rightLabel} className={"pz-studio-right thin-scroll absolute inset-y-0 right-0 z-20 w-[280px] overflow-y-auto border-l border-white/15 bg-[#09090b] p-4 transition-transform xl:relative xl:translate-x-0 "+(rightOpen?"translate-x-0":"translate-x-full")}>
        {right}
      </aside>
    </div>
  </div>;
}
export function saveStudioFile(filename:string,content:string,type="application/json;charset=utf-8") {
  const url=URL.createObjectURL(new Blob([content],{type}));
  const a=document.createElement("a");
  a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),500);
}
export function SummaryTile({name,value,detail}:{name:string;value:string;detail?:string}){
  return <div className="rounded-[7px] border border-black/10 bg-white p-4">
    <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-black/55">{name}</p>
    <p className="mt-2 text-[22px] font-semibold tracking-tight text-[#18181b]">{value}</p>
    {detail&&<p className="mt-1 text-[11px] text-black/55">{detail}</p>}
  </div>;
}
