/** AIME — versioned public editorial registry.
 * Facts about builds are constrained to known POINTZERO source modules.
 * "Concept" and "Projection" are NOT release/availability claims.
 */
import {DEFAULT_LAUNCH, type LaunchStudio} from "./launchManifest";
export const AIME_EDITORIAL_VERSION="2026-10-15.1";
export const AIME_SIGNATURES=[
 "Architecture Intelligente de la Mémoire Ensemble",
 "Architecture Intelligente des Mondes Émergents",
 "Architecture Intelligente des Mémoires Évolutives",
 "Architecture Intelligente des Mouvements Ensemble"
] as const;
export type AimePage="aime-home"|"manifest"|"design"|"aime-landing"|"universe-index"|"universe-detail"|"studio-detail"|"vision";
export interface AimeUniverse {
 slug:string;name:string;intention:string;description:string;connections:string[];
 state:"Concept documenté"|"En expérimentation";route?:string;
}
export const UNIVERSES:AimeUniverse[]=[
 {slug:"creation",name:"Création",intention:"Donner forme à une idée sans perdre son origine.",description:"Images, dessins, grilles, motifs et objets deviennent des matières que d'autres ateliers pourront comprendre.",connections:["creatif","metamorphose","game"],state:"En expérimentation"},
 {slug:"arts",name:"Arts et culture",intention:"Relier les expressions et les personnes.",description:"Musique, gestes, créations visuelles et récits sont envisagés comme des langages complémentaires.",connections:["creatif","transmission"],state:"En expérimentation"},
 {slug:"transmission",name:"Transmission",intention:"Conserver ce qui peut servir à une autre génération.",description:"Documenter les œuvres, les connaissances, les parcours et les méthodes avec leurs autorisations.",connections:["transmission","formation"],state:"En expérimentation"},
 {slug:"evenements",name:"Événements",intention:"Rendre chaque moment plus simple à vivre et à organiser.",description:"Personnes, programmes, horaires et ressources rejoignent une chronologie partagée.",connections:["evenementiel","chronologique","causalite"],state:"En expérimentation"},
 {slug:"mariage",name:"Mariage",intention:"Mettre en relation tous les acteurs autour d'un seul événement.",description:"La préparation, les moments du jour J et les souvenirs peuvent utiliser le même dossier.",connections:["evenementiel","chronologique","web"],state:"Concept documenté"},
 {slug:"inclusion",name:"Inclusion",intention:"Ne pas imposer une seule façon de participer.",description:"Explorer les gestes, la musique, la voix, les contrastes et les modes de lecture accessibles.",connections:["formation","creatif"],state:"Concept documenté"},
 {slug:"generations",name:"Générations",intention:"Faire circuler les savoirs dans les deux sens.",description:"Les expériences individuelles deviennent des ressources pour apprendre, se souvenir et transmettre.",connections:["transmission","identite"],state:"Concept documenté"},
 {slug:"ressources",name:"Ressources",intention:"Rendre visible ce qui existe avant de recréer.",description:"Documents, outils, disponibilités et ressources communes dans un parcours plus lisible.",connections:["organisation","administratif"],state:"Concept documenté"},
 {slug:"accompagnement",name:"Accompagnement",intention:"Comprendre une situation avant de proposer une action.",description:"Un parcours progressif entre information, dossier, interlocuteurs, aide et suivi.",connections:["administratif","formation","causalite"],state:"Concept documenté"}
];
export interface StudioStory {
 id:string;intention:string;probleme:string;mecanisme:string;experience:string;
 connections:string[];proof:string;future:string;technicalSource:string;conceptStatus:string;
}
export const STUDIO_STORIES:StudioStory[]=[
 {id:"identite",intention:"Une identité renseignée une fois, utilisable dans plusieurs contextes.",probleme:"Les mêmes informations sont ressaisies d'un outil à l'autre.",mecanisme:"Une carte commune et des rôles contextuels, sous autorisation.",experience:"Décrire sa présence, ses compétences et ses besoins, puis choisir un Univers.",connections:["organisation","evenementiel","web"],proof:"Prototype d'espace local et de personnes dans POINTZERO.",future:"Identité inter-studios avec droits serveur vérifiables.",technicalSource:"src/lib/oneSpaceCore.ts",conceptStatus:"Prototype"},
 {id:"administratif",intention:"Réunir pièces et démarches dans un dossier intelligible.",probleme:"Documents, versions et justificatifs sont dispersés.",mecanisme:"Des ressources typées et réutilisées selon l'action.",experience:"Préparer un dossier, un devis ou une pièce à transmettre.",connections:["identite","organisation"],proof:"Studio administratif et moteur documentaire présents dans POINTZERO.",future:"Validation juridique et flux de facturation réels.",technicalSource:"src/components/AdminStudio.tsx",conceptStatus:"Prototype"},
 {id:"web",intention:"Transformer un dossier en présentation cohérente.",probleme:"Créer un site impose souvent une nouvelle saisie.",mecanisme:"Composition à partir de champs et médias déjà organisés.",experience:"Esquisser un mini-site et l'exporter.",connections:["metamorphose","identite"],proof:"Studio mini-site dans le dépôt POINTZERO.",future:"Éditeur et publication collaborative à valider.",technicalSource:"src/components/MiniSiteStudio.tsx",conceptStatus:"Prototype"},
 {id:"chronologique",intention:"Donner une place aux actions dans le temps.",probleme:"Un horaire isolé ne décrit pas ses dépendances.",mecanisme:"Moments, personnes et enchaînements liés.",experience:"Composer un programme, puis en examiner les conséquences.",connections:["causalite","evenementiel","ripplecircle"],proof:"Studio Programme et modèle de moments locaux.",future:"Synchronisation et historique multi-utilisateurs.",technicalSource:"src/lib/oneSpaceCore.ts",conceptStatus:"Prototype"},
 {id:"creatif",intention:"Composer une matière transformable.",probleme:"Les formats enferment les idées dans un seul outil.",mecanisme:"Une grille, des calques, des formes et des exports.",experience:"Créer un motif, une composition, un patron de broderie.",connections:["metamorphose","game","transmission"],proof:"Studio Design et moteur broderie POINTZERO existants.",future:"Matières interopérables et transformations enrichies.",technicalSource:"src/components/DesignStudio.tsx",conceptStatus:"Atelier existant"},
 {id:"evenementiel",intention:"Réunir les participants autour de moments communs.",probleme:"Chaque personne possède une version différente du programme.",mecanisme:"Un espace regroupe personnes, ressources et chronologie.",experience:"Préparer le déroulement d'un événement.",connections:["chronologique","identite"],proof:"Studios Programme et Mon Espace existants.",future:"RSVP et prestataires synchronisés sous consentement.",technicalSource:"src/components/OneSpaceStudio.tsx",conceptStatus:"Prototype"},
 {id:"transmission",intention:"Faire traverser le temps aux créations.",probleme:"Les œuvres et les savoir-faire restent difficiles à retrouver.",mecanisme:"Des œuvres documentées et des autorisations de diffusion.",experience:"Créer, archiver et consulter une galerie privée.",connections:["creation","formation"],proof:"Atelier libre et galerie locale LE MONDE AIME existants.",future:"Publication autorisée et transmission intergénérationnelle.",technicalSource:"src/components/ArtWorldStudio.tsx",conceptStatus:"Prototype"},
 {id:"organisation",intention:"Voir une organisation comme des relations utiles.",probleme:"Les responsabilités et ressources restent cloisonnées.",mecanisme:"Relier personnes, missions et dossiers dans un espace.",experience:"Visualiser un projet et ses acteurs.",connections:["identite","administratif","causalite"],proof:"Modèle d'espaces et de personnes dans POINTZERO.",future:"Autorisations réelles et collaboration d'équipe.",technicalSource:"src/lib/oneSpaceCore.ts",conceptStatus:"Concept éprouvé localement"},
 {id:"formation",intention:"Apprendre sans refaire ce qui est déjà acquis.",probleme:"Les parcours ignorent souvent l'expérience du participant.",mecanisme:"Étapes, acquis et supports réutilisables.",experience:"Suivre un parcours pédagogique expérimental.",connections:["transmission","identite"],proof:"Studio Academy dans le projet.",future:"Prérequis réutilisables et attestations selon cadres applicables.",technicalSource:"src/components/AcademyStudio.tsx",conceptStatus:"Prototype"},
 {id:"causalite",intention:"Voir ce qu'une décision pourrait changer.",probleme:"Les conséquences d'un changement sont souvent invisibles.",mecanisme:"Faits, hypothèses, liens et prévisions distingués.",experience:"Simuler et valider localement l'impact d'un retard.",connections:["chronologique","ripplecircle"],proof:"Moteur causal et cadran natif en branche de développement.",future:"Propagation multi-acteurs après autorisation.",technicalSource:"src/lib/oneSpaceCore.ts",conceptStatus:"Expérimentation"},
 {id:"metamorphose",intention:"Transformer une source en nouveaux usages.",probleme:"La connaissance enfermée dans une page est difficile à recomposer.",mecanisme:"Observation → fragments → grille → composition.",experience:"Analyser une structure HTML autorisée et travailler ses fragments.",connections:["web","creatif","game"],proof:"Grille de fragments native, scanner HTML privé en développement.",future:"Capture navigateur et transformations visuelles avancées.",technicalSource:"src/components/MetamorphoseStudio.tsx",conceptStatus:"Expérimentation"},
 {id:"ripplecircle",intention:"Rendre visibles les relations au fil du temps.",probleme:"Un ensemble de moments ne montre pas les ondes qu'il produit.",mecanisme:"Cadran, personnes, liens et propagation causale simulée.",experience:"Observer comment un changement se répercute.",connections:["chronologique","causalite","evenementiel"],proof:"Cadran 2D natif relié au noyau POINTZERO en branche.",future:"Migrer les fonctions complémentaires du dépôt RIPPLECIRCLE.",technicalSource:"src/components/RippleCircleStudio.tsx",conceptStatus:"Expérimentation"},
 {id:"game",intention:"Transformer une grille en geste et en découverte.",probleme:"L'interaction est souvent séparée de la création.",mecanisme:"Même matière, nouvelles règles et rétroactions.",experience:"Nettoyer les confettis pour révéler un motif en 30 secondes.",connections:["creatif","metamorphose"],proof:"Moteur de jeu et pont avec les patrons de broderie en branche.",future:"Défis et expériences accessibles aux différents Univers.",technicalSource:"src/lib/confettiGame.ts",conceptStatus:"Expérimentation"}
];
export const STORY_BY_ID=new Map(STUDIO_STORIES.map(s=>[s.id,s]));
export const UNIVERSE_BY_SLUG=new Map(UNIVERSES.map(u=>[u.slug,u]));
export function studioById(id:string):LaunchStudio|undefined{return DEFAULT_LAUNCH.studios.find(s=>s.id===id)}
export const MOTORS=[
 {id:"fragments",title:"Fragments",description:"Une source peut être décomposée et recomposée.",studioIds:["metamorphose","web","creatif"]},
 {id:"causal",title:"Causalité",description:"Une modification peut être reliée à des conséquences observées ou prévues.",studioIds:["causalite","ripplecircle","chronologique"]},
 {id:"grille",title:"Grille universelle",description:"Des cellules peuvent servir de motif, de composition ou de jeu.",studioIds:["creatif","metamorphose","game"]},
 {id:"temps",title:"Chronologie",description:"Dates, moments et versions relient les réalisations.",studioIds:["chronologique","evenementiel","transmission"]}
];
export const VISION_MILESTONES=[
 {date:"2026-10-15",status:"Développé",title:"Architecture de présentation mère AIME",source:"Branche de travail POINTZERO — à vérifier par commit après implémentation"},
 {date:"2026-10-15",status:"Prototype",title:"Studios Métamorphose, RippleCircle et Game regroupés en branche",source:"PR #36 — https://github.com/mattmezstitchlab/POINTZERO/pull/36"},
 {date:"2026-10-15",status:"Prototype",title:"Landing « Le temps retrouvé » conçue pour POINTZERO",source:"PR #37 — https://github.com/mattmezstitchlab/POINTZERO/pull/37"}
] as const;
