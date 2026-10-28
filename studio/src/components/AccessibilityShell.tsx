import { useEffect, useState, type ReactNode } from "react";
import { ACCESS_KEY, applyPrefs, readPrefs, type Preferences } from "../lib/accessibilityCore";
/** Global access preferences are applied once to the whole POINTZERO interface. */
export default function AccessibilityShell({children}:{children:ReactNode}){
 const [preferences,setPreferences]=useState<Preferences>(readPrefs);
 const [lens,setLens]=useState<{x:number;y:number;label:string}|null>(null);
 useEffect(()=>{
   const changed=(ev:Event)=>{
     const next=(ev as CustomEvent<Preferences>).detail;
     if(next){setPreferences(next);applyPrefs(next);}
   };
   const fromStorage=(ev:StorageEvent)=>{
     if(ev.key===ACCESS_KEY||ev.key===null){const next=readPrefs();setPreferences(next);applyPrefs(next);}
   };
   const refresh=()=>applyPrefs(readPrefs());
   applyPrefs(preferences);
   window.addEventListener("pz:accessibility",changed);
   window.addEventListener("storage",fromStorage);
   const dark=window.matchMedia?.("(prefers-color-scheme: dark)");
   const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)");
   dark?.addEventListener?.("change",refresh);reduced?.addEventListener?.("change",refresh);
   return ()=>{
     window.removeEventListener("pz:accessibility",changed);window.removeEventListener("storage",fromStorage);
     dark?.removeEventListener?.("change",refresh);reduced?.removeEventListener?.("change",refresh);
   };
   // Stable global setup; subsequent changes use the explicit events above.
   // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 useEffect(()=>{
   if(!preferences.readingGuide){setLens(null);return;}
   let focused:HTMLElement|null=null;
   const update=()=>{
     if(!focused||!document.contains(focused)){setLens(null);return;}
     const rect=focused.getBoundingClientRect();
     if(rect.width<1||rect.height<1){setLens(null);return;}
     const text=(focused.getAttribute("aria-label")||focused.getAttribute("title")||focused.innerText||"").replace(/\s+/g," ").trim().slice(0,115);
     const label=text||focused.tagName.toLowerCase();
     const x=Math.max(8,Math.min(window.innerWidth-290,rect.left+rect.width/2-130));
     const y=rect.bottom+110<window.innerHeight?rect.bottom+10:Math.max(8,rect.top-86);
     setLens({x:Math.max(8,x),y,label});
   };
   const focus=(ev:FocusEvent)=>{
     focused=ev.target instanceof HTMLElement?ev.target:null;
     update();
   };
   document.addEventListener("focusin",focus);
   window.addEventListener("scroll",update,true);window.addEventListener("resize",update);
   if(document.activeElement instanceof HTMLElement&&document.activeElement!==document.body){focused=document.activeElement;update();}
   return ()=>{document.removeEventListener("focusin",focus);window.removeEventListener("scroll",update,true);window.removeEventListener("resize",update);};
 },[preferences.readingGuide]);
 return <>
   {children}
   {preferences.readingGuide&&lens&&<div aria-hidden="true" className="pz-guided-lens" style={{left:lens.x,top:lens.y}}>
     <div className="pz-guided-lens-caption">Lecture guidée · élément sélectionné</div>
     <div className="pz-guided-lens-text">{lens.label}</div>
   </div>}
 </>;
}
