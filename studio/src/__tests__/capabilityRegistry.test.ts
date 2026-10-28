import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {afterEach,describe,expect,it} from 'vitest';
import {ADAPTERS,CAPABILITIES,diagnose,executeCapability,isDossier,type DiagnosticRequest} from '../lib/capabilityRegistry';
import {decideNeed,exportNeeds,proposeNeed,similarNeeds} from '../lib/developmentNeeds';
import {createUniversalDossier,readDossier} from '../lib/universalDossier';
import {WORLD_KEY} from '../lib/oneSpaceCore';
import {validProject} from '../lib/academyCore';
const intent='Je souhaite transmettre le saxophone à dix débutants';
const request:DiagnosticRequest={intent,dossierId:'canonical-demo',available:['intention'],target:'dossier-json',confirmed:true};
afterEach(()=>localStorage.clear());
describe('Registre technique local',()=>{
 it('intent.structure',()=>{
  const result=executeCapability('intent.structure',intent) as {training:{participants:number};method:string};
  expect(result.training.participants).toBe(10);expect(result.method).toBe('heuristique locale');
 });
 it('dossier.prepare',()=>{
  const s=executeCapability('dossier.prepare',intent);expect(isDossier(s)).toBe(true);
  expect(localStorage.getItem(WORLD_KEY)).toBeNull();
 });
 it('formation.project',()=>{
  const s=executeCapability('dossier.prepare',intent);
  expect(executeCapability('formation.project',s)).toMatchObject({dossierId:(s as {id:string}).id,participants:10});
  expect(()=>executeCapability('formation.project',executeCapability('dossier.prepare','Je veux créer une peinture'))).toThrow();
 });
 it('academy.prepare',()=>{
  const s=createUniversalDossier(intent),before=localStorage.getItem(WORLD_KEY);
  const a=executeCapability('academy.prepare',s);
  expect(validProject(a)).toBeTruthy();expect(a).toMatchObject({siteTitle:s.title,dossierBinding:{spaceId:s.id}});
  expect(localStorage.getItem(WORLD_KEY)).toBe(before);expect(readDossier(s.id)?.dossier?.references).toEqual([]);
 });
 it('dossier.export',()=>{
  const s=createUniversalDossier(intent),raw=executeCapability('dossier.export',s) as string;
  expect(JSON.parse(raw)).toMatchObject({kind:'aime:universal-dossier',space:{id:s.id}});
  expect(JSON.parse(raw).academy).toBeUndefined();
 });
 it('refuse entrées invalides, faux dossiers et capacités inconnues',()=>{
  for(const c of CAPABILITIES){expect(()=>executeCapability(c.id,null)).toThrow();expect(ADAPTERS[c.adapterId].validates(null)).toBe(false);}
  expect(()=>executeCapability('dossier.prepare','court')).toThrow();
  expect(()=>executeCapability('inventée',intent)).toThrow();
  expect(isDossier({id:'x'})).toBe(false);
 });
 it('exige des contrats, adaptateurs et preuves pour chaque capacité',()=>{
  expect(new Set(CAPABILITIES.map(c=>c.id)).size).toBe(8);
  for(const c of CAPABILITIES){expect(ADAPTERS[c.adapterId]).toBeTruthy();expect(c.evidence[0].sourceCommit??c.evidence[0].sourceBlob).toMatch(/^[a-f0-9]{40}$/);expect(c.limits.length).toBeGreaterThan(0);}
 });
 it('distingue les cinq diagnostics et ne confond pas annoncé et disponible',()=>{
  expect(diagnose({...request,target:'dossier'}).status).toBe('immédiat');
  expect(diagnose(request).status).toBe('composition');
  expect(diagnose({...request,target:'publication-distante'}).status).toBe('développement');
  expect(diagnose({...request,confirmed:false}).status).toBe('à-vérifier');
  expect(diagnose({...request,target:'formation',available:['dossier']}).status).toBe('à-vérifier');
  expect(diagnose({...request,blockedReason:'Absence de droit de publication'}).status).toBe('non-réalisable');
  expect(diagnose({...request,target:'academy'},CAPABILITIES.map(c=>({...c,state:'proposed'}))).status).toBe('à-vérifier');
 });
 it('compose puis exécute réellement intention → dossier → JSON',()=>{
  const diagnostic=diagnose(request);let value:unknown=intent;
  for(const id of diagnostic.path)value=executeCapability(id,value);
  expect(JSON.parse(value as string).space.dossier.intent).toBe(intent);
 });
 it('DEMO: besoin traçable → décision humaine → capacité validée réutilisée',()=>{
  // Simulate a catalog before Academy validation; never self-promote based on a landing.
  const dossier=createUniversalDossier(intent),snapshot=localStorage.getItem(WORLD_KEY);
  const r:DiagnosticRequest={...request,dossierId:dossier.id,available:['dossier'],target:'academy',verifiedPrerequisites:['Dossier avec métadonnées validées']};
  const before=diagnose(r,CAPABILITIES.filter(c=>c.id!=='academy.prepare'));
  const proposed=proposeNeed(r,before,'need-001','2026-10-15T23:00:00Z');
  expect(proposed.status).toBe('proposé');expect(proposed.dossierId).toBe(r.dossierId);
  expect(similarNeeds([proposed],'Académy')).toHaveLength(1);
  expect(similarNeeds([proposed],'paiement sécurisé')).toHaveLength(0);
  const accepted=decideNeed(proposed,'accepté','responsable','Valider le contrat Academy existant','2026-10-15T23:01:00Z');
  // The real adapter is tested above and explicitly included in the validated catalog.
  const after=diagnose(r);expect(after.status).toBe('immédiat');
  let value:unknown=dossier;for(const id of after.path)value=executeCapability(id,value);
  expect(validProject(value)).toBeTruthy();
  const satisfied=decideNeed(accepted,'satisfait','responsable','Test du parcours Academy réussi','2026-10-15T23:02:00Z');
  console.info('AIME DEMO',JSON.stringify({dossierId:r.dossierId,before:before.status,needId:proposed.id,similar:similarNeeds([proposed],'Academy').map(n=>n.id),after:after.status,adapter:after.path,needStatus:satisfied.status,decisions:satisfied.history},null,2));
  expect(satisfied.history).toHaveLength(3);expect(proposed.history).toHaveLength(1);
  expect(JSON.parse(exportNeeds([satisfied])).needs[0].dossierId).toBe(r.dossierId);
  expect(()=>decideNeed(proposed,'satisfait','responsable','Sans acceptation','2026-10-15T23:02:00Z')).toThrow();
  expect(localStorage.getItem(WORLD_KEY)).toBe(snapshot);
 });
});

it('projections',()=>{
 const s=createUniversalDossier(intent);
 expect(executeCapability('chronology.project',s)).toMatchObject({dossierId:s.id});
 expect(executeCapability('mini-site.project',s)).toMatchObject({projectId:s.id,dossierBinding:{spaceId:s.id}});
 expect(executeCapability('document.project',s)).toContain(s.title);
 const proof=CAPABILITIES.find(c=>c.id==='mini-site.project')!.evidence[0];
 const bytes=readFileSync(proof.sourceFile!);expect(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')).toBe(proof.sourceBlob);
});
