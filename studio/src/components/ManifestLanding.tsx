import {DESIGN_SYSTEM,designCSS} from "../lib/designSystem";
import "../design/components.css";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, ChevronRight, Clock3, Fingerprint, GitBranch, Grid2X2, GraduationCap, HeartHandshake, Mail, Music2, ShieldCheck, Sparkles } from "lucide-react";
import { DEFAULT_LAUNCH, STATUS_LABELS, countdown, validLaunch, type LaunchConfig } from "../lib/launchManifest";
import "./ManifestLanding.css";

interface Props {onDetails:(id:string)=>void;onAime:()=>void;onOpenAtelier:()=>void;onUniversal:()=>void;onAdmin:()=>void}
interface PublicState {config:LaunchConfig|null;signupReady:boolean;turnstileSiteKey:string;legalEntity:string;privacyContact:string;privacyPolicyUrl:string}
const THEME_ICONS=[Fingerprint,ShieldCheck,Grid2X2,Clock3,Sparkles,HeartHandshake,HeartHandshake,Grid2X2,GraduationCap,GitBranch,Sparkles,GitBranch,Sparkles];
const pad=(n:number)=>String(n).padStart(2,"0");
const btn="pz-manifest-button";

function CountdownView({date,title,primary=false}:{date:string|null;title:string;primary?:boolean}){
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{if(!date)return;const id=window.setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(id)},[date]);
 const left=countdown(date,now);
 if(!left)return <div className={primary?"pz-countdown-main":"pz-countdown-compact"}>
  <Clock3 size={primary?20:13}/><span>{title} · Date à confirmer</span>
 </div>;
 if(left.done)return <div className={primary?"pz-countdown-main":"pz-countdown-compact"}>
  <Clock3 size={primary?20:13}/><span>{title} · Date atteinte — publication soumise à validation</span>
 </div>;
 return <div className={primary?"pz-countdown-main":"pz-countdown-compact"} role="timer" aria-label={"Compte à rebours : "+title}>
  <span className="pz-countdown-label">{title}</span>
  <div className="pz-countdown-digits"><strong>{pad(left.days)}</strong><span>j</span><strong>{pad(left.hours)}</strong><span>h</span><strong>{pad(left.minutes)}</strong><span>m</span>{primary&&<><strong>{pad(left.seconds)}</strong><span>s</span></>}</div>
 </div>;
}
function InterconnectedGrid(){
 const [focus,setFocus]=useState<number|null>(null);
 const points=[["Intention","Comprendre"],["Identité","Réutiliser"],["Document","Structurer"],["Créer","Transformer"],["Temps","Relier"],["Musique","Synchroniser"],["Transmettre","Conserver"],["Impact","Vérifier"],["Jouer","Explorer"]];
 return <div className="pz-manifest-visual" aria-label="Grille interactive des univers POINTZERO">
   <div className="pz-manifest-mesh" aria-hidden="true"/>
   <div className="pz-manifest-visual-inner">
    <div className="pz-manifest-visual-heading"><span>LA GRILLE UNIVERSELLE</span><span>01 — 09</span></div>
    <div className="pz-manifest-node-grid">{points.map(([name,verb],i)=><button key={name} type="button" onClick={()=>setFocus(focus===i?null:i)}
     className={"pz-manifest-node "+(focus===i?"is-active":"")} aria-pressed={focus===i}
     aria-label={"Explorer le point "+name}>
     <span className="pz-node-index">{pad(i+1)}.</span><span className="pz-node-constellation" aria-hidden="true">✳</span>
     <span className="pz-node-title">{name}</span>
     <span className="pz-node-detail">{focus===i?verb:"↗"}</span></button>)}</div>
    <div className="pz-manifest-visual-foot"><span>{focus===null?"Touchez un point : chaque intention peut devenir une action.":points[focus][0]+" → "+points[focus][1]}</span>
    <span>UNE SEULE CONTINUITÉ</span></div>
   </div>
 </div>;
}
type EmailMode="subscribe"|"unsubscribe";
function Waitlist({state}:{state:PublicState}){
 const [email,setEmail]=useState(""),[name,setName]=useState("");
 const [interests,setInterests]=useState<string[]>(["creatif"]);
 const [agree,setAgree]=useState(false),[honeypot,setHoneypot]=useState("");
 const [mode,setMode]=useState<EmailMode>("subscribe"),[token,setToken]=useState(""),[busy,setBusy]=useState(false),[notice,setNotice]=useState(""),[error,setError]=useState("");
 const holder=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(!state.signupReady||!state.turnstileSiteKey||!holder.current)return;
  type WidgetAPI={render:(element:HTMLElement,options:{sitekey:string;theme:string;callback:(token:string)=>void;"expired-callback":()=>void})=>string;remove:(id:string)=>void};
  type CWindow=Window&{turnstile?:WidgetAPI};
  const global=window as CWindow;
  let widget:string|undefined,cancelled=false;
  const render=()=>{
   if(cancelled||widget||!holder.current||!global.turnstile)return;
   widget=global.turnstile.render(holder.current,{sitekey:state.turnstileSiteKey,theme:"light",callback:setToken,"expired-callback":()=>setToken("")});
  };
  const scriptId="pz-turnstile-script";
  const previous=document.getElementById(scriptId) as HTMLScriptElement|null;
  if(previous){if(global.turnstile)render();else previous.addEventListener("load",render);}
  else{const script=document.createElement("script");script.id=scriptId;script.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";script.async=true;script.defer=true;script.addEventListener("load",render);document.head.appendChild(script)}
  return()=>{cancelled=true;if(widget&&global.turnstile)try{global.turnstile.remove(widget)}catch{};previous?.removeEventListener("load",render)};
 },[state.signupReady,state.turnstileSiteKey]);
 function toggle(id:string){setInterests(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id].slice(0,8))}
 async function submit(e:FormEvent){
  e.preventDefault();setError("");setNotice("");
  if(!state.signupReady){setError("Les inscriptions ne sont pas encore activées : le service sécurisé est en préparation.");return}
  if(!token){setError("Veuillez compléter la vérification anti-robot.");return}
  if(mode==="subscribe"&&(!agree||interests.length===0)){setError("Choisissez un studio et acceptez les communications.");return}
  setBusy(true);
  try{
   const resp=await fetch("/api/pointzero-launch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(
    mode==="subscribe"?{action:"subscribe",email,firstName:name,interests,consent:agree,turnstile:token,website:honeypot}:
     {action:"unsubscribe-request",email,turnstile:token}
   )});
   const result=await resp.json() as {error?:string;message?:string;status?:string};
   if(!resp.ok)throw Error(result.error||"Le service est momentanément indisponible.");
   setNotice(result.message||"Demande enregistrée.");setError("");
  }catch(e){setError(e instanceof Error?e.message:"Une erreur est survenue.");}
  finally{setBusy(false);setToken("");}
 }
 const short=[...(state.config?.studios??DEFAULT_LAUNCH.studios)];
 return <section id="suivre" className="pz-manifest-section pz-manifest-dark" aria-labelledby="pz-waitlist-title">
  <div className="pz-manifest-wrap pz-waitlist-layout">
   <div><p className="pz-manifest-kicker text-white/55">RESTER DANS LA BOUCLE — 2026 → 2027</p>
    <h2 id="pz-waitlist-title" className="pz-manifest-heading !text-white">Le lancement n'est qu'un commencement.</h2>
    <p className="pz-manifest-lead !text-white/65">Les studios s'ouvriront progressivement, après vérification. Choisissez ceux qui vous intéressent ; vous ne recevrez que les informations auxquelles vous consentez.</p>
    <p className="mt-10 text-[12px] leading-relaxed text-white/45">Aucune inscription fictive. Aucune ouverture automatique. Désinscription sur demande vérifiée. Les données sont utilisées uniquement pour informer des ouvertures sélectionnées.</p>
   </div>
   <form aria-label="S'inscrire aux informations de lancement" className="pz-waitlist-form" onSubmit={e=>void submit(e)}>
    <div className="mb-5 flex gap-2"><button type="button" onClick={()=>{setMode("subscribe");setNotice("");setError("")}} aria-pressed={mode==="subscribe"} className={mode==="subscribe"?"pz-waitlist-tab is-active":"pz-waitlist-tab"}>S'inscrire</button>
     <button type="button" onClick={()=>{setMode("unsubscribe");setNotice("");setError("")}} aria-pressed={mode==="unsubscribe"} className={mode==="unsubscribe"?"pz-waitlist-tab is-active":"pz-waitlist-tab"}>Se désinscrire</button></div>
    <label className="pz-manifest-label">Votre adresse e-mail
     <input required type="email" maxLength={254} autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="bonjour@exemple.fr" className="pz-manifest-input"/>
    </label>
    {mode==="subscribe"&&<>
     <label className="pz-manifest-label">Prénom <span className="text-white/40">(facultatif)</span>
      <input type="text" maxLength={70} autoComplete="given-name" value={name} onChange={e=>setName(e.target.value)} placeholder="Prénom" className="pz-manifest-input"/>
     </label>
     <fieldset className="mt-5"><legend className="mb-3 text-xs font-semibold text-white/80">Les studios qui vous intéressent</legend>
      <div className="grid grid-cols-2 gap-2">{short.map(s=><label key={s.id} className="pz-waitlist-interest">
       <input type="checkbox" checked={interests.includes(s.id)} onChange={()=>toggle(s.id)}/><span>{s.title}</span>
      </label>)}</div>
     </fieldset>
     <label className="mt-5 flex items-start gap-3 text-xs leading-relaxed text-white/75">
      <input required type="checkbox" checked={agree} onChange={e=>setAgree(e.target.checked)} className="mt-1"/>
      <span>J'accepte de recevoir par e-mail les informations d'ouverture de POINTZERO pour les studios sélectionnés. Je pourrai retirer mon consentement à tout moment.</span>
     </label>
     <div className="sr-only" aria-hidden="true"><label>Site personnel<input tabIndex={-1} autoComplete="off" value={honeypot} onChange={e=>setHoneypot(e.target.value)}/></label></div>
    </>}
    {state.signupReady&&<div ref={holder} className="mt-5 min-h-12" aria-label="Vérification anti-robot"/>}
    {!state.signupReady&&<p className="mt-5 rounded-[6px] border border-white/15 p-3 text-xs leading-relaxed text-white/60">Inscription sécurisée en préparation : aucune adresse n'est enregistrée tant que le service e-mail, le stockage et l'anti-robot ne sont pas configurés.</p>}
    <button type="submit" disabled={!state.signupReady||busy} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-[6px] bg-white px-5 text-sm font-semibold text-[#161617] transition hover:bg-[#e9e9e9] disabled:cursor-not-allowed disabled:opacity-40">
     <Mail size={17}/>{busy?"Vérification en cours…":mode==="subscribe"?"Recevoir les prochaines ouvertures":"Recevoir mon lien de désinscription"}</button>
    {error&&<p role="alert" className="mt-3 text-xs text-[#ffc2c2]">{error}</p>}
    {notice&&<p role="status" className="mt-3 text-xs leading-relaxed text-[#b9e8c8]">{notice}</p>}
    <p className="mt-4 text-[11px] leading-relaxed text-white/40">Un lien e-mail de confirmation est nécessaire. Une demande non confirmée expire automatiquement après 72 heures.</p>
   </form>
  </div>
 </section>;
}
const MANIFEST=[
 {num:"I.",title:"Passé",tag:"Ce que nous avons construit",text:"L’humanité a accumulé des connaissances, des outils, des documents, des inventions et des expériences. Mais les informations restent dispersées. Les savoirs disparaissent parfois. Les générations recommencent des tâches déjà accomplies."},
 {num:"II.",title:"Présent",tag:"Ce que nous pouvons relier",text:"Les technologies actuelles permettent de structurer les informations, d’automatiser certaines tâches et de rendre les outils interopérables. POINTZERO rassemble ces possibilités dans un atelier unique."},
 {num:"III.",title:"Futur",tag:"Ce que nous pouvons transmettre",text:"Une expérience acquise aujourd’hui peut faciliter une action demain. Un savoir peut être transmis. Une erreur peut être comprise. Une décision peut être reliée à ses conséquences."}
];
const ACTIONS=[
 {id:"devis",title:"Devis",body:"La même identité devient l'en-tête d'un devis."},
 {id:"facture",title:"Facture",body:"Le même contact évite une deuxième saisie sur une facture."},
 {id:"carte",title:"Carte professionnelle",body:"Les mêmes informations s'adaptent à un format imprimable."},
 {id:"web",title:"Page web",body:"Votre présentation professionnelle prend une autre forme."},
 {id:"evenement",title:"Événement",body:"Vos coordonnées accompagnent votre prochaine prestation."}
];
function ReuseDemo(){
 const [identity,setIdentity]=useState(""),[job,setJob]=useState(""),[selection,setSelection]=useState("devis");
 const action=ACTIONS.find(a=>a.id===selection)??ACTIONS[0];
 return <section id="continuite" className="pz-manifest-section bg-[#f5f4f1]" aria-labelledby="pz-reuse-title">
  <div className="pz-manifest-wrap">
   <p className="pz-manifest-kicker">DÉMONSTRATION DE PRINCIPE</p>
   <h2 id="pz-reuse-title" className="pz-manifest-heading max-w-[800px]">Une information. Plusieurs usages.</h2>
   <p className="pz-manifest-lead mb-8">Renseignez une fois votre identité professionnelle. Observez la continuité entre plusieurs supports.</p>
   <div className="pz-reuse-grid">
    <div className="pz-reuse-entry"><p className="text-xs font-semibold tracking-[.1em] text-[#777]">01 / SAISIR UNE FOIS</p>
     <label className="mt-6 block text-xs text-[#555]">Nom ou activité<input value={identity} onChange={e=>setIdentity(e.target.value.slice(0,80))} placeholder="Votre nom professionnel" className="pz-reuse-field"/></label>
     <label className="mt-5 block text-xs text-[#555]">Métier ou activité<input value={job} onChange={e=>setJob(e.target.value.slice(0,80))} placeholder="Votre métier" className="pz-reuse-field"/></label>
     <p className="mt-5 text-[11px] leading-relaxed text-[#999]">Cette démonstration est locale. Elle ne génère ni contrat, ni facture officielle et ne stocke pas vos informations sur un serveur.</p>
    </div>
    <div className="pz-reuse-options"><p className="text-xs font-semibold tracking-[.1em] text-[#777]">02 / CHOISIR LA TRANSFORMATION</p>
     <div className="mt-5 flex flex-col gap-1">{ACTIONS.map(a=><button key={a.id} className={"pz-reuse-option "+(selection===a.id?"is-active":"")} aria-pressed={selection===a.id} onClick={()=>setSelection(a.id)}>{a.title}<ArrowRight size={16}/></button>)}</div>
    </div>
    <div className="pz-reuse-result"><p className="text-xs font-semibold tracking-[.1em] text-[#aaa]">03 / VOIR LA CONTINUITÉ</p>
     <div className="pz-reuse-document"><p className="text-[10px] uppercase tracking-[.15em] text-[#999]">POINTZERO / APERÇU</p>
      <p className="mt-8 text-2xl font-semibold tracking-tight text-[#333]">{identity.trim()||"Votre identité"}</p>
      <p className="mt-2 text-sm text-[#787878]">{job.trim()||"Votre activité"}</p>
      <div className="my-7 h-px bg-[#ddd]"/>
      <p className="text-[12px] font-semibold text-[#555]">{action.title}</p><p className="mt-2 text-[13px] leading-relaxed text-[#858585]">{action.body}</p>
     </div>
     <p className="mt-4 text-[11px] leading-relaxed text-[#8c8c8c]">Aperçu interactif, pas un transfert réel vers un studio. Les transformations documentaires seront connectées progressivement.</p>
    </div>
   </div>
  </div>
 </section>;
}
export default function ManifestLanding({onDetails,onAime,onOpenAtelier,onUniversal,onAdmin}:Props){
 const [state,setState]=useState<PublicState>({config:null,signupReady:false,turnstileSiteKey:"",legalEntity:"",privacyContact:"",privacyPolicyUrl:""});
 useEffect(()=>{
  let active=true;
  fetch("/api/pointzero-launch").then(r=>r.ok?r.json():Promise.reject()).then((raw:PublicState)=>{
   if(!active)return;setState({
    config:validLaunch(raw.config)?raw.config:null,signupReady:raw.signupReady===true,turnstileSiteKey:typeof raw.turnstileSiteKey==="string"?raw.turnstileSiteKey:"",
    legalEntity:typeof raw.legalEntity==="string"?raw.legalEntity:"",privacyContact:typeof raw.privacyContact==="string"?raw.privacyContact:"",privacyPolicyUrl:typeof raw.privacyPolicyUrl==="string"?raw.privacyPolicyUrl:""
   });
  }).catch(()=>undefined);
  return()=>{active=false};
 },[]);
 const config=state.config??DEFAULT_LAUNCH;
 const heroIntro=(config.introduction||DEFAULT_LAUNCH.introduction);
 return <div className="pz-manifest" data-aime-design={DESIGN_SYSTEM.version} aria-label="POINTZERO .0 — Le temps retrouvé"><style>{designCSS()}</style>
  <header className="pz-manifest-nav"><button type="button" onClick={onAime} className="pz-manifest-mark" aria-label="Retour à AIME, maison mère"><span className="pz-manifest-logo" aria-hidden="true">×</span> POINTZERO <span className="pz-manifest-zero">.0</span></button>
   <nav aria-label="Navigation du manifeste"><button type="button" onClick={onAime}>AIME</button><a href="#manifeste">Manifeste</a><a href="#studios">Studios</a><a href="#continuite" className="hidden sm:inline">Continuité</a></nav>
   <button className="pz-manifest-nav-cta" type="button" onClick={onOpenAtelier}>Ouvrir l’Atelier <ArrowUpRight size={15}/></button>
  </header>
  <main id="accueil">
   <section className="pz-manifest-hero" aria-labelledby="pz-manifest-title">
    <div className="pz-manifest-wrap pz-hero-content">
     <div className="pz-hero-copy"><p className="pz-manifest-kicker"><span className="pz-kicker-dot"/> {config.eyebrow}</p>
      <h1 id="pz-manifest-title" className="pz-hero-title">{config.title}</h1>
      <p className="pz-hero-subtitle">{config.subtitle}</p>
      <p className="pz-hero-body">{heroIntro}</p>
      <div className="pz-hero-buttons"><a href="#manifeste" className={btn+" is-primary"}>Découvrir le manifeste <ArrowDownRight size={17}/></a>
       <a href="#studios" className={btn+" is-secondary"}>Explorer les studios <ArrowRight size={17}/></a>
       <button type="button" onClick={onOpenAtelier} className={btn+" is-secondary"}>Ouvrir l’Atelier <ArrowUpRight size={17}/></button>
       <button type="button" onClick={onUniversal} className={btn+" is-secondary"}>Créer un Dossier Universel <ArrowUpRight size={17}/></button>
      </div>
      <div className="mt-9"><CountdownView date={config.mainDate} title={config.mainLabel||"Présentation publique"} primary/></div>
     </div>
     <div className="pz-hero-art"><InterconnectedGrid/></div>
    </div>
    <div className="pz-hero-baseline"><span>TOUT COMMENCE QUELQUE PART.</span><span>PLUS RIEN NE RECOMMENCE À ZÉRO.</span></div>
   </section>
   <section id="manifeste" className="pz-manifest-section" aria-labelledby="pz-m-title">
    <div className="pz-manifest-wrap"><p className="pz-manifest-kicker">MANIFESTE / PASSÉ · PRÉSENT · FUTUR</p>
     <h2 id="pz-m-title" className="pz-manifest-heading max-w-[810px]">Nous avons inventé les outils. Maintenant, relions leurs usages.</h2>
     <div className="pz-manifest-trilogy">{MANIFEST.map(x=><article key={x.num} className="pz-manifest-era">
      <span className="pz-manifest-era-num">{x.num}</span><p className="pz-manifest-kicker mt-7">{x.tag}</p><h3>{x.title}</h3><p>{x.text}</p>
     </article>)}</div>
     <p className="pz-manifest-quote">Le logiciel devient un espace de continuité, plutôt qu'une succession d'applications indépendantes.</p>
    </div>
   </section>
   <section className="pz-manifest-section pz-music-section" aria-labelledby="pz-music-title">
    <div className="pz-manifest-wrap pz-music-inner"><div><p className="pz-manifest-kicker"><Music2 size={14} className="inline mr-2"/> LA MUSIQUE COMME LANGAGE UNIVERSEL</p>
     <h2 id="pz-music-title" className="pz-manifest-heading">Une partition.<br/>Plusieurs instruments.</h2>
     <p className="pz-manifest-lead">Dans un orchestre, chaque instrument possède sa partition. Pourtant, tous participent à la même œuvre.</p>
     <p className="mt-5 max-w-[540px] text-sm leading-relaxed text-[#747474]">Chaque studio possède sa spécialité. Chaque utilisateur possède son rythme. Chaque action peut s'inscrire dans une chronologie commune.</p>
    </div><div className="pz-music-composition" aria-label="Animation de plusieurs points s'organisant en composition">
      {Array.from({length:24},(_,i)=><span key={i} className="pz-music-note" style={{left:(8+(i%8)*12)+"%",top:(14+Math.floor(i/8)*34)+"%",animationDelay:(i*100)+"ms"}}/>)}
      <div className="pz-music-rail"/><div className="pz-music-caption">INSTRUMENTS → RELATIONS → COMPOSITION</div>
    </div></div>
   </section>
   <section id="studios" className="pz-manifest-section bg-[#fafafa]" aria-labelledby="pz-studios-title">
    <div className="pz-manifest-wrap"><p className="pz-manifest-kicker">L'ÉCOSYSTÈME / OUVERTURE PROGRESSIVE</p>
     <div className="flex flex-wrap items-end justify-between gap-7"><h2 id="pz-studios-title" className="pz-manifest-heading max-w-[770px]">Un univers. Plusieurs studios. Une seule continuité.</h2>
      <span className="text-xs text-[#969696]">13 domaines explorés · Statuts vérifiables</span>
     </div>
     <div className="pz-studio-grid">{config.studios.map((studio,i)=>{
      const Icon=THEME_ICONS[i]||Grid2X2;
      return <article key={studio.id} className="pz-manifest-studio">
       <div className="pz-studio-top"><span className="pz-studio-number">{studio.number}</span><Icon size={20} strokeWidth={1.5}/></div>
       <div><span className={"pz-studio-state pz-state-"+studio.status}><span className="pz-state-dot"/>{STATUS_LABELS[studio.status]}</span>
        <h3>{studio.title}</h3><p>{studio.description}</p></div>
       <div className="pz-studio-bottom">{studio.openAt&&<CountdownView title="Ouverture annoncée" date={studio.openAt}/>}
        {studio.history.length>0&&<p className="mt-2 text-[11px] text-[#929292]">{studio.history[studio.history.length-1]}</p>}
        <button type="button" className="pz-studio-link" aria-label={"Voir "+studio.title}
          onClick={()=>onDetails(studio.id)}>
          Découvrir le Studio <ArrowUpRight size={15}/></button>
       </div>
      </article>;
     })}</div>
     <div className="pz-2027-roadmap"><span>AUJOURD'HUI / 2026</span><div className="pz-roadmap-line"/><span>DEMAIN / 2027</span></div>
     <p className="mt-3 text-xs text-[#939393]">Les prochaines étapes ne possèdent pas de dates publiques tant qu'elles ne sont pas confirmées. Un compte à rebours ne publie jamais un studio automatiquement.</p>
    </div>
   </section>
   <ReuseDemo/>
   <section className="pz-manifest-section" aria-labelledby="pz-learn-title">
    <div className="pz-manifest-wrap pz-learning-layout"><div><p className="pz-manifest-kicker">L'ESPACE PERSONNEL / TRANSMISSION</p>
      <h2 id="pz-learn-title" className="pz-manifest-heading">Apprendre sans recommencer.</h2>
      <p className="pz-manifest-lead">« Qui je suis. Ce que je fais. Ce que je connais. Ce que je souhaite accomplir. »</p>
      <p className="mt-5 text-sm leading-relaxed text-[#727272]">L'ambition est de conserver les connaissances acquises, reconnaître les prérequis et adapter les prochains parcours. Cet espace évoluera par étapes, avec des autorisations et des accès contrôlés.</p>
     </div><div className="pz-learning-path">{["Je décris mon intention","J'identifie mes acquis","J'utilise le bon studio","Je transmets le résultat"].map((x,i)=>
      <div key={x} className="pz-learning-step"><span>{pad(i+1)}</span><strong>{x}</strong><ChevronRight size={16}/></div>)}</div>
    </div>
   </section>
   <section className="pz-manifest-section bg-[#f8f7f5]" aria-labelledby="pz-org-title">
    <div className="pz-manifest-wrap pz-org-layout"><div><p className="pz-manifest-kicker">CAS D'USAGE / ORGANISATION</p><h2 id="pz-org-title" className="pz-manifest-heading">Voir les blocages. Pas surveiller les personnes.</h2>
     <p className="pz-manifest-lead">Une grande organisation pourrait relier missions, dossiers, ressources et connaissances dans une seule grille de coordination.</p>
     <p className="mt-5 text-sm leading-relaxed text-[#747474]">L'exemple de la MSA est un cas d'étude indépendant : il ne constitue ni un partenariat ni un service opérationnel. La confidentialité, les droits d'accès et les responsabilités doivent précéder toute intégration réelle.</p></div>
     <div className="pz-org-sheet"><div className="flex items-center justify-between text-xs text-[#8b8b8b]"><span>ORGANISATION / EXEMPLE</span><span>Démonstration</span></div>
      {["Mission à coordonner","Dossier à clarifier","Ressource disponible","Connaissance à transmettre"].map((name,i)=>
       <div key={name} className="pz-org-row"><span className="pz-org-icon">{pad(i+1)}</span><span>{name}</span><span className="text-[#aaa]">↗</span></div>)}
     </div></div>
   </section>
   <section id="journal" className="pz-manifest-section" aria-labelledby="pz-journal-title">
    <div className="pz-manifest-wrap"><p className="pz-manifest-kicker">JOURNAL DE CRÉATION</p><h2 id="pz-journal-title" className="pz-manifest-heading">Une histoire vérifiable. Un futur à construire.</h2>
     {config.journal.length?<div className="pz-manifest-timeline">{config.journal.map(x=><div key={x.id} className="pz-manifest-timeline-row">
      <time dateTime={x.date}>{new Date(x.date+"T12:00:00").toLocaleDateString("fr-FR")}</time><span className="pz-timeline-state">{x.status}</span><div><strong>{x.title}</strong>{x.source&&<p>{x.source}</p>}</div>
     </div>)}</div>:<p className="mt-7 max-w-[700px] text-sm leading-relaxed text-[#898989]">Le journal public sera alimenté à partir des versions, publications et commits vérifiés. Aucun historique n'est inventé pour produire une impression d'ancienneté.</p>}
     {config.announcement&&<p className="mt-6 rounded-[7px] bg-[#f3f1ee] p-5 text-sm text-[#555]">{config.announcement}</p>}
    </div>
   </section>
   <Waitlist state={state}/>
   <section id="confidentialite" className="pz-manifest-section bg-[#f5f4f2]" aria-labelledby="pz-privacy-title">
     <div className="pz-manifest-wrap">
      <p className="pz-manifest-kicker">TRANSPARENCE / DONNÉES PERSONNELLES</p>
      <h2 id="pz-privacy-title" className="pz-manifest-heading">Vos informations vous appartiennent.</h2>
      <div className="grid gap-9 md:grid-cols-3">
       <div><h3 className="text-sm font-semibold">Finalité</h3><p className="mt-3 text-[13px] leading-relaxed text-[#777]">Les adresses e-mail et centres d'intérêt sont utilisés uniquement pour informer des ouvertures sélectionnées. Le prénom est facultatif. Aucun partage commercial de cette liste n'est prévu.</p></div>
       <div><h3 className="text-sm font-semibold">Consentement et retrait</h3><p className="mt-3 text-[13px] leading-relaxed text-[#777]">L'inscription nécessite une validation de votre adresse. Vous pouvez demander un lien de désinscription depuis le formulaire ci-dessus. Les inscriptions non confirmées expirent après 72 heures.</p></div>
       <div><h3 className="text-sm font-semibold">Responsable et contact</h3><p className="mt-3 text-[13px] leading-relaxed text-[#777]">{state.legalEntity||"Identité de l'éditeur à renseigner avant l'ouverture des inscriptions."}</p>
        {state.privacyContact?<a href={"mailto:"+state.privacyContact} className="mt-3 inline-block text-[13px] font-semibold underline">{state.privacyContact}</a>:<p className="mt-3 text-xs text-[#ae8792]">Contact de confidentialité à configurer avant lancement.</p>}
       </div>
      </div>
      <p className="mt-8 max-w-[950px] text-[12px] leading-relaxed text-[#999]">Le formulaire reste désactivé tant que l'identité de l'éditeur, son contact et une politique de confidentialité complète ne sont pas configurés.</p>
      {state.privacyPolicyUrl&&<a href={state.privacyPolicyUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-[12px] font-semibold text-[#765c69] underline">Consulter la politique de confidentialité complète <ArrowUpRight size={14}/></a>}
     </div>
   </section>
   <footer className="pz-manifest-footer"><div className="pz-manifest-wrap"><p className="pz-manifest-kicker">POINTZERO .0</p>
    <h2>Le temps retrouvé.</h2>
    <p>Nous avons appris à fabriquer des outils. Puis nous avons appris à les connecter. Aujourd'hui, nous pouvons commencer à leur donner une continuité.</p>
    <p>Relier ce que nous savons à ce que nous faisons. Relier nos expériences à celles des autres. Relier le passé, le présent et les possibilités du futur.</p>
    <p>Non pour aller toujours plus vite. Mais pour retrouver le temps de comprendre, de créer, de transmettre et de vivre.</p>
    <div className="pz-manifest-footerbar"><span>UN POINT DE DÉPART. UNE INFINITÉ DE POSSIBLES.</span>
     <div className="flex items-center gap-4"><button type="button" onClick={onAime}>AIME — Maison mère</button><a href="/le-monde-aime">Le Monde Aime — Présentation</a><a href="#confidentialite">Confidentialité</a><a href="#accueil">Haut de page ↑</a><button onClick={onAdmin} type="button">Administration</button></div>
    </div>
   </div></footer>
  </main>
 </div>;
}
