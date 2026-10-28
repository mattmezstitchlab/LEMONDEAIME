import type { PdfHandle } from "./pdfimport";

export interface PDFSource {id:string;name:string;file:File;handle:PdfHandle}
export interface PDFPage { id:string;sourceId:string;page:number;name:string;width:number;height:number;rotation:0|90|180|270;enabled:boolean;thumb:string }
export const MAX_PDF_PAGES=80;
export function pageRotation(page:PDFPage,step:90|-90):PDFPage {
  return {...page,rotation:((page.rotation+step+360)%360) as PDFPage["rotation"]};
}
export function repositionPage(pages:PDFPage[],sourceId:string,target:number):PDFPage[]{
  const items=[...pages],index=items.findIndex(p=>p.id===sourceId);
  if(index<0||target<0||target>=items.length||index===target)return pages;
  const [moved]=items.splice(index,1);
  items.splice(target,0,moved);
  return items;
}
export function exportablePages(pages:PDFPage[]):PDFPage[]{return pages.filter(p=>p.enabled);}
export function outputPageDims(page:PDFPage){
  const rotated=page.rotation===90||page.rotation===270;
  return {width:rotated?page.height:page.width,height:rotated?page.width:page.height};
}
/** Rotate a rendered page into a new white canvas (pixels), preserving the requested orientation. */
export function rotatedCanvas(source:HTMLCanvasElement,rotation:PDFPage["rotation"]):HTMLCanvasElement{
  const turned=rotation===90||rotation===270;
  const target=document.createElement("canvas");
  target.width=turned?source.height:source.width;
  target.height=turned?source.width:source.height;
  const context=target.getContext("2d");
  if(!context)throw Error("Canvas indisponible.");
  context.fillStyle="#ffffff";context.fillRect(0,0,target.width,target.height);
  context.translate(target.width/2,target.height/2);
  context.rotate(rotation*Math.PI/180);
  context.drawImage(source,-source.width/2,-source.height/2);
  return target;
}
export function pdfSummary(pages:PDFPage[]){
  const kept=exportablePages(pages);
  return {total:pages.length,kept:kept.length,excluded:pages.length-kept.length,sources:new Set(pages.map(p=>p.sourceId)).size};
}
