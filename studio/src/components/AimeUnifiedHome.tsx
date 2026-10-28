import {useState,type FormEvent,type MouseEvent,type ReactNode} from "react";
import {ArrowRight,ArrowUpRight,CheckCircle2,ChevronDown,ExternalLink,Grid3X3,Layers3,Link2,ShieldCheck,Sparkles} from "lucide-react";
import {INTEGRATION_POINTS} from "../lib/atelierCompositionContract";
import "./AimeUnifiedHome.css";

/** Single public experience. Existing Studio routes, specialist formats and data stores remain untouched. */
type StudioId="metamorphose"|"design"|"mini-site"|"embroidery"|"accessibility";
interface StudioItem{id:StudioId;label:string;description:string;status:string}
const STUDIOS:readonly StudioItem[]=[
 {id:"metamorphose",label:"MÉTAMORPHOSE",description:"Explorateur, fragments, grille responsive et inspection Zoom Code des fragments.",status:"Atelier intégré · fonctions locales"},
 {id:"design",label:"Design",description:"Créations vectorielles et composition que MÉTAMORPHOSE peut référencer.",status:"Studio existant"},
 {id:"mini-site",label:"Mini-site",description:"Un moteur spécialisé qui conserve ses propres pages et sections.",status:"Studio existant"},
 {id:"embroidery",label:"Broderie",description:"Patrons, cellules et fils : le moteur métier reste distinct.",status:"Studio existant"},
 {id:"accessibility",label:"Accessibilité",description:"Outils d'exploration ; aucun audit certifié ni conformité automatique.",status:"Studio expérimental"}
];
const METHODE=[
 {number:"01",title:"Comprendre",body:"Partir d'une intention et identifier les ressources disponibles, sans promettre qu'un agent sait tout réaliser."},
 {number:"02",title:"Fragmenter",body:"Référencer une source sans en perdre l'identité. Le fragment représente une ressource ; il ne remplace pas son original."},
 {number:"03",title:"Composer",body:"Adapter les proportions et les fragments aux écrans avec les modes Éditorial, Régulier et Immersif."},
 {number:"04",title:"Inspecter",body:"Comprendre l'objet, ses propriétés et sa provenance avec Zoom Code. Prévisualiser avant de confirmer."},
 {number:"05",title:"Transmettre",body:"Exporter selon les permissions, conserver le dossier et reprendre là où la création s'est arrêtée."}
] as const;
function LocalLink({href,onNavigate,children,className=""}:{href:string;onNavigate:(url:string)=>void;children:ReactNode;className?:string}){
 const click=(event:MouseEvent<HTMLAnchorElement>)=>{
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();onNavigate(href);
 };
 return <a href={href} onClick={click} className={className}>{children}</a>;
}
export default function AimeUnifiedHome({onNavigate}:{onNavigate:(path:string,intention?:string)=>void}){
 const [intent,setIntent]=useState("");
 const [studioId,setStudioId]=useState<StudioId>("metamorphose");
 const [showPreview,setShowPreview]=useState(false);
 const active=STUDIOS.find(item=>item.id===studioId)!;
 const studioPath="/atelier?studio="+studioId;
 function submitIntent(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  const value=intent.trim();
  if(value.length<8)return;
  // Only prefill the existing Dossier Universel. Nothing is saved or sent from the landing.
  onNavigate("/espace",value.slice(0,800));
 }
 return <main id="contenu" className="au-home">
   <section className="au-hero" aria-labelledby="au-hero-title">
    <div className="au-max au-hero-grid">
     <div className="au-hero-copy">
      <p className="au-eyebrow"><span className="au-star" aria-hidden="true">✳</span> AIME® / MÉTAMORPHOSE ULTIME</p>
      <h1 id="au-hero-title">Une intention.<br/><em>Toutes ses</em><br/>possibilités.</h1>
      <p className="au-lead">Une seule entrée pour comprendre, composer et transformer. Des moteurs différents, des fragments reliés et la liberté de ne pas tout recommencer.</p>
      <div className="au-hero-actions">
       <LocalLink href="/atelier?studio=metamorphose" onNavigate={onNavigate} className="au-button au-button-light">Explorer MÉTAMORPHOSE <ArrowUpRight size={18}/></LocalLink>
       <a href="#interfaces" className="au-quiet-link">Voir les véritables interfaces <ArrowRight size={16}/></a>
      </div>
      <p className="au-hero-note">Première architecture opérationnelle par étapes · Pas d'automatisation universelle annoncée.</p>
     </div>
     <div className="au-hero-graphic" aria-label="Principe de composition : une source liée à plusieurs représentations">
      <div className="au-graphic-top"><span>AIME / FRAGMENT UNIVERSAL</span><span>01—05</span></div>
      <div className="au-fragment-array" aria-hidden="true">
       <div className="au-fragment au-fragment-primary"><span>01 / SOURCE</span><strong>Une seule origine.<br/>Des créations vivantes.</strong><i className="au-orbit">✳</i></div>
       <div className="au-fragment au-fragment-neutral"><span>02 / COMPOSER</span><Grid3X3 size={38} strokeWidth={1}/></div>
       <div className="au-fragment au-fragment-purple"><span>03 / INSPECTER</span><Layers3 size={38} strokeWidth={1}/></div>
       <div className="au-fragment au-fragment-beige"><span>04 / LIER</span><Link2 size={40} strokeWidth={1}/></div>
       <div className="au-fragment au-fragment-green"><span>05 / TRANSMETTRE</span><CheckCircle2 size={32} strokeWidth={1}/></div>
      </div>
      <div className="au-graphic-bottom"><span>FRAGMENTS IDENTIFIÉS</span><span>ÉDITORIAL · RÉGULIER · IMMERSIF</span></div>
     </div>
    </div>
   </section>

   <section className="au-intention" aria-labelledby="au-intent-title">
    <div className="au-max au-intention-grid">
     <div><p className="au-kicker">01 / POINT DE DÉPART</p><h2 id="au-intent-title">Tout commence<br/>par ce qui vous anime.</h2><p>Décrivez votre idée. Elle sera transmise au Dossier Universel existant pour être relue avant toute création. Rien n'est enregistré depuis ce formulaire.</p></div>
     <form className="au-intent-form" onSubmit={submitIntent}>
      <label htmlFor="au-intent-input">Votre intention</label>
      <textarea id="au-intent-input" rows={3} maxLength={800} value={intent} onChange={e=>setIntent(e.target.value)} placeholder="Je souhaite créer une composition florale, puis l'adapter à plusieurs formats accessibles."/>
      <div className="au-form-bottom"><span>Interprétation locale proposée, validation humaine.</span><button type="submit" disabled={intent.trim().length<8}>Comprendre mon projet <ArrowRight size={17}/></button></div>
     </form>
    </div>
   </section>

   <section className="au-interface-section" id="interfaces" aria-labelledby="au-interface-title">
    <div className="au-max">
     <div className="au-section-heading"><div><p className="au-kicker">02 / LES VRAIS STUDIOS</p><h2 id="au-interface-title">La preuve,<br/><em>pas la promesse.</em></h2></div><p>Ce panneau ouvre les interfaces réelles du dépôt POINTZERO, pas des captures fictives. MÉTAMORPHOSE réunit déjà la grille, les fragments et leur inspection ; les autres moteurs conservent leurs outils.</p></div>
     <div className="au-studio-switch" role="group" aria-label="Choisir le studio présenté">
      {STUDIOS.map(item=><button key={item.id} type="button" onClick={()=>{setStudioId(item.id);setShowPreview(false)}} aria-pressed={studioId===item.id} className={studioId===item.id?"au-studio-active":""}>{item.label}</button>)}
     </div>
     <div className="au-live-window">
      <div className="au-window-top"><div className="au-window-dots" aria-hidden="true"><i/><i/><i/></div><span>POINTZERO / ATELIER / {active.label}</span><span className="au-window-status">Interface réelle</span></div>
      <div className="au-live-meta"><div><h3>{active.label}</h3><p>{active.description}</p><small>{active.status}</small></div><LocalLink href={studioPath} onNavigate={onNavigate} className="au-window-open">Ouvrir en plein écran <ExternalLink size={16}/></LocalLink></div>
      {showPreview?<div className="au-live-frame-wrap"><iframe key={studioId} src={studioPath} title={"Interface interactive réelle : "+active.label} loading="lazy" referrerPolicy="same-origin"/></div>
       :<div className="au-live-placeholder"><div className="au-live-mark" aria-hidden="true"><Grid3X3 size={42} strokeWidth={1}/></div>
        <p>Chargez le véritable Studio pour inspecter son interface et l'essayer.</p>
        <button type="button" className="au-button au-button-dark" onClick={()=>setShowPreview(true)}>Afficher l'interface réelle <ArrowRight size={17}/></button>
        <small>Le Studio intégré utilise le stockage de votre navigateur. Ses modifications sont réelles, comme dans l'Atelier.</small>
       </div>}
     </div>
     <p className="au-preview-caption"><ShieldCheck size={15}/> Présentation sans données de démonstration forcées ni migration. Le Studio reste accessible directement ; la prévisualisation utilise les mêmes données locales si vous décidez de l'ouvrir.</p>
    </div>
   </section>

   <section className="au-method" id="methode" aria-labelledby="au-method-title">
    <div className="au-max"><p className="au-kicker">03 / LA MÉTHODE MÉTAMORPHOSE</p>
     <div className="au-method-head"><h2 id="au-method-title">Créer une fois.<br/><em>Composer autrement.</em></h2><p>La Grille Universelle est une philosophie de composition, pas une contrainte imposée à la broderie, aux documents ou au Web. Chaque moteur garde son langage métier.</p></div>
     <div className="au-method-grid">{METHODE.map(item=><article key={item.number}><span>{item.number}</span><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>
     <div className="au-core-invariants"><span>PROJET / WorldSpace.id</span><ArrowRight size={20}/><span>STUDIOS SPÉCIALISÉS</span><ArrowRight size={20}/><span>FRAGMENTS ET PROJECTIONS</span><ArrowRight size={20}/><span>HISTORIQUE ET EXPORTS</span></div>
     <p className="au-honesty">Architecture progressive : toutes les ressources des Studios ne sont pas encore synchronisées par le Dossier Universel.</p>
    </div>
   </section>

   <section className="au-access" id="accessibilite" aria-labelledby="au-access-title">
    <div className="au-max au-access-grid">
     <div><p className="au-kicker">04 / UNE FINALITÉ HUMAINE</p><h2 id="au-access-title">Composer pour<br/><em>plus de personnes.</em></h2>
      <p>L'accessibilité n'est pas une finition. Contraste, lecture, clavier, alternatives textuelles et compréhension doivent être pensés dès la composition. Le cadre européen, WCAG et RGAA guident cette recherche.</p>
      <LocalLink href="/atelier?studio=accessibility" onNavigate={onNavigate} className="au-button au-button-dark">Explorer le Studio Accessibilité <ArrowUpRight size={16}/></LocalLink>
     </div>
     <div className="au-access-panel"><span className="au-access-mark"><ShieldCheck size={25}/></span><h3>Identifier. Proposer. Vérifier.</h3>
      <div className="au-access-steps"><p><span>01</span> Rendre les obstacles visibles</p><p><span>02</span> Préparer les adaptations dans chaque moteur</p><p><span>03</span> Vérifier avec des tests humains et techniques</p></div>
      <p className="au-access-caution">Objectif de développement — pas un certificat de conformité RGAA, WCAG ou European Accessibility Act. Les audits manuels restent indispensables.</p>
     </div>
    </div>
   </section>

   <section className="au-continuity" id="continuite" aria-labelledby="au-continuity-title"><div className="au-max au-continuity-grid">
    <div><p className="au-kicker">05 / LE TEMPS RETROUVÉ</p><h2 id="au-continuity-title">Relier ce qui est séparé.<br/><em>Préserver ce qui compte.</em></h2><p>Le Dossier Universel conserve l'intention et les références connues. Les fragments transforment leur présentation sans effacer leur source. Les capacités indisponibles restent identifiées comme des travaux à réaliser.</p></div>
    <div className="au-status-list"><span>CONCRÈTEMENT, AUJOURD'HUI</span>
     {INTEGRATION_POINTS.filter(x=>x.state!=="planned").map(x=><div key={x.id}><CheckCircle2 size={17}/><p>{x.description}<small>{x.state==="experimental"?"Expérimental":"Disponible localement"}</small></p></div>)}
    </div>
   </div></section>

   <section className="au-resources" aria-labelledby="au-resources-title"><div className="au-max">
    <div className="au-section-heading"><div><p className="au-kicker">06 / LES PREUVES ET LES UNIVERS</p><h2 id="au-resources-title">Une seule porte d'entrée.<br/><em>Une histoire conservée.</em></h2></div><p>Les anciennes pages restent consultables comme documentation ou espaces métier. Elles ne concurrencent plus l'accueil principal.</p></div>
    <div className="au-resource-grid">
     <LocalLink onNavigate={onNavigate} href="/univers" className="au-resource-card"><span>01 / DOMAINES HUMAINS</span><h3>Univers</h3><p>Les intentions humaines auxquelles les moteurs peuvent contribuer.</p><ArrowUpRight size={21}/></LocalLink>
     <LocalLink onNavigate={onNavigate} href="/vision" className="au-resource-card"><span>02 / MÉTHODE DOCUMENTÉE</span><h3>Vision</h3><p>Le chemin parcouru, les limites, la provenance et ce qui reste à inventer.</p><ArrowUpRight size={21}/></LocalLink>
     <LocalLink onNavigate={onNavigate} href="/dossier" className="au-resource-card"><span>03 / DOCUMENTS ET SOURCES</span><h3>Dossier de référence</h3><p>Les fondements, les recherches et les documents vérifiables.</p><ArrowUpRight size={21}/></LocalLink>
     <LocalLink onNavigate={onNavigate} href="/le-monde-aime" className="au-resource-card"><span>04 / IDENTITÉ ASSOCIATIVE</span><h3>LE MONDE AIME</h3><p>L'association conserve son identité et ses activités distinctes.</p><ArrowUpRight size={21}/></LocalLink>
    </div>
    <details className="au-history-details"><summary>Retrouver le manifeste « Le temps retrouvé » <ChevronDown size={18}/></summary><p>Le manifeste POINTZERO original demeure accessible, avec ses ressources éditoriales et sa chronologie.</p><LocalLink href="/pointzero" onNavigate={onNavigate}>Voir le manifeste historique <ArrowUpRight size={15}/></LocalLink></details>
    <details className="au-history-details au-letter-details"><summary>LETTRE OUVERTE — Lire les principes fondateurs <ChevronDown size={18}/></summary><h3>Nous avons construit tant de choses. Mais elles ne se parlent pas encore.</h3><p>Pourquoi faudrait-il ressaisir ce que nous savons déjà, perdre la trace d’une intention ou recommencer à zéro dès qu’une création change de contexte ? AIME relie ce qui existe, distingue ce qui manque et rend visibles les possibilités. Le projet reste une architecture en construction, pas une promesse d’automatisation totale.</p><LocalLink href="/vision" onNavigate={onNavigate}>Lire l’histoire et ses sources <ArrowUpRight size={15}/></LocalLink></details>
   </div></section>

   <section className="au-final" aria-labelledby="au-final-title"><div className="au-max"><Sparkles size={26}/><p>AIME® × POINTZERO</p><h2 id="au-final-title">Un même projet.<br/>Plusieurs expressions.<br/><em>Une seule continuité.</em></h2>
    <div className="au-final-actions"><LocalLink href="/atelier?studio=metamorphose" onNavigate={onNavigate} className="au-button au-button-light">Ouvrir MÉTAMORPHOSE <ArrowRight size={17}/></LocalLink><LocalLink href="/espace" onNavigate={onNavigate} className="au-button au-button-outline">Commencer par une intention <ArrowUpRight size={17}/></LocalLink></div>
   </div></section>
 </main>;
}
