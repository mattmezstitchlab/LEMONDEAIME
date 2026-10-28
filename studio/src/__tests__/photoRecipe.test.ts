import { describe, expect, it } from "vitest";
import { autoLight, cropRect, DEFAULT_RECIPE, photoDimensions, photoFilter } from "../lib/photoRecipe";

describe("Studio photo — traitements locaux et non destructifs",()=>{
  it("calcule le recadrage 1:1, 4:5, 9:16 et 16:9 sans sortir de l'image",()=>{
    for(const crop of ["1:1","4:5","9:16","16:9"] as const){
      const rect=cropRect(2000,1400,{...DEFAULT_RECIPE,crop,centerX:100,centerY:0});
      expect(rect.x).toBeGreaterThanOrEqual(0);expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.x+rect.w).toBeLessThanOrEqual(2000);
      expect(rect.y+rect.h).toBeLessThanOrEqual(1400);
      const [a,b]=crop.split(":").map(Number);
      expect(rect.w/rect.h).toBeCloseTo(a/b);
    }
  });
  it("adapte la sortie et la rotation sans agrandir au-delà de la résolution source",()=>{
    const r=photoDimensions(2000,1000,{...DEFAULT_RECIPE,crop:"libre",rotation:90},1600);
    expect(r).toEqual({width:800,height:1600});
    const small=photoDimensions(300,200,DEFAULT_RECIPE,1600);
    expect(small).toEqual({width:300,height:200});
  });
  it("propose une correction mesurée des photos trop sombres, sans IA",()=>{
    const dark=new Uint8ClampedArray(128*4);
    for(let i=0;i<dark.length;i+=4){dark[i]=50;dark[i+1]=50;dark[i+2]=50;dark[i+3]=255;}
    const patch=autoLight(dark);
    expect(patch.brightness).toBeGreaterThan(100);
    expect(patch.brightness).toBeLessThanOrEqual(128);
    expect(patch.contrast).toBe(105);
  });
  it("respecte les bornes de filtre et le recadrage libre",()=>{
    expect(cropRect(500,300,DEFAULT_RECIPE)).toEqual({x:0,y:0,w:500,h:300});
    const css=photoFilter({...DEFAULT_RECIPE,brightness:999,saturation:-7,grayscale:true});
    expect(css).toContain("brightness(200%)");
    expect(css).toContain("saturate(0%)");
    expect(css).toContain("grayscale(1)");
  });
});
