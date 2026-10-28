import {describe,expect,it} from "vitest";
import {
 ART_W,ART_H,ART_TOOLS, makeArt, artId, artToSVG, artMarkSVG, artPaletteAnalysis,
 requestArtTool,safeArt,safeGallery,dmcSound, type ArtMark
} from "../lib/artWorldCore";
import {docToHTML,createAdminDocument,documentArtBackground,safeAdminStore} from "../lib/adminCore";

describe("LE MONDE AIME — laboratoire créatif local",()=>{
 it("expose des outils physiques réels, non de fausses capacités IA",()=>{
   expect(ART_TOOLS.map(t=>t.id)).toEqual(["pencil","brush","watercolor","pastel","charcoal","tape","stencil","cross","pin","eraser","move"]);
   const config={tool:"pencil" as const,color:"#111111",width:3,opacity:1,message:""};
   expect(requestArtTool("un crayon bleu foncé",config)).toMatchObject({tool:"pencil",color:"#173465",width:4});
   expect(requestArtTool("Je voudrais une aquarelle",config)).toMatchObject({tool:"watercolor",opacity:.34});
   expect(requestArtTool("un rouleau de scotch",config)?.tool).toBe("tape");
   expect(requestArtTool("je veux de la téléportation",config)).toBeNull();
 });
 it("produit un vrai SVG modifiable pour les matières, point de croix et pochoirs",()=>{
   const p=makeArt();
   const tools=["watercolor","charcoal","stencil","pin","cross","tape"] as const;
   p.marks=tools.map((tool,i)=>({id:artId(),tool,color:"#173465",width:18,opacity:.6,
      points:[{x:30+i*130,y:120},{x:70+i*130,y:180}]}));
   const output=artToSVG(p,{framed:true});
   expect(output).toContain('viewBox="0 0 '+ART_W+" "+ART_H);
   expect(output).toContain('filter="url(#art-wash)"');
   expect(output).toContain('stroke-dasharray="8 4"');
   expect(output).toContain('stroke-width="20"');
   expect(output).not.toContain("<script");
   expect(safeArt(p)).not.toBeNull();
   expect(artPaletteAnalysis(p)).toMatchObject({marks:6,colors:["#173465"]});
 });
 it("échappe les titres SVG et valide strictement les imports",()=>{
   const p=makeArt();p.title='<img src=x onerror="alert(1)">';
   expect(artToSVG(p)).not.toContain('<img src=x');
   expect(artToSVG(p)).toContain("&lt;img");
   const one:ArtMark={id:"one",tool:"brush",color:"#123456",width:12,opacity:.5,points:[{x:10,y:10}]};
   expect(artMarkSVG(one)).toContain("<circle");
   expect(safeArt({...p,marks:[{...one,color:'url(javascript:alert(1))'}]})).toBeNull();
   expect(safeArt({...p,marks:[{...one,points:[{x:-2,y:10}]}]})).toBeNull();
   expect(safeArt({...p,marks:[{...one,points:[]}]})).toBeNull();
   expect(safeGallery([{id:"a",title:"test",created:"2026-10-14",project:p,visibility:"public"}])).toEqual([]);
   expect(safeGallery([{id:"a",title:"test",created:"2026-10-14",project:p,visibility:"private"}])).toHaveLength(1);
 });
 it("associe les fils DMC à des sons reproductibles sans inférence émotionnelle",()=>{
   const a=dmcSound("820","#173465"),b=dmcSound("820","#173465");
   expect(a).toEqual(b);
   expect(a.midi).toBeGreaterThanOrEqual(48);
   expect(a.midi).toBeLessThanOrEqual(81);
 });
 it("ajoute un fond décoratif A4 sans changer les montants ni valider un document juridiquement",()=>{
   const d=createAdminDocument("devis");
   d.items=[{id:"a",title:"Illustration",quantity:2,unitCents:18000}];
   d.artTheme="floral";
   expect(safeAdminStore({version:1,documents:[d]})).not.toBeNull();
   expect(documentArtBackground(d.artTheme)).toContain("radial-gradient");
   const html=docToHTML(d);
   expect(html).toContain('class="sheet"');
   expect(html).toContain('36');
   expect(html).toContain('rgba(222,148,170');
   expect(safeAdminStore({version:1,documents:[{...d,artTheme:"evil"}]})).toBeNull();
   d.artTheme="my-art";const p=makeArt();p.marks=[{id:"b",tool:"pencil",color:"#123456",width:4,opacity:1,points:[{x:10,y:10}]}];
   expect(docToHTML(d,p)).toContain('data:image/svg+xml;charset=utf-8,');
 });
});
