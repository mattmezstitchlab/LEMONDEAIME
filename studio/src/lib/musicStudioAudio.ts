import { musicEvents, type MusicNote, type MusicScore, type MusicVoice } from "./musicStudioCore";
import { dmcSound } from "./artWorldCore";
import { flossIndex, FLOSS } from "./dmc";

/**
 * Local instrument: the visual playhead can run without sound.
 * Browsers only unlock AudioContext after a deliberate user interaction.
 * Playback is streamed in short windows so new gestures can be heard while editing.
 */
export class MusicAudio {
  private context:AudioContext|null=null;
  private voices:OscillatorNode[]=[];
  private played=new Set<string>();
  private enabled=false;
  get soundEnabled(){return this.enabled;}
  async activate():Promise<void>{
    const NativeAudio=window.AudioContext;
    if(!NativeAudio)throw Error("Votre navigateur ne permet pas la synthèse sonore.");
    const ctx=this.context??(this.context=new NativeAudio());
    await ctx.resume();
    this.enabled=ctx.state==="running";
  }
  /** One gesture always sounds when placed, regardless of its timeline position. */
  async preview(note:MusicNote):Promise<void>{
    await this.activate();
    const context=this.context;if(!context)return;
    const events=musicEvents({version:1,id:"preview",title:"",intention:"",audience:"ensemble",tempo:120,notes:[note]});
    const now=context.currentTime+.015;
    for(const e of events){
      this.schedule(context,now+Math.max(0,e.time-note.time),e.duration,e.midi,e.velocity,e.voice);
    }
  }
  /** Reuse the deterministic DMC note mapping. No external samples are downloaded. */
  async previewDMC(code:string):Promise<void>{
    await this.activate();
    const idx=flossIndex(code),floss=FLOSS[idx];if(!floss)return;
    const {midi,duration}=dmcSound(floss.code,floss.hex);
    this.schedule(this.context!,this.context!.currentTime+.016,duration,midi,.7,"bell");
  }
  /**
   * Audible part of an always-moving visual transport.
   * The caller supplies the current time and a short look-ahead, typically 0.14s.
   */
  queue(score:MusicScore,position:number,lookAhead=.14):void{
    const ctx=this.context;
    if(!ctx||ctx.state!=="running"||!this.enabled)return;
    const limit=position+lookAhead;
    const events=musicEvents(score);
    for(let i=0;i<events.length;i++){
      const e=events[i],id=e.noteId+":"+i;
      if(e.time>=position-.025 && e.time<limit && !this.played.has(id)){
        this.played.add(id);
        const offset=Math.max(.006,e.time-position);
        this.schedule(ctx,ctx.currentTime+offset,e.duration,e.midi,e.velocity,e.voice);
      }
    }
  }
  /** A new playback lap re-enables every saved gesture. */
  nextLap(){this.played.clear();}
  stopVoices(){
    for(const node of this.voices){try{node.stop();}catch{/* already stopped */}}
    this.voices=[];
    this.played.clear();
  }
  private schedule(ctx:AudioContext,start:number,duration:number,midi:number,velocity:number,voice:MusicVoice){
    const fundamental=440*Math.pow(2,(midi-69)/12);
    const master=ctx.createGain();master.connect(ctx.destination);
    const amp=Math.min(.13,Math.max(.012,velocity*.12));
    const attack=voice==="pad"?.09:voice==="bell"?.012:.006;
    const sustain=voice==="pad"?.65:voice==="pluck"?.1:voice==="drum"?.13:.16;
    const tail=voice==="pad"?.45:voice==="bell"?.4:.10;
    master.gain.setValueAtTime(.0001,start);
    master.gain.exponentialRampToValueAtTime(amp,start+attack);
    master.gain.exponentialRampToValueAtTime(Math.max(.0002,amp*sustain),start+Math.max(attack+.02,duration*.65));
    master.gain.exponentialRampToValueAtTime(.0001,start+duration+tail);
    // Tuned overtones produce a richer bell/pad timbre than a single oscillator.
    const harmonics=voice==="bell"?[[1,1],[2.01,.34],[3.97,.1]]:
      voice==="pad"?[[1,.75],[2,.17],[.501,.1]]:
      voice==="drum"?[[1,1],[.5,.18]]:
      [[1,1],[2,.2]];
    let remaining=harmonics.length;
    for(const [mult,level] of harmonics){
      const oscillator=ctx.createOscillator(),partial=ctx.createGain();
      oscillator.type=voice==="pluck"?"triangle":voice==="drum"?"triangle":"sine";
      oscillator.frequency.setValueAtTime(fundamental*mult,start);
      if(voice==="drum")oscillator.frequency.exponentialRampToValueAtTime(Math.max(35,fundamental*mult*.75),start+Math.min(.2,duration));
      partial.gain.value=level;
      oscillator.connect(partial);partial.connect(master);
      oscillator.start(start);oscillator.stop(start+duration+tail+.02);
      oscillator.onended=()=>{
        oscillator.disconnect();partial.disconnect();
        this.voices=this.voices.filter(v=>v!==oscillator);
        if(--remaining===0)master.disconnect();
      };
      this.voices.push(oscillator);
    }
  }
  dispose(){this.stopVoices();const ctx=this.context;this.context=null;this.enabled=false;if(ctx)void ctx.close();}
}
