import { useState } from "react";
import { FLOSS, flossIndex } from "../lib/dmc";
import { COUNTS } from "../lib/pattern";
import {
  saveBrodeuseProfile, type BrodeuseProfile, type BroderieStyle, type SkillLevel,
} from "../lib/brodeuseProfile";

export default function BrodeuseProfilePanel({profile,onChange}:{profile:BrodeuseProfile;onChange:(p:BrodeuseProfile)=>void}) {
 const [message,setMessage]=useState("");
 const [code,setCode]=useState("");
 const [skeins,setSkeins]=useState(1);
 const [remaining,setRemaining]=useState(0);
 const update=<K extends keyof BrodeuseProfile>(field:K,value:BrodeuseProfile[K])=>{
   onChange({...profile,[field]:value});
 };
 const add=()=>{
   const c=code.trim().toUpperCase();
   if(flossIndex(c)<0){setMessage("Référence DMC inconnue.");return;}
   const i=Math.max(0,Math.floor(Number(skeins)||0)),m=Math.max(0,Math.min(8,Number(remaining)||0));
   update("stock",{...profile.stock,[c]:{skeins:i,remainingMeters:m}});
   setCode("");setMessage("");
 };
 const save=()=>{
   try{saveBrodeuseProfile(profile);setMessage("Profil enregistré sur cet appareil.");}
   catch(e){setMessage(e instanceof Error?e.message:"Échec de sauvegarde.");}
 };
 return <section className="space-y-3 rounded-md border border-white/15 bg-white/[.035] p-3 text-xs" aria-label="Profil et stock de fils de la brodeuse">
   <div><h4 className="font-semibold">Mon profil brodeuse</h4>
     <p className="mt-1 text-white/55">Enregistré localement. Pour l’instant, seules les références DMC disposent d’une correspondance couleur exploitable.</p></div>
   <div className="grid grid-cols-2 gap-2">
     <label>Marque<input className="mt-1 w-full rounded border border-white/20 bg-[#27272c] p-2" value={profile.brand} maxLength={40}
       onChange={e=>update("brand",e.target.value)}/></label>
     <label>Niveau<select className="mt-1 w-full rounded border border-white/20 bg-[#27272c] p-2" value={profile.skill} onChange={e=>update("skill",e.target.value as SkillLevel)}>
       <option value="debutant">Débutant</option><option value="intermediaire">Intermédiaire</option><option value="expert">Expert</option>
     </select></label>
   </div>
   <label className="block">Style préféré<select value={profile.style} onChange={e=>update("style",e.target.value as BroderieStyle)} className="mt-1 w-full rounded border border-white/20 bg-[#27272c] p-2">
     <option value="botanique">Botanique</option><option value="minimal">Minimal</option>
     <option value="geometrique">Géométrique</option><option value="vintage">Vintage</option>
     <option value="realiste-doux">Réaliste doux</option>
   </select></label>
   <div className="grid grid-cols-2 gap-2">
     <label>Couleurs maximum<input type="number" min={2} max={50} value={profile.maxColors} className="mt-1 w-full rounded border border-white/20 bg-[#27272c] p-2"
       onChange={e=>update("maxColors",Math.max(2,Math.min(50,+e.target.value||2)))}/></label>
     <label>Toile (ct)<select value={profile.count} className="mt-1 w-full rounded border border-white/20 bg-[#27272c] p-2" onChange={e=>update("count",+e.target.value as BrodeuseProfile["count"])}>
       {COUNTS.map(n=><option key={n} value={n}>{n}</option>)}
     </select></label>
     <label>Largeur maxi (pts)<input type="number" min={20} max={500} value={profile.maxWidth} className="mt-1 w-full rounded border border-white/20 bg-[#27272c] p-2"
       onChange={e=>update("maxWidth",Math.max(20,Math.min(500,+e.target.value||20)))}/></label>
     <label>Hauteur maxi (pts)<input type="number" min={20} max={500} value={profile.maxHeight} className="mt-1 w-full rounded border border-white/20 bg-[#27272c] p-2"
       onChange={e=>update("maxHeight",Math.max(20,Math.min(500,+e.target.value||20)))}/></label>
   </div>
   <label className="block">Temps disponible (minutes, optionnel)
     <input type="number" min={10} max={50000} value={profile.minutes??""} placeholder="Non renseigné"
       className="mt-1 w-full rounded border border-white/20 bg-[#27272c] p-2"
       onChange={e=>update("minutes",e.target.value===""?null:Math.max(10,Math.min(50000,+e.target.value||10)))}/>
   </label>
   <label className="block">Fils préférés (codes DMC séparés par des virgules)<input className="mt-1 w-full rounded border border-white/20 bg-[#27272c] p-2" placeholder="310, 703, 321"
     value={profile.preferredCodes.join(", ")} onChange={e=>update("preferredCodes",e.target.value.split(/[\s,;]+/).filter(Boolean).slice(0,50))}/></label>
   <div className="border-t border-white/10 pt-3">
     <h4 className="font-semibold">Fils réellement disponibles</h4>
     <p className="mt-1 text-white/55">Renseignez les écheveaux et le métrage de fil restant. Un écheveau DMC standard : 8 m à 6 brins.</p>
     <div className="mt-2 grid grid-cols-3 gap-1">
       <label>Code<input list="floss-stock" value={code} onChange={e=>setCode(e.target.value)} placeholder="310" className="mt-1 w-full rounded border border-white/20 bg-[#27272c] p-1.5"/></label>
       <label>Écheveaux<input type="number" min={0} value={skeins} onChange={e=>setSkeins(+e.target.value||0)} className="mt-1 w-full rounded border border-white/20 bg-[#27272c] p-1.5"/></label>
       <label>Reste (m à 6 brins)<input type="number" min={0} max={8} step=".5" value={remaining} onChange={e=>setRemaining(+e.target.value||0)} className="mt-1 w-full rounded border border-white/20 bg-[#27272c] p-1.5"/></label>
     </div>
     <datalist id="floss-stock">{FLOSS.slice(0,489).map(f=><option value={f.code} key={f.code}/>)}</datalist>
     <button type="button" className="mt-2 w-full rounded border border-white/25 px-2 py-2" onClick={add}>Ajouter ou actualiser ce fil</button>
     {Object.entries(profile.stock).sort((a,b)=>a[0].localeCompare(b[0])).map(([c,n])=><div key={c} className="mt-2 flex items-center gap-2 rounded border border-white/10 px-2 py-1.5">
       <span className="h-3 w-3 rounded-sm" style={{background:FLOSS[flossIndex(c)]?.hex??"#aaa"}}/>
       <span className="flex-1">{c} · {n.skeins} écheveau(x), {n.remainingMeters} m restant</span>
       <button aria-label={"Retirer le fil "+c} className="text-white/65 underline" onClick={()=>{
         const next={...profile.stock};delete next[c];update("stock",next);
       }}>Retirer</button>
     </div>)}
   </div>
   <button className="w-full rounded-md bg-white px-3 py-2 font-semibold text-black" onClick={save}>Enregistrer mon profil et mon stock</button>
   {message&&<p role="status" className="text-xs text-white/80">{message}</p>}
 </section>;
}
