import {afterEach,describe,expect,it} from "vitest";
import {createMiniSite,miniSiteToHTML,safeMiniSite} from "../lib/miniSiteCore";
import {
 MINI_COACH_KEY,COACH_PHASES,blankMiniCoach,miniSiteAudit,miniCoachProgress,
 readMiniCoach,safeMiniCoach,writeMiniCoach
} from "../lib/miniSiteLearning";
afterEach(()=>localStorage.clear());
describe("POINTZERO Mini-site Academy — parcours et règles explicables",()=>{
 it("part du public et de la finalité avant les couleurs et la couverture",()=>{
   const site=createMiniSite("mariage"),profile=blankMiniCoach(site.id);
   const report=miniSiteAudit(site,profile);
   expect(report.map(i=>i.id)).toEqual(expect.arrayContaining(["audience","purpose","hero-title","hero-subtitle","hero-action","manual"]));
   expect(COACH_PHASES.map(i=>i.id)).toEqual(["intention","hero","navigation","lisibilite","seo","verification"]);
   expect(miniCoachProgress(site,profile).passed).toBeLessThan(6);
   profile.audience="Les invités au mariage";
   profile.purpose="Retrouver les lieux et confirmer l'horaire";
   expect(miniSiteAudit(site,profile).some(i=>i.id==="audience")).toBe(false);
   expect(miniSiteAudit(site,profile).some(i=>i.id==="purpose")).toBe(false);
 });
 it("sait relire les contrastes et repérer les placeholders, sans déclarer une conformité",()=>{
   const site=createMiniSite("evenement"),profile=blankMiniCoach(site.id);
   site.primaryColor="#eeeeee";site.background="#ffffff";
   const report=miniSiteAudit(site,profile);
   expect(report.some(i=>i.id==="accent-contrast")).toBe(true);
   expect(report.some(i=>i.id==="practical")).toBe(true);
   expect(report.some(i=>i.id==="manual"&&i.severity==="a-verifier")).toBe(true);
   expect(report.every(i=>i.why.length>10&&i.action.length>10)).toBe(true);
 });
 it("conserve un profil indépendant et refuse un objet malformé ou croisé",()=>{
   const a=createMiniSite(),b=createMiniSite();
   const profile={...blankMiniCoach(a.id),audience:"Invités",purpose:"Infos utiles",reviewed:true};
   writeMiniCoach(profile);
   expect(readMiniCoach(a.id)).toEqual(profile);
   expect(readMiniCoach(b.id)).toEqual(blankMiniCoach(b.id));
   expect(safeMiniCoach({...profile,siteId:b.id},a.id)).toBeNull();
   expect(safeMiniCoach({...profile,audience:"x".repeat(221)},a.id)).toBeNull();
   localStorage.setItem(MINI_COACH_KEY,"{");
   expect(readMiniCoach(a.id).reviewed).toBe(false);
 });
 it("garde les anciens mini-sites et exporte un vrai CTA sécurisé au clavier",()=>{
   const site=createMiniSite("portfolio");
   delete site.heroActionHref;delete site.heroActionLabel;delete site.heroAlt;
   expect(safeMiniSite(site)).not.toBeNull();
   site.heroActionLabel='Voir <nos réalisations> & "plus"';
   site.heroActionHref="#s-"+site.sections[0].id;
   site.heroAlt='Galerie "studio"';
   const html=miniSiteToHTML(site);
   expect(html).toContain('class="cta hero-cta"');
   expect(html).toContain("Voir &lt;nos réalisations&gt; &amp; &#34;plus&#34;");
   expect(html).toContain("focus-visible");
   expect(html).toContain("prefers-reduced-motion");
   expect(safeMiniSite({...site,heroActionHref:"javascript:alert(1)"})).toBeNull();
   expect(miniSiteAudit({...site,heroActionHref:"javascript:alert(1)"},blankMiniCoach(site.id)).some(i=>i.id==="hero-action")).toBe(true);
 });
 it("signale le rôle d'une photo si sa description est absente, sans imposer un alt aux images décoratives",()=>{
   const site=createMiniSite();
   site.heroImage="data:image/png;base64,YQ==";
   expect(miniSiteAudit(site,blankMiniCoach(site.id)).some(i=>i.id==="cover-alt")).toBe(true);
   site.heroAlt="Une salle décorée pour les invités";
   expect(miniSiteAudit(site,blankMiniCoach(site.id)).some(i=>i.id==="cover-alt")).toBe(false);
 });
});
