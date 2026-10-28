import {safeDesign,designToSVG} from './designStudio';
import type {Fragment,FragmentCollection} from './fragmentGrid';
/** One implemented adapter, not a second resource store. Only the existing Design current slot. */
export interface DesignFragmentSource {version:1;kind:'design';resourceId:string;titleMode:'linked'|'custom';allowExport:boolean}
export function validDesignSource(raw:unknown):raw is DesignFragmentSource {
 if(!raw||typeof raw!=='object')return false;
 const r=raw as DesignFragmentSource;
 return r.version===1&&r.kind==='design'&&typeof r.resourceId==='string'&&r.resourceId.length>0&&r.resourceId.length<=120&&['linked','custom'].includes(r.titleMode)&&typeof r.allowExport==='boolean';
}
export function readDesignResource(id?:string){
 const raw=localStorage.getItem('pointzero:design-current:v1');if(raw===null)return null;
 const doc=safeDesign(JSON.parse(raw));if(!doc)throw Error('Création Design invalide ; original conservé');
 if(id&&doc.id!==id)return null;
 return doc;
}
export function referenceCurrentDesign():Fragment {
 const d=readDesignResource();if(!d)throw Error('Aucune création Design courante');
 return {id:'design-ref-'+d.id,title:d.name,description:'Ressource Design liée sur cet appareil ; non exportable par défaut.',sourceUrl:'',image:'',kind:'Design',span:2,locked:false,crop:{x:50,y:50,zoom:100},notes:'',source:{version:1,kind:'design',resourceId:d.id,titleMode:'linked',allowExport:false}};
}
export function resolveDesignFragment(fragment:Fragment,context:'private'|'export'):Fragment {
 if(!fragment.source)return fragment;
 if(!validDesignSource(fragment.source))throw Error('Référence inconnue');
 if(context==='export'&&!fragment.source.allowExport)throw Error('Export refusé : une ressource liée privée exige une autorisation explicite');
 const doc=readDesignResource(fragment.source.resourceId);if(!doc)throw Error('Création source introuvable ; aucune copie de remplacement');
 return {...fragment,title:fragment.source.titleMode==='linked'?doc.name:fragment.title,image:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(designToSVG(doc))};
}
export function resolveCollection(collection:FragmentCollection,context:'private'|'export'):FragmentCollection {
 return {...collection,fragments:collection.fragments.map(f=>resolveDesignFragment(f,context))};
}
