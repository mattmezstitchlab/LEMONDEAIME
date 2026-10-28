import {afterEach,describe,expect,it} from "vitest";
import {ACADEMY_KEY,makeAcademyProject} from "../lib/academyCore";
import {MINI_KEY,createMiniSite} from "../lib/miniSiteCore";
import {
 LEGAL_KEY,newLegalDossier,newTreatment,inspectLegal,legalDraft,readLegal,sourceProjects,
 validLegal,validLegalStore,writeLegal
} from "../lib/legalCore";
afterEach(()=>{localStorage.clear();});
describe("POINTZERO Juridique — sources uniques et dossier prudent",()=>{
 it("retrouve les identifiants Mini-site et Academy sans réinventer le titre ni le contact",()=>{
  const mini=createMiniSite("mariage");mini.name="Mariage Camille et Gabriel";mini.contact="contact@exemple.fr";
  const academy=makeAcademyProject("association");
  academy.siteTitle="Association du territoire";
  localStorage.setItem(MINI_KEY,JSON.stringify(mini));
  localStorage.setItem(ACADEMY_KEY,JSON.stringify(academy));
  const sources=sourceProjects();
  expect(sources.map(s=>s.key)).toContain("mini-site:"+mini.id);
  expect(sources.map(s=>s.key)).toContain("academy:"+academy.id);
  expect(sources.find(s=>s.key==="mini-site:"+mini.id)).toMatchObject({title:mini.name,contact:mini.contact});
  expect(sources.find(s=>s.key==="academy:"+academy.id)?.title).toBe(academy.siteTitle);
 });
 it("assure l'isolation d'un dossier par projet, résiste aux objets malformés",()=>{
  const d1=newLegalDossier("mini-site:1");
  const d2=newLegalDossier("academy:2");
  const store={version:1 as const,dossiers:[d1,d2]};
  expect(validLegalStore(store)).not.toBeNull();
  writeLegal(store);expect(readLegal()).toEqual(store);
  expect(validLegal({...d1,editorKind:"certifié"})).toBeNull();
  expect(validLegal({...d1,notes:"a".repeat(1801)})).toBeNull();
  expect(validLegalStore({...store,dossiers:[d1,d1]})).toBeNull();
  localStorage.setItem(LEGAL_KEY,"malformed");expect(readLegal().dossiers).toHaveLength(0);
 });
 it("n'attribue jamais une base légale ni un délai de conservation fictifs",()=>{
  const d=newLegalDossier("mini-site:abc");
  const processing=newTreatment("rsvp");
  expect(processing.lawfulBasis).toBe("");
  expect(processing.retention).toBe("");
  expect(processing.recipients).toBe("");
  d.treatments.push(processing);
  const issues=inspectLegal(d,{kind:"mini-site",id:"abc",key:"mini-site:abc",title:"Jour J",source:"Mini-site",contact:"contact@example.com"});
  expect(issues.map(x=>x.id)).toContain("basis-"+processing.id);
  expect(issues.map(x=>x.id)).toContain("retention-"+processing.id);
  expect(issues.map(x=>x.id)).not.toContain("rights");
 });
 it("distingue les informations sensibles et traceurs exemptables du consentement préalable",()=>{
  const d=newLegalDossier("academy:abc");
  d.treatments.push(newTreatment("donnees-sensibles"));
  d.cookies="autres-traceurs";
  expect(inspectLegal(d,null).map(x=>x.id)).toContain("consent");
  expect(inspectLegal(d,null).some(x=>x.id.startsWith("sensitive-"))).toBe(true);
  d.cookies="necessaires";
  expect(inspectLegal(d,null).map(x=>x.id)).not.toContain("consent");
  d.cookies="mesure-audience-a-verifier";
  expect(inspectLegal(d,null).map(x=>x.id)).toContain("analytics");
 });
 it("exporte un brouillon marqué à relire, jamais un certificat",()=>{
  const d=newLegalDossier("mini-site:abc");
  const ref={kind:"mini-site" as const,id:"abc",key:"mini-site:abc",title:"Mon mariage",contact:"contact@exemple.fr",source:"Mini-site"};
  const text=legalDraft(d,ref);
  expect(text).toContain("BROUILLON À VÉRIFIER");
  expect(text).toContain("Mon mariage");
  expect(text).toContain("contact@exemple.fr");
  expect(text).toContain("[À compléter]");
  expect(text).not.toContain("Conforme RGPD");
 });
});
