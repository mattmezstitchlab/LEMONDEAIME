import {afterEach,expect,it,vi} from 'vitest';
import {inspectStorage,writeStoredJSON} from '../lib/storageSafety';
import {blankPattern,saveStored} from '../lib/store';
import {defaultBrodeuseProfile,saveBrodeuseProfile} from '../lib/brodeuseProfile';
const valid=(v:unknown)=>!!v&&typeof v==='object'&&(v as {version?:unknown}).version===1&&Array.isArray((v as {items?:unknown}).items);
afterEach(()=>{localStorage.clear();vi.restoreAllMocks()});
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
it('préserve profil et inventaire avant la première écriture multi-clés',()=>{
 localStorage.setItem('point-zero:inventory','{broken');expect(()=>saveBrodeuseProfile(defaultBrodeuseProfile())).toThrow();
 expect(localStorage.getItem('pointzero:brodeuse:profile-v1')).toBeNull();expect(localStorage.getItem('point-zero:inventory')).toBe('{broken');
});
it('le patron courant ne remplace pas une valeur illisible',()=>{
 // Locate the existing key from a successful save, then simulate corrupt storage.
 expect(saveStored(blankPattern())).toBe(true);const key=localStorage.key(0)!;localStorage.setItem(key,'{broken');
 expect(saveStored(blankPattern())).toBe(false);expect(localStorage.getItem(key)).toBe('{broken');
});
