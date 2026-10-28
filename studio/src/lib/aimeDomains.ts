/** Navigation metadata, not a new capability registry or storage system. */
import {isStudioRoute} from './entryNavigation';
export type DomainTool={label:string;route:string;state:'local'|'experimental';limit:string};
export const AIME_DOMAINS:{id:string;title:string;intent:string;tools:DomainTool[]}[]=[
 {id:'visual',title:'Création visuelle',intent:'Composer une identité ou un visuel',tools:[
 {label:'Design',route:'design',state:'local',limit:'Composition locale et exports ; pas de publication'},
 {label:'Photo',route:'photo',state:'local',limit:'Traitements navigateur'},
 {label:'Broderie',route:'embroidery',state:'local',limit:'Patrons, points et exports'},
 {label:'Design System',route:'accessibility',state:'local',limit:'Fondations et préférences ; migration progressive'},
 {label:'Mode',route:'fashion',state:'experimental',limit:'Concept visuel, pas patronage industriel'},
 {label:'Atelier artistique',route:'art-world',state:'local',limit:'Créations et galerie locales'}]},
 {id:'web',title:'Web et interfaces',intent:'Créer et recomposer un site',tools:[
 {label:'Mini-site',route:'mini-site',state:'local',limit:'HTML exportable ; hébergement non intégré'},
 {label:'Métamorphose',route:'metamorphose',state:'experimental',limit:'Scanner privé à configurer ; HTML statique seulement'},
 {label:'Génération',route:'generation',state:'experimental',limit:'Images via service tiers ; pas génération autonome universelle'},
 {label:'Academy',route:'academy',state:'local',limit:'Support pédagogique local, pas LMS partagé'}]},
 {id:'music',title:'Musique',intent:'Composer et préparer une prestation',tools:[
 {label:'Musique',route:'music',state:'local',limit:'Gestes, audio et MIDI'},
 {label:'Production musicale',route:'music-production',state:'experimental',limit:'Catalogue, playlist et prémaster locaux ; pas distribution ni déclaration des droits'}]},
 {id:'documents',title:'Documents et démarches',intent:'Préparer mes documents',tools:[
 {label:'Administratif',route:'admin',state:'local',limit:'Brouillons à vérifier ; aucune démarche transmise'},
 {label:'PDF',route:'pdf',state:'local',limit:'Montage raster ; signatures et champs non préservés'},
 {label:'Budget',route:'budget',state:'local',limit:'Suivi local, pas comptabilité certifiée'},
 {label:'Juridique',route:'legal',state:'experimental',limit:'Questions et brouillons, pas conseil juridique'}]},
 {id:'projects',title:'Projets et événements',intent:'Organiser un projet collectif',tools:[
 {label:'Mon Espace',route:'one-space',state:'local',limit:'Personnes et relations descriptives ; aucun compte invité'},
 {label:'Programme',route:'programme',state:'local',limit:'Séances locales et exports'},
 {label:'RippleCircle',route:'ripplecircle',state:'experimental',limit:'Cadran local, pas notifications distantes'},
 {label:'Impacts',route:'causal',state:'experimental',limit:'Simulation de dépendances, pas causalité scientifique'},
 {label:'Jeu',route:'game',state:'experimental',limit:'Moteur Canvas local'}]}
];
export function domainToolPath(route:string):string {
 if(!isStudioRoute(route)||!AIME_DOMAINS.some(d=>d.tools.some(t=>t.route===route)))throw Error('Outil non déclaré');
 return '/atelier?studio='+encodeURIComponent(route);
}
export const CONNECTION_TYPES=['file-import','link-preview','search','read','sync','notify','write','automate','publish','export'] as const;
/** Future connector contract only. No token, account or external operation is implemented. */
export interface ConnectionContract {
 version:1;id:string;provider:string;ownerId:string;dossierId:string;
 resourceId:string;sourceUrl:string;capabilities:(typeof CONNECTION_TYPES)[number][];
 permissions:string[];state:'disconnected'|'authorized'|'expired'|'revoked';
 lastSyncAt:string|null;provenance:string;revocable:boolean;
}
