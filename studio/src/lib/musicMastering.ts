/** Non-destructive, offline pre-master for user-provided audio. Never uploads samples. */
export type MasterPreset="transparent"|"warm"|"bright"|"gentle";
export const MASTER_PRESETS:{id:MasterPreset;name:string;description:string}[]=[
 {id:"transparent",name:"Naturel",description:"Équilibre discret et compression douce"},
 {id:"warm",name:"Chaleureux",description:"Graves arrondis et aigus adoucis"},
 {id:"bright",name:"Clair",description:"Présence et définition"},
 {id:"gentle",name:"Acoustique",description:"Dynamique préservée"}
];
export type MasterSettings={preset:MasterPreset;intensity:number};
export const MAX_MASTER_BYTES=42*1024*1024;
export const MAX_MASTER_SECONDS=240;
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
export function presetEQ(settings:MasterSettings){
 const value=clamp(settings.intensity,0,1);
 switch(settings.preset){
  case "warm":return {low:2.5*value,mid:-.7*value,high:-1.2*value,threshold:-20*value-8,ratio:1+2.2*value};
  case "bright":return {low:-.4*value,mid:1.5*value,high:2.1*value,threshold:-18*value-8,ratio:1+2.3*value};
  case "gentle":return {low:1.1*value,mid:.3*value,high:.8*value,threshold:-11*value-10,ratio:1+1.2*value};
  default:return {low:.5*value,mid:.4*value,high:.6*value,threshold:-16*value-9,ratio:1+1.8*value};
 }
}
export function writeWav(buffer:AudioBuffer):Blob{
 const channels=Math.min(2,buffer.numberOfChannels),frames=buffer.length,sampleRate=buffer.sampleRate;
 const bytes=new ArrayBuffer(44+frames*channels*2),dv=new DataView(bytes);
 const word=(offset:number,v:number)=>dv.setUint16(offset,v,true);
 const dword=(offset:number,v:number)=>dv.setUint32(offset,v,true);
 for(const [i,c] of [..."RIFF"].entries())dv.setUint8(i,c.charCodeAt(0));
 dword(4,36+frames*channels*2);
 for(const [i,c] of [..."WAVE"].entries())dv.setUint8(8+i,c.charCodeAt(0));
 for(const [i,c] of [..."fmt "].entries())dv.setUint8(12+i,c.charCodeAt(0));
 dword(16,16);word(20,1);word(22,channels);dword(24,sampleRate);
 dword(28,sampleRate*channels*2);word(32,channels*2);word(34,16);
 for(const [i,c] of [..."data"].entries())dv.setUint8(36+i,c.charCodeAt(0));
 dword(40,frames*channels*2);
 // Peak normalization is real; do not claim LUFS-certified mastering.
 let peak=0;
 const data=Array.from({length:channels},(_,i)=>buffer.getChannelData(i));
 for(let i=0;i<frames;i++)for(let ch=0;ch<channels;ch++)peak=Math.max(peak,Math.abs(data[ch][i]));
 const gain=peak>0?.94/peak:1;
 let pos=44;
 for(let i=0;i<frames;i++)for(let ch=0;ch<channels;ch++){
  const sample=clamp(data[ch][i]*gain,-1,1);
  dv.setInt16(pos,sample<0?sample*32768:sample*32767,true);pos+=2;
 }
 return new Blob([bytes],{type:"audio/wav"});
}
export async function masterLocal(file:File,settings:MasterSettings):Promise<{blob:Blob;duration:number;peakNote:string}>{
 if(file.size>MAX_MASTER_BYTES)throw Error("Fichier limité à 42 Mo pour le pré-master local.");
 if(file.size===0)throw Error("Fichier audio vide.");
 if(!["audio/wav","audio/mpeg","audio/mp3","audio/x-wav","audio/aiff","audio/mp4","audio/ogg","audio/flac",""].includes(file.type))
  throw Error("Format audio non reconnu.");
 const Audio=window.AudioContext,Offline=window.OfflineAudioContext;
 if(!Audio||!Offline)throw Error("Ce navigateur ne prend pas en charge le traitement audio local.");
 const decoder=new Audio();
 let raw:AudioBuffer;
 try{raw=await decoder.decodeAudioData(await file.arrayBuffer());}
 finally{void decoder.close();}
 if(raw.duration>MAX_MASTER_SECONDS)throw Error("Pré-master limité à 4 minutes par fichier.");
 if(raw.numberOfChannels>2)throw Error("Source multicanale non prise en charge.");
 const rate=44100,frames=Math.ceil(raw.duration*rate),offline=new Offline(2,frames,rate);
 const source=offline.createBufferSource();source.buffer=raw;
 const hp=offline.createBiquadFilter();hp.type="highpass";hp.frequency.value=28;
 const low=offline.createBiquadFilter();low.type="lowshelf";low.frequency.value=120;
 const mid=offline.createBiquadFilter();mid.type="peaking";mid.frequency.value=2900;mid.Q.value=.75;
 const high=offline.createBiquadFilter();high.type="highshelf";high.frequency.value=7800;
 const compressor=offline.createDynamicsCompressor();
 const eq=presetEQ(settings);
 low.gain.value=eq.low;mid.gain.value=eq.mid;high.gain.value=eq.high;
 compressor.threshold.value=eq.threshold;compressor.ratio.value=eq.ratio;
 compressor.attack.value=.018;compressor.release.value=.27;compressor.knee.value=9;
 source.connect(hp);hp.connect(low);low.connect(mid);mid.connect(high);high.connect(compressor);compressor.connect(offline.destination);
 source.start(0);
 const processed=await offline.startRendering();
 return {blob:writeWav(processed),duration:processed.duration,peakNote:"Normalisation de crête ≈ -0,54 dBFS ; pas de mesure LUFS ni de certification de diffusion."};
}
