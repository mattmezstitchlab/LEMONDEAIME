/** Narrow interface projection schema; no new builder, kernel or persistence. */
import {type WorldSpace,WORLD_KEY,safeWorld} from './oneSpaceCore';
const isDossier=(s:WorldSpace)=>!!s.dossier&&!!safeWorld({version:1,spaces:[s],selectedSpaceId:s.id});
import {createMiniSite,safeMiniSite,type MiniSite} from './miniSiteCore';
import {createAdminDocument,docToHTML} from './adminCore';
export const DOSSIER_INTERFACE={version:1,blocks:['chronology','mini-site','document'] as const,publication:'disabled' as const};
export function chronology(space:WorldSpace){
 if(!isDossier(space))throw Error('Dossier invalide');
 return {dossierId:space.id,title:space.title,moments:space.moments.map(m=>({id:m.id,title:m.title,time:m.time}))};
}
export function chronologyText(space:WorldSpace):string {
 return chronology(space).moments.map(m=>(m.time||'Horaire à définir')+' · '+m.title).join('\n')||'Programme à définir';
}
export function linkedMiniSite(space:WorldSpace):MiniSite {
 const site=createMiniSite(space.kind==='mariage'?'mariage':'evenement');
 const section=site.sections.find(s=>s.kind==='programme')!;
 return {...site,projectId:space.id,title:space.title,name:space.title,
 dossierBinding:{version:1,spaceId:space.id,programmeSectionId:section.id,programmeMode:'linked'},
 sections:site.sections.map(s=>s.id===section.id?{...s,body:''}:s)};
}
/** Display-time read-through. Never writes canonical moments or the saved site. */
export function projectMiniSite(site:MiniSite,space:WorldSpace|null):MiniSite {
 if(!safeMiniSite(site))throw Error('Mini-site invalide');
 const b=site.dossierBinding;if(!b||b.programmeMode==='custom')return site;
 if(!space||!isDossier(space)||space.id!==b.spaceId)throw Error('Source du programme introuvable ou incompatible : export lié bloqué');
 return {...site,sections:site.sections.map(s=>s.id===b.programmeSectionId?{...s,body:chronologyText(space)}:s)};
}
export function storedProjectionSource(id:string):WorldSpace|null {
 const raw=localStorage.getItem(WORLD_KEY);if(raw===null)return null;
 const world=safeWorld(JSON.parse(raw));if(!world)throw Error('Source AIME invalide : aucune réparation automatique');
 return world.spaces.find(s=>s.id===id)??null;
}
export function recapHTML(space:WorldSpace):string {
 const doc=createAdminDocument('courrier',space.id);
 return docToHTML({...doc,title:space.title,subject:'Programme — projection du Dossier Universel',body:chronologyText(space),
 reference:'AIME-'+space.id.slice(0,8),footer:'Brouillon local à vérifier. Export statique : ne se met pas à jour après téléchargement. Aucun partage ni publication.'});
}
