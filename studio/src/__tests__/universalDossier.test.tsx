import type React from "react";
import {afterEach,beforeAll,describe,expect,it,vi} from "vitest";
import {act} from "react";
import {createRoot,type Root} from "react-dom/client";
import {newPerson,newMoment,newSpace,readWorld,writeWorld,WORLD_KEY,safeWorld} from "../lib/oneSpaceCore";
import {academyDisplayProject,ACADEMY_KEY,makeAcademyProject,validProject,exportAcademyHTML} from "../lib/academyCore";
import {validUniversalMeta} from "../lib/dossierSchema";
import {academyDossierKey,academyReferenceHealth,adoptLegacySpace,attachAcademyResource,createUniversalDossier,exportUniversalJSON,importUniversalJSON,makeUniversalDossier,projectFormation,readDossier,understandIntent,updateUniversalField,writableWorld,addUniversalMoment} from "../lib/universalDossier";
import {entryStudio} from "../lib/entryNavigation";
import UniversalDossierStudio from "../components/UniversalDossierStudio";
import AcademyStudio from "../components/AcademyStudio";

let node:HTMLDivElement|null=null,root:Root|null=null;
beforeAll(()=>{(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;});
afterEach(()=>{act(()=>root?.unmount());root=null;node?.remove();node=null;localStorage.clear();vi.restoreAllMocks();vi.unstubAllGlobals();window.history.replaceState(null,"","/");});
async function mount(component:React.ReactElement){
 node=document.createElement("div");document.body.appendChild(node);root=createRoot(node);
 await act(async()=>root?.render(component));
 return node;
}
describe("Dossier Universel AIME — extension canonique non destructive",()=>{
 it("comprend honnêtement une intention sans prétendre faire appel à l'IA",()=>{
  const understood=understandIntent("Je suis saxophoniste et je souhaite transmettre l'improvisation à dix débutants");
  expect(understood.method).toBe("heuristique locale");
  expect(understood.universe).toBe("formation");
  expect(understood.training?.participants).toBe(10);
  expect(understood.training?.context).toBe("loisirs");
  expect(understood.questions.length).toBeGreaterThan(1);
 });
 it("crée un vrai WorldSpace et réutilise son identité canonique et ses tiles",()=>{
  const space=createUniversalDossier("Je veux transmettre une initiation au saxophone à dix débutants");
  const store=readWorld();
  expect(store.selectedSpaceId).toBe(space.id);
  expect(store.spaces).toHaveLength(1);
  expect(store.spaces[0].id).toBe(space.id);
  expect(store.spaces[0].tiles.some(t=>t.kind==="academy")).toBe(true);
  expect(store.spaces[0].dossier?.version).toBe(1);
  expect(projectFormation(space)?.participants).toBe(10);
  expect(safeWorld(store)).not.toBeNull();
 });
 it("valide strictement la projection et refuse les entrées non conformes",()=>{
  const s=makeUniversalDossier("Je veux enseigner une initiation au saxophone");
  expect(validUniversalMeta(s.dossier)).toBe(true);
  expect(validUniversalMeta({...s.dossier,history:[{id:"a",field:"x"}]})).toBe(false);
  expect(validUniversalMeta({...s.dossier,training:{...s.dossier!.training,context:"certifié"} })).toBe(false);
  expect(safeWorld({version:1,spaces:[{...s,dossier:{...s.dossier,version:2}}],selectedSpaceId:s.id})).toBeNull();
 });
 it("conserve tous les anciens espaces/personnes/moments lors de l'adoption",()=>{
  const old=newSpace("association","Atelier ancien");
  old.people=[newPerson("Personne témoin")];
  old.moments=[newMoment("Accueil","09:00")];
  old.moments[0].personIds=[old.people[0].id];
  writeWorld({version:1,spaces:[old],selectedSpaceId:old.id});
  expect(readWorld().spaces[0].dossier).toBeUndefined();
  const adopted=adoptLegacySpace(old.id);
  expect(adopted.id).toBe(old.id);
  expect(adopted.people).toEqual(old.people);
  expect(adopted.moments).toEqual(old.moments);
  expect(adopted.signals).toEqual(old.signals);
  expect(readWorld().spaces[0].dossier?.version).toBe(1);
 });
 it("propage le titre à la projection Formation et conserve une mémoire avec avant/après",()=>{
  const s=createUniversalDossier("Je souhaite proposer un cours de saxophone pour dix débutants");
  const changed=updateUniversalField(s.id,"title","Improvisation — Niveau 1");
  expect(changed.id).toBe(s.id);
  expect(projectFormation(changed)?.title).toBe("Improvisation — Niveau 1");
  expect(readDossier(s.id)?.title).toBe("Improvisation — Niveau 1");
  const event=changed.dossier?.history.at(-1);
  expect(event).toMatchObject({field:"title",before:s.title,after:"Improvisation — Niveau 1",origin:"utilisateur",validation:"confirmé"});
  const repeat=updateUniversalField(s.id,"title","Improvisation — Niveau 1");
  expect(repeat.dossier?.history).toHaveLength(1);
 });
 it("relie des horaires au noyau moments existant plutôt qu'à un silo Formation",()=>{
  const s=createUniversalDossier("Je souhaite créer un atelier de saxophone");
  const updated=addUniversalMoment(s.id,"Pratique guidée","14:30");
  expect(updated.moments.at(-1)?.title).toBe("Pratique guidée");
  expect(projectFormation(updated)?.moments.at(-1)?.time).toBe("14:30");
  expect(updated.dossier?.history.at(-1)?.field).toBe("moments");
  expect(()=>addUniversalMoment(s.id,"Titre","27:90")).toThrow();
 });
 it("relie Academy par référence sans dupliquer l'objet ou changer les autres espaces",()=>{
  const other=newSpace("mariage","Mariage ancien");
  writeWorld({version:1,spaces:[other],selectedSpaceId:other.id});
  const space=createUniversalDossier("Atelier d'improvisation saxophone pour dix débutants");
  const linked=attachAcademyResource(space.id,"academy-123");
  expect(linked.tiles.find(t=>t.kind==="academy")?.refId).toBe("academy-123");
  expect(linked.dossier?.references.some(r=>r.targetId==="academy-123")).toBe(true);
  expect(readWorld().spaces.find(s=>s.id===other.id)).toEqual(other);
  expect(attachAcademyResource(space.id,"academy-123").dossier?.history.length).toBe(1);
 });
 it("Academy suit le titre canonique et respecte le choix de personnalisation",()=>{
  const s=createUniversalDossier("Je veux transmettre le saxophone à dix débutants");
  const project={...makeAcademyProject(),dossierBinding:{spaceId:s.id,titleMode:"linked" as const}};
  expect(validProject(project)).not.toBeNull();
  const updated=updateUniversalField(s.id,"title","Mon atelier vivant");
  expect(academyDisplayProject(project,updated).siteTitle).toBe("Mon atelier vivant");
  const linkedObjectives={...project,dossierBinding:{spaceId:s.id,titleMode:"linked" as const,objectivesMode:"linked" as const}};
  expect(academyDisplayProject(linkedObjectives,updated).sections.find(v=>v.kind==="intro")?.body).toContain(updated.dossier!.objectives[0]);
  const next=updateUniversalField(s.id,"dossier.objectives","Apprendre à improviser\nJouer collectivement");
  expect(academyDisplayProject(linkedObjectives,next).sections.find(v=>v.kind==="intro")?.body).toContain("Jouer collectivement");
  const customObjectives={...project,dossierBinding:{spaceId:s.id,titleMode:"linked" as const,objectivesMode:"custom" as const}};
  expect(academyDisplayProject(customObjectives,next).sections.find(v=>v.kind==="intro")?.body).toBe(project.sections.find(v=>v.kind==="intro")?.body);
  const html=exportAcademyHTML(academyDisplayProject(project,updated));
  expect(html).toContain("<title>Mon atelier vivant</title>");
  const customized={...project,siteTitle:"Mon titre personnel",dossierBinding:{spaceId:s.id,titleMode:"custom" as const}};
  expect(academyDisplayProject(customized,updated).siteTitle).toBe("Mon titre personnel");
  expect(academyDisplayProject(project,{id:"autre",title:"Secret"}).siteTitle).toBe(project.siteTitle);
 });
 it("exporte, vérifie et réimporte sans remplacer silencieusement un dossier existant",()=>{
  const s=createUniversalDossier("Atelier de saxophone pour dix débutants");
  const raw=exportUniversalJSON(s);
  const pack=JSON.parse(raw);
  expect(pack.kind).toBe("aime:universal-dossier");
  expect(pack.space.id).toBe(s.id);
  expect(()=>importUniversalJSON(pack)).toThrow(/Conflit/);
  expect(importUniversalJSON(pack,true).id).toBe(s.id);
  expect(()=>importUniversalJSON({...pack,space:{...s,dossier:{...s.dossier,version:7}}},true)).toThrow(/Schéma/);
  expect(localStorage.getItem(WORLD_KEY)).toContain(s.id);
 });
 it("préserve l'ancien Academy et crée un support distinct par dossier",async()=>{
  const classic=makeAcademyProject();
  localStorage.setItem(ACADEMY_KEY,JSON.stringify(classic));
  const s=createUniversalDossier("Je souhaite proposer un atelier de saxophone");
  const view=await mount(<AcademyStudio onBack={vi.fn()} onAccessibility={vi.fn()} linkedDossierId={s.id}/>);
  expect(view.textContent).toContain(s.title);
  expect(view.querySelector('[aria-label="Lien canonique Dossier Universel"]')).toBeTruthy();
  expect(localStorage.getItem(academyDossierKey(s.id))).toBeTruthy();
  expect(JSON.parse(localStorage.getItem(ACADEMY_KEY)!)).toEqual(classic);
  expect(readDossier(s.id)?.dossier?.references.some(r=>r.studio==="academy")).toBe(true);
 });
 it("montre une interface centrale avec la création, les prochaines actions et le retour Academy",async()=>{
  const s=createUniversalDossier("Je souhaite proposer un atelier d'improvisation à dix débutants");
  const open=vi.fn();
  const view=await mount(<UniversalDossierStudio onBack={vi.fn()} onOpenAcademy={open}/>);
  expect(view.textContent).toContain("Un même projet.");
  expect(view.textContent).toContain("Le dossier vivant");
  expect(view.textContent).toContain("Prochaines actions");
  expect(view.textContent).toContain("Projection Formation");
  const btn=[...view.querySelectorAll("button")].find(x=>x.textContent?.includes("Créer un support pédagogique"));
  expect(btn).toBeTruthy();
  await act(async()=>btn!.dispatchEvent(new MouseEvent("click",{bubbles:true})));
  expect(open).toHaveBeenCalledWith(s.id);
  expect(entryStudio("","","/espace")).toBe("universal-dossier");
  expect(entryStudio("?studio=academy&dossier="+s.id,"","/atelier")).toBe("academy");
 });
 it("affiche explicitement l'absence d'objectifs liés, sans contenu pédagogique périmé",()=>{
  const s=createUniversalDossier("Je veux proposer un atelier de saxophone pour dix débutants");
  const p={...makeAcademyProject(),dossierBinding:{spaceId:s.id,titleMode:"linked" as const,objectivesMode:"linked" as const}};
  const empty=updateUniversalField(s.id,"dossier.objectives","");
  const linked=academyDisplayProject(p,empty);
  const intro=linked.sections.find(section=>section.kind==="intro");
  expect(intro?.body).toContain("Aucun objectif pédagogique renseigné");
  expect(intro?.body).not.toBe(p.sections.find(section=>section.kind==="intro")?.body);
  expect(exportAcademyHTML(linked)).toContain("Aucun objectif pédagogique renseigné");
  const custom={...p,dossierBinding:{...p.dossierBinding,objectivesMode:"custom" as const}};
  expect(academyDisplayProject(custom,empty).sections.find(v=>v.kind==="intro")?.body).toBe(p.sections.find(v=>v.kind==="intro")?.body);
 });
 it("ne remplace pas une référence Academy existante sans accord explicite et signale son état",()=>{
  const s=createUniversalDossier("Atelier musical avec programme et dix débutants");
  expect(academyReferenceHealth(s)).toBe("none");
  const first=attachAcademyResource(s.id,"academy-premier");
  expect(academyReferenceHealth(first)).toBe("missing");
  localStorage.setItem(academyDossierKey(s.id),"{malformed-json");
  expect(academyReferenceHealth(first)).toBe("invalid");
  const support={...makeAcademyProject(),id:"academy-premier",dossierBinding:{spaceId:s.id,titleMode:"linked" as const}};
  localStorage.setItem(academyDossierKey(s.id),JSON.stringify(support));
  expect(academyReferenceHealth(first)).toBe("available");
  expect(()=>attachAcademyResource(s.id,"academy-autre")).toThrow(/Conflit Academy/);
  expect(readDossier(s.id)?.dossier?.references[0].targetId).toBe("academy-premier");
  const approved=attachAcademyResource(s.id,"academy-autre",true);
  expect(approved.dossier?.references[0].targetId).toBe("academy-autre");
  expect(approved.dossier?.history.at(-1)?.before).toBe("academy-premier");
  expect(academyReferenceHealth(approved)).toBe("invalid");
  expect(()=>attachAcademyResource(s.id,"")).toThrow(/Identifiant Academy invalide/);
 });
 it("préserve octet pour octet un store local corrompu et bloque l'import qui l'effacerait",()=>{
  const broken="{legacy-invalid-json";
  localStorage.setItem(WORLD_KEY,broken);
  expect(()=>writableWorld()).toThrow(/illisible/);
  expect(()=>createUniversalDossier("Je souhaite proposer un atelier pédagogique")).toThrow(/illisible/);
  const candidate=makeUniversalDossier("Je souhaite proposer une formation");
  expect(()=>importUniversalJSON({kind:"aime:universal-dossier",version:1,space:candidate})).toThrow(/illisible/);
  expect(localStorage.getItem(WORLD_KEY)).toBe(broken);
  const future=JSON.stringify({version:999,spaces:[],selectedSpaceId:""});
  localStorage.setItem(WORLD_KEY,future);
  expect(()=>createUniversalDossier("Je souhaite organiser un atelier")).toThrow(/incompatible/);
  expect(localStorage.getItem(WORLD_KEY)).toBe(future);
 });
 it("n'inscrit aucun changement d'historique quand le navigateur refuse l'écriture",()=>{
  const s=createUniversalDossier("Je veux organiser un atelier pour dix débutants");
  const original=localStorage.getItem(WORLD_KEY);
  const mock=vi.spyOn(Storage.prototype,"setItem").mockImplementation(()=>{throw new Error("QuotaExceededError");});
  try{expect(()=>updateUniversalField(s.id,"title","Nouveau titre")).toThrow(/QuotaExceededError/);}
  finally{mock.mockRestore();}
  expect(localStorage.getItem(WORLD_KEY)).toBe(original);
  expect(readDossier(s.id)?.title).toBe(s.title);
 });
 it("préserve le support Academy endommagé lors d'une réouverture liée",async()=>{
  const s=createUniversalDossier("Atelier saxophone de dix débutants");
  const corrupted="{academy-original-unreadable";
  localStorage.setItem(academyDossierKey(s.id),corrupted);
  const view=await mount(<AcademyStudio onBack={vi.fn()} onAccessibility={vi.fn()} linkedDossierId={s.id}/>);
  expect(localStorage.getItem(academyDossierKey(s.id))).toBe(corrupted);
  expect(view.textContent).toContain("contenu original conservé");
  expect(readDossier(s.id)?.dossier?.references.some(r=>r.studio==="academy")).toBe(false);
 });

});
