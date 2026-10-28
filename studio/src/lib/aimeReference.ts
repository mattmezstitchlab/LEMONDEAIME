/** AIME — Public reference dossier v1. Facts must carry independent sources.
 * Source links were checked against original publishers on 2026-10-16.
 * No private documents, invented TAM or fundraising claims are contained here.
 */
export const REFERENCE_EDITION="2026-10-16";
export interface ReferenceSource {title:string;publisher:string;url:string;published:string;scope?:string}
export const SOURCES:Record<string,ReferenceSource>={
 british:{title:"Mesopotamia — Writing began around 3200 BC",publisher:"British Museum",url:"https://www.britishmuseum.org/sites/default/files/2019-09/Visit_Mesopotamia_KS2b.pdf",published:"Document pédagogique",scope:"Écriture sumérienne ; datation approximative"},
 memex:{title:"A Little History of the World Wide Web",publisher:"W3C",url:"https://www.w3.org/History.html",published:"Chronologie historique",scope:"Memex 1945 et hypertexte 1965"},
 eniac:{title:"Histoire des machines — L’ENIAC",publisher:"Inria / ACONIT",url:"https://aconit.inria.fr/omeka/exhibits/show/histoire-machines/naissance-ordinateur/eniac.html",published:"Musée virtuel",scope:"1942–1946"},
 engelbart:{title:"Mother of All Demos",publisher:"DARPA",url:"https://www.darpa.mil/about/innovation-timeline/mother-of-all-demos",published:"Chronologie DARPA",scope:"9 décembre 1968"},
 mac:{title:"Apple Timeline",publisher:"Computer History Museum",url:"https://computerhistory.org/apple-timeline/",published:"Chronologie",scope:"Lisa 1983 ; Macintosh 1984"},
 web:{title:"The birth of the Web",publisher:"CERN",url:"https://home.cern/science/computing/the-birth-of-the-web/",published:"Dossier institutionnel",scope:"1989 ; libération du logiciel en 1993"},
 euid:{title:"European Digital Identity",publisher:"Commission européenne",url:"https://commission.europa.eu/topics/digital-economy-and-society/european-digital-identity_en",published:"Documentation institutionnelle",scope:"Portefeuille européen : objectif fin 2026"},
 frAi:{title:"Les TIC dans les entreprises en 2025 — Insee Première n°2120",publisher:"Insee",url:"https://www.insee.fr/fr/statistiques/9025878",published:"Juillet 2026",scope:"France, entreprises 10 salariés ou plus, secteurs marchands hors agriculture et finance"},
 euAi:{title:"20% of EU enterprises use AI technologies",publisher:"Eurostat",url:"https://ec.europa.eu/eurostat/web/products-eurostat-news/w/ddn-20251211-2",published:"11 décembre 2025",scope:"UE, entreprises 10 salariés ou plus ; série isoc_eb_ai"},
 euCloud:{title:"53% EU enterprises used paid cloud services in 2025",publisher:"Eurostat",url:"https://ec.europa.eu/eurostat/web/products-eurostat-news/w/ddn-20260203-1",published:"3 février 2026",scope:"UE, entreprises 10 salariés ou plus ; série isoc_cicce_use"},
 notion:{title:"Product — Guides Notion",publisher:"Notion",url:"https://www.notion.com/help/guides/category/product",published:"Documentation produit",scope:"Projets, documents, bases et collaboration"},
 figma:{title:"Figma Design",publisher:"Figma",url:"https://www.figma.com/design/",published:"Documentation produit",scope:"Design, coédition, systèmes de conception"},
 zapier:{title:"Apps on Zapier",publisher:"Zapier",url:"https://help.zapier.com/hc/en-us/categories/8495901804429",published:"Documentation produit",scope:"Automatisation entre applications"}
};
export interface HistoryMoment {
 id:string;date:string;label:string;people:string;context:string;impact:string;limits:string;
 aimeRelation:string;sourceId:string;certainty:"Documenté"|"Approximation historique";
}
export const HISTORY:HistoryMoment[]=[
 {id:"writing",date:"vers 3200 av. J.-C.",label:"L'écriture et la mémoire matérielle",people:"Communautés sumériennes de Mésopotamie",context:"Les tablettes enregistrent notamment des ressources et des échanges.",impact:"Des informations survivent au-delà d'une conversation.",limits:"Accès limité, supports physiques et interprétations historiques.",aimeRelation:"L'importance de la provenance et de la conservation.",sourceId:"british",certainty:"Approximation historique"},
 {id:"memex",date:"1945",label:"Le Memex imaginé",people:"Vannevar Bush",context:"Dispositif conceptuel de navigation associative dans des documents.",impact:"Relier des connaissances par leurs associations.",limits:"Concept et non navigateur Web opérationnel.",aimeRelation:"La continuité des idées plutôt qu'une accumulation de documents.",sourceId:"memex",certainty:"Documenté"},
 {id:"eniac",date:"1942–1946",label:"Les calculateurs électroniques",people:"Équipes ENIAC, notamment J. Presper Eckert et John Mauchly",context:"Construction d'un calculateur électronique d'usage général.",impact:"Automatisation de calculs auparavant longs et complexes.",limits:"Programmation par câblage physique, contraintes matérielles.",aimeRelation:"La technique rend possibles de nouvelles formes d'organisation.",sourceId:"eniac",certainty:"Documenté"},
 {id:"hypertext",date:"1965",label:"Le mot « hypertexte »",people:"Ted Nelson",context:"Vision d'informations liées au-delà de l'ordre linéaire.",impact:"Un document peut pointer vers un autre.",limits:"Plusieurs traditions et équipes ont contribué aux systèmes hypertextes.",aimeRelation:"Relier les concepts sans effacer leur contexte.",sourceId:"memex",certainty:"Documenté"},
 {id:"engelbart",date:"9 décembre 1968",label:"La démonstration NLS",people:"Douglas Engelbart et équipes du SRI",context:"Présentation de la souris, d'outils collaboratifs et de la navigation interactive.",impact:"Des interactions humaines plus puissantes avec les ordinateurs.",limits:"Démonstration de recherche, non adoption immédiate universelle.",aimeRelation:"Concevoir l'interface comme prolongement de l'intelligence humaine.",sourceId:"engelbart",certainty:"Documenté"},
 {id:"mac",date:"1983–1984",label:"L'interface graphique personnelle",people:"Équipes Xerox PARC et Apple",context:"Lisa puis Macintosh diffusent des interfaces graphiques au-delà des laboratoires.",impact:"Manipulation visuelle de documents et d'applications.",limits:"Coût, accessibilité et formats spécifiques.",aimeRelation:"Des interfaces plus humaines, malgré la multiplication des outils.",sourceId:"mac",certainty:"Documenté"},
 {id:"web",date:"1989–1993",label:"Le World Wide Web",people:"Tim Berners-Lee et contributeurs du CERN",context:"Proposition de 1989 ; mise à disposition du logiciel Web en 1993.",impact:"Partage décentralisé de pages reliées.",limits:"Des silos de contenus persistent malgré l'universalité du Web.",aimeRelation:"Interopérabilité et liens entre intentions, sources et actions.",sourceId:"web",certainty:"Documenté"},
 {id:"wallet",date:"2024–2026",label:"L'identité numérique européenne",people:"Union européenne et États membres",context:"Cadre du portefeuille européen d'identité numérique.",impact:"Partager certaines attestations et contrôler les données communiquées.",limits:"Cadre et calendrier publics ne prouvent pas une adoption effective partout.",aimeRelation:"Une identité réutilisable nécessite des autorisations explicites.",sourceId:"euid",certainty:"Documenté"}
];
export interface ObservedSeries {
 id:string;name:string;unit:string;geography:string;population:string;dates:number[];values:number[];sourceId:string;
 updated:string;method:string;kind:"Données observées";
}
export const OBSERVED:ObservedSeries[]=[
 {id:"frAi",name:"Entreprises françaises utilisant l'IA",unit:"% des entreprises",geography:"France",population:"Entreprises ≥10 salariés, champ Insee TIC, hors agriculture et finance",
 dates:[2023,2024,2025],values:[6,10,18],sourceId:"frAi",updated:"Juillet 2026",method:"Enquête TIC entreprises ; déclarations d'usage, non mesure du nombre de salariés utilisateurs.",kind:"Données observées"},
 {id:"euAi",name:"Entreprises européennes utilisant l'IA",unit:"% des entreprises",geography:"Union européenne",population:"Entreprises ≥10 salariés, champ Eurostat",
 dates:[2023,2024,2025],values:[8,13.5,20],sourceId:"euAi",updated:"Décembre 2025",method:"Enquête communautaire TIC ; déclarations d'entreprises ; série isoc_eb_ai.",kind:"Données observées"},
 {id:"euCloud",name:"Entreprises européennes utilisant des services cloud payants",unit:"% des entreprises",geography:"Union européenne",population:"Entreprises ≥10 salariés, champ Eurostat",
 dates:[2014,2023,2025],values:[17.8,45.3,52.7],sourceId:"euCloud",updated:"Février 2026",method:"Enquête TIC, services cloud payants ; 2023 = 52,7 % moins hausse 7,4 points publiée par Eurostat ; série isoc_cicce_use.",kind:"Données observées"}
];
export const COMPETITORS=[
 {domain:"Organisation, documents et collaboration",name:"Notion",use:"Documents, wikis et suivi de projets connectés.",gap:"Hypothèse AIME : continuité typée entre dossier, grille créative, identité et action.",sourceId:"notion"},
 {domain:"Création graphique et interface",name:"Figma",use:"Conception collaborative, commentaires et systèmes de design.",gap:"Hypothèse AIME : garder l'intention et les liens métier hors du fichier de conception.",sourceId:"figma"},
 {domain:"Automatisation et interconnexion",name:"Zapier",use:"Déclenchement de processus reliant différentes applications.",gap:"Hypothèse AIME : mémoire de décision et relation entre intentions et objets, au-delà du flux.",sourceId:"zapier"},
 {domain:"Identité et contrôle des données",name:"Portefeuille européen",use:"Attestations, identification et partage sélectif de données.",gap:"AIME devra s'interfacer aux standards pertinents et ne pas recréer une identité régalienne.",sourceId:"euid"}
];
export const ARCHITECTURE=["Intention","Compréhension","Mémoire","Relations","Décision","Action","Évolution"] as const;
export const CAUSAL_STEPS=[
 {id:"apps",title:"Multiplication d'outils spécialisés",kind:"Constat descriptif",evidence:"notion",note:"Des solutions spécialisées coexistent et couvrent plusieurs fonctions."},
 {id:"silos",title:"Fragmentation de données possible",kind:"Hypothèse plausible",evidence:"",note:"À vérifier selon les outils, les API et les pratiques ; aucune fragmentation universelle n'est postulée."},
 {id:"reentry",title:"Saisies répétées possibles",kind:"Hypothèse à tester",evidence:"",note:"Observer sur le terrain les parcours d'utilisateurs avant de chiffrer."},
 {id:"cost",title:"Temps et efforts de coordination",kind:"Hypothèse à tester",evidence:"",note:"La perte réelle ne peut pas être chiffrée sans mesure comparative."},
 {id:"interop",title:"Besoin de continuité documentée",kind:"Proposition de conception",evidence:"",note:"Définir une API commune et vérifier les permissions."},
 {id:"aime",title:"Architecture AIME expérimentale",kind:"Prototype AIME",evidence:"",note:"Démonstration partielle dans POINTZERO, sans preuve de gain de temps à ce stade."}
];
export const SCENARIOS=[
 {title:"Un mariage",fragmented:"Programme, invitations, prestataires et documents souvent dans des outils distincts.",proposal:"Un dossier, des moments et des personnes reliées.",proof:"Programme, Mon Espace et Mini-site prototypés ; sync multi-parties à construire."},
 {title:"Un artiste",fragmented:"Identité, prestation, contrat et musique préparés dans différents supports.",proposal:"Une fiche de prestation qui renseigne plusieurs ateliers.",proof:"Studios Admin et Musique existants ; automatisation du cycle contractuel non démontrée."},
 {title:"Une brodeuse",fragmented:"Transformer une image, choisir des couleurs puis mettre au propre un motif.",proposal:"Une même grille transformable, utilisable en composition et dans Game.",proof:"Broderie, moteurs de grille et Game sur branche ; gains de temps non mesurés."},
 {title:"Un inventeur",fragmented:"Carnets, fichiers et prototypes dont la provenance est parfois difficile à reconstituer.",proposal:"Un dossier source/version/décision explicitement horodaté.",proof:"Registre Git et dossier Vision public ; preuve d'antériorité juridique non certifiée."}
];
export const FUNDING_AUDIENCES=[
 {name:"Investisseurs",goal:"Potentiel économique, modèle et risques.",materials:"Hypothèses modifiables, besoin de financement à établir, jalons de validation."},
 {name:"Mécènes et fondations",goal:"Impact culturel, social et transmission.",materials:"Indicateurs d'accessibilité, publics concernés et méthode de mesure d'impact."},
 {name:"Banques",goal:"Solidité économique et trésorerie.",materials:"Prévisionnel argumenté, situation comptable et garanties, non encore communiqués."},
 {name:"Institutions",goal:"Adéquation à des besoins et responsabilité.",materials:"Cas d'usage, règles d'accès, protection des données et évaluation."},
 {name:"Partenaires techniques",goal:"Interopérabilité et faisabilité.",materials:"Architecture, interfaces, dépendances et prototype vérifiable."},
 {name:"Conseils juridiques",goal:"Titularité, risques et conformité.",materials:"Historique de conception, contrats, licences et pièces probantes autorisées."}
];
export interface DossierDocument {id:string;title:string;category:string;status:"Public"|"À compléter"|"Privé — non accessible";version:string;date:string;summary:string;url?:string;source?:string}
export const REFERENCE_DOCS:DossierDocument[]=[
 {id:"audit",title:"Architecture mère AIME — audit",category:"Architecture",status:"Public",version:"Branche de développement",date:"2026-10-15",summary:"Distinction entre AIME, Univers, POINTZERO, Studios et moteurs.",url:"https://github.com/mattmezstitchlab/POINTZERO/blob/feat/aime-mother-architecture/docs/AIME-ARCHITECTURE-MERE-AUDIT.md"},
 {id:"manifeste",title:"Landing POINTZERO — audit de lancement",category:"Prototype",status:"Public",version:"PR #37",date:"2026-10-15",summary:"Inventaire technique, statuts et recette.",url:"https://github.com/mattmezstitchlab/POINTZERO/blob/feat/pointzero-manifeste-launch/docs/AUDIT-LANCEMENT-POINTZERO-0.md"},
 {id:"unity",title:"Moteurs réunis : MÉTAMORPHOSE, RIPPLECIRCLE et Game",category:"Prototype",status:"Public",version:"PR #36",date:"2026-10-15",summary:"Évolutions du code en branche de développement, sans annonce de service déjà publié.",url:"https://github.com/mattmezstitchlab/POINTZERO/pull/36"},
 {id:"financing",title:"Prévisionnel financier et besoins de financement",category:"Finance",status:"À compléter",version:"Non établi",date:"",summary:"Aucun chiffre de besoin, levée ou rendement ne peut être communiqué sans pièces et hypothèses validées."},
 {id:"governance",title:"Accords de partenariat et autorisations",category:"Juridique",status:"Privé — non accessible",version:"Non publié",date:"",summary:"Pas de dépôt de documents sensibles, ni de façade d'accès sécurisé simulé."},
 {id:"impact",title:"Mesures d'impact et évaluation",category:"Impact",status:"À compléter",version:"Cadrage",date:"",summary:"Définir indicateurs, méthode, période et ligne de base avant tout résultat chiffré."}
];
export const ROADMAP=[
 {state:"Implémenté (branche)",item:"Accueil AIME, POINTZERO et menu par hiérarchie ; dossiers des 13 Studios."},
 {state:"Implémenté (branche)",item:"Dossier public sourcé, graphiques observés et simulation économique modifiable."},
 {state:"Prototype",item:"Graphe de justification interactif avec niveaux de preuve, sans moteur de causalité scientifique."},
 {state:"À tester",item:"Tests utilisateurs de gains de temps, inclusion et sauvegarde de provenance."},
 {state:"À documenter",item:"Étude de marché complète, métriques de conversion, TAM/SAM/SOM et modèle de revenus validé."},
 {state:"Non réalisé",item:"Salle de données privée avec authentification, audit trail et droits d'accès par organisation."},
 {state:"Non réalisé",item:"Workflow de contribution et décisions avec persistance, propriétaire, alertes et historique."},
 {state:"À valider",item:"Conventions de partenariat, structure juridique, politique RGPD et modèles contractuels."}
];
export function sourceFor(id:string){return SOURCES[id]}
export function validObserved(s:ObservedSeries){return s.dates.length===s.values.length&&s.values.every(x=>Number.isFinite(x)&&x>=0&&x<=100)}
export interface FinanceInputs {clients:number;monthlyFee:number;monthlyGrowthPercent:number;fixedMonthlyCost:number;variableCostPerClient:number}
export const FINANCE_EXAMPLE:FinanceInputs={clients:50,monthlyFee:15,monthlyGrowthPercent:5,fixedMonthlyCost:5000,variableCostPerClient:3};
/** Hypothetical monthly active paying clients and simple cash operating scenario.
 * Revenue excludes taxes and one-offs; no historical company accounts implied.
 */
export function calculateHypothesis(v:FinanceInputs){
 const sane={
  clients:Math.max(0,Math.min(100000,Number.isFinite(v.clients)?v.clients:0)),
  monthlyFee:Math.max(0,Math.min(10000,Number.isFinite(v.monthlyFee)?v.monthlyFee:0)),
  monthlyGrowthPercent:Math.max(-100,Math.min(100,Number.isFinite(v.monthlyGrowthPercent)?v.monthlyGrowthPercent:0)),
  fixedMonthlyCost:Math.max(0,Math.min(1e7,Number.isFinite(v.fixedMonthlyCost)?v.fixedMonthlyCost:0)),
  variableCostPerClient:Math.max(0,Math.min(10000,Number.isFinite(v.variableCostPerClient)?v.variableCostPerClient:0))
 };
 let count=sane.clients;
 return Array.from({length:3},(_,i)=>{
  let revenue=0,cost=0,avgClients=0;
  for(let m=0;m<12;m++){avgClients+=count;revenue+=count*sane.monthlyFee;cost+=sane.fixedMonthlyCost+count*sane.variableCostPerClient;count*=1+sane.monthlyGrowthPercent/100;}
  return {year:i+1,revenue:Math.round(revenue),cost:Math.round(cost),balance:Math.round(revenue-cost),clientsAverage:Math.round(avgClients/12)};
 });
}
