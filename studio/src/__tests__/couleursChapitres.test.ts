import { describe,it,expect } from 'vitest';
import { FLOSS } from '../lib/dmc';
import { couleurChapitre,FILS_CHAPITRES } from '../components/couleursChapitres';
describe('fonds DMC des chapitres',()=>{
 it('emploie huit références existantes, sans altérer leurs couleurs, avec texte AA',()=>{
  expect(new Set(FILS_CHAPITRES).size).toBe(8);
  for(let i=0;i<8;i++){
   const f=couleurChapitre(i);
   expect(f.hex).toBe(FLOSS.find(x=>x.code===f.code)?.hex);
   expect(f.contraste).toBeGreaterThanOrEqual(4.5);
  }
 });
});
