import { describe, expect, it } from "vitest";
import { FORMATS, addDesignElement, createDesign, designToHTML, designToSVG, duplicateDesign, safeDesign } from "../lib/designStudio";

describe("POINTZERO — documents universels", () => {
  it("crée sept supports utilisables avec titre, texte et vrai motif DMC", () => {
    expect(FORMATS).toHaveLength(7);
    for (const spec of FORMATS) {
      const doc = createDesign(spec.id);
      expect(doc.width).toBe(spec.width);
      expect(doc.height).toBe(spec.height);
      expect(doc.elements.some(e=>e.kind==="motif")).toBe(true);
      expect(safeDesign(JSON.parse(JSON.stringify(doc)))).not.toBeNull();
      expect(designToSVG(doc)).toContain("<svg");
      expect(designToSVG(doc)).toContain("<rect");
    }
  });
  it("ajoute texte, forme et motif au même document, avec des identifiants distincts", () => {
    const orig = createDesign("affiche");
    let doc = addDesignElement(orig,"text");
    doc = addDesignElement(doc,"shape");
    doc = addDesignElement(doc,"motif","oiseau",{x:110,y:205});
    expect(doc.elements).toHaveLength(orig.elements.length+3);
    expect(new Set(doc.elements.map(e=>e.id)).size).toBe(doc.elements.length);
    expect(doc.elements.at(-1)?.kind).toBe("motif");
    expect(designToSVG(doc)).toContain("<text");
  });
  it("décline une composition sans toucher à la source ni jeter ses éléments", () => {
    const original = createDesign("affiche");
    const newStory = duplicateDesign(original,"story");
    const banner = duplicateDesign(original,"banniere");
    expect(newStory.width).toBe(540);
    expect(newStory.height).toBe(960);
    expect(banner.height).toBe(400);
    expect(original.format).toBe("affiche");
    expect(newStory.elements).toHaveLength(original.elements.length);
    expect(newStory.elements[0].id).not.toBe(original.elements[0].id);
    expect(newStory.elements.every(e=>e.w>0&&e.h>0)).toBe(true);
    expect(safeDesign(JSON.parse(JSON.stringify(newStory)))).not.toBeNull();
  });
  it("produit une maquette HTML statique sans insérer de code utilisateur", () => {
    const doc=createDesign("mini-site");
    const tagged=addDesignElement(doc,"text");
    const text = tagged.elements.at(-1)!;
    if(text.kind!=="text")throw Error("texte attendu");
    text.text = '<script>alert("XSS")</script> & hello';
    const svg=designToSVG(tagged);
    const html=designToHTML(tagged);
    expect(svg).toContain("&lt;script&gt;");
    expect(html).not.toContain('<script>alert("XSS")');
    expect(html).toContain("Maquette statique");
    expect(html).toContain('<meta name="viewport"');
  });
  it("refuse les documents invalides et les URL d'images externes", () => {
    const doc=createDesign("flyer");
    expect(safeDesign({...doc, background:"javascript:alert(1)"})).toBeNull();
    expect(safeDesign({...doc, format:"non-existant"})).toBeNull();
    expect(safeDesign({...doc, elements:[{id:"image",kind:"image",x:0,y:0,w:10,h:10,dataUrl:"https://evil.test/data.png"}]})).toBeNull();
    expect(safeDesign({...doc, elements:Array.from({length:151}, (_,i)=>({...doc.elements[0],id:String(i)}))})).toBeNull();
  });
  it("permet de supprimer le fond du SVG pour les objets réutilisés", () => {
    const doc=createDesign("faire-part");
    const transparent=designToSVG(doc,true);
    expect(transparent.startsWith("<svg")).toBe(true);
    expect(transparent).not.toContain('fill="'+doc.background+'"');
  });
});
