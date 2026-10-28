import {useMemo,useState,type MouseEvent,type ReactNode} from "react";
import {ArrowLeft,ArrowRight,ArrowUpRight,ChevronDown,FileText,Filter,LockKeyhole,Search,ShieldCheck,SlidersHorizontal} from "lucide-react";
import {ARCHITECTURE,CAUSAL_STEPS,COMPETITORS,FINANCE_EXAMPLE,FUNDING_AUDIENCES,HISTORY,OBSERVED,REFERENCE_DOCS,REFERENCE_EDITION,ROADMAP,SCENARIOS,SOURCES,calculateHypothesis,sourceFor,validObserved,type FinanceInputs,type ObservedSeries} from "../lib/aimeReference";
import "./AimeDossier.css";
type Props={onNavigate:(path:string)=>void};
const EURO=new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0});
function Jump({href,onNavigate,children,className=""}:{href:string;onNavigate:(path:string)=>void;children:ReactNode;className?:string}){
 function click(e:MouseEvent<HTMLAnchorElement>){if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();onNavigate(href)}
 return <a href={href} onClick={click} className={className}>{children}</a>;
}
const SECTIONS=[
 ["introduction","Pourquoi AIME existe"],
 ["histoire","Histoire et antériorités"],
 ["besoins","Problèmes et besoins"],
 ["architecture","Architecture AIME"],
 ["comparaison","Comparaison des solutions"],
 ["marches","Marchés et données"],
 ["causalite","Causalité"],
 ["modele","Modèle économique"],
 ["impact","Impact"],
 ["partenariats","Investissement et mécénat"],
 ["gouvernance","Gouvernance"],
 ["documents","Documents"]
] as const;
type SectionId=(typeof SECTIONS)[number][0];
function Label({children}:{children:ReactNode}){return <p className="adr-kicker">{children}</p>}
function Section({id,number,title,lead,children}:{id:SectionId;number:string;title:string;lead?:string;children:ReactNode}){
 return <section className="adr-section" id={id} aria-labelledby={"adr-"+id}>
  <Label>DOSSIER / {number}</Label><h2 id={"adr-"+id} className="adr-h2">{title}</h2>
  {lead&&<p className="adr-lead">{lead}</p>}{children}
 </section>;
}
function RefLink({id}:{id:string}){const s=sourceFor(id);return s?<a className="adr-source" href={s.url} target="_blank" rel="noopener noreferrer" title={s.scope||s.title}>{s.publisher} · {s.title} <ArrowUpRight size={13}/></a>:<span className="adr-unknown">Source à documenter</span>}
function History(){const [active,setActive]=useState(HISTORY[HISTORY.length-1].id),[mode,setMode]=useState<"all"|"modern">("all");
 const list=mode==="all"?HISTORY:HISTORY.filter(x=>x.id!=="writing");
 const moment=list.find(x=>x.id===active)??list[list.length-1];
 return <div className="adr-history">
  <div className="adr-history-toolbar">
   <div className="adr-segment" role="group" aria-label="Période historique">
    <button type="button" className={mode==="all"?"is-on":""} onClick={()=>setMode("all")}>Des origines</button>
    <button type="button" className={mode==="modern"?"is-on":""} onClick={()=>setMode("modern")}>Histoire contemporaine</button>
   </div><span>{list.length} repères documentés</span>
  </div>
  <div className="adr-history-grid">
   <div className="adr-history-events">{list.map(x=><button key={x.id} className={"adr-history-event "+(moment.id===x.id?"selected":"")} type="button" aria-pressed={moment.id===x.id} onClick={()=>setActive(x.id)}>
    <time>{x.date}</time><span>{x.label}</span><ArrowRight size={15}/>
   </button>)}</div>
   <article className="adr-history-focus" aria-live="polite">
    <span className="adr-tag">ANTÉRIORITÉ · {moment.certainty}</span>
    <h3>{moment.label}</h3><p className="adr-history-people">{moment.people}</p>
    <dl>
     <div><dt>Contexte</dt><dd>{moment.context}</dd></div>
     <div><dt>Impact documenté ou historique</dt><dd>{moment.impact}</dd></div>
     <div><dt>Limites</dt><dd>{moment.limits}</dd></div>
     <div><dt>Rapport avec AIME</dt><dd>Lecture éditoriale, non attribution : {moment.aimeRelation}</dd></div>
    </dl><RefLink id={moment.sourceId}/>
   </article>
  </div>
 </div>;
}
function ObservedChart({series}:{series:ObservedSeries}){
 const [hover,setHover]=useState<number>(series.values.length-1);
 const vals=series.values.map(v=>Number(v)),max=Math.max(25,Math.ceil(Math.max(...vals)/10)*10);
 const pts=vals.map((v,i)=>[54+(i*(580/(vals.length-1))),220-178*v/max]);
 const d=pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
 return <div className="adr-observed">
  <div className="adr-observed-top"><div><p className="adr-mini">DONNÉES OBSERVÉES · {series.geography}</p><h3>{series.name}</h3></div>
   <div className="adr-observed-value"><strong>{new Intl.NumberFormat("fr-FR",{maximumFractionDigits:1}).format(series.values[hover])} %</strong><span>{series.dates[hover]}</span></div>
  </div>
  <svg viewBox="0 0 680 260" className="adr-chart" role="img" aria-label={"Courbe : "+series.name+". "+series.dates.map((date,i)=>date+" "+series.values[i]+" %").join(", ")}>
   {[0,1,2,3,4].map(i=><g key={i}><line x1="54" y1={220-178*i/4} x2="652" y2={220-178*i/4} stroke="#e5e3e0"/><text x="10" y={224-178*i/4} fontSize="12" fill="#999">{(max*i/4).toFixed(0)}%</text></g>)}
   <path d={d} fill="none" stroke="#a47b8e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
   {pts.map(([x,y],i)=><g key={series.dates[i]}><circle cx={x} cy={y} r={i===hover?8:5} fill="#fff" stroke="#a47b8e" strokeWidth="3"/>
    <rect x={x-25} y={y-25} width="50" height="50" fill="transparent" role="button" tabIndex={0} aria-label={series.dates[i]+": "+series.values[i]+" %"} onMouseEnter={()=>setHover(i)} onFocus={()=>setHover(i)} onClick={()=>setHover(i)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")setHover(i)}}/>
    <text x={x} y="248" textAnchor="middle" fontSize="12" fill="#85807d">{series.dates[i]}</text></g>)}
  </svg>
  <div className="adr-chart-legend"><strong>Unité : {series.unit}</strong><span>Dernière publication : {series.updated}</span></div>
  <p className="adr-caption">Population : {series.population}. Méthode : {series.method}</p><RefLink id={series.sourceId}/>
  <div className="adr-data-strip">{series.dates.map((year,i)=><button type="button" aria-pressed={hover===i} key={year} onClick={()=>setHover(i)}><strong>{year}</strong><span>{series.values[i].toLocaleString("fr-FR")} %</span></button>)}</div>
 </div>;
}
function Finance(){
 const [v,setV]=useState<FinanceInputs>(FINANCE_EXAMPLE);
 const rows=useMemo(()=>calculateHypothesis(v),[v]);
 const nums:[keyof FinanceInputs,string,string,number,number,number][]=[
  ["clients","Clients payants au départ","clients",0,100000,1],
  ["monthlyFee","Prix mensuel hypothétique","€ / mois",0,10000,1],
  ["monthlyGrowthPercent","Variation mensuelle des clients","% / mois",-100,100,1],
  ["fixedMonthlyCost","Dépenses fixes mensuelles","€ / mois",0,1e7,100],
  ["variableCostPerClient","Coût variable mensuel par client","€ / client / mois",0,10000,1]
 ];
 const max=Math.max(1,...rows.flatMap(r=>[r.revenue,r.cost]));
 return <div className="adr-finance">
  <div className="adr-finance-input"><div className="adr-finance-header"><SlidersHorizontal size={20}/><strong>Hypothèses modifiables</strong></div>
  <p className="adr-caption">Valeurs pédagogiques arbitraires et non comptes réels d'AIME. Modifiez-les pour explorer la sensibilité économique.</p>
  {nums.map(([key,label,unit,min,maxV,step])=><label className="adr-finance-row" key={key}>
   <span>{label}<small>{unit}</small></span><input type="number" min={min} max={maxV} step={step} value={v[key]}
    onChange={e=>{const n=Number(e.target.value);setV(prev=>({...prev,[key]:Number.isFinite(n)?Math.max(min,Math.min(maxV,n)):0}))}}/></label>)}
  <button type="button" className="adr-reset" onClick={()=>setV(FINANCE_EXAMPLE)}>Réinitialiser l'exemple</button>
  </div>
  <div className="adr-finance-results"><div className="adr-finance-header"><span className="adr-tag">PROJECTION AIME · EXEMPLE NON VALIDÉ</span></div>
   <div className="adr-scenario-chart">{rows.map(r=><div key={r.year} className="adr-scenario-group">
    <div className="adr-scenario-bars"><div style={{height:(r.revenue/max*100)+"%"}} aria-label={"Recettes année "+r.year+": "+EURO.format(r.revenue)}/><div style={{height:(r.cost/max*100)+"%"}} aria-label={"Dépenses année "+r.year+": "+EURO.format(r.cost)}/></div>
    <span>Année {r.year}</span>
   </div>)}</div>
   <div className="adr-scenario-legend"><span><i/> Recettes calculées</span><span><i/> Dépenses calculées</span></div>
   <div className="adr-finance-table"><table><thead><tr><th>Scénario</th><th>Recettes</th><th>Dépenses</th><th>Résultat simplifié</th></tr></thead><tbody>
    {rows.map(r=><tr key={r.year}><th>A. {r.year}</th><td>{EURO.format(r.revenue)}</td><td>{EURO.format(r.cost)}</td><td>{EURO.format(r.balance)}</td></tr>)}
   </tbody></table></div>
   <p className="adr-caption">Méthode : moyenne projetée de clients mensuels × prix mensuel ; dépenses fixes + coût variable par client. Croissance mensuelle composée, sans taxes, investissements, churn distinct, financement, TVA ou inflation. Ne constitue ni un prévisionnel bancaire ni une estimation de marché.</p>
  </div>
 </div>;
}
function Causal(){const [selected,setSelected]=useState(0);
 return <div className="adr-causal"><div className="adr-causal-flow">{CAUSAL_STEPS.map((x,i)=><button key={x.id} type="button" aria-pressed={selected===i} className={selected===i?"is-selected":""} onClick={()=>setSelected(i)}>
   <span>{String(i+1).padStart(2,"0")}</span><strong>{x.title}</strong>{i<CAUSAL_STEPS.length-1&&<ArrowRight size={13}/>}</button>)}</div>
   <div className="adr-causal-note" aria-live="polite"><p className="adr-tag">{CAUSAL_STEPS[selected].kind}</p><h3>{CAUSAL_STEPS[selected].title}</h3><p>{CAUSAL_STEPS[selected].note}</p>
    {CAUSAL_STEPS[selected].evidence?<RefLink id={CAUSAL_STEPS[selected].evidence}/>:<span className="adr-caption">Relation non étayée par une mesure causale directe — preuve à produire.</span>}
   </div><p className="adr-caption">Les flèches matérialisent un raisonnement de conception. Elles ne sont pas une preuve que chaque étape provoque la suivante.</p>
 </div>;
}
function Docs(){const [query,setQuery]=useState(""),[category,setCategory]=useState("Tous");
 const categories=["Tous",...new Set(REFERENCE_DOCS.map(d=>d.category))];
 const list=REFERENCE_DOCS.filter(d=>(category==="Tous"||d.category===category)&&
 (d.title+" "+d.summary+" "+d.category).toLowerCase().includes(query.trim().toLowerCase()));
 return <div className="adr-documents">
   <div className="adr-doc-filters"><label className="adr-search"><Search size={17}/><input aria-label="Rechercher les documents" placeholder="Rechercher dans la bibliothèque…" value={query} onChange={e=>setQuery(e.target.value)}/></label>
    <label className="adr-select"><Filter size={15}/><select aria-label="Filtrer par catégorie" value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(x=><option key={x}>{x}</option>)}</select><ChevronDown size={14}/></label>
   </div>
   <div className="adr-doc-list">{list.map(d=><article key={d.id} className="adr-doc-row">
    <div className="adr-doc-icon">{d.status==="Privé — non accessible"?<LockKeyhole size={19}/>:<FileText size={19}/>}</div>
    <div><div className="adr-doc-top"><span>{d.category}</span><span>{d.status}</span><span>{d.version}</span></div><h3>{d.title}</h3><p>{d.summary}</p>{d.date&&<time>{d.date}</time>}</div>
    {d.status==="Public"&&d.url?<a className="adr-doc-open" href={d.url} rel="noopener noreferrer" target="_blank">Consulter <ArrowUpRight size={15}/></a>:<span className="adr-disabled">{d.status==="Privé — non accessible"?"Accès non ouvert":"À produire"}</span>}
   </article>)}
   {!list.length&&<p className="adr-caption">Aucun document ne correspond à cette recherche.</p>}</div>
   <p className="adr-caption">Bibliothèque publique structurée en code. Recherche locale, liens vers versions GitHub existantes. Aucun dépôt de fichiers privés ni habilitation serveur simulés ; export PDF et versionnement documentaire complet à développer.</p>
 </div>;
}
function Partners(){const [choice,setChoice]=useState(0);const cur=FUNDING_AUDIENCES[choice];
 return <div className="adr-partners"><div className="adr-audiences" role="group" aria-label="Choisir un type de partenaire">{FUNDING_AUDIENCES.map((x,i)=><button key={x.name} type="button" aria-pressed={choice===i} className={choice===i?"is-on":""} onClick={()=>setChoice(i)}>{x.name} <ArrowUpRight size={14}/></button>)}</div>
 <article className="adr-partner-focus" aria-live="polite"><Label>PARCOURS DE DÉCISION</Label><h3>{cur.name}</h3><p>{cur.goal}</p><h4>Éléments à examiner</h4><p>{cur.materials}</p><span className="adr-tag">Document de cadrage — aucune offre ferme ni partenaire confirmé</span></article></div>;
}
export default function AimeDossier({onNavigate}:Props){
 const [activeNav,setActiveNav]=useState<SectionId>("introduction");
 const [chart,setChart]=useState("frAi");
 const [scenario,setScenario]=useState(0);
 const sourceSeries=OBSERVED.find(x=>x.id===chart)??OBSERVED[0];
 const allValid=OBSERVED.every(validObserved);
 return <div className="adr-shell" aria-label="AIME — Dossier de référence">
  <header className="adr-top">
   <Jump href="/" onNavigate={onNavigate} className="adr-brand"><span>✳</span> AIME<sup>®</sup></Jump>
   <div className="adr-top-middle">DOSSIER DE RÉFÉRENCE <span>ÉDITION {REFERENCE_EDITION}</span></div>
   <Jump href="/vision" onNavigate={onNavigate} className="adr-return">La vision <ArrowUpRight size={16}/></Jump>
  </header>
  <div className="adr-body">
   <aside className="adr-sidebar" aria-label="Sommaire du dossier">
    <div className="adr-sidebar-top"><p>INDEX</p><span>12 CHAPITRES</span></div>
    <nav>{SECTIONS.map(([id,label],i)=><a key={id} className={activeNav===id?"is-on":""} href={"#"+id} onClick={()=>setActiveNav(id)}>
     <span>{String(i+1).padStart(2,"0")}</span>{label}</a>)}</nav>
    <div className="adr-sidebar-foot"><ShieldCheck size={16}/><span>Sources ouvertes. Hypothèses signalées. Aucun accès privé fictif.</span></div>
   </aside>
   <main className="adr-main">
    <div className="adr-main-wrap">
     <section className="adr-cover">
      <div className="adr-cover-top"><span>AIME® · DOCUMENT STRATÉGIQUE</span><span>RÉFÉRENCE / 01</span></div>
      <p className="adr-kicker">VISION · ANTÉRIORITÉS · IMPACT · INVESTISSEMENT · PARTENARIATS</p>
      <h1>Relier ce qui existe.<br/><em>Rendre possible la suite.</em></h1>
      <p>Un dossier de décision ouvert : l'histoire des idées qui nous précèdent, les enjeux contemporains, l'architecture AIME, les premières expérimentations et les questions à résoudre pour construire une proposition durable.</p>
      <div className="adr-cover-bottom"><span>Édition {REFERENCE_EDITION} · Version publique</span><a href="#introduction">Lire le dossier <ArrowRight size={17}/></a></div>
     </section>
     <Section id="introduction" number="01" title="Pourquoi AIME existe." lead="Ne pas remplacer ce qui existe. Relier ce qui est séparé, reconnaître les contributions et donner une continuité aux intentions.">
      <div className="adr-prose"><p>Des outils spécialisés ont transformé le travail, la création et les démarches. Pourtant, passer de l'idée à la réalisation implique souvent de changer d'application, d'organisation, de format et parfois de vocabulaire. Des documents se déplacent ; leur contexte et la raison de certaines décisions peuvent se perdre.</p>
      <p>Ces difficultés sont des problèmes à étudier, non une condamnation générale des plateformes ou des institutions. AIME propose une architecture exploratoire où une information garde son origine, ses relations, les actions auxquelles elle participe et, à terme, les permissions de ses contributeurs.</p>
      <blockquote>« Une idée ne vaut pas par le nombre de fois où elle est ressaisie, mais par les transformations qu'elle permet, les personnes qu'elle relie et la mémoire qu'elle conserve. »</blockquote>
      <p>Ce dossier distingue les réalisations visibles dans le dépôt POINTZERO, les constats sourcés et les fonctions que la recherche AIME souhaite encore éprouver.</p></div>
     </Section>
     <Section id="histoire" number="02" title="Les antériorités, notre héritage commun." lead="Chaque avancée provient de personnes, d'équipes et d'institutions antérieures. AIME ne revendique pas leurs découvertes : il reconnaît les conditions qui rendent sa recherche possible."><History/></Section>
     <Section id="besoins" number="03" title="Les besoins à démontrer." lead="Du problème observé à l'hypothèse de terrain : ce qui paraît évident doit pouvoir être vérifié.">
      <div className="adr-questions">{[
       ["Fragmentation","Combien de contextes et de fichiers faut-il traverser pour réaliser une action ?","À mesurer lors de tests d'usage"],
       ["Temps et démarches","Quel temps est consacré à la ressaisie, à la recherche et aux erreurs ?","Aucune perte chiffrée sans protocole"],
       ["Attribution","Comment documenter une contribution, une décision et une évolution ?","Historique technique ≠ titre de propriété"],
       ["Accès aux ressources","Qui peut participer et quels obstacles rencontre-t-il ?","Indicateurs d'accessibilité à construire"]
      ].map(([h,p,status])=><article key={h}><h3>{h}</h3><p>{p}</p><span>{status}</span></article>)}</div>
     </Section>
     <Section id="architecture" number="04" title="Une continuité, sept étapes." lead="Intention → compréhension → mémoire → relations → décision → action → évolution : un modèle conceptuel vérifiable par les usages.">
      <div className="adr-arch-flow" role="list">{ARCHITECTURE.map((name,i)=><div role="listitem" className="adr-arch-node" key={name}><span>{String(i+1).padStart(2,"0")}</span><strong>{name}</strong>{i<ARCHITECTURE.length-1&&<ArrowRight aria-hidden="true" size={19}/>}</div>)}</div>
      <div className="adr-arch-layers"><article><span>AIME®</span><h3>La vision et la mémoire</h3><p>Intention, provenance, décisions et personnes.</p></article><article><span>UNIVERS</span><h3>Les domaines humains</h3><p>Mariage, création, transmission, inclusion, ressources…</p></article><article><span>POINTZERO</span><h3>Les Studios et leurs moteurs</h3><p>Grille, fragments, causalité et chronologie réutilisables.</p></article></div>
      <div className="adr-scenarios"><div className="adr-scenario-head"><h3>Parcours à comparer</h3><span>Études de conception · pas d'économie mesurée</span></div>
       <div className="adr-segment" role="group">{SCENARIOS.map((x,i)=><button type="button" key={x.title} className={scenario===i?"is-on":""} onClick={()=>setScenario(i)}>{x.title}</button>)}</div>
       <div className="adr-scenario-comparison"><div><span>Parcours fragmenté possible</span><p>{SCENARIOS[scenario].fragmented}</p></div><div><span>Parcours proposé par AIME</span><p>{SCENARIOS[scenario].proposal}</p></div></div>
       <p className="adr-caption">État réel : {SCENARIOS[scenario].proof}</p>
      </div>
     </Section>
     <Section id="comparaison" number="05" title="Ce qui existe déjà." lead="Le paysage n'est pas vide : des plateformes fortes couvrent déjà la conception, la collaboration, l'identité et l'automatisation. Le différenciateur AIME est une hypothèse d'architecture, non une prétention d'exclusivité.">
      <div className="adr-compare">{COMPETITORS.map(x=><article key={x.name}><span className="adr-tag">{x.domain}</span><h3>{x.name}</h3><p>{x.use}</p><div><span>Question pour AIME</span><p>{x.gap}</p></div><RefLink id={x.sourceId}/></article>)}</div>
      <p className="adr-caption">Comparaison qualitative illustrative, non audit exhaustif du marché ni comparaison de prix. Un benchmark fonctionnel, économique et juridique devra être daté et complété.</p>
     </Section>
     <Section id="marches" number="06" title="Les chiffres observés." lead="Des séries publiques réelles pour situer les changements du numérique — sans en déduire automatiquement une taille de marché ou une demande pour AIME.">
      <div className="adr-tabs" role="group" aria-label="Choisir la série économique">{OBSERVED.map(x=><button key={x.id} aria-pressed={chart===x.id} className={chart===x.id?"is-on":""} onClick={()=>setChart(x.id)}>{x.id==="frAi"?"IA · France":x.id==="euAi"?"IA · Union européenne":"Cloud · Union européenne"}</button>)}</div>
      {allValid?<ObservedChart series={sourceSeries}/>:<p className="adr-caption">Les séries sources comportent des incohérences ; publication du graphique suspendue.</p>}
      <p className="adr-caption">Ces enquêtes couvrent des entreprises d'au moins dix salariés dans des champs sectoriels définis. Elles ne sont ni un sondage des micro-entrepreneurs ni une mesure du marché accessible à AIME. Les niveaux ne doivent pas être additionnés.</p>
     </Section>
     <Section id="causalite" number="07" title="Un raisonnement que l'on peut interroger." lead="Un graphe d'hypothèses, pas une preuve de causalité. Sélectionnez une étape pour comprendre sa justification et la preuve encore nécessaire."><Causal/></Section>
     <Section id="modele" number="08" title="Construire des hypothèses économiques honnêtes." lead="Le simulateur ci-dessous est un outil d'exploration. Les chiffres initiaux sont des paramètres d'exemple, sans rapport avec une trésorerie ou des clients effectivement obtenus."><Finance/></Section>
     <Section id="impact" number="09" title="L'impact devra se mesurer." lead="Le nombre de prototypes n'est pas un impact social. Les résultats doivent être suivis auprès des utilisateurs et des partenaires habilités.">
      <div className="adr-impact">{[
       ["Accessibilité","Tests auprès de personnes aux besoins différents","Aucun résultat mesuré"],
       ["Temps de travail","Minutes par tâche avant/après, avec groupe de comparaison","Protocole à concevoir"],
       ["Transmission","Savoirs réellement conservés, réutilisés et autorisés","Ligne de base à constituer"],
       ["Confiance","Corrections, droits d'accès, consentements et qualité des décisions","Gouvernance à mettre en place"]
      ].map(([t,d,z])=><article key={t}><h3>{t}</h3><p>{d}</p><span>{z}</span></article>)}</div>
     </Section>
     <Section id="partenariats" number="10" title="Contribuer sans confondre les engagements." lead="Chaque partenaire doit disposer d'informations adaptées à son rôle, d'indicateurs vérifiables et d'une lecture sincère des risques."><Partners/>
      <div className="adr-risk"><h3>Risques identifiés</h3><p>Interopérabilité, périmètre du produit, sécurité des données, obligations légales, dépendances technologiques, financement et absence de validation commerciale sont des risques de premier ordre. Aucune levée de fonds, aucune garantie de rendement et aucun partenaire confirmé ne sont annoncés ici.</p></div>
     </Section>
     <Section id="gouvernance" number="11" title="Une remontée doit pouvoir devenir une décision." lead="Un parcours responsable à construire : Contribution → Qualification → Vérification → Décision → Action → Suivi.">
      <div className="adr-arch-flow adr-governance" role="list">{["Contribution","Qualification","Vérification","Décision","Action","Suivi"].map((x,i)=><div className="adr-arch-node" role="listitem" key={x}><span>{String(i+1).padStart(2,"0")}</span><strong>{x}</strong></div>)}</div>
      <div className="adr-risk"><ShieldCheck size={23}/><h3>Ce circuit n'est pas encore un service d'enregistrement.</h3><p>Une version opérationnelle exigera authentification, gestion des rôles, identifiant immuable, horodatage, responsable désigné, historique d'événements et conservation conforme. Aucun signalement ni dossier privé n'est collecté par cette page. Aucun accord d'une marraine pressentie ou d'un représentant institutionnel n'est présumé.</p></div>
     </Section>
     <Section id="documents" number="12" title="Une mémoire documentaire ouverte." lead="Une bibliothèque publique filtrable, des sources vérifiables et une séparation explicite des pièces confidentielles."><Docs/>
      <h3 className="adr-roadmap-title">Feuille de route du dossier</h3>
      <div className="adr-roadmap">{ROADMAP.map((x,i)=><article key={i}><span>{String(i+1).padStart(2,"0")}</span><p>{x.item}</p><strong>{x.state}</strong></article>)}</div>
      <div className="adr-sources">
       <h3>Registre des sources publiques</h3><p className="adr-caption">Dernier contrôle éditorial : {REFERENCE_EDITION}. Chaque entrée contient son éditeur, son champ ou sa période. Une étude plus exhaustive reste à mener.</p>
       {Object.entries(SOURCES).map(([id,v])=><div key={id}><span>{v.publisher} · {v.published}</span><RefLink id={id}/></div>)}
      </div>
     </Section>
     <div className="adr-ending"><p>Relier ce qui existe ne dispense pas de démontrer ce qui manque.</p><Jump href="/" onNavigate={onNavigate}>Revenir à AIME <ArrowLeft size={18}/></Jump><Jump href="/pointzero" onNavigate={onNavigate}>Découvrir POINTZERO <ArrowUpRight size={18}/></Jump></div>
    </div>
   </main>
  </div>
 </div>;
}
