const tune=[72,76,79,78,76,null,74,71,67,71,74,77,76,74,72,null,76,79,84,83,79,76,78,null,77,74,71,69,67,71,72,null];
const bass=[48,43,45,43,48,45,41,43];
const pitch=note=>440*2**((note-69)/12);

// A swung toy-brass tune, synthesized locally so the game works offline.
export class SledMusic{
 constructor(context){
  this.ctx=context;
  this.bus=context.createGain();
  this.bus.gain.value=0;
  this.bus.connect(context.destination);
  this.playing=false;
  this.step=0;
  this.next=0;
 }
 voice(note,at,length,type,level,slide=0){
  const ctx=this.ctx,osc=ctx.createOscillator(),gain=ctx.createGain();
  osc.type=type;
  osc.frequency.setValueAtTime(pitch(note+slide),at);
  if(slide)osc.frequency.exponentialRampToValueAtTime(pitch(note),at+.047);
  gain.gain.setValueAtTime(.0001,at);
  gain.gain.exponentialRampToValueAtTime(level,at+.018);
  gain.gain.exponentialRampToValueAtTime(.0001,at+length);
  osc.connect(gain);
  gain.connect(this.bus);
  osc.start(at);
  osc.stop(at+length+.012);
 }
 update(enabled,flight=false){
  const ctx=this.ctx;
  const wanted=enabled&&ctx.state==='running';
  if(wanted!==this.playing){
   this.playing=wanted;
   this.bus.gain.setTargetAtTime(wanted?.52:0,ctx.currentTime,.030);
   if(wanted){this.next=ctx.currentTime+.035;this.step=0}
  }
  if(!wanted)return;
  if(this.next<ctx.currentTime)this.next=ctx.currentTime+.018;
  while(this.next<ctx.currentTime+.09){
   const beat=this.step%tune.length,bar=Math.floor(beat/4),note=tune[beat],at=this.next;
   if(beat%2===0)this.voice(bass[bar]+(beat%4===2?7:0),at,.16,'triangle',.050);
   else {
    this.voice(bass[bar]+12,at,.084,'triangle',.022);
    this.voice(bass[bar]+(bar===2||bar===5?15:16),at,.084,'sine',.016);
   }
   if(note!==null)this.voice(note,at,beat%4===0?.20:.125,flight?'square':'triangle',flight?.024:.040,beat%4===0?-2:0);
   this.next+=beat%2===0?.183:.124;
   this.step++;
  }
 }
}

const rideCues={
 tub:{wave:'sine',launch:[230,290,390],land:[330,410,620],crash:[380,290,210,160],slide:.63},
 cart:{wave:'square',launch:[188,251,211],land:[392,494,660],crash:[255,193,244,136,171],slide:.93},
 toilet:{wave:'triangle',launch:[190,245,340],land:[261,330,392,523],crash:[360,270,184,117,78],slide:1.38},
 duck:{wave:'sawtooth',launch:[510,370],land:[620,460,575],crash:[580,460,290,175],slide:1.48},
 toaster:{wave:'triangle',launch:[520,680],land:[880,1175],crash:[750,1180,235],slide:.77},
 sofa:{wave:'triangle',launch:[132,158,196],land:[248,196,156],crash:[242,175,112,65],slide:1.30},
 banana:{wave:'sine',launch:[262,338,530],land:[415,550,700],crash:[655,445,250,110],slide:1.65},
 ufo:{wave:'sine',launch:[385,620,430,870],land:[700,480,940],crash:[970,580,365,195,120],slide:1.74}
};
export function playRideSound(ctx,ride,event){
 const cue=rideCues[ride];
 if(!cue||ctx?.state!=='running')return;
 cue[event].forEach((hz,i)=>{
  const osc=ctx.createOscillator(),gain=ctx.createGain();
  const start=ctx.currentTime+i*.077;
  const duration=event==='crash'?.16:.125;
  osc.type=cue.wave;
  osc.frequency.setValueAtTime(hz*cue.slide,start);
  osc.frequency.exponentialRampToValueAtTime(hz,start+duration*.70);
  gain.gain.setValueAtTime(.0001,start);
  gain.gain.exponentialRampToValueAtTime(cue.wave==='sawtooth'||cue.wave==='square'?.027:.064,start+.017);
  gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start+duration+.008);
 });
}
