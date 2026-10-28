/** Local-first document preparation, not certified invoicing or e-signature. */
import { artToSVG, safeArt, type ArtProject } from "./artWorldCore";
export type DocumentArtTheme="none"|"nature"|"floral"|"abstract"|"my-art";
export const documentArtThemes:{id:DocumentArtTheme;label:string}[]=[
 {id:"none",label:"Blanc classique"},{id:"nature",label:"Nature douce"},
 {id:"floral",label:"Floral"},{id:"abstract",label:"Abstrait"}, {id:"my-art",label:"Ma toile LE MONDE AIME"}
];
export type AdminDocKind="devis"|"facture"|"contrat"|"attestation"|"courrier";
export type AdminDocState="brouillon"|"à vérifier"|"finalisé";
export interface DocumentItem {id:string;title:string;quantity:number;unitCents:number}
export interface AdminDocument {
  id:string;kind:AdminDocKind;state:AdminDocState;reference:string;title:string;
  issuer:string;issuerAddress:string;issuerContact:string;
  recipient:string;recipientAddress:string;
  issueDate:string;dueDate:string;projectId:string;
  subject:string;body:string;items:DocumentItem[];vatRate:number;currency:"EUR";
  paymentTerms:string;footer:string;sourceId:string;artTheme?:DocumentArtTheme;
}
export interface AdminStore {version:1;documents:AdminDocument[]}
export const ADMIN_STORAGE="pointzero:admin:v1";
const uid=()=>globalThis.crypto?.randomUUID?.()??Math.random().toString(36).slice(2);
export const docKinds:{id:AdminDocKind;label:string}[]=[
  {id:"devis",label:"Devis"},{id:"facture",label:"Facture"},{id:"contrat",label:"Contrat"},
  {id:"attestation",label:"Attestation"},{id:"courrier",label:"Courrier"}
];
const safeText=(s:unknown,max=2000)=>typeof s==="string"&&s.length<=max;
export function createAdminDocument(kind:AdminDocKind,projectId=""):AdminDocument{
  const now=new Date(),date=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0")+"-"+String(now.getDate()).padStart(2,"0");
  const prefix:{[K in AdminDocKind]:string}={devis:"DEV",facture:"FAC",contrat:"CTR",attestation:"ATT",courrier:"CRR"};
  const n=Math.floor(Math.random()*90000)+10000;
  return {
    id:uid(),kind,state:"brouillon",reference:prefix[kind]+"-"+now.getFullYear()+"-"+n,
    title:docKinds.find(k=>k.id===kind)?.label??"Document",
    issuer:"",issuerAddress:"",issuerContact:"",recipient:"",recipientAddress:"",
    issueDate:date,dueDate:date,projectId,subject:"",body:"",items:kind==="devis"||kind==="facture"?[{id:uid(),title:"Prestation",quantity:1,unitCents:0}]:[],
    vatRate:0,currency:"EUR",paymentTerms:"",footer:"Document à vérifier avant toute utilisation officielle.",sourceId:"",artTheme:"none"
  };
}
export function documentTotals(doc:AdminDocument){
  const subtotal=Math.round(doc.items.reduce((sum,i)=>sum+i.quantity*i.unitCents,0));
  const vat=Math.round(subtotal*doc.vatRate/100);
  return {subtotal,vat,total:subtotal+vat};
}
export function duplicateAsInvoice(source:AdminDocument):AdminDocument {
  const next=createAdminDocument("facture",source.projectId);
  return {...next,issuer:source.issuer,issuerAddress:source.issuerAddress,issuerContact:source.issuerContact,
    recipient:source.recipient,recipientAddress:source.recipientAddress,
    title:"Facture · "+source.subject,subject:source.subject,body:source.body,artTheme:source.artTheme??"none",
    items:source.items.map(i=>({...i,id:uid()})),vatRate:source.vatRate,paymentTerms:source.paymentTerms,sourceId:source.id};
}
export function safeAdminStore(raw:unknown):AdminStore|null {
  if(!raw||typeof raw!=="object")return null;
  const store=raw as Partial<AdminStore>;
  if(store.version!==1||!Array.isArray(store.documents)||store.documents.length>400)return null;
  const known=new Set<string>();
  for(const d of store.documents){
    if(!d||typeof d.id!=="string"||d.id.length>120||known.has(d.id)||
      !docKinds.some(k=>k.id===d.kind)||!["brouillon","à vérifier","finalisé"].includes(d.state)||
      !safeText(d.reference,100)||!safeText(d.title,200)||!safeText(d.issuer,300)||!safeText(d.issuerAddress,1500)||
      !safeText(d.issuerContact,500)||!safeText(d.recipient,300)||!safeText(d.recipientAddress,1500)||
      !/^\d{4}-\d{2}-\d{2}$/.test(d.issueDate)||!/^\d{4}-\d{2}-\d{2}$/.test(d.dueDate)||
      !safeText(d.projectId,120)||!safeText(d.subject,1000)||!safeText(d.body,20000)||
      !safeText(d.paymentTerms,3000)||!safeText(d.footer,3000)||!safeText(d.sourceId,120)||
      d.currency!=="EUR"||![0,2.1,5.5,10,20].includes(d.vatRate)||(d.artTheme!==undefined&&!documentArtThemes.some(t=>t.id===d.artTheme))||!Array.isArray(d.items)||d.items.length>150)return null;
    known.add(d.id);
    for(const i of d.items){
      if(!i||typeof i.id!=="string"||i.id.length>120||!safeText(i.title,500)||
        !Number.isFinite(i.quantity)||i.quantity<=0||i.quantity>100000||
        !Number.isSafeInteger(i.unitCents)||i.unitCents<0||i.unitCents>100_000_000_000)return null;
    }
  }
  return store as AdminStore;
}
const esc=(s:string)=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const eur=(cents:number)=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"}).format(cents/100);
export const documentArtBackground=(theme:DocumentArtTheme|undefined):string=>{
  if(theme==="nature")return "radial-gradient(ellipse at 86% 22%, rgba(121,177,127,.20), transparent 40%), radial-gradient(ellipse at 9% 89%, rgba(154,192,132,.12), transparent 35%)";
  if(theme==="floral")return "radial-gradient(circle at 85% 14%, rgba(222,148,170,.25), transparent 19%), radial-gradient(circle at 76% 20%, rgba(226,173,185,.18), transparent 15%), radial-gradient(circle at 94% 26%, rgba(148,191,143,.17), transparent 17%)";
  if(theme==="abstract")return "radial-gradient(ellipse at 88% 20%, rgba(123,151,206,.24), transparent 37%), radial-gradient(ellipse at 15% 82%, rgba(214,184,154,.18), transparent 29%)";
  return "none";
};
export function docToHTML(d:AdminDocument,art?:ArtProject|null):string{
  const totals=documentTotals(d);
  const monetary=d.kind==="devis"||d.kind==="facture";
  const safeArtwork=d.artTheme==="my-art"?safeArt(art):null;
  const artworkTag=safeArtwork?'<img class="artwork" alt="" src="data:image/svg+xml;charset=utf-8,'+encodeURIComponent(artToSVG(safeArtwork))+'">':"";
  const deco=esc(documentArtBackground(d.artTheme));
  const lines=monetary?'<table><thead><tr><th>Désignation</th><th>Qté</th><th>Prix unitaire</th><th>Total</th></tr></thead><tbody>'+
    d.items.map(i=>'<tr><td>'+esc(i.title)+'</td><td>'+i.quantity+'</td><td>'+eur(i.unitCents)+'</td><td>'+eur(Math.round(i.unitCents*i.quantity))+'</td></tr>').join("")+
    '</tbody></table><div class="totals"><div>Sous-total : '+eur(totals.subtotal)+'</div><div>TVA ('+d.vatRate+' %) : '+eur(totals.vat)+'</div><strong>Total : '+eur(totals.total)+'</strong></div>':"";
  return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+
    esc(d.reference)+'</title><style>@page{size:A4;margin:20mm}body{font:14px/1.5 Arial,sans-serif;color:#18181b;max-width:800px;margin:22px auto;padding:0 20px}'+
    'header{display:flex;justify-content:space-between;gap:30px;border-bottom:2px solid #18181b;padding-bottom:22px}h1{font-size:32px;margin:4px 0 0}h2{font-size:16px}.meta{color:#555}'+
    '.parties{display:flex;gap:30px;margin:30px 0}.parties>div{flex:1}.pre{white-space:pre-wrap;overflow-wrap:anywhere}'+
    'table{border-collapse:collapse;width:100%;margin:28px 0}th,td{text-align:left;padding:9px 5px;border-bottom:1px solid #ddd}th{font-size:12px}'+
    '.totals{text-align:right;margin:10px 0 25px;line-height:2}.body{white-space:pre-wrap;overflow-wrap:anywhere;margin:30px 0;min-height:80px}footer{border-top:1px solid #ddd;'+
    'padding-top:12px;color:#666;font-size:11px;margin-top:55px;white-space:pre-wrap}'+
    '.sheet{position:relative;isolation:isolate;min-height:980px;background-image:var(--deco);-webkit-print-color-adjust:exact;print-color-adjust:exact}.sheet .artwork{position:absolute;z-index:-1;pointer-events:none;inset:0;width:100%;height:100%;object-fit:contain;opacity:.085}'+
    '</style></head><body><div class="sheet" style="--deco:'+deco+'">'+artworkTag+'<header><div><small>POINTZERO · Administration</small><h1>'+
    esc(d.title||(docKinds.find(k=>k.id===d.kind)?.label??"Document"))+'</h1><div class="meta">'+esc(d.reference)+'</div></div><div class="meta">Émis le '+esc(d.issueDate)+
    (monetary?'<div>Échéance : '+esc(d.dueDate)+'</div>':"")+'</div></header><div class="parties"><div><h2>Émetteur</h2><div class="pre">'+esc(d.issuer)+
    '\n'+esc(d.issuerAddress)+'\n'+esc(d.issuerContact)+'</div></div><div><h2>Destinataire</h2><div class="pre">'+esc(d.recipient)+'\n'+esc(d.recipientAddress)+
    '</div></div></div><h2>'+esc(d.subject)+'</h2>'+lines+'<div class="body">'+esc(d.body)+'</div>'+
    '<div class="pre">'+esc(d.paymentTerms)+'</div><footer>'+esc(d.footer)+'</footer></div></body></html>';
}
