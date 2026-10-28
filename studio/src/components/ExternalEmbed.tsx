import {useState} from "react";
import {ExternalLink,Link2,ShieldCheck,SquareArrowOutUpRight,Unplug} from "lucide-react";
import {type ExternalResource,safeExternalURL} from "../lib/externalProjects";
interface Props{resource:ExternalResource;compact?:boolean;onRemove?:()=>void}
/** External content is never loaded until the visitor deliberately requests it. */
export default function ExternalEmbed({resource,compact=false,onRemove}:Props){
 const [requested,setRequested]=useState(false);
 const safe=safeExternalURL(resource.url);
 if(!safe)return <p role="alert" className="text-xs text-[#ffc3c3]">Adresse invalide ou indisponible.</p>;
 return <section aria-label={"Projet externe "+resource.title} className="rounded-[8px] border border-white/15 bg-[#16161a] p-3 sm:p-4">
   <div className="flex flex-wrap items-center gap-2">
     <Link2 size={16} className="shrink-0 text-white/70"/>
     <div className="min-w-0 flex-1"><strong className="block truncate text-sm text-white">{resource.title}</strong>
       <span className="block truncate text-[11px] text-white/50">{safe}</span></div>
     <a href={safe} target="_blank" rel="noopener noreferrer" aria-label={"Ouvrir "+resource.title+" dans un nouvel onglet"}
       className="inline-flex min-h-10 items-center gap-2 rounded-[5px] border border-white/30 px-3 text-xs text-white hover:bg-white/10">
       <SquareArrowOutUpRight size={15}/> Ouvrir</a>
     {onRemove&&<button type="button" onClick={onRemove} aria-label={"Détacher "+resource.title} className="inline-flex min-h-10 items-center gap-1 rounded-[5px] border border-white/20 px-3 text-xs text-white/70">
       <Unplug size={14}/> Détacher</button>}
   </div>
   {!requested?<div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[7px] border border-dashed border-white/20 p-4">
      <div className="flex min-w-0 items-start gap-2"><ShieldCheck size={18} className="shrink-0 text-[#b7dfd2]"/>
       <p className="max-w-[390px] text-[11px] leading-relaxed text-white/65">Ce site tiers ne se charge pas automatiquement. Son affichage dépend des permissions d'intégration du fournisseur et peut activer ses propres données ou traceurs.</p></div>
      <button type="button" aria-label={"Essayer l'aperçu intégré de "+resource.title} onClick={()=>setRequested(true)} className="inline-flex min-h-10 items-center gap-2 rounded-[5px] bg-white px-4 text-xs font-semibold text-black"><ExternalLink size={14}/> Afficher ici</button>
   </div>:<>
    <div className="mt-3 overflow-hidden rounded-[6px] border border-white/20 bg-white">
      <iframe title={"Application externe : "+resource.title} src={safe}
        referrerPolicy="no-referrer" loading="lazy"
        sandbox="allow-scripts allow-same-origin allow-forms"
        className={"w-full border-0 "+(compact?"h-[480px]":"h-[min(70dvh,760px)] min-h-[420px]")}/>
    </div>
    <p className="mt-2 text-[11px] leading-relaxed text-white/60">Si l'aperçu reste blanc ou affiche une erreur, l'hébergeur bloque peut-être les iframes ou exige une connexion. Utilisez « Ouvrir ». Cet affichage ne synchronise aucune donnée avec POINTZERO.</p>
    <button type="button" aria-label={"Fermer l'aperçu de "+resource.title} onClick={()=>setRequested(false)} className="mt-2 text-xs text-white/75 underline">Fermer l'aperçu</button>
   </>}
 </section>;
}
