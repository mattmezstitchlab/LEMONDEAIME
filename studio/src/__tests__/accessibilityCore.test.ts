import {describe,expect,it,afterEach,vi} from "vitest";
import {
 ACCESS_KEY,DEFAULT_ACCESS,ACCENTS,applyPrefs,auditMarkup,bestInk,contrastGrade,parsePrefs,ratio,readPrefs,savePrefs
} from "../lib/accessibilityCore";
afterEach(()=>{localStorage.removeItem(ACCESS_KEY);vi.restoreAllMocks();});
describe("POINTZERO Studio Accessibilité — préférences",()=>{
 it("conserve et réapplique un profil personnel sans données externes",()=>{
  const profile={...DEFAULT_ACCESS,theme:"light" as const,vision:"daltonisme" as const,fontScale:1.4,
   lineHeight:1.8,spacing:.05,readingGuide:true,reduceMotion:true,privacyBlur:true,contrast:"strong" as const};
  const dispatch=vi.fn();window.addEventListener("pz:accessibility",dispatch);
  savePrefs(profile);
  expect(readPrefs()).toEqual(profile);
  expect(dispatch).toHaveBeenCalledTimes(1);
  applyPrefs(profile);
  expect(document.documentElement.dataset.pzTheme).toBe("light");
  expect(document.documentElement.dataset.pzMotion).toBe("reduce");
  expect(document.documentElement.dataset.pzFocus).toBe("standard");
  expect(document.documentElement.dataset.pzTextScale).toBe("custom");
  expect(document.documentElement.dataset.pzDiscretion).toBe("on");
  window.removeEventListener("pz:accessibility",dispatch);
 });
 it("rejette fichiers malveillants ou profils hors limites sans changer l'enregistrement",()=>{
  expect(parsePrefs({...DEFAULT_ACCESS,fontScale:10})).toBeNull();
  expect(parsePrefs({...DEFAULT_ACCESS,accent:"url(javascript:evil)"})).toBeNull();
  expect(parsePrefs({...DEFAULT_ACCESS,reduceMotion:"no"})).toBeNull();
  expect(parsePrefs({...DEFAULT_ACCESS,version:5})).toBeNull();
  expect(ACCENTS.length).toBeGreaterThan(4);
  localStorage.setItem(ACCESS_KEY,"{invalid}");
  expect(readPrefs()).toEqual(DEFAULT_ACCESS);
 });
 it("calcule les ratios WCAG 2.x de façon reproductible",()=>{
  expect(ratio("#000000","#ffffff")).toBeCloseTo(21,4);
  expect(ratio("#777777","#ffffff")).toBeCloseTo(4.478,2);
  expect(contrastGrade("#000000","#ffffff")).toMatchObject({normalAA:true,largeAA:true,normalAAA:true,uiAA:true});
  expect(contrastGrade("#aaaaaa","#ffffff").normalAA).toBe(false);
  expect(bestInk("#111111")).toBe("#ffffff");
  expect(bestInk("#fffafa")).toBe("#000000");
 });
});
describe("POINTZERO Studio Accessibilité — audit limité au HTML",()=>{
 it("signale langue, titres, alternatives et formulaires sans étiquette",()=>{
  const html='<html><head></head><body><h2>Section</h2><img src="test.png"><button><svg></svg></button><a href="/"></a><input type="text"><iframe src="/demo"></iframe></body></html>';
  const r=auditMarkup(html);
  expect(r.issues.map(x=>x.code)).toEqual(expect.arrayContaining(["LANG","TITLE","H1","IMG_ALT","BUTTON_NAME","LINK_NAME","INPUT_NAME","FRAME_TITLE"]));
  expect(r.checked).toBeGreaterThan(5);
  expect(r.limitations.join(" ")).toContain("ne signifie pas conformité");
 });
 it("accepte un petit document correctement étiqueté, sans prétendre valider WCAG",()=>{
  const markup='<html lang="fr"><head><title>Démo</title></head><body><h1>Contact</h1><label for="email">Email</label><input id="email" type="email"><img src="decor.png" alt=""><button aria-label="Fermer"></button><a href="/">Accueil</a></body></html>';
  const report=auditMarkup(markup);
  expect(report.issues).toHaveLength(0);
  expect(report.limitations.length).toBeGreaterThan(2);
  expect(()=>auditMarkup("a".repeat(1_500_100))).toThrow(/volumineux/);
 });
});
