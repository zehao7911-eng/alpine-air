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
