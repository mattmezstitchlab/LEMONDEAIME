/** POINTZERO Musique — local, inclusive and intergenerational composition. */
import { BASE_FLOSS } from "./dmc";
import { dmcSound } from "./artWorldCore";
export const MUSIC_KEY="pointzero:music:v1";
export const MUSIC_SECONDS=225;
export type Gesture="point"|"circle"|"square"|"line"|"wave"|"group"|"star"|"text";
export type Emotion="Joie"|"Sérénité"|"Amour"|"Énergie"|"Nature"|"Méditation"|"Mystère"|"Courage"|"Tristesse";
export type MusicAudience="ensemble"|"decouverte"|"transmission";
export interface MusicNote {id:string;gesture:Gesture;time:number;pitch:0|1|2;emotion:Emotion;intensity:number;label:string;author:string;dmcCode?:string}
export interface MusicScore {version:1;id:string;title:string;intention:string;audience:MusicAudience;notes:MusicNote[];tempo:number}
export type MusicVoice="bell"|"pad"|"pluck"|"drum";
export interface MusicEvent {time:number;duration:number;midi:number;velocity:number;voice:MusicVoice;noteId:string}
export const EMOTIONS:readonly {id:Emotion;hex:string}[]=[
 {id:"Joie",hex:"#f4ba33"},{id:"Sérénité",hex:"#40b9e9"},{id:"Amour",hex:"#e96ca9"},
 {id:"Énergie",hex:"#fc9847"},{id:"Nature",hex:"#3aca95"},{id:"Méditation",hex:"#43c8ba"},
 {id:"Mystère",hex:"#9676f2"},{id:"Courage",hex:"#ef788d"},{id:"Tristesse",hex:"#82baf2"}
];
export const GESTURES:readonly {id:Gesture;label:string;description:string;symbol:string}[]=[
 {id:"point",label:"Point",description:"Note courte",symbol:"•"},
 {id:"circle",label:"Cercle",description:"Son tenu",symbol:"○"},
 {id:"square",label:"Carré",description:"Percussion",symbol:"■"},
 {id:"line",label:"Ligne",description:"Mélodie",symbol:"╱"},
 {id:"wave",label:"Vague",description:"Mouvement",symbol:"∿"},
 {id:"group",label:"Groupe",description:"Accord partagé",symbol:"✣"},
 {id:"star",label:"Étoile",description:"Moment fort",symbol:"✦"},
 {id:"text",label:"Texte",description:"Intention écrite",symbol:"T"}
];
const unique=()=>globalThis.crypto?.randomUUID?.()??Math.random().toString(36).slice(2);
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
export const formatMusicTime=(sec:number)=>Math.floor(sec/60)+":"+String(Math.floor(sec%60)).padStart(2,"0");
export const colorFor=(emotion:Emotion)=>EMOTIONS.find(e=>e.id===emotion)?.hex??"#9676f2";
export const snapMusicTime=(sec:number)=>clamp(Math.round(sec*2)/2,0,MUSIC_SECONDS-0.5);
export const makeMusicNote=(gesture:Gesture,time:number,pitch:0|1|2,emotion:Emotion,author="",label=""):MusicNote=>({
 id:unique(),gesture,time:snapMusicTime(time),pitch,emotion,intensity:.75,label:label.slice(0,120),author:author.slice(0,70)
});
const demo:[Gesture,number,0|1|2,Emotion][]=[
 ["circle",13,0,"Sérénité"],["point",25,0,"Joie"],["wave",40,0,"Méditation"],
 ["point",61,1,"Mystère"],["star",76,0,"Joie"],["square",83,2,"Énergie"],
 ["square",91,2,"Nature"],["point",100,1,"Tristesse"],["group",113,1,"Amour"],
 ["wave",127,2,"Mystère"],["circle",136,0,"Amour"],["point",151,0,"Amour"],
 ["star",159,1,"Sérénité"],["circle",169,2,"Mystère"],["group",186,1,"Nature"],
 ["line",198,1,"Mystère"],["circle",213,2,"Joie"]];
export const makeMusicScore=():MusicScore=>({
 version:1,id:unique(),title:"Rêves d'humanité",intention:"Créer un moment musical partagé",audience:"ensemble",tempo:120,
 notes:demo.map(([gesture,time,pitch,emotion])=>makeMusicNote(gesture,time,pitch,emotion))
});
export const emptyMusicScore=():MusicScore=>({version:1,id:unique(),title:"Nouvelle partition",intention:"",audience:"ensemble",tempo:120,notes:[]});
const gestureIds=new Set(GESTURES.map(x=>x.id)),emotionIds=new Set(EMOTIONS.map(x=>x.id));
const validDMC=new Set(BASE_FLOSS.map(f=>f.code));
export function safeMusicScore(raw:unknown):MusicScore|null{
 if(!raw||typeof raw!=="object")return null;
 const s=raw as Partial<MusicScore>;
 if(s.version!==1||typeof s.id!=="string"||s.id.length>100||
 typeof s.title!=="string"||s.title.length>150||typeof s.intention!=="string"||s.intention.length>1500||
 !["ensemble","decouverte","transmission"].includes(s.audience??"")||typeof s.tempo!=="number"||
 !Number.isInteger(s.tempo)||s.tempo<50||s.tempo>180||!Array.isArray(s.notes)||s.notes.length>150)return null;
 const seen=new Set<string>();
 for(const n of s.notes){
  if(!n||typeof n.id!=="string"||n.id.length>100||seen.has(n.id)||
   !gestureIds.has(n.gesture)||!emotionIds.has(n.emotion)||!Number.isFinite(n.time)||n.time<0||n.time>=MUSIC_SECONDS||
   ![0,1,2].includes(n.pitch)||!Number.isFinite(n.intensity)||n.intensity<0||n.intensity>1||
   typeof n.label!=="string"||n.label.length>120||typeof n.author!=="string"||n.author.length>70||
   (n.dmcCode!==undefined&&(typeof n.dmcCode!=="string"||!validDMC.has(n.dmcCode))))return null;
  seen.add(n.id);
 }
 return s as MusicScore;
}
/** Local deterministic suggestion; no remote AI is implied. */
export function intentionGesture(text:string,emotion:Emotion,time:number,author=""):MusicNote{
 const t=text.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 let gesture:Gesture="circle",pitch:0|1|2=1;
 if(/danse|fete|celebr|joie|energie|rythme/.test(t)){gesture="square";pitch=2;}
 else if(/grand.mere|grand.pere|souvenir|douceur|amour|famille|transmi/.test(t))gesture="wave";
 else if(/ensemble|union|groupe|chorale|generations/.test(t))gesture="group";
 else if(/espoir|brill|lumiere|etoile/.test(t)){gesture="star";pitch=0;}
 return makeMusicNote(gesture,time,pitch,emotion,author,text.trim().slice(0,120));
}
const SCALE=[48,50,52,55,57,60,62,64,67,69,72,74,76,79,81,84];
const pitchIndex=(p:0|1|2)=>p===0?11:p===1?7:3;
const deg=(i:number)=>SCALE[clamp(Math.round(i),0,SCALE.length-1)];
const emotionVelocity=(e:Emotion)=>({"Énergie":1,"Courage":.92,"Joie":.86,"Méditation":.47,"Sérénité":.55,"Tristesse":.5,"Amour":.67,"Nature":.68,"Mystère":.63}[e]??.72);
export function musicEvents(score:MusicScore):MusicEvent[]{
 const events:MusicEvent[]=[];
 for(const n of score.notes){
  if(n.gesture==="text")continue;
  const base=pitchIndex(n.pitch),v=clamp(n.intensity*emotionVelocity(n.emotion),.06,.95);
  const floss=n.dmcCode?BASE_FLOSS.find(f=>f.code===n.dmcCode):null;
  const shift=floss?dmcSound(floss.code,floss.hex).midi-deg(base):0;
  const add=(offset:number,midi:number,dur:number,voice:MusicVoice,ratio=1)=>{
   const time=n.time+offset;if(time<0||time>=MUSIC_SECONDS)return;
   events.push({time,duration:Math.min(dur,MUSIC_SECONDS-time),midi:clamp(midi+shift,36,96),velocity:clamp(v*ratio,.04,.95),voice,noteId:n.id});
  };
  switch(n.gesture){
   case "point":add(0,deg(base+1),.32,"pluck");break;
   case "circle":add(0,deg(base),2.6,"pad");add(0,deg(base+3),1.1,"bell",.4);break;
   case "square":add(0,deg(base-5),.28,"drum");break;
   case "star":for(const d of [0,2,4])add(0,deg(base+d),2.5,"pad",.68);break;
   case "group":for(const [k,d] of [0,2,4].entries())add(k*.025,deg(base+d),1.65,"bell",.68);break;
   case "line":for(let i=0;i<7;i++)add(i*.25,deg(base+Math.round(i*.6)),.3,"pluck",.85);break;
   case "wave":for(let i=0;i<9;i++)add(i*.22,deg(base+Math.round(Math.sin(i*Math.PI/4)*2)),.4,"bell",.65);break;
  }
 }
 return events.sort((a,b)=>a.time-b.time);
}
const byte=(n:number)=>clamp(Math.round(n),0,127);
const variable=(value:number):number[]=>{
 let n=Math.max(0,Math.floor(value)),v=n&127;
 while((n>>=7)>0)v=(v<<8)|((n&127)|128);
 const bytes:number[]=[];for(;;){bytes.push(v&255);if(v&128)v>>=8;else break;}
 return bytes;
};
const chunk=(name:string,data:number[])=>[...name].map(c=>c.charCodeAt(0)).concat([
 (data.length>>>24)&255,(data.length>>>16)&255,(data.length>>>8)&255,data.length&255,...data
]);
export function musicToMidi(score:MusicScore):Uint8Array{
 const ppq=480,tempo=Math.round(60000000/score.tempo);
 const events:{tick:number;priority:number;bytes:number[]}[]=[];
 for(const e of musicEvents(score)){
  const scale=score.tempo/60*ppq,start=Math.round(e.time*scale),end=Math.max(start+1,Math.round((e.time+e.duration)*scale));
  const note=byte(e.midi);
  events.push({tick:start,priority:1,bytes:[0x90,note,byte(e.velocity*117)]});
  events.push({tick:end,priority:0,bytes:[0x80,note,0]});
 }
 events.sort((a,b)=>a.tick-b.tick||a.priority-b.priority);
 const data=[0,255,81,3,(tempo>>16)&255,(tempo>>8)&255,tempo&255];
 let last=0;
 for(const event of events){data.push(...variable(event.tick-last),...event.bytes);last=event.tick;}
 data.push(0,255,47,0);
 return new Uint8Array([...chunk("MThd",[0,0,0,1,ppq>>8,ppq&255]),...chunk("MTrk",data)]);
}
