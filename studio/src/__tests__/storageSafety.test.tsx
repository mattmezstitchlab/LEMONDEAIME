import {afterEach,beforeAll,describe,expect,it,vi} from 'vitest';
import {act,type ReactElement} from 'react';
import {createRoot} from 'react-dom/client';
import {inspectStorage,writeStoredJSON} from '../lib/storageSafety';
import {WORLD_KEY,emptyWorld,writeWorld} from '../lib/oneSpaceCore';
import {blankPattern,saveStored} from '../lib/store';
import OneSpaceStudio from '../components/OneSpaceStudio';
import RippleCircleStudio from '../components/RippleCircleStudio';
import MiniSiteStudio from '../components/MiniSiteStudio';
import BudgetStudio from '../components/BudgetStudio';
import AdminStudio from '../components/AdminStudio';
import ProgrammeStudio from '../components/ProgrammeStudio';
import FashionStudio from '../components/FashionStudio';
import FragmentGridWorkspace from '../components/FragmentGridWorkspace';
import {defaultBrodeuseProfile,saveBrodeuseProfile} from '../lib/brodeuseProfile';
import {writeMiniCoach,blankMiniCoach} from '../lib/miniSiteLearning';
const valid=(v:unknown)=>!!v&&typeof v==='object'&&(v as {version?:unknown}).version===1&&Array.isArray((v as {items?:unknown}).items);
afterEach(()=>{localStorage.clear();vi.restoreAllMocks()});
beforeAll(()=>{(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true});
it('distingue absent, corrompu, incompatible, invalide, valide et inaccessible',()=>{
 expect(inspectStorage('x',valid).status).toBe('absent');
 for(const [raw,status] of [['{','corrupt'],['{"version":2}','incompatible'],['null','invalid'],['{"version":1,"items":[]}','valid']]){
  localStorage.setItem('x',raw);expect(inspectStorage('x',valid).status).toBe(status);
 }
 vi.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw Error('denied')});
 expect(inspectStorage('x',valid).status).toBe('unavailable');
});
it('bloque sans toucher les octets, refuse la sortie invalide et propage le quota',()=>{
 for(const raw of ['{','null','{"version":99}']){
  localStorage.setItem('x',raw);expect(()=>writeStoredJSON('x','{"version":1,"items":[]}',valid)).toThrow();expect(localStorage.getItem('x')).toBe(raw);
 }
 localStorage.clear();expect(()=>writeStoredJSON('x','null',valid)).toThrow();
 vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new DOMException('full','QuotaExceededError')});
 expect(()=>writeStoredJSON('x','{"version":1,"items":[]}',valid)).toThrow();
});
it('ferme tous les écrivains du WorldStore, même sans passer par universalDossier',()=>{
 localStorage.setItem(WORLD_KEY,'{broken');expect(()=>writeWorld(emptyWorld())).toThrow();expect(localStorage.getItem(WORLD_KEY)).toBe('{broken');
});
it('préserve profil et inventaire avant la première écriture multi-clés',()=>{
 localStorage.setItem('point-zero:inventory','{broken');expect(()=>saveBrodeuseProfile(defaultBrodeuseProfile())).toThrow();
 expect(localStorage.getItem('pointzero:brodeuse:profile-v1')).toBeNull();expect(localStorage.getItem('point-zero:inventory')).toBe('{broken');
});
it('préserve un profil pédagogique incompatible',()=>{
 localStorage.setItem('pointzero:minisite-academy:v1','[]');expect(()=>writeMiniCoach(blankMiniCoach('demo'))).toThrow();
 expect(localStorage.getItem('pointzero:minisite-academy:v1')).toBe('[]');
});
it('le patron courant ne remplace pas une valeur illisible',()=>{
 // Locate the existing key from a successful save, then simulate corrupt storage.
 expect(saveStored(blankPattern())).toBe(true);const key=localStorage.key(0)!;localStorage.setItem(key,'{broken');
 expect(saveStored(blankPattern())).toBe(false);expect(localStorage.getItem(key)).toBe('{broken');
});
const noop=()=>{};
const screens:[string,()=>ReactElement][]=[
 [WORLD_KEY,()=> <OneSpaceStudio onBack={noop} onStudio={noop}/>],
 [WORLD_KEY,()=> <RippleCircleStudio onBack={noop} onMetamorphose={noop} onGame={noop}/>],
 ['pointzero:minisite:v1',()=> <MiniSiteStudio onBack={noop}/>],
 ['pointzero:budget:v1',()=> <BudgetStudio onBack={noop}/>],
 ['pointzero:admin:v1',()=> <AdminStudio onBack={noop}/>],
 ['pointzero:programmes:v1',()=> <ProgrammeStudio onBack={noop}/>],
 ['pointzero:fashion-draft:v1',()=> <FashionStudio onBack={noop}/>],
 ['pointzero:universal-fragments:v1',()=> <FragmentGridWorkspace/>]
];
describe('ouvrir un écran ne détruit pas la source',()=>{
 for(const [index,[key,screen]] of screens.entries())it(`${index}: ${key}`,async()=>{
  for(const raw of ['{broken',JSON.stringify({version:98})]){
   localStorage.setItem(key,raw);const node=document.createElement('div');document.body.append(node);const root=createRoot(node);
   try{await act(async()=>root.render(screen()));expect(localStorage.getItem(key)).toBe(raw)}finally{await act(async()=>root.unmount());node.remove()}
  }
 });
});

it('ne purge pas les autres profils quand la limite est atteinte',()=>{
 const all=Object.fromEntries(Array.from({length:25},(_,i)=>['p'+i,blankMiniCoach('p'+i)]));
 const raw=JSON.stringify(all);localStorage.setItem('pointzero:minisite-academy:v1',raw);
 expect(()=>writeMiniCoach(blankMiniCoach('new'))).toThrow();expect(localStorage.getItem('pointzero:minisite-academy:v1')).toBe(raw);
 writeMiniCoach({...all.p0,audience:'Public corrigé'});expect(Object.keys(JSON.parse(localStorage.getItem('pointzero:minisite-academy:v1')!))).toHaveLength(25);
});
