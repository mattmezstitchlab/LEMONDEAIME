import { createPattern, ensurePalette, type Pattern } from "./pattern";
import { flossIndex } from "./dmc";

/** Original geometrical multi-subject scene used only for engine regression. */
export function multiSubjectDemo(): Pattern {
  const p=createPattern("Essai · oiseau, fleur et maisonnette",120,75);
  p.provenance={kind:"original",source:"Démonstration géométrique POINTZERO",author:"POINTZERO",license:"Illustration de test originale",personalOnly:false};
  const dot=(x:number,y:number,code:string)=>{
    if(x<0||y<0||x>=p.w||y>=p.h)return;
    const c=flossIndex(code);p.cross[y*p.w+x]=c;ensurePalette(p,c);
  };
  const ellipse=(cx:number,cy:number,rx:number,ry:number,code:string)=>{
    for(let y=Math.floor(cy-ry);y<=cy+ry;y++)for(let x=Math.floor(cx-rx);x<=cx+rx;x++)
      if(((x-cx)/rx)**2+((y-cy)/ry)**2<=1)dot(x,y,code);
  };
  const line=(x0:number,y0:number,x1:number,y1:number,c:string)=>{
    const n=Math.ceil(Math.hypot(x1-x0,y1-y0)*2);
    for(let i=0;i<=n;i++)dot(Math.round(x0+(x1-x0)*i/n),Math.round(y0+(y1-y0)*i/n),c);
  };
  // Subject A: an ORIGINAL geometric bird (test fixture label, not AI recognition)
  ellipse(24,43,15,10,"738");ellipse(22,43,10,6,"436");ellipse(30,34,8,8,"739");
  ellipse(25,43,7,5,"700");ellipse(26,43,4,2,"701");
  dot(33,32,"310");dot(34,32,"310"); // eye protected from confetti
  line(37,36,43,37,"742");line(24,51,22,56,"801");
  line(30,51,31,56,"801");
  // Subject B: flower, leaves, stem, separated from bird by clear empty cells
  line(66,62,66,27,"701");ellipse(66,21,8,8,"321");
  ellipse(66,21,5,5,"815");ellipse(66,21,3,3,"725");
  ellipse(61,48,8,3,"703");ellipse(72,52,8,3,"704");
  line(66,48,60,48,"701");line(66,52,76,52,"701");
  // Subject C: little house.
  for(let y=40;y<=60;y++)for(let x=94;x<=111;x++)dot(x,y,"436");
  for(let y=31;y<=43;y++)for(let x=94;y<=43 && x<=111;x++){
    if(y>=40-Math.floor((x-102.5)*-0.7) && y>=34+Math.floor(Math.abs(x-102.5)*.8))dot(x,y,"801");
  }
  for(let y=49;y<=60;y++)for(let x=100;x<=105;x++)dot(x,y,"434");
  for(let y=44;y<=48;y++)for(let x=107;x<=109;x++)dot(x,y,"828");
  // Tiny unrelated accents must stay in backdrop, not disappear.
  dot(5,7,"321");dot(116,7,"703");
  return p;
}
