import { describe, expect, it } from "vitest";
import { createGarment, fashionTechSheet, fashionToSVG, GARMENTS, validGarment } from "../lib/fashionStudio";
describe("Studio stylisme — maquettes et fiche concept",()=>{
  it("propose cinq vêtements et des vues devant/dos vectorielles",()=>{
    expect(GARMENTS).toHaveLength(5);
    for(const option of GARMENTS){
      const p={...createGarment(),garment:option.id};
      expect(validGarment(JSON.parse(JSON.stringify(p)))).not.toBeNull();
      const front=fashionToSVG(p,"front"),back=fashionToSVG(p,"back");
      expect(front).toContain('<svg');
      expect(front).toContain('clipPath');
      expect(back).toContain('Dos');
      expect(front).toContain('Devant');
    }
  });
  it("place un vrai motif brodable et l'option d'un motif distinct au dos",()=>{
    const p={...createGarment(),motifId:"fleur-rose",backMotifId:"oiseau",technique:"embroidery" as const};
    expect(fashionToSVG(p,"front")).toContain('<rect');
    expect(fashionToSVG(p,"back")).toContain('<rect');
    expect(fashionTechSheet(p).front.motif).toBe("fleur-rose");
    expect(fashionTechSheet(p).back.motif).toBe("oiseau");
  });
  it("échappe les textes pour exporter des SVG sûrs",()=>{
    const p={...createGarment(),text:'<script>alert("x")</script> & atelier'};
    const svg=fashionToSVG(p,"front");
    expect(svg).toContain('&lt;script&gt;');
    expect(svg).not.toContain('<script>alert');
    expect(fashionTechSheet(p).disclaimer).toContain("Maquette");
  });
  it("refuse les fiches falsifiées, SVG injectables et les valeurs invalides",()=>{
    const p=createGarment();
    expect(validGarment({...p,motifId:"../../outside"})).toBeNull();
    expect(validGarment({...p,baseColor:"red;url(https://bad.example)"})).toBeNull();
    expect(validGarment({...p,motifSize:Infinity})).toBeNull();
    expect(validGarment({...p,backMotifId:"impossible"})).toBeNull();
  });
});
