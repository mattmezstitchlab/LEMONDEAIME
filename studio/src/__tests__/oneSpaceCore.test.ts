import {afterEach,describe,expect,it} from "vitest";
import {
 emptyWorld,newSpace,newPerson,newMoment,newSignal,readWorld,writeWorld,
 safeWorld,selectedWorld,downstreamMoments,previewImpact,validateSignal,journeySteps,linkedModuleInfo
} from "../lib/oneSpaceCore";
import {ACADEMY_KEY,makeAcademyProject} from "../lib/academyCore";
import {PROGRAMME_STORAGE,makeProgramme} from "../lib/programmeCore";
import {MUSIC_LABEL_KEY,makeMusicLabel,newMusicEvent} from "../lib/musicLabelCore";
afterEach(()=>{localStorage.clear();});
const demo=()=>{
 const s=newSpace("mariage","Mariage · Démonstration");
 const host=newPerson("Organisateur","organisateur");
 const invited=newPerson("Invité","famille");
 const absent=newPerson("Prestataire","prestataire");
 s.people=[host,invited,absent];
 const ceremony=newMoment("Cérémonie","15:00"),cocktail=newMoment("Cocktail","16:00");
 ceremony.personIds=[host.id,invited.id];
 cocktail.personIds=[invited.id,absent.id];cocktail.followsMomentIds=[ceremony.id];
 s.moments=[ceremony,cocktail];
 return {s,host,invited,absent,ceremony,cocktail};
};
describe("POINTZERO noyau commun — objets reliés",()=>{
 it("crée des espaces privés pour mariage, famille, association et autres sans écraser les sources",()=>{
  const spaces=["mariage","famille","association","professionnel","personnel"] as const;
  const w=emptyWorld();w.spaces=spaces.map(s=>newSpace(s,s));w.selectedSpaceId=w.spaces[0].id;
  expect(safeWorld(w)).not.toBeNull();
  writeWorld(w);
  expect(readWorld()).toEqual(w);
  expect(selectedWorld(readWorld())?.kind).toBe("mariage");
  expect(w.spaces[0].tiles.map(t=>t.kind)).toContain("causal");
 });
 it("refuse les identifiants non résolus, les doubles inscriptions et les références incohérentes",()=>{
  const {s,ceremony,cocktail}=demo();
  const w={version:1 as const,spaces:[s],selectedSpaceId:s.id};
  expect(safeWorld(w)).not.toBeNull();
  expect(safeWorld({...w,selectedSpaceId:"autre"})).toBeNull();
  expect(safeWorld({...w,spaces:[s,s]})).toBeNull();
  expect(safeWorld({...w,spaces:[{...s,moments:[{...ceremony,personIds:["absent"]},cocktail]}]})).toBeNull();
  expect(safeWorld({...w,spaces:[{...s,moments:[{...ceremony,followsMomentIds:["absent"]},cocktail]}]})).toBeNull();
  expect(safeWorld({...w,spaces:[{...s,people:s.people.map(p=>({...p,subscribedMomentIds:["absent"]}))}]})).toBeNull();
 });
 it("propage uniquement sur les moments dépendants; résiste aux cycles",()=>{
  const {s,ceremony,cocktail}=demo();
  expect(downstreamMoments(s,ceremony.id)).toEqual([ceremony.id,cocktail.id]);
  expect(downstreamMoments(s,cocktail.id)).toEqual([cocktail.id]);
  expect(downstreamMoments(s,"absent")).toEqual([]);
  s.moments[0].followsMomentIds=[cocktail.id];
  expect(downstreamMoments(s,ceremony.id)).toHaveLength(2);
 });
 it("n'identifie des destinataires qu'avec consentement ET abonnement explicites",()=>{
  const {s,host,invited,absent,ceremony,cocktail}=demo();
  const signal=newSignal(ceremony.id,host.id,"retard",20,"Je serai en retard");
  expect(previewImpact(s,signal).recipients).toHaveLength(0);
  invited.notificationsOptIn=true;
  expect(previewImpact(s,signal).recipients).toHaveLength(0);
  invited.subscribedMomentIds=[ceremony.id];
  expect(previewImpact(s,signal).recipients.map(p=>p.id)).toEqual([invited.id]);
  absent.notificationsOptIn=true;absent.subscribedMomentIds=[cocktail.id];
  const impact=previewImpact(s,signal);
  expect(impact.recipients.map(p=>p.id)).toEqual([invited.id,absent.id]);
  expect(impact.direct.map(p=>p.id)).toEqual([invited.id]);
  expect(impact.indirect.map(p=>p.id)).toEqual([absent.id]);
  expect(impact.recipients.some(p=>p.id===host.id)).toBe(false);
  // Turning off consent removes a person from the plan.
  invited.notificationsOptIn=false;invited.subscribedMomentIds=[];
  expect(previewImpact(s,signal).recipients.map(p=>p.id)).toEqual([absent.id]);
 });
 it("valide un plan local figé, sans délivrer de message ni modifier les horaires",()=>{
  const {s,host,invited,ceremony}=demo();
  invited.notificationsOptIn=true;invited.subscribedMomentIds=[ceremony.id];
  const signal=newSignal(ceremony.id,host.id,"retard",30,"Trajet ralenti");
  s.signals=[signal];
  const updated=validateSignal(s,signal.id);
  expect(updated.signals[0]).toMatchObject({status:"validé",plannedRecipientIds:[invited.id]});
  expect(updated.moments).toEqual(s.moments);
  expect(updated.people).toEqual(s.people);
  expect(s.signals[0].status).toBe("brouillon");
  expect(validateSignal(updated,signal.id)).toEqual(updated);
  const academy=makeAcademyProject();
  localStorage.setItem(ACADEMY_KEY,JSON.stringify(academy));
  updated.tiles.find(t=>t.kind==="academy")!.refId=academy.id;
  const steps=journeySteps(updated);
  expect(steps.filter(v=>v.passed).length).toBe(steps.length);
 });
 it("affiche les sources vivantes selon les IDs au lieu de répliquer des documents",()=>{
  const {s}=demo();
  const academy=makeAcademyProject(),programme=makeProgramme("Formation Jour J");
  const music=makeMusicLabel(),event=newMusicEvent("Cocktail du mariage");
  music.events=[event];
  localStorage.setItem(ACADEMY_KEY,JSON.stringify(academy));
  localStorage.setItem(PROGRAMME_STORAGE,JSON.stringify({version:1,programmes:[programme]}));
  localStorage.setItem(MUSIC_LABEL_KEY,JSON.stringify(music));
  const tile=(kind:"academy"|"programme"|"musique",refId="")=>({...s.tiles[0],kind,refId});
  expect(linkedModuleInfo(tile("academy"))).toBeNull();
  expect(linkedModuleInfo(tile("academy",academy.id))?.id).toBe(academy.id);
  expect(linkedModuleInfo(tile("programme",programme.id))?.label).toBe(programme.title);
  expect(linkedModuleInfo(tile("musique",event.id))?.id).toBe(event.id);
  expect(linkedModuleInfo(tile("musique","missing"))).toBeNull();
 });
});
