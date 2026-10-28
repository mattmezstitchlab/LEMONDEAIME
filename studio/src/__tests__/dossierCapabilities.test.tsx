import {afterEach,expect,it,vi} from 'vitest';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {WORLD_KEY} from '../lib/oneSpaceCore';
import {createUniversalDossier,updateUniversalField,attachAcademyResource,academyDossierKey} from '../lib/universalDossier';
import {inspectStoredDossierCapability,inspectDossierCapability,proposeDossierNeed} from '../lib/dossierCapabilities';
import {executeCapability} from '../lib/capabilityRegistry';
import {makeAcademyProject,academyDisplayProject} from '../lib/academyCore';
import DossierCapabilityPanel from '../components/DossierCapabilityPanel';
afterEach(()=>{localStorage.clear();vi.restoreAllMocks()});
const intent='Je souhaite transmettre le saxophone à dix débutants';
it('lit le dossier canonique sans écriture et vérifie Formation',()=>{
 const s=createUniversalDossier(intent),before=localStorage.getItem(WORLD_KEY),write=vi.spyOn(Storage.prototype,'setItem');
 expect(inspectStoredDossierCapability(s.id,'formation',true).diagnostic.status).toBe('immédiat');
 expect(inspectDossierCapability(s,'academy',false).diagnostic.status).toBe('à-vérifier');
 expect(inspectDossierCapability(s,'',true).diagnostic.status).toBe('à-vérifier');
 expect(write).not.toHaveBeenCalled();expect(localStorage.getItem(WORLD_KEY)).toBe(before);
});
it('préserve les octets corrompus et refuse dossiers absents ou futurs',()=>{
 for(const raw of ['{bad',JSON.stringify({version:99,spaces:[]})]){
  localStorage.setItem(WORLD_KEY,raw);
  expect(()=>inspectStoredDossierCapability('absent','academy',true)).toThrow();
  expect(localStorage.getItem(WORLD_KEY)).toBe(raw);
 }
 localStorage.removeItem(WORLD_KEY);expect(()=>inspectStoredDossierCapability('absent','academy',true)).toThrow();
});
it('ne répare pas une référence Academy cassée et refuse les actions inconnues',()=>{
 const s=createUniversalDossier(intent);attachAcademyResource(s.id,'original');
 localStorage.setItem(academyDossierKey(s.id),'corrompu');
 const before=localStorage.getItem(WORLD_KEY),write=vi.spyOn(Storage.prototype,'setItem');
 expect(inspectStoredDossierCapability(s.id,'academy',true).academyHealth).toBe('invalid');
 expect(()=>executeCapability('academy.publish',s)).toThrow();
 expect(()=>attachAcademyResource(s.id,'replacement')).toThrow();
 expect(write).not.toHaveBeenCalled();expect(localStorage.getItem(WORLD_KEY)).toBe(before);
});
it('respecte objectifs vides et personnalisation Academy consolidés',()=>{
 const s=createUniversalDossier(intent),p={...makeAcademyProject(),dossierBinding:{spaceId:s.id,titleMode:'linked' as const,objectivesMode:'linked' as const}};
 const empty=updateUniversalField(s.id,'dossier.objectives','');
 expect(academyDisplayProject(p,empty).sections.find(x=>x.kind==='intro')?.body).toContain('Aucun objectif');
 const custom={...p,dossierBinding:{...p.dossierBinding,objectivesMode:'custom' as const}};
 expect(academyDisplayProject(custom,empty).sections).toEqual(custom.sections);
});
it('propose un besoin lié sans modifier le noyau ou son historique',()=>{
 const s=createUniversalDossier(intent),before=localStorage.getItem(WORLD_KEY);
 const need=proposeDossierNeed(s,'publication-distante','need-demo','2026-10-15T23:00:00Z');
 expect(need.dossierId).toBe(s.id);expect(need.status).toBe('proposé');expect(need.history).toHaveLength(1);
 expect(localStorage.getItem(WORLD_KEY)).toBe(before);
 expect(()=>proposeDossierNeed(s,'academy','bad','2026-10-15T23:00:00Z')).toThrow();
});
it('affiche le diagnostic et la proposition sans sauvegarde implicite',async()=>{
 (globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
 const s=createUniversalDossier(intent),before=localStorage.getItem(WORLD_KEY),write=vi.spyOn(Storage.prototype,'setItem');
 const node=document.createElement('div');document.body.append(node);const root=createRoot(node);
 try{
 await act(async()=>root.render(<DossierCapabilityPanel dossierId={s.id}/>));
 const select=node.querySelector('select')!;
 await act(async()=>{select.value='other';select.dispatchEvent(new Event('change',{bubbles:true}))});
 const input=node.querySelector('input')!;
 await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'publication-distante');input.dispatchEvent(new Event('input',{bubbles:true}));});
 await act(async()=>node.querySelector('button')!.click());
 expect(node.textContent).toContain('Réalisable après développement');
 await act(async()=>[...node.querySelectorAll('button')].find(b=>b.textContent?.includes('Préparer une proposition'))!.click());
 expect(node.querySelector('textarea')!.value).toContain(s.id);
 expect(write).not.toHaveBeenCalled();expect(localStorage.getItem(WORLD_KEY)).toBe(before);
 }finally{await act(async()=>root.unmount());node.remove()}
});
