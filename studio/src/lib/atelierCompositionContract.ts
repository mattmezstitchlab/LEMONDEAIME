/** MÉTAMORPHOSE — contrats réversibles sur FragmentCollection v1.
 * Pas de second Kernel ou magasin. Chaque moteur reste propriétaire de ses données.
 */
import {updateFragment,type Fragment,type FragmentCollection} from "./fragmentGrid";
export type StudioEngine="fragments"|"design"|"pattern"|"mini-site"|"document"|"timeline"|"music";
export type TransformationCoverage="complete"|"partial"|"impossible";
export type IntegrationState="available"|"experimental"|"planned";
export interface AtelierSelection {
 engine:StudioEngine;objectId:string;schemaVersion:number;locked:boolean;
 source?:{engine:StudioEngine;objectId:string;linked:boolean};
}
export interface AtelierAdapterPort<T=unknown> {
 engine:StudioEngine;
 inspect(selection:AtelierSelection):T|null;
 canTransform(selection:AtelierSelection,target:StudioEngine):{
 coverage:TransformationCoverage;kept:readonly string[];lost:readonly string[];reason:string;
 };
}
export interface AtelierCapability {
 id:string;engine:StudioEngine;state:IntegrationState;readOnly:boolean;
 description:string;requiresConfirmation:boolean;
}
export const INTEGRATION_POINTS:readonly AtelierCapability[]=[
 {id:"fragment.compose",engine:"fragments",state:"available",readOnly:false,description:"Composer des fragments JSON v1",requiresConfirmation:true},
 {id:"design.reference-current",engine:"design",state:"available",readOnly:true,description:"Lire une référence au document Design courant",requiresConfirmation:false},
 {id:"fragment.html",engine:"fragments",state:"available",readOnly:true,description:"Projection HTML soumise aux droits d'export",requiresConfirmation:false},
 {id:"pattern.zoom-code",engine:"pattern",state:"experimental",readOnly:false,description:"Prototype broderie 8×8 en mémoire",requiresConfirmation:true},
 {id:"chromatheque.global",engine:"design",state:"planned",readOnly:true,description:"Chromathèque à connecter",requiresConfirmation:true},
 {id:"mosaic.projection",engine:"pattern",state:"planned",readOnly:true,description:"Mosaïque à connecter",requiresConfirmation:true},
 {id:"accessibility.global",engine:"mini-site",state:"planned",readOnly:true,description:"Accessibilité transverse à adapter",requiresConfirmation:true},
 {id:"document.references",engine:"document",state:"planned",readOnly:true,description:"Documents liés par référence",requiresConfirmation:true}
];
export function selectFragment(f:Fragment):AtelierSelection {
 return {engine:"fragments",objectId:f.id,schemaVersion:1,locked:f.locked,
 ...(f.source?{source:{engine:"design" as const,objectId:f.source.resourceId,linked:f.source.titleMode==="linked"}}:{})};
}
export interface FragmentPreview {
 kind:"fragment.span";targetId:string;before:FragmentCollection;after:FragmentCollection;
 previousSpan:number;nextSpan:number;effects:readonly string[];
}
export function previewFragmentSpan(collection:FragmentCollection,id:string,span:Fragment["span"]):FragmentPreview {
 const f=collection.fragments.find(x=>x.id===id);
 if(!f)throw Error("Fragment introuvable");
 if(f.locked)throw Error("Fragment verrouillé");
 if(!Number.isInteger(span)||span<1||span>4)throw Error("Taille de fragment incorrecte");
 const after=updateFragment(collection,id,{span});
 return {kind:"fragment.span",targetId:id,before:collection,after,previousSpan:f.span,nextSpan:span,
  effects:["Composition responsive recalculée, source inchangée","Les fragments suivants peuvent changer de place",
  "Identifiant et droits d’export de la référence Design préservés"]};
}
export interface CompositionSession {
 present:FragmentCollection;past:readonly FragmentCollection[];future:readonly FragmentCollection[];
}
export const beginComposition=(present:FragmentCollection):CompositionSession=>({present,past:[],future:[]});
export function commitComposition(s:CompositionSession,next:FragmentCollection):CompositionSession {
 if(next===s.present||JSON.stringify(next)===JSON.stringify(s.present))return s;
 return {present:next,past:[...s.past.slice(-24),s.present],future:[]};
}
export function confirmFragmentPreview(s:CompositionSession,preview:FragmentPreview):CompositionSession {
 if(preview.before!==s.present)throw Error("Composition modifiée depuis l'aperçu : recommencez");
 return commitComposition(s,preview.after);
}
export function undoComposition(s:CompositionSession):CompositionSession {
 if(!s.past.length)return s;
 return {present:s.past[s.past.length-1],past:s.past.slice(0,-1),future:[s.present,...s.future].slice(0,25)};
}
export function redoComposition(s:CompositionSession):CompositionSession {
 if(!s.future.length)return s;
 return {present:s.future[0],past:[...s.past.slice(-24),s.present],future:s.future.slice(1)};
}
