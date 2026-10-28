/** Shared point/grid primitive — native CONFETTI 30 gameplay, no licensed portraits or songs. */
export const GAME_SIZE=48;
export interface GameArtist {id:string;name:string;genre:string;palette:string[]}
export const ARTISTS:GameArtist[]=[
 {id:"nova",name:"NOVA LUX",genre:"Electro pop",palette:["#f7ece7","#b96e85","#754e70","#28243b","#ffc36c","#4b7a8e"]},
 {id:"jax",name:"JAX BLUE",genre:"Soul",palette:["#e9d2b1","#b87b57","#593e4d","#242d42","#f2ad6a","#668fa2"]},
 {id:"mira",name:"MIRA VIOLET",genre:"Synthwave",palette:["#d6d4f1","#a482c8","#593b79","#28224b","#e99ba8","#6ba3c8"]},
 {id:"leo",name:"LEO SOL",genre:"Disco",palette:["#f1dec0","#d69b58","#9a673e","#3b332d","#ffe18a","#64867f"]},
 {id:"sora",name:"SORA SKY",genre:"Neo jazz",palette:["#d3e2da","#87aca3","#5c7e77","#1c3440","#d7a58a","#8872ac"]}
];
export type Power="wave"|"magnet"|"focus";
export interface GameBoard {
 artist:number;seed:number;size:number;portrait:Uint8Array;confetti:Int8Array;
 score:number;cleared:number;largest:number;combo:number;powerUses:number;
}
const circle=(x:number,y:number,cx:number,cy:number,rx:number,ry:number)=>
 ((x-cx)/rx)**2+((y-cy)/ry)**2<1;
function h(seed:number,x:number,y:number){let n=(Math.imul((x+1)*374761393,(y+1)*668265263)^seed)>>>0;n=Math.imul(n^(n>>>13),1274126177)>>>0;return(n^(n>>>16))>>>0}
export function portraitAt(artist:number,x:number,y:number):number {
 const shift=(artist%3)-1;
 const cx=24+shift;
 if(circle(x,y,cx,24,15,20)){
  const hair=artist===3?2:artist===4?3:artist===1?3:2;
  if(y<13+Math.sin((x+shift)*.5)*2)return hair;
  if(x<cx-12||x>cx+12)return hair;
  if(y>26&&y<31&&((x>cx-10&&x<cx-4)||(x>cx+4&&x<cx+10)))return 3; // eyes / glasses
  if(artist===0&&y>23&&y<33&&(x===cx-3||x===cx+3))return 4;
  if(y>35&&y<38&&Math.abs(x-cx)<5)return artist%2?4:1; // smile
  if(y>31&&y<35&&Math.abs(x-cx)<2)return 1; // nose
  return artist%2===0?1:0;
 }
 if(circle(x,y,cx,61,22,29))return artist%2===0?3:5; // clothing sits behind the face
 if(artist===2&&y>8&&y<14&&Math.abs(x-cx)<19)return 2;
 return 0;
}
export function portraitCells(artist:number,size=GAME_SIZE):Uint8Array {
 const arr=new Uint8Array(size*size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++)arr[y*size+x]=portraitAt(artist,x,y);
 return arr;
}
export function newGame(artist=0,seed=1):GameBoard {
 const size=GAME_SIZE, portrait=portraitCells(artist,size),confetti=new Int8Array(size*size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const cluster=h(seed,Math.floor(x/5),Math.floor(y/5))%5;
  const scattered=h(seed+7919,x,y)%11===0;
  confetti[y*size+x]=(h(seed+11,x,y)%100<83)?(scattered?h(seed+821,x,y)%5:cluster):-1;
 }
 const cleared=Array.from(confetti).filter(v=>v<0).length;
 return {artist,seed,size,portrait,confetti,score:0,cleared,largest:0,combo:0,powerUses:0};
}
const neighbors=(idx:number,size:number)=>{
 const x=idx%size,y=Math.floor(idx/size);const n:number[]=[];
 if(x>0)n.push(idx-1);if(x<size-1)n.push(idx+1);
 if(y>0)n.push(idx-size);if(y<size-1)n.push(idx+size);
 return n;
};
export function matchingGroup(board:GameBoard,index:number):number[] {
 if(index<0||index>=board.confetti.length||board.confetti[index]<0)return [];
 const kind=board.confetti[index],queue=[index],seen=new Uint8Array(board.confetti.length);seen[index]=1;
 for(let k=0;k<queue.length;k++)for(const n of neighbors(queue[k],board.size)){
  if(!seen[n]&&board.confetti[n]===kind){seen[n]=1;queue.push(n);}
 }
 return queue;
}
export function clearGroup(board:GameBoard,index:number):GameBoard {
 const group=matchingGroup(board,index);
 if(group.length<2)return board;
 const confetti=board.confetti.slice();for(const i of group)confetti[i]=-1;
 const combo=group.length>=12?Math.min(board.combo+1,10):1;
 return {...board,confetti,cleared:board.cleared+group.length,
  score:board.score+group.length*10*combo,largest:Math.max(board.largest,group.length),combo};
}
export function usePower(board:GameBoard,power:Power,index:number):GameBoard {
 if(index<0||index>=board.confetti.length)return board;
 const confetti=board.confetti.slice();let cleared=0,boost=0;
 const size=board.size,x=index%size,y=Math.floor(index/size),kind=board.confetti[index];
 if(power==="focus")return board; // advisory only: see bestMove()
 for(let i=0;i<confetti.length;i++){
  const xi=i%size,yi=Math.floor(i/size);
  const hit=power==="wave"?Math.abs(yi-y)<=1:(Math.abs(xi-x)<=7&&Math.abs(yi-y)<=7&&(kind<0||confetti[i]===kind));
  if(hit&&confetti[i]>=0){confetti[i]=-1;cleared++;}
 }
 if(!cleared)return board;
 boost=power==="wave"?4:3;
 return {...board,confetti,cleared:board.cleared+cleared,score:board.score+cleared*boost,
  combo:board.combo+1,largest:Math.max(board.largest,cleared),powerUses:board.powerUses+1};
}
export const revealPercent=(board:GameBoard)=>Math.round(board.cleared/board.confetti.length*100);
export function bestMove(board:GameBoard):number {
 let best=-1,count=0;const visited=new Uint8Array(board.confetti.length);
 for(let i=0;i<visited.length;i++){
  if(visited[i]||board.confetti[i]<0)continue;
  const group=matchingGroup(board,i);for(const index of group)visited[index]=1;
  if(group.length>count){count=group.length;best=i;}
 }
 return best;
}
export const finalScore=(board:GameBoard,remaining:number)=>
 board.score+(revealPercent(board)===100?2500:0)+Math.max(0,Math.floor(remaining))*12;
