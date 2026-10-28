import { designToSVG, type DesignDocument } from "./designStudio";
import { getMotifPreset } from "./motifPresets";

export type Garment = "tshirt" | "sweat" | "hoodie" | "tote" | "robe";
export type GarmentSide = "front" | "back";
export type Embellishment = "print" | "embroidery";
export interface GarmentProject {
  version:1;
  name:string;
  garment:Garment;
  baseColor:string;
  ribColor:string;
  motifId:string;
  motifSize:number;
  motifX:number;
  motifY:number;
  text:string;
  textColor:string;
  technique:Embellishment;
  fabric:"coton" | "molleton" | "autre";
  fit:"standard" | "ample";
  sizes:string[];
  view:GarmentSide;
  backMotifId:string;
  backText:string;
  notes:string;
}
export const GARMENTS: {id:Garment;label:string}[]=[
  {id:"tshirt",label:"T-shirt"},{id:"sweat",label:"Sweat"},{id:"hoodie",label:"Hoodie"},
  {id:"robe",label:"Robe"},{id:"tote",label:"Tote bag"}
];
export const GARMENT_COLORS = ["#f6f3ee","#101114","#d7a2a4","#62714a","#bba782","#536a8a","#873a43","#d5b956"];
const hex=(v:string)=>/^#[0-9a-fA-F]{6}$/.test(v);
const xml=(value:string)=>value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
export function createGarment():GarmentProject {
  return {
    version:1,name:"Collection POINTZERO",garment:"tshirt",baseColor:"#f6f3ee",ribColor:"#d7d1c8",
    motifId:"fleur-rose",motifSize:125,motifX:300,motifY:273,
    text:"",textColor:"#202020",technique:"embroidery",fabric:"coton",fit:"standard",
    sizes:["S","M","L"],view:"front",backMotifId:"",backText:"",notes:"Concept visuel à valider avant fabrication."
  };
}
export function validGarment(raw:unknown):GarmentProject|null{
  if(!raw||typeof raw!=="object")return null;
  const p=raw as Partial<GarmentProject>;
  if(p.version!==1||typeof p.name!=="string"||p.name.length>120||
    !GARMENTS.some(g=>g.id===p.garment)||typeof p.baseColor!=="string"||!hex(p.baseColor)||
    typeof p.ribColor!=="string"||!hex(p.ribColor)||typeof p.textColor!=="string"||!hex(p.textColor)||
    typeof p.motifId!=="string"||!getMotifPreset(p.motifId)||
    typeof p.backMotifId!=="string"||(p.backMotifId!==""&&!getMotifPreset(p.backMotifId))||
    !["print","embroidery"].includes(String(p.technique))||
    !["standard","ample"].includes(String(p.fit))||
    !["coton","molleton","autre"].includes(String(p.fabric))||
    !["front","back"].includes(String(p.view))||
    !["motifSize","motifX","motifY"].every(k=>Number.isFinite(p[k as keyof GarmentProject])&&Math.abs(p[k as keyof GarmentProject] as number)<1000)||
    typeof p.text!=="string"||p.text.length>150||typeof p.backText!=="string"||p.backText.length>150||
    typeof p.notes!=="string"||p.notes.length>3000||!Array.isArray(p.sizes)||
    p.sizes.length>8||p.sizes.some(s=>typeof s!=="string"||s.length>6))return null;
  return p as GarmentProject;
}
function garmentPath(garment:Garment,fit:GarmentProject["fit"]) {
  const bump=fit==="ample"?22:0;
  if(garment==="tote")return "M176 172 Q176 145 208 145 H392 Q424 145 424 172 L447 552 Q448 570 430 570 H170 Q152 570 153 552 Z";
  if(garment==="robe")return "M236 114 Q269 141 300 141 Q334 141 364 114 L426 151 L467 258 L410 279 L383 222 L398 334 L484 568 Q487 579 463 581 H137 Q117 579 121 568 L202 334 L217 222 L190 279 L133 258 L174 151 Z";
  const sweatshirt=garment!=="tshirt";
  const sleeve=sweatshirt ? 505 : 254;
  const sleeveBottom=sweatshirt ? 558 : 274;
  return "M214 128 L245 114 Q270 151 300 151 Q330 151 355 114 L386 128 L"+
    (sweatshirt?446:455)+" "+sleeve+" L"+(sweatshirt?401:402)+" "+sleeveBottom+
    " L"+(sweatshirt?371:385)+" "+(sweatshirt?307:265)+
    " L"+(393+bump)+" 558 H"+(207-bump)+" L"+(215-bump)+" "+(sweatshirt?307:265)+
    " L"+(sweatshirt?199:198)+" "+sleeveBottom+" L"+(sweatshirt?154:145)+" "+sleeve+" L214 128 Z";
}
function outline(garment:Garment,side:GarmentSide,fit:GarmentProject["fit"],base:string,rib:string):string {
  const path=garmentPath(garment,fit);
  let extra="";
  if(garment==="tote"){
    extra='<path d="M216 148 V114 Q216 69 257 69 H343 Q384 69 384 114 V148" fill="none" stroke="'+rib+'" stroke-width="18" stroke-linecap="round"/>';
  } else if(garment==="hoodie"){
    extra='<path d="M243 124 Q200 54 256 69 Q300 32 345 69 Q400 54 358 124 L330 161 Q300 176 270 161 Z" fill="'+base+'" stroke="'+rib+'" stroke-width="6"/>'+
      '<path d="M277 167 L268 230 M324 167 L334 230" fill="none" stroke="'+rib+'" stroke-width="3"/>';
    extra+='<path d="M258 413 H342 Q352 413 355 429 L367 484 H233 L245 429 Q248 413 258 413Z" stroke="'+rib+'" stroke-width="3" fill="none"/>';
  } else if(garment!=="robe"){
    extra='<path d="M245 116 Q300 195 355 116" stroke="'+rib+'" stroke-width="10" fill="none"/>';
  }
  if(side==="back" && garment!=="tote")extra+='<path d="M248 125 Q300 147 352 125" fill="none" stroke="'+rib+'" stroke-width="5"/>';
  return '<path d="'+path+'" stroke="#2b2b30" stroke-width="4" fill="'+base+'" stroke-linejoin="round"/>'+extra;
}
export function fashionToSVG(project:GarmentProject,side:GarmentSide=project.view):string {
  const color=project.baseColor,rib=project.ribColor,front=side==="front";
  const motifId=front?project.motifId:project.backMotifId;
  const label=front?project.text:project.backText;
  const motif=motifId?getMotifPreset(motifId):null;
  const s=project.motifSize;
  const x=front?project.motifX:300,y=front?project.motifY:290;
  // Place artwork on top of the garment; the path itself is only a visualization.
  const artwork=motif ? (()=>{
    const mini:DesignDocument={
      version:1,id:"visual",name:"motif",format:"maquette",
      width:s,height:s,background:"#ffffff",
      elements:[{id:"1",kind:"motif",presetId:motifId,x:0,y:0,w:s,h:s}]
    };
    const svg=designToSVG(mini,true);
    return '<g transform="translate('+(x-s/2)+' '+(y-s/2)+')">'+svg+'</g>';
  })() : "";
  const text=label?'<text x="300" y="'+(y+s/2+53)+'" fill="'+project.textColor+'" font-size="29" font-weight="600" font-family="Arial,sans-serif" text-anchor="middle">'+xml(label)+'</text>':"";
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 650" width="600" height="650">'+
    '<rect width="600" height="650" fill="#efedf0"/>'+
    '<defs><clipPath id="pz-garment-clip"><path d="'+garmentPath(project.garment,project.fit)+'"/></clipPath></defs>'+
    '<ellipse cx="300" cy="601" rx="176" ry="14" fill="#000" opacity=".08"/>'+
    outline(project.garment,side,project.fit,color,rib)+
    '<g clip-path="url(#pz-garment-clip)">'+artwork+text+'</g>'+
    '<text x="30" y="618" font-size="13" font-family="Arial,sans-serif" fill="#707078">POINTZERO · '+
      xml(GARMENTS.find(g=>g.id===project.garment)?.label??"Vêtement")+' · '+(front?"Devant":"Dos")+'</text>'+
    '</svg>';
}
export function fashionTechSheet(project:GarmentProject) {
  return {
    version:1,kind:"pointzero-fashion-concept",name:project.name,garment:project.garment,
    fit:project.fit,fabric:project.fabric,sizes:project.sizes,
    color:project.baseColor,trim:project.ribColor,technique:project.technique,
    front:{motif:project.motifId,placement:{x:project.motifX,y:project.motifY,size:project.motifSize},text:project.text},
    back:{motif:project.backMotifId,text:project.backText},
    notes:project.notes,
    disclaimer:"Maquette graphique illustrative. Ne constitue ni patron de couture, ni fiche de production validée."
  };
}
