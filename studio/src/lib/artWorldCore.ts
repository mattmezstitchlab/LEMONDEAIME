/** LE MONDE AIME — atelier libre. Local-only artworks, no public accounts or diagnosis. */
import { BASE_FLOSS } from "./dmc";

export const ART_KEY="pointzero:le-monde-aime:art:v1";
export const GALLERY_KEY="pointzero:le-monde-aime:gallery:v1";
export const ART_W=1200,ART_H=760;
export type ArtTool="pencil"|"brush"|"watercolor"|"pastel"|"charcoal"|"tape"|"stencil"|"cross"|"pin"|"eraser"|"move";
export type ArtPoint={x:number;y:number};
export type ArtMark={id:string;tool:Exclude<ArtTool,"eraser"|"move">;color:string;width:number;opacity:number;points:ArtPoint[]};
export type ArtProject={version:1;id:string;title:string;alias:string;paper:"ivory"|"white"|"sand"|"night";marks:ArtMark[];updated:string};
export type GalleryItem={id:string;title:string;created:string;project:ArtProject;visibility:"private"};
export const ART_TOOLS:{id:ArtTool;name:string;description:string}[]=[
  {id:"pencil",name:"Crayon",description:"Trait précis"},
  {id:"brush",name:"Pinceau",description:"Peinture souple"},
  {id:"watercolor",name:"Aquarelle",description:"Lavis léger"},
  {id:"pastel",name:"Pastel",description:"Matière poudrée"},
  {id:"charcoal",name:"Fusain",description:"Trait sombre"},
  {id:"tape",name:"Ruban adhésif",description:"Masque ou bande"},
  {id:"stencil",name:"Pochoir",description:"Contour tampon"},
  {id:"cross",name:"Point de croix",description:"Motif DMC"},
  {id:"pin",name:"Pin",description:"Point mobile"},
  {id:"eraser",name:"Gomme",description:"Effacer un élément"},
  {id:"move",name:"Déplacer",description:"Déplacer une création"}
];
export const ART_PAPERS:{id:ArtProject["paper"];name:string;color:string}[]=[
  {id:"ivory",name:"Papier ivoire",color:"#faf8f3"},
  {id:"white",name:"Papier blanc",color:"#ffffff"},
  {id:"sand",name:"Papier naturel",color:"#e8ded0"},
  {id:"night",name:"Papier nuit",color:"#1c202a"}
];
export type ToolConfig={tool:ArtTool;color:string;width:number;opacity:number;message:string};
export const artId=()=>globalThis.crypto?.randomUUID?.()??Math.random().toString(36).slice(2);
const date=()=>new Date().toISOString().slice(0,10);
export const makeArt=():ArtProject=>({version:1,id:artId(),title:"Un amour, une toile, un monde",alias:"",paper:"ivory",marks:[],updated:date()});
const validHex=(v:unknown)=>typeof v==="string"&&/^#[a-f0-9]{6}$/i.test(v);
const finite=(n:unknown,min:number,max:number)=>typeof n==="number"&&Number.isFinite(n)&&n>=min&&n<=max;
export function safeArt(raw:unknown):ArtProject|null{
  if(!raw||typeof raw!=="object")return null;
  const p=raw as Partial<ArtProject>;
  if(p.version!==1||typeof p.id!=="string"||p.id.length>100||typeof p.title!=="string"||p.title.length>120||
    typeof p.alias!=="string"||p.alias.length>80||!ART_PAPERS.some(x=>x.id===p.paper)||
    typeof p.updated!=="string"||p.updated.length>30||!Array.isArray(p.marks)||p.marks.length>2000)return null;
  const used=new Set<string>();
  for(const m of p.marks){
    if(!m||typeof m.id!=="string"||m.id.length>100||used.has(m.id)||!ART_TOOLS.filter(t=>t.id!=="move"&&t.id!=="eraser").some(t=>t.id===m.tool)||
      !validHex(m.color)||!finite(m.width,1,120)||!finite(m.opacity,0,1)||!Array.isArray(m.points)||m.points.length<1||m.points.length>1500)return null;
    used.add(m.id);
    if(m.points.some(v=>!v||!finite(v.x,0,ART_W)||!finite(v.y,0,ART_H)))return null;
  }
  return p as ArtProject;
}
export const safeGallery=(raw:unknown):GalleryItem[]=>{
  if(!Array.isArray(raw)||raw.length>16)return [];
  const items:GalleryItem[]=[];
  for(const v of raw){
    if(!v||typeof v!=="object")return [];
    const i=v as Partial<GalleryItem>;
    const project=safeArt(i.project);
    if(!project||typeof i.id!=="string"||i.id.length>100||typeof i.title!=="string"||i.title.length>120||
      typeof i.created!=="string"||i.created.length>30||i.visibility!=="private")return [];
    items.push({...i,project} as GalleryItem);
  }
  return items;
};
export const artColor=(index:number)=>BASE_FLOSS[index]?.hex??"#334155";
export const ART_DMC_FAVORITES=["310","B5200","3865","321","815","761","963","820","996","703","3348","3820","742","550","209","3766","413"];
export function requestArtTool(request:string,previous:ToolConfig):ToolConfig|null{
  const normalized=request.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim().slice(0,220);
  if(normalized.length<3)return null;
  const match=ART_TOOLS.find(t=>{
    const terms:Record<ArtTool,string[]>={pencil:["crayon","stylo","graphite"],brush:["pinceau","brush","peinture","acrylique"],watercolor:["aquarelle","lavis"],pastel:["pastel","craie"],charcoal:["fusain","charbon"],tape:["scotch","adhesif","ruban","masking"],stencil:["pochoir","tampon"],cross:["broder","point de croix"],pin:["pin","epingle","point mobile"],eraser:["gomme","effac"],move:["deplac","main"]};
    return terms[t.id].some(word=>normalized.includes(word));
  });
  if(!match)return null;
  const hues:{words:string[];color:string}[]=[
    {words:["bleu fonce","bleu marine","indigo","navy"],color:"#173465"},
    {words:["bleu"],color:"#417dc5"},{words:["rose"],color:"#d77d9e"},
    {words:["rouge"],color:"#c4454d"},{words:["vert"],color:"#458663"},
    {words:["jaune"],color:"#e3b94f"},{words:["violet"],color:"#8666b3"},
    {words:["orange"],color:"#e58d47"},{words:["blanc"],color:"#ffffff"},
    {words:["noir"],color:"#222222"},{words:["gris"],color:"#72777f"}
  ];
  const color=hues.find(x=>x.words.some(word=>normalized.includes(word)))?.color??previous.color;
  const width=normalized.includes("fin")?3:normalized.includes("epais")||normalized.includes("large")?33:
    ({pencil:4,brush:14,watercolor:34,pastel:19,charcoal:12,tape:34,stencil:28,cross:14,pin:12,eraser:25,move:12} as Record<ArtTool,number>)[match.id];
  const opacity=match.id==="watercolor"?.34:match.id==="pastel"?.64:match.id==="tape"?.5:1;
  return {tool:match.id,color,width,opacity,message:match.name+" préparé"+(color!==previous.color?" avec la couleur demandée":"")+". L'outil est disponible dans l'atelier."};
}
const xml=(s:string)=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const fixed=(n:number)=>Number(n.toFixed(1));
const line=(p:ArtPoint[])=>p.map((v,i)=>(i?"L ":"M ")+fixed(v.x)+" "+fixed(v.y)).join(" ");
const circle=(p:ArtPoint,r:number,fill:string,alpha:number)=>'<circle cx="'+fixed(p.x)+'" cy="'+fixed(p.y)+'" r="'+fixed(r)+'" fill="'+fill+'" opacity="'+alpha+'"/>';
/** Pure HTML-escaped SVG: preview, gallery and exports all render the exact same marks. */
export function artMarkSVG(mark:ArtMark):string{
  const p=mark.points,origin=p[0];
  const stroke='stroke="'+mark.color+'" stroke-width="'+mark.width+'" opacity="'+mark.opacity+'" stroke-linecap="round" stroke-linejoin="round"';
  if(mark.tool==="pin")return circle(origin,mark.width/1.7,mark.color,mark.opacity)+circle({x:origin.x-mark.width/5,y:origin.y-mark.width/5},mark.width/5,"#ffffff",.65);
  if(mark.tool==="cross"){
    const n=mark.width/2;
    return '<g '+stroke+'><path d="M '+fixed(origin.x-n)+' '+fixed(origin.y-n)+' l '+fixed(2*n)+' '+fixed(2*n)+' M '+fixed(origin.x+n)+' '+fixed(origin.y-n)+' l -'+fixed(2*n)+' '+fixed(2*n)+'" fill="none"/></g>';
  }
  if(mark.tool==="stencil")return '<circle cx="'+fixed(origin.x)+'" cy="'+fixed(origin.y)+'" r="'+fixed(mark.width)+'" fill="none" '+stroke+' stroke-dasharray="8 4"/>';
  if(mark.tool==="tape"){
    const last=p[p.length-1]??origin;
    return '<path d="'+line([origin,last])+'" fill="none" stroke="'+mark.color+'" stroke-width="'+mark.width+'" stroke-linecap="butt" stroke-opacity="'+Math.min(mark.opacity,.6)+'"/>'+
      '<path d="'+line([origin,last])+'" fill="none" stroke="#ffffff" stroke-opacity=".5" stroke-width="1.5" stroke-dasharray="4 4"/>';
  }
  if(p.length===1)return circle(origin,mark.width/2,mark.color,mark.opacity);
  const base='<path d="'+line(p)+'" fill="none" '+stroke+(mark.tool==="pastel"?' stroke-dasharray="3 1"':"")+'/>';
  if(mark.tool==="watercolor")return '<g filter="url(#art-wash)">'+base+'</g>'+base;
  if(mark.tool==="charcoal")return base+'<path d="'+line(p)+'" fill="none" stroke="#222222" stroke-width="'+fixed(mark.width*.3)+'" opacity=".24"/>';
  return base;
}
export function artToSVG(project:ArtProject,options?:{framed?:boolean}):string{
  const paper=ART_PAPERS.find(p=>p.id===project.paper)?.color??"#faf8f3";
  const def='<defs><filter id="art-wash" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3.5"/></filter></defs>';
  const outer=options?.framed?'<rect x="20" y="20" width="1160" height="720" fill="none" stroke="#b5a188" stroke-width="20"/>'+
    '<rect x="52" y="52" width="1096" height="656" fill="none" stroke="#fff" stroke-width="17"/>':"";
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+ART_W+" "+ART_H+'" width="'+ART_W+'" height="'+ART_H+'" role="img" aria-label="'+xml(project.title)+'">'+
    def+'<rect width="'+ART_W+'" height="'+ART_H+'" fill="'+paper+'"/>'+project.marks.map(artMarkSVG).join("")+outer+'</svg>';
}
export function artPaletteAnalysis(p:ArtProject){
  const count=p.marks.length;
  const colors=[...new Set(p.marks.map(m=>m.color))];
  const center=p.marks.reduce((sum,m)=>sum+(m.points[0]?.x??ART_W/2),0)/Math.max(1,count);
  const symmetry=count?Math.max(0,100-Math.round(Math.abs(center-ART_W/2)/ART_W*200)):0;
  return {marks:count,colors,center,symmetry,materials:[...new Set(p.marks.map(m=>m.tool))]};
}
export function dmcSound(code:string,hex:string):{midi:number;duration:number}{
  const num=parseInt(code.replace(/\D/g,""),10)||0;
  const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  const max=Math.max(...rgb),min=Math.min(...rgb),sat=max-min;
  const degrees=[0,2,4,7,9];
  return {midi:48+12*(max>185?2:max>100?1:0)+degrees[(num+sat)%5],duration:.32};
}
