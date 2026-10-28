import { describe, expect, it } from "vitest";
import { createMiniSite, MINI_KINDS, miniSection, miniSiteToHTML, safeMiniSite } from "../lib/miniSiteCore";
describe("POINTZERO Mini-site",()=>{
  it("propose quatre modèles responsives complets sans réseau",()=>{
    expect(MINI_KINDS).toHaveLength(4);
    for(const {id} of MINI_KINDS){
      const doc=createMiniSite(id);
      expect(doc.sections.length).toBeGreaterThanOrEqual(3);
      expect(safeMiniSite(JSON.parse(JSON.stringify(doc)))).not.toBeNull();
      const html=miniSiteToHTML(doc);
      expect(html).toContain('<meta name="viewport"');
      expect(html).toContain('@media(max-width:720px)');
      expect(html).not.toContain('<script');
      expect(html).not.toContain('https://');
    }
  });
  it("échappe les textes arbitraires et les attributs, et préserve les sauts de ligne",()=>{
    const d=createMiniSite();
    d.title='Mariage "test" & <script>alert(1)</script>';
    d.subtitle='<img src=x onerror=alert(1)>';
    d.sections=[miniSection("texte")];
    d.sections[0].title='"><script>bad</script>';
    d.sections[0].body='Bonjour & bienvenue\nEnsemble';
    const html=miniSiteToHTML(d);
    expect(html).not.toContain('<script>alert');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&#34;');
    expect(html).toContain('Ensemble');
    expect(html).toContain('<br>');
  });
  it("ne crée un bouton mailto qu'avec une adresse valide",()=>{
    const d=createMiniSite();
    d.contact='bonjour@example.com';
    expect(miniSiteToHTML(d)).toContain('href="mailto:bonjour%40example.com');
    d.contact='malicious"><script>x</script>';
    expect(miniSiteToHTML(d)).not.toContain('href="mailto:malicious');
  });
  it("rejette les JSON malformés, couleurs illégales et images externes",()=>{
    const d=createMiniSite("portfolio");
    expect(safeMiniSite({...d,primaryColor:"red"})).toBeNull();
    expect(safeMiniSite({...d,heroImage:"https://example.com/a.jpg"})).toBeNull();
    expect(safeMiniSite({...d,sections:[{...d.sections[0],kind:"js"}]})).toBeNull();
    expect(safeMiniSite({...d,sections:Array.from({length:17},()=>miniSection("texte"))})).toBeNull();
  });
});
