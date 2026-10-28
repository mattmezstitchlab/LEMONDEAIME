import { FLOSS, flossIndex, nearestFloss } from "./dmc";
import { clonePattern, compositePattern, createPattern, ensurePalette, fromObject, makeId, toObject, type Pattern, type Seg } from "./pattern";
import { clearSelection, extractSelection, pasteSelection } from "./editing";

export interface SubjectLayer {
  id: string;
  name: string;
  /** Values in source grid cells, may extend partially beyond the canvas. */
  x: number;
  y: number;
  scale: number;
  visible: boolean;
  locked: boolean;
  /** Self-contained native POINTZERO Pattern JSON (DMC code table included). */
  sprite: string;
  tint?: string;
  origin: "auto" | "manual" | "library";
}
export interface SubjectScene {
  version: 1;
  /** Never alter this original. Serialized by the existing native Pattern codec. */
  source: string;
  /** Source minus extracted cells; keeps tiny unassigned details and background. */
  backdrop: string;
  layers: SubjectLayer[];
  warnings: string[];
  depth?: "naturelle" | "renforcee";
}
export interface SubjectAnalysis {
  scene: SubjectScene;
  detected: number;
  residual: number;
  sourceCount: number;
  warnings: string[];
}
export interface Bounds { x: number; y: number; w: number; h: number }
const MAX_CELLS = 250_000;
const MAX_SUBJECTS = 16;
const spriteCache = new Map<string, Pattern>();
const read = (raw: string): Pattern => {
  const cached = spriteCache.get(raw);
  if(cached)return cached;
  const parsed=fromObject(JSON.parse(raw));
  if(!parsed)throw new Error("Composant de broderie invalide.");
  if(spriteCache.size >= 20)spriteCache.delete(spriteCache.keys().next().value!);
  spriteCache.set(raw,parsed);
  return parsed;
};
const enc = (p: Pattern) => JSON.stringify(toObject({...p,subjectScene:undefined}));
const count = (p:Pattern) => p.cross.reduce((n,v)=>n+Number(v>=0),0);
const active = (p:Pattern,i:number) => p.cross[i]>=0 || p.fwd[i]>=0 || p.bwd[i]>=0 || p.q.some(a=>a[i]>=0);
const inside = (x:number,y:number,p:Pattern) => x>=0&&y>=0&&x<p.w&&y<p.h;
const at = (x:number,y:number,p:Pattern) => y*p.w+x;
const boxOf=(layer:SubjectLayer):Bounds=>{
  const p=read(layer.sprite);
  return {x:layer.x,y:layer.y,w:Math.max(1,Math.ceil(p.w*layer.scale)),h:Math.max(1,Math.ceil(p.h*layer.scale))};
};

/**
 * Foreground-object candidate segmentation, not semantic object recognition.
 * Proximity connects adjacent multi-colour patches without changing the
 * actual source pixels. Smaller fragments remain in the backdrop.
 */
export function detectSubjects(input:Pattern, minSize=10):SubjectAnalysis {
  const p=compositePattern(input);
  if(p.w*p.h>MAX_CELLS)throw new Error("Analyse limitée à 250 000 cases. Utilisez un découpage manuel.");
  const n=p.w*p.h,seen=new Uint8Array(n),groups:number[][]=[];
  let sourceCount=0;
  for(let i=0;i<n;i++)if(active(p,i))sourceCount++;
  for(let i=0;i<n;i++){
    if(seen[i]||!active(p,i))continue;
    const queue=[i];seen[i]=1;
    for(let k=0;k<queue.length;k++){
      const pos=queue[k],x=pos%p.w,y=Math.floor(pos/p.w);
      // Geometric proximity radius 2: one stitch gap remains unchanged,
      // only candidate masks are grouped.
      for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
        if(Math.abs(dx)+Math.abs(dy)>3)continue;
        const xx=x+dx,yy=y+dy;
        if(!inside(xx,yy,p))continue;
        const j=at(xx,yy,p);
        if(!seen[j]&&active(p,j)){seen[j]=1;queue.push(j);}
      }
    }
    groups.push(queue);
  }
  groups.sort((a,b)=>b.length-a.length||a[0]-b[0]);
  const large=groups.filter(g=>g.length>=minSize).slice(0,MAX_SUBJECTS);
  const warnings:string[]=[];
  if(groups.length>large.length)warnings.push("Petits détails et régions non sélectionnées conservés dans le fond, jamais supprimés.");
  if(large.length===1)warnings.push("Un seul groupe géométrique : plusieurs objets peuvent se toucher. Une séparation manuelle est nécessaire.");
  if(!large.length)warnings.push("Aucun groupe séparé suffisamment grand : essayez un cadrage manuel.");
  const background=clonePattern(p);
  background.layers=[];background.activeLayer=undefined;background.composition=undefined;background.subjectScene=undefined;
  const layers:SubjectLayer[]=[];
  for(let gi=0;gi<large.length;gi++){
    const group=large[gi];
    const mask=new Set(group);
    let x0=p.w,y0=p.h,x1=0,y1=0;
    for(const cell of group){
      const x=cell%p.w,y=Math.floor(cell/p.w);
      x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);
      background.cross[cell]=background.fwd[cell]=background.bwd[cell]=-1;
      for(const q of background.q)q[cell]=-1;
      background.done[cell]=0;
    }
    const w=x1-x0+1,h=y1-y0+1;
    const sprite=createPattern("Sujet "+(gi+1),w,h,p.count,p.strands);
    sprite.provenance=p.provenance;sprite.fabric=p.fabric;
    for(const i of group){
      const x=i%p.w,y=Math.floor(i/p.w),local=(y-y0)*w+(x-x0);
      sprite.cross[local]=p.cross[i];sprite.fwd[local]=p.fwd[i];sprite.bwd[local]=p.bwd[i];
      sprite.done[local]=p.done[i];
      for(let q=0;q<4;q++)sprite.q[q][local]=p.q[q][i];
    }
    // An existing contour is assigned only when both its endpoints and the
    // midpoint are inside this object; crossing contours stay in the backdrop.
    const owns=(x:number,y:number)=>inside(Math.floor(x),Math.floor(y),p) && mask.has(at(Math.floor(x),Math.floor(y),p));
    const keepSeg=(s:Seg)=>owns(s.x1,s.y1)&&owns(s.x2,s.y2)&&owns((s.x1+s.x2)/2,(s.y1+s.y2)/2);
    const offsets=(s:Seg)=>({...s,x1:s.x1-x0,x2:s.x2-x0,y1:s.y1-y0,y2:s.y2-y0});
    sprite.back=p.back.filter(keepSeg).map(offsets);sprite.long=p.long.filter(keepSeg).map(offsets);
    background.back=background.back.filter(s=>!keepSeg(s));
    background.long=background.long.filter(s=>!keepSeg(s));
    sprite.knots=p.knots.filter(k=>owns(k.x,k.y)).map(k=>({...k,x:k.x-x0,y:k.y-y0}));
    sprite.special=p.special?.filter(k=>owns(k.x,k.y)).map(k=>({...k,x:k.x-x0,y:k.y-y0}));
    background.knots=background.knots.filter(k=>!owns(k.x,k.y));
    background.special=background.special?.filter(k=>!owns(k.x,k.y));
    sprite.palette=[];
    const colors=new Set<number>([...sprite.cross,...sprite.fwd,...sprite.bwd,...sprite.q.flatMap(q=>Array.from(q)),...sprite.back.map(s=>s.c),...sprite.knots.map(k=>k.c)]);
    for(const c of colors)if(c>=0&&FLOSS[c])ensurePalette(sprite,c);
    layers.push({id:"auto-"+gi+"-"+group[0],name:"Sujet "+(gi+1),x:x0,y:y0,scale:1,visible:true,locked:false,
      sprite:enc(sprite),origin:"auto"});
  }
  const original={...p,subjectScene:undefined};
  const scene:SubjectScene={version:1,source:enc(original),backdrop:enc(background),layers,warnings};
  return {scene,detected:layers.length,residual:sourceCount-large.reduce((v,g)=>v+g.length,0),sourceCount,warnings};
}

export function changeSubject(scene:SubjectScene,id:string,patch:Partial<Pick<SubjectLayer,"name"|"x"|"y"|"scale"|"visible"|"locked"|"tint">>):SubjectScene {
  return {...scene,layers:scene.layers.map(s=>{
    if(s.id!==id)return s;
    if(s.locked && ("x" in patch || "y" in patch || "scale" in patch || "tint" in patch))return s;
    return {...s,...patch,x:patch.x===undefined?s.x:Math.max(-1000,Math.min(1000,Math.round(patch.x))),
      y:patch.y===undefined?s.y:Math.max(-1000,Math.min(1000,Math.round(patch.y))),
      scale:patch.scale===undefined?s.scale:Math.max(.25,Math.min(3,patch.scale))};
  })};
}
export function reorderSubject(scene:SubjectScene,id:string,delta:number):SubjectScene {
  const i=scene.layers.findIndex(l=>l.id===id),j=i+delta;
  if(i<0||j<0||j>=scene.layers.length)return scene;
  const layers=scene.layers.slice();[layers[i],layers[j]]=[layers[j],layers[i]];
  return {...scene,layers};
}
/** Remove only an editable sprite; original source snapshot is untouched. */
export function removeSubject(scene:SubjectScene,id:string):SubjectScene {
  const target=scene.layers.find(l=>l.id===id);
  if(!target)return scene;
  if(target.locked)throw new Error("Déverrouillez le sujet avant de le retirer.");
  return {...scene,layers:scene.layers.filter(l=>l.id!==id)};
}
export function duplicateSubject(scene:SubjectScene,id:string):SubjectScene {
  const i=scene.layers.findIndex(l=>l.id===id);
  if(i<0||scene.layers.length>=MAX_SUBJECTS)return scene;
  const subject=scene.layers[i];
  const next={...subject,id:makeId(),name:subject.name+" · copie",x:subject.x+4,y:subject.y+4,origin:"manual" as const};
  return {...scene,layers:[...scene.layers.slice(0,i+1),next,...scene.layers.slice(i+1)]};
}

/** Manual split keeps both halves editable; no source cell is discarded. */
export function splitSubject(scene:SubjectScene,id:string,rect:Bounds):SubjectScene {
  const i=scene.layers.findIndex(l=>l.id===id);
  if(i<0)throw new Error("Sujet introuvable.");
  const layer=scene.layers[i];
  if(layer.locked)throw new Error("Sujet verrouillé.");
  if(layer.scale!==1)throw new Error("Remettez l'échelle à 100 % avant la séparation.");
  const source=read(layer.sprite);
  const box:Bounds={x:Math.max(0,Math.floor(rect.x)),y:Math.max(0,Math.floor(rect.y)),w:Math.max(1,Math.floor(rect.w)),h:Math.max(1,Math.floor(rect.h))};
  if(box.x+box.w>source.w||box.y+box.h>source.h)throw new Error("Séparation hors du sujet.");
  const part=extractSelection(source,box);
  if(!count(part))throw new Error("Aucun point dans cette sélection.");
  const remainder=clearSelection(source,box);
  if(!count(remainder))throw new Error("Impossible de séparer la totalité du sujet.");
  const next:SubjectLayer={...layer,id:makeId(),name:layer.name+" · extrait",x:layer.x+box.x,y:layer.y+box.y,sprite:enc(part),origin:"manual"};
  const layers=scene.layers.slice();
  layers[i]={...layer,sprite:enc(remainder)};
  layers.splice(i+1,0,next);
  return {...scene,layers,warnings:[...scene.warnings,"Vérifiez les contours traversant la limite de séparation."]};
}
export function mergeSubjects(scene:SubjectScene,first:string,second:string):SubjectScene {
  if(first===second)throw new Error("Choisissez deux sujets distincts.");
  const a=scene.layers.find(x=>x.id===first),b=scene.layers.find(x=>x.id===second);
  if(!a||!b)throw new Error("Sujets introuvables.");
  if(a.locked||b.locked)throw new Error("Déverrouillez les sujets avant de les fusionner.");
  if(a.scale!==1||b.scale!==1)throw new Error("Fusionnez à une échelle de 100 %.");
  const pa=read(a.sprite),pb=read(b.sprite);
  const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y);
  const w=Math.max(a.x+pa.w,b.x+pb.w)-x,h=Math.max(a.y+pa.h,b.y+pb.h)-y;
  if(w>1000||h>1000||w*h>MAX_CELLS)throw new Error("Dimensions de fusion trop grandes.");
  const canvas=createPattern(a.name+" + "+b.name,w,h,pa.count,pa.strands);
  const afterA=pasteSelection(canvas,pa,a.x-x,a.y-y);
  const merged=pasteSelection(afterA,pb,b.x-x,b.y-y);
  const layer:SubjectLayer={...a,id:makeId(),name:merged.name,x,y,scale:1,sprite:enc(merged),origin:"manual"};
  const index=Math.min(scene.layers.findIndex(s=>s.id===first),scene.layers.findIndex(s=>s.id===second));
  const layers=scene.layers.filter(s=>s.id!==first&&s.id!==second);
  layers.splice(index,0,layer);
  return {...scene,layers};
}

/** Adds a reusable independent native Pattern onto the current scene. */
export function attachSubject(scene:SubjectScene,component:Pattern,x=0,y=0):SubjectScene {
  if(scene.layers.length>=MAX_SUBJECTS)throw new Error("16 sujets maximum dans cette version.");
  if(component.w*component.h>MAX_CELLS)throw new Error("Composant trop grand.");
  const sprite=compositePattern(component);
  const layer:SubjectLayer={id:makeId(),name:component.name.slice(0,80),x:Math.round(x),y:Math.round(y),
    scale:1,visible:true,locked:false,origin:"library",sprite:enc({...sprite,layers:[],subjectScene:undefined,composition:undefined})};
  return {...scene,layers:[...scene.layers,layer]};
}

function recolored(idx:number,tint:string|undefined,cache:Map<number,number>):number {
  if(idx<0||!tint)return idx;
  const mapped=cache.get(idx);
  if(mapped!==undefined)return mapped;
  const dest=FLOSS.find(f=>f.code===tint);
  if(!dest)return idx;
  const source=FLOSS[idx];if(!source)return idx;
  const lab:[number,number,number]=[Math.max(0,Math.min(100,source.lab[0]+(dest.lab[0]-50)*.65)),dest.lab[1],dest.lab[2]];
  const out=nearestFloss(lab);cache.set(idx,out);return out;
}

/**
 * Recompose from transparent native subjects, retaining backstitches and
 * fractional stitches. Order is the sole overlap rule. PDF/Canvas consume
 * exactly the Pattern returned here; no secondary PDF renderer.
 */
export function recomposeSubjects(scene:SubjectScene, previous?:Pattern, dirty?:Bounds):Pattern {
  if(scene.version!==1||scene.layers.length>MAX_SUBJECTS)throw new Error("Scène de broderie invalide.");
  const base=read(scene.backdrop),source=read(scene.source);
  if(base.w*base.h>MAX_CELLS)throw new Error("Grille trop grande.");
  const partial=!!previous&&!!dirty &&
    previous.subjectScene?.source===scene.source &&
    previous.subjectScene?.backdrop===scene.backdrop &&
    previous.w===base.w && previous.h===base.h &&
    Number.isFinite(dirty.x)&&Number.isFinite(dirty.y)&&dirty.w>0&&dirty.h>0;
  const out=clonePattern(partial?previous!:base);
  if(partial){
    const x0=Math.max(0,Math.floor(dirty!.x)),y0=Math.max(0,Math.floor(dirty!.y));
    const x1=Math.min(base.w,Math.ceil(dirty!.x+dirty!.w));
    const y1=Math.min(base.h,Math.ceil(dirty!.y+dirty!.h));
    // Rebuild ONLY the affected cells from the immutable background. All
    // overlapping sprites touching this rectangle will be repainted below.
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
      const i=at(x,y,base);
      out.cross[i]=base.cross[i];out.fwd[i]=base.fwd[i];out.bwd[i]=base.bwd[i];
      out.done[i]=base.done[i];
      for(let q=0;q<4;q++)out.q[q][i]=base.q[q][i];
    }
    // Ornaments must stay consistent even when they cross a dirty rectangle.
    // Recreating these short arrays costs much less than regenerating all cells.
    out.back=base.back.slice();out.long=base.long.slice();
    out.knots=base.knots.slice();out.special=base.special?.slice()??[];
  }
  out.name=source.name+" · sujets recomposés";
  out.layers=[];out.activeLayer=undefined;out.composition=undefined;out.subjectScene=undefined;
  const warningSet=new Set<string>();
  // Negative index = immutable backdrop; nonnegative = last visible
  // foreground sprite at this stitch cell.
  const topOwner=new Int16Array(base.w*base.h).fill(-1);
  const overlaps=new Int16Array(base.w*base.h).fill(-1);
  const occupiedBefore=new Uint8Array(base.w*base.h);
  for(let i=0;i<occupiedBefore.length;i++){
    if(base.cross[i]>=0||base.fwd[i]>=0||base.bwd[i]>=0||base.q.some(q=>q[i]>=0))
      occupiedBefore[i]=1;
  }
  const backOwners=new Array<number>(out.back.length).fill(-1);
  const longOwners=new Array<number>(out.long.length).fill(-1);
  const knotOwners=new Array<number>(out.knots.length).fill(-1);
  const specialOwners=new Array<number>(out.special?.length??0).fill(-1);
  for(const [layerIndex,layer] of scene.layers.entries()){
    if(!layer.visible)continue;
    const sprite=read(layer.sprite);
    const ratio=layer.scale,tint=new Map<number,number>();
    const dw=Math.max(1,Math.ceil(sprite.w*ratio)),dh=Math.max(1,Math.ceil(sprite.h*ratio));
    for(let dy=0;dy<dh;dy++)for(let dx=0;dx<dw;dx++){
      const x=layer.x+dx,y=layer.y+dy;
      if(!inside(x,y,out)){warningSet.add("Certains points sont hors de la grille. Déplacez le sujet.");continue;}
      const sx=Math.min(sprite.w-1,Math.floor((dx+.5)/ratio)),sy=Math.min(sprite.h-1,Math.floor((dy+.5)/ratio));
      const a=at(sx,sy,sprite),b=at(x,y,out);
      const painted=sprite.cross[a]>=0||sprite.fwd[a]>=0||sprite.bwd[a]>=0||sprite.q.some(q=>q[a]>=0);
      if(!painted)continue;
      if(occupiedBefore[b])overlaps[b]=layerIndex;
      occupiedBefore[b]=1;
      topOwner[b]=layerIndex;
      if(partial && (x<dirty!.x || y<dirty!.y || x>=dirty!.x+dirty!.w || y>=dirty!.y+dirty!.h))continue;
      // An opaque embroidery stitch covers ALL channels from a lower object.
      // Without this, the lower object's quarters survive under a top cross.
      out.cross[b]=out.fwd[b]=out.bwd[b]=-1;
      for(const q of out.q)q[b]=-1;
      out.done[b]=0;
      for(const key of ["cross","fwd","bwd"] as const)if(sprite[key][a]>=0)out[key][b]=recolored(sprite[key][a],layer.tint,tint);
      for(let q=0;q<4;q++)if(sprite.q[q][a]>=0)out.q[q][b]=recolored(sprite.q[q][a],layer.tint,tint);
      if(sprite.done[a])out.done[b]=1;
    }
    const node=(x:number,y:number)=>({x:layer.x+x*ratio,y:layer.y+y*ratio});
    const segments=(arr:Seg[])=>arr.map(s=>{
      const a=node(s.x1,s.y1),b=node(s.x2,s.y2);
      return {x1:a.x,y1:a.y,x2:b.x,y2:b.y,c:recolored(s.c,layer.tint,tint)};
    }).filter(s=>s.x1>=0&&s.x2>=0&&s.y1>=0&&s.y2>=0&&s.x1<=out.w&&s.x2<=out.w&&s.y1<=out.h&&s.y2<=out.h);
    const newBack=segments(sprite.back),newLong=segments(sprite.long);
    out.back.push(...newBack);out.long.push(...newLong);
    backOwners.push(...newBack.map(()=>layerIndex));longOwners.push(...newLong.map(()=>layerIndex));
    const newKnots=sprite.knots.map(k=>({...node(k.x,k.y),c:recolored(k.c,layer.tint,tint)}))
      .filter(k=>k.x>=0&&k.y>=0&&k.x<=out.w&&k.y<=out.h);
    const newSpecial=(sprite.special??[]).map(k=>({...node(k.x,k.y),kind:k.kind,c:recolored(k.c,layer.tint,tint)}))
      .filter(k=>k.x>=0&&k.y>=0&&k.x<=out.w&&k.y<=out.h);
    out.knots.push(...newKnots);
    out.special=[...(out.special??[]),...newSpecial];
    knotOwners.push(...newKnots.map(()=>layerIndex));
    specialOwners.push(...newSpecial.map(()=>layerIndex));
    if(layer.scale!==1)warningSet.add("Les fractions et contours redimensionnés doivent être vérifiés visuellement.");
  }
  // Clip hidden lower contours at later subject overlaps. Uncovered
  // segments remain untouched (important for exact PDF/JSON round trips).
  // This is raster-based visibility, not artistic regeneration of outlines.
  const hidden=(x:number,y:number,owner:number)=>{
    const xx=Math.max(0,Math.min(out.w-1,Math.floor(x)));
    const yy=Math.max(0,Math.min(out.h-1,Math.floor(y)));
    return topOwner[yy*out.w+xx]>owner;
  };
  const clipSegments=(segments:Seg[],owners:number[]):Seg[]=>{
    const final:Seg[]=[];
    for(let i=0;i<segments.length;i++){
      const seg=segments[i],owner=owners[i];
      const dx=seg.x2-seg.x1,dy=seg.y2-seg.y1;
      const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)*4));
      let first=-1;let blocked=false;
      for(let k=0;k<steps;k++){
        const t=(k+.5)/steps;
        const visible=!hidden(seg.x1+dx*t,seg.y1+dy*t,owner);
        if(visible&&first<0)first=k;
        if(!visible){blocked=true;if(first>=0){
          const a=first/steps,b=k/steps;
          if(b-a>=1/steps)final.push({...seg,x1:seg.x1+dx*a,y1:seg.y1+dy*a,x2:seg.x1+dx*b,y2:seg.y1+dy*b});
          first=-1;
        }}
      }
      if(!blocked){final.push(seg);continue;}
      if(first>=0)final.push({...seg,x1:seg.x1+dx*first/steps,y1:seg.y1+dy*first/steps,x2:seg.x2,y2:seg.y2});
    }
    return final;
  };
  out.back=clipSegments(out.back,backOwners);
  out.long=clipSegments(out.long,longOwners);
  out.knots=out.knots.filter((k,i)=>!hidden(k.x,k.y,knotOwners[i]));
  out.special=out.special?.filter((k,i)=>!hidden(k.x,k.y,specialOwners[i]));
  // Discreet depth accent only at actual foreground/background collisions.
  // Optional by design. It is a geometric proposal, not a detected shadow.
  if(scene.depth==="renforcee"){
    const accents:Seg[]=[];
    for(let i=0;i<overlaps.length&&accents.length<90;i++){
      const owner=overlaps[i];
      if(owner<0 || owner!==topOwner[i])continue;
      const x=i%out.w,y=Math.floor(i/out.w);
      const stitch=out.cross[i]>=0?out.cross[i]:out.fwd[i]>=0?out.fwd[i]:out.bwd[i];
      if(stitch<0)continue;
      const ink=FLOSS[stitch]?.lab[0]<44?stitch:flossIndex("801");
      if(ink<0)continue;
      // Four ordered neighbor checks avoid outlining every color shift.
      for(const [dx,dy,ax,ay,bx,by] of [
        [x-1,y,x,y,x,y+1],[x+1,y,x+1,y,x+1,y+1],
        [x,y-1,x,y,x+1,y],[x,y+1,x,y+1,x+1,y+1],
      ]){
        if(dx<0||dy<0||dx>=out.w||dy>=out.h||topOwner[dy*out.w+dx]!==owner)
          accents.push({x1:ax,y1:ay,x2:bx,y2:by,c:ink});
        if(accents.length>=90)break;
      }
    }
    out.back.push(...accents);
    if(accents.length)warningSet.add(accents.length+" segments de profondeur proposés aux chevauchements ; vérifier à l'aperçu.");
  }
  out.palette=[];
  const all=[...out.cross,...out.fwd,...out.bwd,...out.q.flatMap(a=>Array.from(a)),
    ...out.back.map(a=>a.c),...out.long.map(a=>a.c),...out.knots.map(a=>a.c),...(out.special??[]).map(a=>a.c)];
  for(const idx of new Set(all))if(idx>=0&&FLOSS[idx])ensurePalette(out,idx);
  out.provenance=source.provenance;out.fabric=source.fabric;
  out.stock=source.stock;out.supplies=source.supplies;
  out.adaptation=undefined;
  out.subjectScene={...scene,warnings:[...scene.warnings,...warningSet]};
  return out;
}

/** Recompute region bounding boxes; consumer may invalidate only this area. */
export function affectedBounds(before:SubjectLayer,after:SubjectLayer):Bounds {
  const a=boxOf(before),b=boxOf(after);
  const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y);
  return {x,y,w:Math.max(a.x+a.w,b.x+b.w)-x,h:Math.max(a.y+a.h,b.y+b.h)-y};
}

export function sceneFromPattern(pattern:Pattern):SubjectScene|null {
  const scene=pattern.subjectScene;
  if(!scene||scene.version!==1)return null;
  try{
    const src=read(scene.source),back=read(scene.backdrop);
    if(src.w!==back.w||src.h!==back.h||scene.layers.length>MAX_SUBJECTS)return null;
    for(const layer of scene.layers)read(layer.sprite);
    return scene;
  }catch{return null;}
}

export function spriteForExport(layer:SubjectLayer):Pattern {
  const p=clonePattern(read(layer.sprite));
  p.name=layer.name;
  p.provenance={...(p.provenance??{kind:"original",source:"",author:"",personalOnly:true,license:"Usage personnel"}),personalOnly:true};
  p.subjectScene=undefined;
  return p;
}
