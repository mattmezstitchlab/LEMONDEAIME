import { useEffect, useRef } from "react";
import { FLOSS } from "../lib/dmc";
import type { Pattern } from "../lib/pattern";

export interface StitchFocus {x:number;y:number}
export const clampFocus=(pattern:Pick<Pattern,"w"|"h">,point:StitchFocus):StitchFocus=>({
  x:Math.max(0,Math.min(pattern.w-1,Math.floor(point.x))),
  y:Math.max(0,Math.min(pattern.h-1,Math.floor(point.y))),
});
export function stitchAt(pattern:Pattern,focus:StitchFocus) {
  const {x,y}=clampFocus(pattern,focus);
  const i=y*pattern.w+x;
  return {x,y,cross:pattern.cross[i],forward:pattern.fwd[i],backward:pattern.bwd[i],
    quarters:pattern.q.map(q=>q[i]),color:FLOSS[pattern.cross[i]]?.code??null};
}
const CELL=21;
const RADIUS=5;
export default function StitchMagnifier({pattern,focus}:{pattern:Pattern;focus:StitchFocus}) {
  const ref=useRef<HTMLCanvasElement>(null);
  const resolved=clampFocus(pattern,focus);
  const info=stitchAt(pattern,resolved);
  useEffect(()=>{
    const canvas=ref.current,ctx=canvas?.getContext("2d");
    if(!canvas||!ctx)return;
    canvas.width=canvas.height=(2*RADIUS+1)*CELL;
    ctx.fillStyle=pattern.fabric?.color??"#f7f2e8";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    const startX=resolved.x-RADIUS,startY=resolved.y-RADIUS;
    for(let dy=0;dy<2*RADIUS+1;dy++)for(let dx=0;dx<2*RADIUS+1;dx++){
      const x=startX+dx,y=startY+dy,px=dx*CELL,py=dy*CELL;
      if(x>=0&&y>=0&&x<pattern.w&&y<pattern.h) {
        const i=y*pattern.w+x;
        const cross=FLOSS[pattern.cross[i]];
        if(cross){ctx.fillStyle=cross.hex;ctx.fillRect(px,py,CELL,CELL);}
        // Real overlay of fraction and half stitches: draw fine strokes over each cell.
        for(const [array,forward] of [[pattern.fwd,true],[pattern.bwd,false]] as const){
          const c=FLOSS[array[i]];
          if(!c)continue;
          ctx.strokeStyle=c.hex;ctx.lineWidth=3;ctx.beginPath();
          if(forward){ctx.moveTo(px,py+CELL);ctx.lineTo(px+CELL,py);}
          else{ctx.moveTo(px,py);ctx.lineTo(px+CELL,py+CELL);}
          ctx.stroke();
        }
        for(let k=0;k<4;k++){
          const c=FLOSS[pattern.q[k][i]];if(!c)continue;
          ctx.strokeStyle=c.hex;ctx.lineWidth=4;ctx.beginPath();
          const qx=k===1||k===2?CELL:0,qy=k>=2?CELL:0;
          ctx.moveTo(px+qx,py+qy);ctx.lineTo(px+CELL/2,py+CELL/2);ctx.stroke();
        }
      }
      ctx.strokeStyle="rgba(50,45,48,.3)";
      ctx.lineWidth=1;ctx.strokeRect(px+.5,py+.5,CELL,CELL);
    }
    // Backstitch polylines are drawn over the same magnified area.
    for(const seg of pattern.back){
      if(Math.max(seg.x1,seg.x2)<startX || Math.min(seg.x1,seg.x2)>startX+2*RADIUS+1||
        Math.max(seg.y1,seg.y2)<startY || Math.min(seg.y1,seg.y2)>startY+2*RADIUS+1)continue;
      ctx.strokeStyle=FLOSS[seg.c]?.hex??"#333";ctx.lineWidth=2.5;ctx.beginPath();
      ctx.moveTo((seg.x1-startX)*CELL,(seg.y1-startY)*CELL);
      ctx.lineTo((seg.x2-startX)*CELL,(seg.y2-startY)*CELL);ctx.stroke();
    }
    ctx.strokeStyle="#f43f5e";ctx.lineWidth=2.5;ctx.strokeRect(RADIUS*CELL+1,RADIUS*CELL+1,CELL-2,CELL-2);
  },[pattern,resolved.x,resolved.y]);
  const quarterCount=info.quarters.filter(i=>i>=0).length;
  return <div aria-label="Loupe de détail des points" className="w-[252px] max-w-full rounded-[6px] border border-white/20 bg-[#09090b] p-2 text-white shadow-[0_15px_40px_#0007]">
    <div className="mb-2 flex items-center justify-between text-[11px]"><strong>Loupe · × 21</strong><span className="font-mono text-white/65">X {info.x+1} · Y {info.y+1}</span></div>
    <canvas ref={ref} aria-label="Grille agrandie autour du point sélectionné" width={231} height={231}
      className="block aspect-square w-full rounded-[4px] bg-[#f7f2e8] [image-rendering:pixelated]"/>
    <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-white/80">
      <span>DMC : {info.color??"Toile libre"}</span><span>¼ de point : {quarterCount}</span>
      <span>Diagonale / : {info.forward>=0?"Oui":"Non"}</span><span>Diagonale \ : {info.backward>=0?"Oui":"Non"}</span>
    </div>
  </div>;
}
