import { describe, expect, it } from "vitest";
import { exportablePages, MAX_PDF_PAGES, outputPageDims, pageRotation, pdfSummary, repositionPage, type PDFPage } from "../lib/pdfStudioCore";
const page=(id:string,n:number):PDFPage=>({id,sourceId:"f1",page:n,name:"patron.pdf",width:595,height:842,rotation:0,enabled:true,thumb:""});
describe("POINTZERO PDF — montage non destructif",()=>{
  it("limite le montage à un total raisonnable de pages",()=>{
    expect(MAX_PDF_PAGES).toBeGreaterThan(30);
    expect(MAX_PDF_PAGES).toBeLessThanOrEqual(100);
  });
  it("réordonne sans modifier les originaux ni les autres pages",()=>{
    const initial=[page("a",1),page("b",2),page("c",3)];
    expect(repositionPage(initial,"a",2).map(p=>p.id)).toEqual(["b","c","a"]);
    expect(initial.map(p=>p.id)).toEqual(["a","b","c"]);
    expect(repositionPage(initial,"non",1)).toBe(initial);
  });
  it("tourne les pages par quarts et inverse les dimensions de sortie",()=>{
    let a=page("a",1);
    a=pageRotation(a,90);
    expect(a.rotation).toBe(90);
    expect(outputPageDims(a)).toEqual({width:842,height:595});
    a=pageRotation(a,-90);
    expect(a.rotation).toBe(0);
    expect(outputPageDims(a)).toEqual({width:595,height:842});
    a=pageRotation(a,-90);
    expect(a.rotation).toBe(270);
  });
  it("exclut explicitement les pages sélectionnées de l'export",()=>{
    const pages=[page("a",1),{...page("b",2),enabled:false}];
    expect(exportablePages(pages)).toHaveLength(1);
    expect(pdfSummary(pages)).toEqual({total:2,kept:1,excluded:1,sources:1});
  });
});
