import DesignFoundation from "./DesignFoundation";
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { Contrast, Download, Eye, FileCheck2, FileDown, LockKeyhole, Palette, RotateCcw, ScanSearch, Shield, Sparkles, Upload } from "lucide-react";
import { StudioFrame, studioButton, studioInput, saveStudioFile } from "./StudioFrame";
import {
 ACCESS_KEY, ACCENTS, DEFAULT_ACCESS, auditMarkup, bestInk, contrastGrade, parsePrefs,
 readPrefs, savePrefs, type AuditResult, type Preferences
} from "../lib/accessibilityCore";

type Panel="preferences"|"colors"|"audit"|"privacy";
const sections:{id:Panel;label:string;icon:typeof Eye}[]=[
 {id:"preferences",label:"Lecture & confort",icon:Eye},{id:"colors",label:"Design System",icon:Palette},
 {id:"audit",label:"Audit WCAG / RGAA",icon:ScanSearch},{id:"privacy",label:"Confidentialité",icon:Shield}
];
const rgb=(hex:string)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const hex=(v:number[])=>"#"+v.map(x=>Math.round(x).toString(16).padStart(2,"0")).join("");
const blend=(a:string,b:string,amount:number)=>{
 const x=rgb(a),y=rgb(b);return hex(x.map((c,i)=>c+(y[i]-c)*amount));
};
const ramp=(seed:string)=>Array.from({length:10},(_,i)=>{
 const n=i===0?50:i*100;
 const color=i<=4?blend("#ffffff",seed,(i+1)/5*.88):blend(seed,"#05060a",(i-4)/6*.95);
 return {name:String(n),hex:color,ink:bestInk(color)};
});
export default function AccessibilityStudio({onBack}:{onBack:()=>void}){
 const [prefs,setPrefs]=useState<Preferences>(readPrefs);
 const [section,setSection]=useState<Panel>("preferences");
 const [notice,setNotice]=useState("");
 const [foreground,setForeground]=useState("#222222"),[background,setBackground]=useState("#ffffff");
 const [html,setHTML]=useState(""),[result,setResult]=useState<AuditResult|null>(null);
 const [auditName,setAuditName]=useState("code-client.html");
 const file=useRef<HTMLInputElement>(null),prefFile=useRef<HTMLInputElement>(null);
 const grades=useMemo(()=>contrastGrade(foreground,background),[foreground,background]);
 const palette=useMemo(()=>ramp(prefs.accent),[prefs.accent]);
 const set=(patch:Partial<Preferences>)=>{
   const next={...prefs,...patch};
   try{savePrefs(next);setPrefs(next);setNotice("Préférences enregistrées sur cet appareil et appliquées à POINTZERO.");}
   catch{setNotice("Impossible d'enregistrer ces préférences dans le navigateur.");}
 };
 const clear=()=>{
   if(!window.confirm("Réinitialiser uniquement les préférences d'accessibilité de POINTZERO ? Les créations ne seront pas supprimées."))return;
   set({...DEFAULT_ACCESS});
 };
 const importPrefs=async(e:ChangeEvent<HTMLInputElement>)=>{
   const f=e.target.files?.[0];e.target.value="";if(!f)return;
   if(f.size>25000){setNotice("Profil trop volumineux.");return;}
   try{
     const next=parsePrefs(JSON.parse(await f.text()));
     if(!next)throw Error("Profil d'accessibilité invalide.");
     set(next);setNotice("Profil restauré et appliqué à l'interface.");
   }catch(e){setNotice(e instanceof Error?e.message:"Lecture impossible.");}
 };
 const importHTML=async(e:ChangeEvent<HTMLInputElement>)=>{
   const f=e.target.files?.[0];e.target.value="";if(!f)return;
   if(f.size>1_500_000){setNotice("HTML limité à 1,5 Mo.");return;}
   try{setHTML(await f.text());setAuditName(f.name.slice(0,120));setResult(null);}
   catch{setNotice("Fichier HTML illisible.");}
 };
 const doAudit=()=>{
   try{
     if(!html.trim())throw Error("Collez le HTML ou choisissez un fichier à auditer.");
     setResult(auditMarkup(html));
     setNotice("Contrôle statique terminé : un examen humain demeure indispensable.");
   }catch(e){setNotice(e instanceof Error?e.message:"Audit impossible.");}
 };
 const left=<div className="space-y-3 pb-16">
   <p className="text-[11px] font-semibold uppercase tracking-widest text-white/55">Mes préférences · toujours</p>
   {sections.map(s=><button key={s.id} aria-label={"Ouvrir "+s.label} aria-pressed={section===s.id} onClick={()=>setSection(s.id)}
     className={"flex min-h-11 w-full items-center gap-3 rounded-[5px] border px-3 text-left text-xs "+(section===s.id?"border-white bg-white font-semibold text-black":"border-white/15 text-white/85 hover:bg-white/10")}>
      <s.icon size={17}/>{s.label}
    </button>)}
   <div className="space-y-2 border-t border-white/15 pt-4">
     <h3 className="text-xs font-semibold">Profils rapides</h3>
     <button onClick={()=>set({...DEFAULT_ACCESS,theme:"light",fontScale:1.25,lineHeight:1.8,enhancedFocus:true})} className={studioButton+" w-full"}>Lecture confortable</button>
     <button onClick={()=>set({...DEFAULT_ACCESS,contrast:"strong",enhancedFocus:true,vision:"daltonisme"})} className={studioButton+" w-full"}>Contraste & repères</button>
     <button onClick={()=>set({...DEFAULT_ACCESS,reduceMotion:true,readingGuide:true,fontScale:1.12})} className={studioButton+" w-full"}>Lecture guidée calme</button>
     <button aria-label="Réinitialiser mon profil d'accessibilité" onClick={clear} className={studioButton+" w-full"}><RotateCcw size={14}/> Réinitialiser les préférences</button>
   </div>
   <div className="space-y-2 border-t border-white/15 pt-4">
     <h3 className="text-xs font-semibold">Mon profil</h3>
     <button onClick={()=>saveStudioFile("pointzero-profil-accessibilite.json",JSON.stringify(prefs,null,2))} className={studioButton+" w-full"}><FileDown size={14}/> Exporter le profil</button>
     <button onClick={()=>prefFile.current?.click()} className={studioButton+" w-full"}><Upload size={14}/> Importer le profil</button>
     <p className="text-[11px] leading-relaxed text-white/55">Les réglages persistent sur cet appareil. Ils ne suivent pas automatiquement la personne vers un autre navigateur.</p>
   </div>
 </div>;
 const right=<div className="space-y-4 pb-16">
   <h3 className="text-sm font-semibold">Accessibilité & vie privée</h3>
   <div className="space-y-3 rounded-[7px] border border-white/15 p-3">
     <label className="flex items-center justify-between gap-2 text-xs"><span><strong className="font-medium">Loupe de lecture</strong><span className="mt-1 block text-[11px] text-white/60">Suit l'élément sélectionné au clavier, sans voler le focus.</span></span>
       <input aria-label="Activer le guide de lecture" type="checkbox" checked={prefs.readingGuide} onChange={e=>set({readingGuide:e.target.checked})} className="size-4 accent-white"/>
     </label>
     <label className="flex items-center justify-between gap-2 text-xs"><span><strong className="font-medium">Mouvements réduits</strong><span className="mt-1 block text-[11px] text-white/60">Désactive les animations non essentielles dans les studios.</span></span>
       <input aria-label="Réduire les animations" type="checkbox" checked={prefs.reduceMotion} onChange={e=>set({reduceMotion:e.target.checked})} className="size-4 accent-white"/>
     </label>
     <label className="flex items-center justify-between gap-2 text-xs"><span><strong className="font-medium">Focus renforcé</strong><span className="mt-1 block text-[11px] text-white/60">Contours visibles lors de la navigation clavier.</span></span>
       <input aria-label="Renforcer le focus clavier" type="checkbox" checked={prefs.enhancedFocus} onChange={e=>set({enhancedFocus:e.target.checked})} className="size-4 accent-white"/>
     </label>
   </div>
   <div className="space-y-3 rounded-[7px] border border-white/15 p-3">
     <h4 className="flex items-center gap-2 text-xs font-semibold"><LockKeyhole size={15}/> Affichage discret</h4>
     <label className="flex items-center justify-between gap-2 text-xs text-white/75"><span>Flouter les images dans les studios <span className="block text-[11px] text-white/55">Protection visuelle, pas chiffrement des fichiers.</span></span>
       <input aria-label="Flouter les aperçus d'images" type="checkbox" checked={prefs.privacyBlur} onChange={e=>set({privacyBlur:e.target.checked})} className="size-4 accent-white"/>
     </label>
     <p className="text-[11px] leading-relaxed text-white/60">Ce studio n'envoie pas les profils ni le HTML audité à un serveur. Les données déjà enregistrées par d'autres fonctions de POINTZERO ne sont pas supprimées par ces réglages.</p>
     <div className="rounded-[5px] border border-white/15 bg-white/5 p-2 text-[11px] text-white/65">
       <strong className="text-white">Clé locale :</strong> {ACCESS_KEY}
     </div>
   </div>
   <div className="rounded-[7px] border border-white/15 p-3">
     <h4 className="text-xs font-semibold">Textes & composants</h4>
     <p className="mt-2 text-[11px] leading-relaxed text-white/60">Le design system contrôle les préférences d'affichage du site, pas les paramètres du système d'exploitation. Les contenus, SVG et documents exportés doivent être vérifiés séparément.</p>
     <a className="mt-3 inline-block text-xs font-semibold text-white underline underline-offset-2" href="https://accessibilite.numerique.gouv.fr/" target="_blank" rel="noreferrer">Référentiel RGAA 4.1.2</a>
     <a className="mt-2 block text-xs font-semibold text-white underline underline-offset-2" href="https://www.w3.org/WAI/WCAG22/quickref/" target="_blank" rel="noreferrer">WCAG 2.2 · W3C</a>
   </div>
 </div>;
 return <StudioFrame title="Accessibilité & Design System" subtitle="L'interface s'adapte à chacun · les outils de contrôle restent transparents"
   onBack={onBack} left={left} right={right} leftLabel="Profils d'accessibilité" rightLabel="Lecture guidée et vie privée"
   actions={<div className="flex items-center gap-1">
     <button type="button" onClick={()=>setSection("audit")} className={studioButton}><ScanSearch size={15}/><span className="hidden sm:inline">Auditer</span></button>
   </div>}>
   <div className="mx-auto max-w-[1130px] space-y-5 pb-20">
     <div><p className="text-[11px] font-semibold uppercase tracking-widest text-white/55">POINTZERO · DESIGN SYSTEM PERSONNEL</p>
       <h2 className="mt-1 text-[clamp(20px,2.8vw,32px)] font-semibold">{sections.find(s=>s.id===section)?.label}</h2>
       <p className="mt-2 text-xs leading-relaxed text-white/60">Préférences persistantes · choix explicites · contrôles de base accessibles à tous.</p>
     </div>
     {section==="preferences"&&<>
       <div className="grid gap-3 rounded-[8px] border border-white/15 bg-white/5 p-4 sm:grid-cols-2">
         <label className="text-xs text-white/70">Apparence
           <select aria-label="Apparence du site" className={studioInput+" mt-2"} value={prefs.theme} onChange={e=>set({theme:e.target.value as Preferences["theme"]})}>
             <option value="system">Selon l'appareil</option><option value="dark">Noir</option><option value="light">Blanc</option>
           </select>
         </label>
         <label className="text-xs text-white/70">Lisibilité des couleurs
           <select aria-label="Mode de perception des couleurs" className={studioInput+" mt-2"} value={prefs.vision} onChange={e=>set({vision:e.target.value as Preferences["vision"]})}>
             <option value="standard">Couleurs originales</option><option value="daltonisme">Repères renforcés</option><option value="monochrome">Sans couleurs (simulation)</option>
           </select>
         </label>
         <label className="text-xs text-white/70">Taille relative du texte : {Math.round(prefs.fontScale*100)} %
           <input aria-label="Agrandir les caractères" type="range" className="mt-3 w-full accent-white" min={1} max={1.75} step={.05} value={prefs.fontScale} onChange={e=>set({fontScale:Number(e.target.value)})}/>
         </label>
         <label className="text-xs text-white/70">Interligne : {prefs.lineHeight.toFixed(2)}
           <input aria-label="Adapter les interlignes" type="range" className="mt-3 w-full accent-white" min={1.2} max={2.1} step={.05} value={prefs.lineHeight} onChange={e=>set({lineHeight:Number(e.target.value)})}/>
         </label>
         <label className="text-xs text-white/70">Espacement lettres : {(prefs.spacing*100).toFixed(0)} %
           <input aria-label="Adapter l'espacement des lettres" type="range" className="mt-3 w-full accent-white" min={0} max={.15} step={.01} value={prefs.spacing} onChange={e=>set({spacing:Number(e.target.value)})}/>
         </label>
         <label className="text-xs text-white/70">Contrastes
           <select aria-label="Niveau de contraste" className={studioInput+" mt-2"} value={prefs.contrast} onChange={e=>set({contrast:e.target.value as Preferences["contrast"]})}>
             <option value="normal">Standard</option><option value="strong">Renforcés</option>
           </select>
         </label>
       </div>
       <div className="grid gap-4 rounded-[10px] border border-white/15 p-4 sm:grid-cols-2">
         <div><h3 className="text-sm font-semibold">Ma lecture, ma manière</h3>
           <p className="mt-2 text-xs leading-relaxed text-white/65">Testez les réglages dans tous les studios. La lecture conserve les intitulés : ni le vert ni le rouge ne sont utilisés comme seule information.</p>
           <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-[5px] border border-white/25 px-3 py-2 text-xs">✓ Fonction disponible</span><span className="rounded-[5px] border border-dashed border-white/25 px-3 py-2 text-xs">! À vérifier</span></div></div>
         <div className="rounded-[7px] border border-[#ded9ea] bg-[#faf9ff] p-5 text-[#24232e]" style={{fontSize:16*prefs.fontScale,lineHeight:prefs.lineHeight,letterSpacing:prefs.spacing+"em"}}>
           <strong>Une interface pour chacun.</strong>
           <p className="mt-3">Créer, transmettre et communiquer sans obstacle. La lecture s'adapte à votre rythme.</p>
           <button type="button" className="mt-4 rounded-[6px] px-4 py-2 text-sm font-semibold text-white" style={{backgroundColor:prefs.accent}}>Tester le bouton</button>
         </div>
       </div>
     </>}
     {section==="colors"&&<>
       <DesignFoundation/>
       <div className="space-y-4 rounded-[8px] border border-white/15 bg-white/5 p-4">
         <h3 className="text-sm font-semibold">Couleurs de marque</h3>
         <p className="text-xs text-white/60">Gamme inspirée du principe des rampes de Dabbit. Chaque teinte peut générer dix nuances et être évaluée sur fond blanc et fond noir.</p>
         <div className="flex flex-wrap gap-3" role="group" aria-label="Couleurs d'accent accessibles">
           {ACCENTS.map(c=><button type="button" key={c.hex} aria-label={"Accent "+c.name} aria-pressed={prefs.accent===c.hex} onClick={()=>set({accent:c.hex})}
             className={"flex min-w-[90px] items-center gap-2 rounded-[5px] border px-3 py-2 text-xs "+(prefs.accent===c.hex?"border-white bg-white/15":"border-white/20 hover:bg-white/10")}>
             <span className="size-5 rounded-[4px] border border-white/20" style={{background:c.hex}}/>{c.name}</button>)}
         </div>
         <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">{palette.map((p)=><div key={p.name} className="min-w-0">
           <div className="flex aspect-square items-center justify-center rounded-[5px] border border-white/15 text-[10px]" style={{backgroundColor:p.hex,color:p.ink}}>{p.name}</div>
           <p className="mt-1 truncate text-center font-mono text-[9px] text-white/50">{p.hex}</p></div>)}</div>
         <button onClick={()=>saveStudioFile("pointzero-palette.json",JSON.stringify({accent:prefs.accent,shades:palette},null,2))} className={studioButton}><Download size={14}/> Exporter les nuances</button>
       </div>
       <div className="rounded-[8px] border border-white/15 p-4">
         <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Contrast size={17}/> Vérificateur de contraste</h3>
         <div className="grid gap-3 sm:grid-cols-2">
           <label className="text-xs text-white/70">Couleur du texte
             <div className="mt-2 flex gap-2"><input aria-label="Choisir la couleur du texte" type="color" value={foreground} onChange={e=>setForeground(e.target.value)} className="h-10 w-12 cursor-pointer rounded-[5px]"/>
               <input aria-label="Code hex du texte" value={foreground} onChange={e=>{if(/^#[0-9a-fA-F]{6}$/.test(e.target.value))setForeground(e.target.value);}} className={studioInput}/></div></label>
           <label className="text-xs text-white/70">Fond
             <div className="mt-2 flex gap-2"><input aria-label="Choisir la couleur de fond" type="color" value={background} onChange={e=>setBackground(e.target.value)} className="h-10 w-12 cursor-pointer rounded-[5px]"/>
               <input aria-label="Code hex du fond" value={background} onChange={e=>{if(/^#[0-9a-fA-F]{6}$/.test(e.target.value))setBackground(e.target.value);}} className={studioInput}/></div></label>
         </div>
         <div className="mt-4 rounded-[6px] p-5 text-base" style={{color:foreground,backgroundColor:background}}>
           <p className="font-semibold">Lire ensemble, créer sans barrière</p>
           <p className="mt-2">Chaque mot compte, chaque couleur aussi.</p>
         </div>
         <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
           {[["Ratio",grades.ratio.toFixed(2)+":1"],["Texte AA",grades.normalAA?"Réussi":"Échec"],["Grand AA",grades.largeAA?"Réussi":"Échec"],["UI AA",grades.uiAA?"Réussi":"Échec"]].map(([label,value])=><div key={label} className="rounded-[5px] border border-white/15 bg-white/5 p-3 text-xs"><p className="text-white/60">{label}</p><strong className="mt-2 block text-base">{value}</strong></div>)}
         </div>
         <p className="mt-3 text-[11px] text-white/55">Calcul WCAG de deux couleurs opaques : AA 4,5:1 pour le texte normal, 3:1 pour le texte large et certains composants. Les images, superpositions et états ne sont pas évalués par cette mesure.</p>
         <button className={studioButton+" mt-3"} onClick={()=>{setForeground(bestInk(background));setNotice("Couleur de texte noire ou blanche choisie selon le contraste mesuré.");}}><Sparkles size={14}/> Proposer noir ou blanc</button>
       </div>
     </>}
     {section==="audit"&&<>
       <div className="rounded-[8px] border border-white/15 bg-white/5 p-4">
         <h3 className="flex items-center gap-2 text-sm font-semibold"><FileCheck2 size={18}/> Premier contrôle d'un site client</h3>
         <p className="mt-2 text-xs leading-relaxed text-white/65">Importez le fichier HTML d'une page de votre client, ou collez son code source. Le contrôle est exécuté dans votre navigateur, sans requête au site distant ni serveur d'analyse.</p>
         <div className="mt-3 flex flex-wrap gap-2">
           <button className={studioButton} onClick={()=>file.current?.click()}><Upload size={15}/> Importer HTML</button>
           <button className={studioButton} onClick={()=>{setHTML("");setResult(null);}}>Vider</button>
           <span className="self-center text-xs text-white/50">{auditName}</span>
         </div>
         <textarea aria-label="Code HTML à examiner" spellCheck={false} className={studioInput+" mt-3 min-h-[180px] resize-y font-mono text-[11px]"} maxLength={1_500_000}
           value={html} onChange={e=>{setHTML(e.target.value);setResult(null);}} placeholder={'<!doctype html>\n<html lang="fr">\n<head><title>Mon site</title></head>\n<body><h1>Bienvenue</h1>…'}/>
         <button aria-label="Analyser les critères HTML de base" onClick={doAudit} className="mt-3 flex min-h-10 items-center gap-2 rounded-[5px] bg-white px-4 text-xs font-semibold text-black"><ScanSearch size={15}/> Analyser les points détectables</button>
       </div>
       {result&&<div aria-label="Rapport d'accessibilité provisoire" className="space-y-4 rounded-[8px] border border-white/15 p-4">
         <div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-[11px] uppercase tracking-widest text-white/55">Rapport partiel</p>
           <h3 className="mt-1 text-xl font-semibold">{result.issues.length} alertes détectées</h3><p className="text-xs text-white/60">{result.checked} éléments / règles examinés</p></div>
           <button className={studioButton} onClick={()=>saveStudioFile("pointzero-audit-accessibilite.json",JSON.stringify({source:auditName,...result},null,2))}><Download size={15}/> Export rapport</button></div>
         <div className="max-h-[330px] space-y-2 overflow-y-auto">{result.issues.map((issue,i)=><div key={i} className="rounded-[5px] border border-white/15 bg-white/5 p-3 text-xs">
           <strong>{issue.code}</strong> <span className="text-white/55">· {issue.where}</span><p className="mt-1 text-white/85">{issue.detail}</p></div>)}
           {!result.issues.length&&<p className="text-xs">Aucune alerte détectée parmi les seuls contrôles programmés. Un audit complet reste nécessaire.</p>}
         </div>
         <ul className="list-inside list-disc space-y-1 text-[11px] leading-relaxed text-white/60">{result.limitations.map(t=><li key={t}>{t}</li>)}</ul>
       </div>}
       <div className="rounded-[8px] border border-white/15 p-4 text-xs leading-relaxed text-white/70">
         <strong className="text-white">Référentiels :</strong> France : RGAA 4.1.2 (RGAA 5 annoncé). International : WCAG 2.2. WCAG 3.0 n'est encore qu'un projet ; ce studio ne délivre pas de certificat de conformité.
         <p className="mt-2">Un simple formulaire qui accepte une URL ne peut pas auditer de manière fiable le DOM d'autres sites à cause des restrictions du navigateur, des contenus dynamiques et des règles de sécurité. L'audit à distance viendra avec un service de test dédié.</p>
       </div>
     </>}
     {section==="privacy"&&<div className="space-y-4 rounded-[9px] border border-white/15 p-4">
       <div className="flex items-center gap-3"><Shield size={25}/><div><h3 className="text-sm font-semibold">Confidentialité maîtrisable</h3><p className="mt-1 text-xs text-white/60">Un écran clair pour savoir ce qui reste sur l'appareil.</p></div></div>
       <p className="text-xs leading-relaxed text-white/75">Votre profil est conservé sous la clé locale <code>{ACCESS_KEY}</code>. Un autre appareil n'en bénéficie pas sans import manuel. Le mode discret floute des images à l'écran mais ne chiffre ni ne supprime les fichiers.</p>
       <label className="flex items-center gap-3 rounded-[5px] border border-white/15 p-3 text-xs">
         <input type="checkbox" aria-label="Mode discret des aperçus" checked={prefs.privacyBlur} onChange={e=>set({privacyBlur:e.target.checked})} className="size-4 accent-white"/>
         Flouter les aperçus dans les studios
       </label>
       <button onClick={()=>saveStudioFile("pointzero-profil-accessibilite.json",JSON.stringify(prefs,null,2))} className={studioButton}><Download size={14}/> Récupérer mon profil</button>
       <button onClick={clear} className={studioButton}><RotateCcw size={14}/> Effacer mes réglages personnalisés</button>
       <p className="text-[11px] leading-relaxed text-white/55">Cela ne supprime pas les données des autres studios. Une fonction de gestion complète des données devra présenter chaque catégorie et ses conséquences avant effacement.</p>
     </div>}
     {notice&&<p role="status" className="rounded-[6px] border border-white/20 bg-[#09090b] p-3 text-xs text-white">{notice}</p>}
   </div>
   <input ref={file} type="file" accept=".html,.htm,text/html" className="sr-only" aria-label="Choisir un fichier HTML à auditer" onChange={e=>void importHTML(e)}/>
   <input ref={prefFile} type="file" accept=".json,application/json" className="sr-only" aria-label="Choisir un profil d'accessibilité" onChange={e=>void importPrefs(e)}/>
 </StudioFrame>;
}
