import {afterEach,describe,expect,it} from "vitest";
import {
 ACADEMY_LESSONS,ACADEMY_KEY,ACADEMY_PROGRESS_KEY,
 courseProgress,defaultLearning,exportAcademyHTML,makeAcademyProject,makeSection,
 readAcademy,readLearning,safeHref,validLearning,validProject,writeAcademy
} from "../lib/academyCore";
afterEach(()=>{localStorage.removeItem(ACADEMY_KEY);localStorage.removeItem(ACADEMY_PROGRESS_KEY);});
describe("POINTZERO Academy — création No Code",()=>{
 it("génère trois vrais modèles de site éditables et extensibles",()=>{
  for(const preset of ["artisan","association","portfolio"] as const){
   const p=makeAcademyProject(preset);
   expect(p.template).toBe(preset);
   expect(p.sections.some(s=>s.kind==="hero")).toBe(true);
   expect(p.sections.some(s=>s.kind==="footer")).toBe(true);
   expect(validProject(p)).not.toBeNull();
  }
  expect(makeSection("cards").kind).toBe("cards");
 });
 it("préserve réellement les changements et rejette les projets corrompus ou dangereux",()=>{
  const p=makeAcademyProject();
  p.siteTitle="Mon entreprise";
  p.sections[0].title="Le site de ma propre entreprise";
  p.sections.push(makeSection("callout"));
  writeAcademy(p);
  expect(readAcademy()).toEqual(p);
  expect(validProject({...p,sections:[p.sections[0],p.sections[0]]})).toBeNull();
  expect(validProject({...p,sections:[{...p.sections[0],actionHref:"javascript:alert(1)"}]})).toBeNull();
  expect(validProject({...p,accent:"url(evil)"})).toBeNull();
  expect(validProject({...p,sections:[]})).toBeNull();
 });
 it("évite toute injection HTML/script dans le site exporté",()=>{
  const p=makeAcademyProject();
  p.siteTitle='Site <img src=x onerror="alert(1)">';
  p.sections[0].title='<script>alert(1)</script>';
  p.sections[0].body='<img src=x onerror=alert(1)>';
  p.sections[0].actionHref="https://example.com";
  const output=exportAcademyHTML(p);
  expect(output).toContain("&lt;script&gt;");
  expect(output).not.toContain("<script>alert(1)</script>");
  expect(output).not.toContain("<img src=x onerror");
  expect(output).toContain('href="https://example.com"');
  expect(output).toContain('<footer');
  expect(output).toContain('<html lang="fr">');
  expect(output).toContain("prefers-reduced-motion");
  expect(()=>exportAcademyHTML({...p,sections:[{...p.sections[0],actionHref:"data:text/html,evil"}]})).toThrow();
 });
 it("ne permet que des URL HTTPS, relatives, mailto, téléphone ou ancre",()=>{
  expect(safeHref("javascript:alert(1)")).toBe("");
  expect(safeHref("data:text/html,evil")).toBe("");
  expect(safeHref("//host.example")).toBe("");
  expect(safeHref("http://insecure.example")).toBe("");
  expect(safeHref("https://example.com")).toBe("https://example.com");
  expect(safeHref("mailto:bonjour@example.com")).toBe("mailto:bonjour@example.com");
  expect(safeHref("tel:+33612345678")).toBe("tel:+33612345678");
  expect(safeHref("/contact")).toBe("/contact");
  expect(safeHref("#contact")).toBe("#contact");
 });
});
describe("POINTZERO Academy — cours et progression réelle",()=>{
 it("mesure les compétences démontrées plutôt que de délivrer un faux certificat",()=>{
  const p=makeAcademyProject();
  const zero=courseProgress(p,defaultLearning());
  expect(zero.passed).toBeLessThan(zero.all);
  p.siteTitle="Atelier Horizon";
  p.sections[0].title="Atelier Horizon vous accompagne partout";
  p.sections[0].actionHref="mailto:atelier@example.fr";
  p.sections.find(s=>s.kind==="intro")!.body="Nous préparons ensemble de vraies expériences de création et de transmission dans le territoire.";
  p.accent="#216a51";
  p.sections.push(makeSection("quote"));
  const result=courseProgress(p,defaultLearning());
  expect(result.passed).toBeGreaterThan(zero.passed);
  expect(result.ids).toEqual(expect.arrayContaining(["hero","identity","message","layout","brand","action","handoff"]));
  expect(result.all).toBe(ACADEMY_LESSONS.length);
 });
 it("autorise des exercices personnalisés, sans prétendre à un suivi distant",()=>{
  const p=defaultLearning();
  p.exercises.push({id:"ex-1",title:"Créer un contact",instructions:"Ajouter une page de contact claire."});
  p.completedCustom.push("ex-1");
  expect(validLearning(p)).toEqual(p);
  localStorage.setItem(ACADEMY_PROGRESS_KEY,JSON.stringify(p));
  expect(readLearning()).toEqual(p);
  expect(validLearning({...p,completedCustom:["missing"]})).toBeNull();
  expect(validLearning({...p,exercises:[...p.exercises,...p.exercises]})).toBeNull();
 });
});
