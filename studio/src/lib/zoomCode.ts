import {createPattern,clonePattern,ensurePalette,toObject,type Pattern} from './pattern';
import {FLOSS,flossIndex} from './dmc';
import {patternToSvg} from './svg';
export function demoZoomPattern():Pattern {
 const p=createPattern('Recherche POINTZERO — motif 8 × 8',8,8,14,2);
 const color=flossIndex('321');ensurePalette(p,color);
 for(const i of [19,20,26,27,28,29,34,35,36,37,43,44])p.cross[i]=color;
 return p;
}
export function cellInfo(p:Pattern,index:number){
 if(!Number.isInteger(index)||index<0||index>=p.w*p.h)throw Error('Cellule inconnue');
 const idx=p.cross[index],floss=idx>=0?FLOSS[idx]:null;
 return {id:`${p.id}:cross:${index}`,sourceId:p.id,x:index%p.w,y:Math.floor(index/p.w),type:'cross',thread:floss?.code??null,screenColor:floss?.hex??null,
 explanation:floss?'Cette case propose une croix avec ce fil. Sa couleur à l’écran est indicative.':'Cette case est vide. Vous pouvez proposer un fil avant de confirmer.'};
}
export function editZoomCell(p:Pattern,index:number,code:string):Pattern {
 cellInfo(p,index);const idx=code.trim()===''?-1:flossIndex(code.trim());
 if(code.trim()!==''&&idx<0)throw Error('Référence de fil inconnue');
 const next=clonePattern(p);next.cross[index]=idx;if(idx>=0)ensurePalette(next,idx);return next;
}
export function zoomSVG(p:Pattern):string {return patternToSvg(p,{symbols:false,grid:true,legend:false,cell:24}).svg;}
export function zoomHTML(p:Pattern):string {
 return `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Motif POINTZERO</title><style>body{margin:0;padding:24px;font:16px/1.6 Arial;background:#fafafa;color:#161616}main{max-width:800px;margin:auto}svg{display:block;width:100%;height:auto}p{overflow-wrap:anywhere}</style><main><h1>Un motif, une représentation graphique</h1>${zoomSVG(p)}<p>Projection statique du même Pattern. Pas une conversion en application web interactive. Couleurs de fils indicatives.</p></main></html>`;
}
export function zoomJSON(p:Pattern){return JSON.stringify(toObject(p),null,2)}
