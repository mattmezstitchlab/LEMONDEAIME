import {afterEach,beforeAll,expect,it,vi} from 'vitest';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {makeUniversalDossier,createWeddingDemo,updateUniversalMoment,readDossier} from '../lib/universalDossier';
import {chronology,linkedMiniSite,projectMiniSite,recapHTML,storedProjectionSource} from '../lib/dossierProjections';
import {WORLD_KEY} from '../lib/oneSpaceCore';
import {MINI_KEY,safeMiniSite,miniSiteToHTML} from '../lib/miniSiteCore';
import UniversalDossierStudio from '../components/UniversalDossierStudio';
import MiniSiteStudio from '../components/MiniSiteStudio';
beforeAll(()=>{(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true});
afterEach(()=>{localStorage.clear();vi.restoreAllMocks()});
it('une heure canonique alimente programme, mini-site et document sans magasins concurrents',()=>{
 expect(makeUniversalDossier('Je souhaite organiser notre mariage').kind).toBe('mariage');
 const s=createWeddingDemo(),site=linkedMiniSite(s),id=s.moments[0].id;
 const changed=updateUniversalMoment(s.id,id,'15:30');
 expect(chronology(changed).moments[0].time).toBe('15:30');
 expect(miniSiteToHTML(projectMiniSite(site,changed))).toContain('15:30');expect(recapHTML(changed)).toContain('15:30');
 expect(readDossier(s.id)?.dossier?.history.at(-1)).toMatchObject({entityId:id,before:'15:00',after:'15:30',validation:'confirmé'});
 expect(updateUniversalMoment(s.id,id,'15:30').dossier?.history).toHaveLength(1);
 expect(localStorage.getItem('pointzero:programmes:v1')).toBeNull();expect(localStorage.getItem('pointzero:admin:v1')).toBeNull();
 expect(site.sections.find(x=>x.kind==='programme')?.body).toBe('');
});
it('personnalisations conservées et source absente/étrangère refusée sans réparation',()=>{
 const s=createWeddingDemo(),site=linkedMiniSite(s),changed=updateUniversalMoment(s.id,s.moments[0].id,'16:00');
 const custom={...site,title:'Notre titre personnel',dossierBinding:{...site.dossierBinding!,programmeMode:'custom' as const},sections:site.sections.map(x=>x.kind==='programme'?{...x,body:'Notre programme choisi'}:x)};
 expect(projectMiniSite(custom,changed)).toBe(custom);expect(projectMiniSite(site,changed).title).toBe(site.title);
 expect(()=>projectMiniSite(site,null)).toThrow();expect(()=>projectMiniSite(site,{...changed,id:'other'})).toThrow();
 expect(safeMiniSite({...site,dossierBinding:{...site.dossierBinding,version:2}})).toBeNull();
 expect(safeMiniSite({...site,projectId:'another-source'})).toBeNull();
 expect(safeMiniSite({...site,dossierBinding:null})).toBeNull();
});
it('refuse corruption, horaire invalide et absence de dossier sans toucher les octets',()=>{
 const s=createWeddingDemo(),before=localStorage.getItem(WORLD_KEY);
 expect(()=>updateUniversalMoment(s.id,s.moments[0].id,'25:90')).toThrow();expect(localStorage.getItem(WORLD_KEY)).toBe(before);
 localStorage.setItem(WORLD_KEY,'{broken');expect(()=>createWeddingDemo()).toThrow();expect(()=>storedProjectionSource(s.id)).toThrow();expect(localStorage.getItem(WORLD_KEY)).toBe('{broken');
});
it('DEMO mariage : modification confirmée visible dans le Dossier et le véritable éditeur Mini-site',async()=>{
 const s=createWeddingDemo(),site=linkedMiniSite(s),node=document.createElement('div');document.body.append(node);const root=createRoot(node);
 try{
 await act(async()=>root.render(<><UniversalDossierStudio onBack={vi.fn()} onOpenAcademy={vi.fn()}/><MiniSiteStudio onBack={vi.fn()} incomingDraft={site}/></>));
 const before=JSON.parse(localStorage.getItem(MINI_KEY)!);
 const input=node.querySelector('[aria-label="Horaire Cérémonie"]') as HTMLInputElement;expect(input).toBeTruthy();
 input.value='15:45';
 await act(async()=>input.closest('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 const linkedFrame=node.querySelector('iframe[title="Mini-site lié au programme canonique"]') as HTMLIFrameElement;
 const recapFrame=node.querySelector('iframe[title="Récapitulatif lié au programme canonique"]') as HTMLIFrameElement;
 const editor=node.querySelector('iframe[title="Prévisualisation du mini-site"]') as HTMLIFrameElement;
 for(const frame of [linkedFrame,recapFrame,editor])expect(frame.srcdoc).toContain('15:45');
 expect(JSON.parse(localStorage.getItem(MINI_KEY)!)).toEqual(before);
 expect(readDossier(s.id)?.moments[0].time).toBe('15:45');
 }finally{await act(async()=>root.unmount());node.remove()}
});

it('Budget découvre le dossier canonique et Juridique retrouve son Academy lié sans recopier les données',async()=>{
 const {loadProjectOptions}=await import('../lib/budgetCore');const {sourceProjects}=await import('../lib/legalCore');
 const {makeAcademyProject}=await import('../lib/academyCore');const {academyDossierKey}=await import('../lib/universalDossier');
 const damaged=createWeddingDemo();localStorage.setItem(academyDossierKey(damaged.id),'{broken');
 const s=createWeddingDemo(),p={...makeAcademyProject(),dossierBinding:{spaceId:s.id,titleMode:'linked' as const}};
 localStorage.setItem(academyDossierKey(s.id),JSON.stringify(p));const before=localStorage.getItem(WORLD_KEY);
 expect(loadProjectOptions()).toContainEqual({id:s.id,name:s.title});
 expect(sourceProjects()).toContainEqual(expect.objectContaining({id:p.id,title:s.title,kind:'academy'}));
 expect(localStorage.getItem(WORLD_KEY)).toBe(before);
});
