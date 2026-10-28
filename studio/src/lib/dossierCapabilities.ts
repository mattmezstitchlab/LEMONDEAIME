/** Read-only integration with the consolidated kernel. No persistence or mutable execution. */
import {WORLD_KEY,safeWorld,type WorldSpace} from './oneSpaceCore';
import {CAPABILITIES,diagnose,isDossier,type Diagnostic} from './capabilityRegistry';
import {academyReferenceHealth} from './universalDossier';
import {proposeNeed,type DevelopmentNeed} from './developmentNeeds';
export interface DossierCapabilityReport {
 dossierId:string;sourceCommit:string;target:string;diagnostic:Diagnostic;
 academyHealth:ReturnType<typeof academyReferenceHealth>;limits:string[];
}
/** Explicit snapshot input: never substitutes an empty world for damaged storage. */
export function inspectDossierCapability(space:WorldSpace,target:string,confirmed=false):DossierCapabilityReport {
 if(!isDossier(space))throw Error('Dossier canonique invalide');
 const prerequisites=['Dossier avec métadonnées validées'];
 if(space.dossier?.training)prerequisites.push('Métadonnées training requises');
 return {dossierId:space.id,sourceCommit:'c93054fd88a9194ce43d31e8aa595b3d1cf479f6',target,
 diagnostic:diagnose({intent:space.dossier!.intent,dossierId:space.id,available:['dossier'],target,confirmed,verifiedPrerequisites:prerequisites}),
 academyHealth:academyReferenceHealth(space),limits:CAPABILITIES.filter(c=>c.output===target).flatMap(c=>c.limits)};
}
export function inspectStoredDossierCapability(id:string,target:string,confirmed=false):DossierCapabilityReport {
 const raw=localStorage.getItem(WORLD_KEY);if(raw===null)throw Error('Magasin AIME absent');
 let world;try{world=safeWorld(JSON.parse(raw));}catch{throw Error('Magasin AIME illisible ; données conservées');}
 if(!world)throw Error('Magasin AIME incompatible ; données conservées');
 const space=world.spaces.find(s=>s.id===id);if(!space)throw Error('Dossier introuvable');
 return inspectDossierCapability(space,target,confirmed);
}
/** Proposal only: caller must explicitly retain/export it. No kernel history is forged. */
export function proposeDossierNeed(space:WorldSpace,target:string,id:string,at:string):DevelopmentNeed {
 const report=inspectDossierCapability(space,target,true);
 return proposeNeed({intent:space.dossier!.intent,dossierId:space.id,available:['dossier'],target,confirmed:true},report.diagnostic,id,at);
}
