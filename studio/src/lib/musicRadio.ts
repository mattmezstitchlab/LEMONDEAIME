import type { MusicTrack } from "./musicLabelCore";
/** Local DJ engine: equal-power crossfades between authorised local audio files.
 * BPM is user-supplied and adjusted only within ±6%; never claims beat analysis. */
export class MusicRadio {
  private current:{audio:HTMLAudioElement;index:number}|null=null;
  private incoming:{audio:HTMLAudioElement;index:number}|null=null;
  private fadeStart=0;
  private timer:number|null=null;
  private starting=false;
  private tracks:MusicTrack[]=[];
  private files=new Map<string,string>();
  private onState:(v:{playing:boolean;trackId:string;seconds:number;status:string})=>void=()=>{};
  public fadeSeconds=6;
  public matchBPM=true;
  setStateListener(listener:(v:{playing:boolean;trackId:string;seconds:number;status:string})=>void){this.onState=listener;}
  setSources(tracks:MusicTrack[],files:Map<string,string>){this.tracks=tracks.filter(t=>files.has(t.id));this.files=files;}
  get available(){return this.tracks.length;}
  get playing(){return !!this.current&&!this.current.audio.paused;}
  private update(status=""){const a=this.current;this.onState({playing:this.playing,trackId:a?this.tracks[a.index]?.id??"": "",seconds:a?.audio.currentTime??0,status});}
  async start(index=0):Promise<void>{
    if(!this.tracks.length)throw Error("Importez des fichiers audio pour écouter la radio.");
    const idx=((index%this.tracks.length)+this.tracks.length)%this.tracks.length;
    this.stop();
    const src=this.files.get(this.tracks[idx].id);if(!src)throw Error("Fichier indisponible");
    const audio=new Audio(src);audio.volume=1;
    this.current={audio,index:idx};
    audio.onended=()=>{if(!this.incoming)void this.start(idx+1).catch(()=>this.stop());};
    try{await audio.play();}catch(e){this.stop();throw e;}
    this.timer=window.setInterval(()=>this.tick(),80);
    this.update("Lecture locale démarrée.");
  }
  stop():void{
    if(this.timer!==null)window.clearInterval(this.timer);this.timer=null;
    this.current?.audio.pause();this.incoming?.audio.pause();
    this.current=null;this.incoming=null;this.starting=false;this.fadeStart=0;this.update();
  }
  async mixNext():Promise<void>{
    if(this.starting||this.incoming||!this.current||this.tracks.length<2)return;
    this.starting=true;
    try{
      const from=this.tracks[this.current.index],index=(this.current.index+1)%this.tracks.length,to=this.tracks[index];
      const src=this.files.get(to.id);if(!src)return;
      const audio=new Audio(src);audio.volume=0;
      const ratio=this.matchBPM&&from.bpm>0&&to.bpm>0?from.bpm/to.bpm:1;
      if(ratio>=.94&&ratio<=1.06)audio.playbackRate=ratio;
      this.incoming={audio,index};
      await audio.play();this.fadeStart=performance.now();
      this.update(audio.playbackRate!==1?"Fondu et ajustement BPM approximatif.":"Fondu enchaîné en cours.");
    }catch{this.incoming?.audio.pause();this.incoming=null;this.update("Le morceau suivant n'est pas lisible.");}
    finally{this.starting=false;}
  }
  private tick(){
    if(!this.current)return;
    const a=this.current.audio,b=this.incoming?.audio;
    if(b&&this.incoming){
      const t=Math.max(0,Math.min(1,(performance.now()-this.fadeStart)/(this.fadeSeconds*1000)));
      a.volume=Math.cos(Math.PI*t/2);b.volume=Math.sin(Math.PI*t/2);
      if(t>=1){
        a.pause();this.current=this.incoming;this.incoming=null;
        const idx=this.current.index;
        this.current.audio.onended=()=>{if(!this.incoming)void this.start(idx+1).catch(()=>this.stop());};
        this.update("Enchaînement terminé.");
      }
      return;
    }
    const left=a.duration-a.currentTime;
    if(this.tracks.length>1&&Number.isFinite(left)&&left>0&&left<=this.fadeSeconds+.15)
      void this.mixNext();
    this.update();
  }
  dispose(){this.stop();this.onState=()=>{};}
}
