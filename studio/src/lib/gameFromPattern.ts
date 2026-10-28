import { FLOSS } from "./dmc";
import { compositePattern, type Pattern } from "./pattern";
import { GAME_SIZE } from "./confettiGame";

/** Native bridge: turn the CURRENT POINTZERO DMC pattern into a playable portrait layer.
 * The user's underlying pattern, palette, notes and embroidery progress are never changed. */
export interface PlayablePattern {name:string;portrait:Uint8Array;colors:string[]}
export function playableFromPattern(input:Pattern):PlayablePattern|null {
 const p=compositePattern(input),src=p.cross;
 if(!p.w||!p.h||src.length!==p.w*p.h||!src.some(v=>v>=0))return null;
 const freq=new Map<number,number>();
 for(const v of src)if(v>=0)freq.set(v,(freq.get(v)||0)+1);
 const ranked=[...freq].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([idx])=>idx);
 const colors=["#f8f5f0",...ranked.map(i=>FLOSS[i]?.hex??"#b9b9b9")];
 while(colors.length<6)colors.push("#c4c4c4");
 const out=new Uint8Array(GAME_SIZE*GAME_SIZE);
 const scale=Math.min(GAME_SIZE/p.w,GAME_SIZE/p.h);
 const dw=p.w*scale,dh=p.h*scale,ox=(GAME_SIZE-dw)/2,oy=(GAME_SIZE-dh)/2;
 const cache=new Map<number,number>();
 const nearest=(idx:number)=>{
  if(idx<0||!FLOSS[idx])return 0;
  if(cache.has(idx))return cache.get(idx)!;
  const found=ranked.indexOf(idx);if(found>=0)return found+1;
  const [r,g,b]=FLOSS[idx].rgb;let best=1,dist=Infinity;
  for(let k=0;k<ranked.length;k++){
   const rgb=FLOSS[ranked[k]].rgb;
   const d=(rgb[0]-r)**2+(rgb[1]-g)**2+(rgb[2]-b)**2;
   if(d<dist){dist=d;best=k+1;}
  }
  cache.set(idx,best);return best;
 };
 for(let y=0;y<GAME_SIZE;y++)for(let x=0;x<GAME_SIZE;x++){
  const px=(x-ox)/scale,py=(y-oy)/scale;
  if(px<0||py<0||px>=p.w||py>=p.h)continue;
  out[y*GAME_SIZE+x]=nearest(src[Math.floor(py)*p.w+Math.floor(px)]);
 }
 return {name:p.name,portrait:out,colors};
}
