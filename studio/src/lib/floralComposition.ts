import { createPattern, ensurePalette, type Pattern } from "./pattern";
import { flossIndex } from "./dmc";
import { attachSubject, detectSubjects, recomposeSubjects, type SubjectScene } from "./subjectEngine";

const make=(name:string,w:number,h:number)=>{
 const p=createPattern(name,w,h);
 p.provenance={kind:"original",source:"Composition florale originale POINTZERO",author:"POINTZERO",license:"Démonstration originale",personalOnly:false};
 const put=(x:number,y:number,code:string)=>{
   if(x<0||y<0||x>=w||y>=h)return;
   const c=flossIndex(code);if(c<0)throw Error("Code DMC inconnu : "+code);
   p.cross[y*w+x]=c;ensurePalette(p,c);
 };
 const ellipse=(cx:number,cy:number,rx:number,ry:number,code:string)=>{
   for(let y=Math.max(0,Math.floor(cy-ry));y<=Math.min(h-1,Math.ceil(cy+ry));y++)
   for(let x=Math.max(0,Math.floor(cx-rx));x<=Math.min(w-1,Math.ceil(cx+rx));x++)
   if(((x-cx)/rx)**2+((y-cy)/ry)**2<=1)put(x,y,code);
 };
 const line=(ax:number,ay:number,bx:number,by:number,code:string)=>{
   const n=Math.max(1,Math.ceil(Math.hypot(bx-ax,by-ay)*2));
   for(let i=0;i<=n;i++)put(Math.round(ax+(bx-ax)*i/n),Math.round(ay+(by-ay)*i/n),code);
 };
 return {p,put,ellipse,line};
};
export function floralFlower(name:string,main="603",dark="602",center="725"):Pattern {
 const {p,ellipse,line}=make(name,27,29);
 for(let i=0;i<8;i++){
   const t=i*Math.PI/4,x=13+Math.cos(t)*6,y=12+Math.sin(t)*6;
   ellipse(x,y,5,5,main);
   ellipse(x+Math.cos(t)*2,y+Math.sin(t)*2,2.5,2.5,dark);
 }
 ellipse(13,12,5,5,center);
 ellipse(13,12,2,2,"3820");
 line(13,18,13,28,"700");
 p.back.push({x1:11,y1:10,x2:15,y2:10,c:flossIndex("801")});
 ensurePalette(p,flossIndex("801"));
 return p;
}
export function floralLeaf(name="Feuille",tone="703"):Pattern {
 const {p,ellipse,line}=make(name,20,12);
 ellipse(9,6,8,4,tone);
 ellipse(10,6,5,2,"704");
 line(2,8,18,4,"934");
 p.back.push({x1:2,y1:8,x2:18,y2:4,c:flossIndex("934")});
 ensurePalette(p,flossIndex("934"));
 return p;
}
export function floralBranch():Pattern {
 const {p,line}=make("Branche",110,20);
 line(4,14,106,7,"801");line(37,12,27,1,"801");line(72,10,84,1,"801");
 line(43,11,54,19,"801");
 p.back.push({x1:4,y1:14,x2:106,y2:7,c:flossIndex("938")});
 ensurePalette(p,flossIndex("938"));
 return p;
}
export function floralBird():Pattern {
 const {p,ellipse,line,put}=make("Petit oiseau",22,19);
 ellipse(9,10,8,5,"739");ellipse(7,10,5,3,"436");
 ellipse(13,5,5,5,"738");ellipse(13,6,3,3,"739");
 put(15,4,"310");put(16,4,"310");
 line(18,7,21,8,"742");
 line(7,14,7,18,"801");
 return p;
}
/**
 * User-authorized original fixture with 3 distinct flower sprites, 4 leaves,
 * one branch behind them and optional bird. Deliberate overlaps test masking.
 * Labels are authored: NOT output from object recognition.
 */
export function floralDemo(includeBird=false):SubjectScene {
 const blank=createPattern("Bouquet botanique · 3 fleurs",150,95);
 blank.provenance={kind:"original",source:"Composition florale POINTZERO",author:"POINTZERO",license:"Démonstration originale",personalOnly:false};
 let scene=detectSubjects(blank).scene;
 const add=(p:Pattern,x:number,y:number)=>{scene=attachSubject(scene,p,x,y);};
 add(floralBranch(),18,64);
 add(floralLeaf("Feuille A","703"),18,55);
 add(floralLeaf("Feuille B","702"),47,73);
 add(floralLeaf("Feuille C","703"),79,63);
 add(floralLeaf("Feuille D","704"),105,68);
 add(floralFlower("Rose gauche","603","602","725"),25,28);
 add(floralFlower("Rose centrale","819","776","725"),61,20);
 add(floralFlower("Rose droite","321","815","3820"),94,29);
 if(includeBird)add(floralBird(),123,24);
 return scene;
}
export interface LeafSuggestion {x:number;y:number;reason:string}
/** Optional, reversible, deterministic placement proposal; no semantic AI. */
export function suggestLeaves(scene:SubjectScene,limit=2):LeafSuggestion[] {
 const pattern=recomposeSubjects(scene);
 const positions:LeafSuggestion[]=[];
 const candidates=[
  {x:46,y:52},{x:80,y:52},{x:112,y:57},{x:22,y:71},
  {x:66,y:68},{x:97,y:72},{x:48,y:18},{x:107,y:16},
 ];
 const leaf=floralLeaf();
 for(const pos of candidates){
   if(positions.length>=Math.max(0,Math.min(3,limit)))break;
   if(pos.x+leaf.w>=pattern.w||pos.y+leaf.h>=pattern.h)continue;
   let filled=0,near=0;
   for(let y=pos.y;y<pos.y+leaf.h;y++)for(let x=pos.x;x<pos.x+leaf.w;x++){
     if(pattern.cross[y*pattern.w+x]>=0)filled++;
   }
   for(let y=Math.max(0,pos.y-5);y<Math.min(pattern.h,pos.y+leaf.h+5);y++)
   for(let x=Math.max(0,pos.x-5);x<Math.min(pattern.w,pos.x+leaf.w+5);x++){
     if(pattern.cross[y*pattern.w+x]>=0)near++;
   }
   // New leaves should fill gaps near an existing bouquet, not conceal flowers.
   if(filled<6&&near>=3 && !positions.some(o=>Math.abs(o.x-pos.x)<20&&Math.abs(o.y-pos.y)<10))
     positions.push({...pos,reason:"Espace peu rempli près du bouquet (suggestion géométrique)"});
 }
 return positions;
}
export function addSuggestedLeaves(scene:SubjectScene,limit=2):SubjectScene {
 let next=scene;for(const pos of suggestLeaves(scene,limit))
   next=attachSubject(next,floralLeaf("Feuille proposée"),pos.x,pos.y);
 return next;
}
