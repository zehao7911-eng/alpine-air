import {HILLS,clamp,ground,profile,newRun,restoreRun,snapshotRun,targetTake,flightTime,targetLand,distanceWorld,action,tick,nextAttempt,total,settle} from './core.mjs';
import {CHALLENGES,challengeFor,jumpLimit,available,takeoffBand,challengeResult,recordActivity,practiceAvailable,TOUR,tourStage,tourIndex,newTourRun,wipeout} from './core.mjs';
import {AlpineView} from './view.mjs';
import {AlpineHost} from './sdk.mjs';
import {SledMusic,playRideSound} from './music.mjs';
const $=id=>document.getElementById(id),key='alpine-air-v1';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let data;try{data=JSON.parse(localStorage.getItem(key)||'null')}catch{}
const valid=v=>v?.game==='alpine-air'&&v.v===1&&v.profile&&typeof v.profile==='object';
let pf=profile(valid(data)?data.profile:undefined);
let circuit=restoreRun(valid(data)?data.run:null,pf)||newRun();
let side=restoreRun(valid(data)?data.side:null,pf);
let tour=restoreRun(valid(data)?data.tour:null,pf)||newTourRun();
let run=data?.selected==='tour'?tour:data?.selected==='side'&&side?side:circuit;
let mode='home',paused=false,changed=false,support={},fx=null,noticeUntil=0,last=0,ctx=null,music,view;
const host=new AlpineHost(window,{
 status(v){support=v;if(mode==='kits')panel()},
 reward(kit){if(pf[kit])return;pf[kit]=true;save();notice(kit==='aurora'?'Aurora suit unlocked':'Ember suit unlocked');tone([490,650,800]);if(mode==='kits')panel()},
 load(v){
  if(!valid(v))return;
  const cloud=profile(v.profile);
  if(!changed&&!valid(data)){
   pf=cloud;
   circuit=restoreRun(v.run,pf)||newRun();
   side=restoreRun(v.side,pf);
   tour=restoreRun(v.tour,pf)||newTourRun();
   run=v.selected==='tour'?tour:v.selected==='side'&&side?side:circuit;
   try{localStorage.setItem(key,JSON.stringify(payload()))}catch{}
  }else{
   pf.unlocked=Math.max(pf.unlocked,cloud.unlocked);
   pf.best=pf.best.map((n,i)=>Math.max(n,cloud.best[i]));
   pf.practice=pf.practice.map((n,i)=>Math.max(n,cloud.practice[i]));
   for(const {id} of CHALLENGES)pf.medals[id]=Math.max(pf.medals[id],cloud.medals[id]);
   pf.aurora||=cloud.aurora;
   pf.ember||=cloud.ember;
   save();
  }
  if(!active()||paused)panel();
 }
});
function payload(){return {game:'alpine-air',v:1,profile:pf,run:snapshotRun(circuit),side:snapshotRun(side),tour:snapshotRun(tour),selected:run===tour?'tour':run===side?'side':'circuit'}}
function selectRun(next){
 run=next;
 if(tourStage(next))tour=next;
 else if(next.activity==='circuit')circuit=next;
 else side=next;
 mode='race';fx=null;noticeUntil=0;$('toast').textContent='';save();
}
const displayedRide=()=>mode==='race'?tourStage(run)?.id??'skis':'skis';
function save(){changed=true;let p=payload();try{localStorage.setItem(key,JSON.stringify(p))}catch{}host.save(p)}
function unlockAudio(){
 try{
  ctx??=new (window.AudioContext||window.webkitAudioContext)();
  if(ctx.state==='suspended'||ctx.state==='interrupted')ctx.resume().catch(()=>{});
  if(pf.music)music??=new SledMusic(ctx);
 }catch{}
}
function tone(notes,type='sine'){if(!pf.sound)return;try{const at=ctx.currentTime;notes.forEach((freq,i)=>{const t=at+i*.073,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.063,t+.025);g.gain.exponentialRampToValueAtTime(.0001,t+.20);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+.205)})}catch{}}
function notice(s,meme=false){$('toast').textContent=s;$('toast').classList.toggle('meme',meme);noticeUntil=performance.now()+1050}
function rideLanding(run){
 const stage=tourStage(run);
 if(!stage)return false;
 const crashed=wipeout(run);
 notice(crashed?stage.crash:stage.clean,true);
 if(pf.sound)playRideSound(ctx,stage.id,crashed?'crash':'land');
 return true;
}
const button=(label,id,cl='primary',tail='→',disabled=false)=>'<button type="button" class="'+cl+'" data-do="'+id+'" '+(disabled?'disabled':'')+'><span>'+label+'</span><span aria-hidden="true">'+tail+'</span></button>';
const names={blue:'Basin Blue',rose:'Glacier Rose',ice:'Ridge Ice',summit:'Summit Green',gold:'Suncrest Gold',aurora:'Aurora Violet',ember:'Ember Orange'};
const starTotal=()=>Object.values(pf.medals).reduce((sum,stars)=>sum+stars,0);
const owned=k=>k==='blue'||k==='rose'&&pf.unlocked>=1||k==='ice'&&pf.best[2]>=HILLS[2].target||k==='summit'&&starTotal()>=4||k==='gold'&&starTotal()>=12||((k==='aurora'||k==='ember')&&pf[k]);
const starsLabel=stars=>'★'.repeat(stars)+'☆'.repeat(3-stars);
function marks(run){
 return '<div class="scores">'+run.results.map(jump=>'<div class="score"><strong>'+jump.distance+' m</strong><span>Style '+jump.style.toFixed(1)+'</span><b>'+jump.points.toFixed(1)+' pts</b></div>').join('')+'</div>';
}
function tourPanel(){
 const stage=tourStage(run),index=tourIndex(run),lastStage=index===TOUR.length-1;
 const label='<small>Sled parade · '+(index+1)+' / '+TOUR.length+'</small>';
 if(run.phase==='ready')return label+'<h2>'+stage.name+'</h2><p>'+stage.tag+'</p>'+button('Start descent','start');
 if(run.phase!=='result')return '';
 const title=lastStage?'Parade complete':wipeout(run)?'Spectacular wipeout':'Landed!';
 return label+'<h2>'+title+'</h2>'+marks(run)+'<p>'+(wipeout(run)?stage.crash:stage.clean)+'</p>'+
  (lastStage?button('Restart parade','tour-reset'):button('Next mystery sled','tour-next'))+
  '<div class="row">'+button('Home','home','secondary','←')+'</div>';
}
function activityPanel(){
 const challenge=challengeFor(run);
 const name=challenge?.name??'Practice';
 const label='<small>'+name+' · '+HILLS[run.hill].name+'</small>';
 if(run.phase==='ready')return label+'<h2>At the gate</h2><p>'+(challenge?.detail??HILLS[run.hill].subtitle??'Train your timing with slower cues. Every jump counts toward your practice best.')+'</p>'+button('Start descent','start');
 if(run.phase==='between')return label+'<h2>First mark</h2>'+marks(run)+'<p>Match your first jump to stay within '+challenge.gap+' m.</p>'+button('Next jump','second');
 if(run.phase!=='result')return '';
 if(!challenge)return label+'<h2>Practice mark</h2>'+marks(run)+'<p>Personal best · '+pf.practice[run.hill]+' m</p>'+button('Jump again','replay')+'<div class="row">'+button('Practice hills','practice','secondary','◭')+button('Home','home','secondary','←')+'</div>';
 const {stars,reason}=challengeResult(run);
 const next=CHALLENGES.indexOf(challenge)+1;
 const advance=stars&&next<CHALLENGES.length;
 return label+'<h2>'+(stars?'Challenge cleared':'Try again')+'</h2><div class="rating" aria-label="'+stars+' out of 3 stars">'+starsLabel(stars)+'</div>'+marks(run)+'<p>'+reason+'</p>'+
  (advance?button('Next challenge','challenge-'+next):'')+'<div class="row">'+button('Jump again','replay',advance?'secondary':'primary','↻')+button('Challenge board','challenges','secondary','◈')+'</div>';
}
const active=()=>['inrun','flight','brake'].includes(run.phase);
const wide=matchMedia('(orientation:landscape) and (max-height:540px)');
function panel(){
 let h=HILLS[run.hill],html='';
 $('meet').textContent=h.code+' · '+h.name;$('menu').setAttribute('aria-label',active()?'Pause':'Open menu');$('hud').hidden=mode!=='race'||!active();
 $('controls').hidden=mode!=='race'||!active()||paused;
 if(!view)return;
 if(paused){html='<small>Alpine circuit</small><h2>Paused</h2>'+button('Resume','resume')+'<div class="row">'+button(pf.sound?'SFX on':'SFX off','sound','secondary','◖')+button(pf.music?'Music on':'Music off','music','secondary','♪')+'</div>'}
 else if(mode==='home'){
  const began=tourIndex(tour)>0||tour.phase==='result';
  html='<small>ALPINE AIR</small><h1>Sled Parade</h1><p>Eight surprise sleds. Tap to jump. Tap again to land.</p>'+
   button(began?'Continue parade':'Start parade','tour')+
   '<div class="row home-dock">'+button('Venues','hills','secondary','◭')+button('More','more','secondary','⋯')+'</div>';
 }
 else if(mode==='settings'){
  html='<small>Alpine Air</small><h2>Settings</h2>'+button('Suits','kits','choice','◇')+
   '<div class="row">'+button(pf.sound?'SFX on':'SFX off','sound','secondary','◖')+button(pf.music?'Music on':'Music off','music','secondary','♪')+'</div>'+
   '<div class="row">'+button('Back','home','secondary','←')+'</div>';
 }
 else if(mode==='more'){
  html='<small>Alpine circuit</small><h2>More ways to play</h2>'+
   button(circuit.phase==='result'?'Circuit results':circuit.results.length?'Continue circuit':'Classic circuit','enter','choice','◭')+
   (side&&side.phase!=='result'?button('Resume '+(challengeFor(side)?.name??'practice'),'resume-side','choice'):'')+
   button('Challenges','challenges','choice','◈')+button('Practice','practice','choice','↻')+
   '<div class="row">'+button('Back','home','secondary','←')+button('Settings','settings','secondary','♪')+'</div>';
 }
 else if(mode==='challenges'){
  html='<small>Alpine challenge board</small><h2>Challenges</h2><p>'+starTotal()+' / 18 stars · Clear a challenge to unlock the next.</p>'+
   CHALLENGES.map((c,i)=>button(c.name,'challenge-'+i,'choice',available(i,pf)?starsLabel(pf.medals[c.id]):'LOCKED',!available(i,pf))).join('')+
   '<div class="row">'+button('Back','home','secondary','←')+'</div>';
 }
 else if(mode==='practice'){
  html='<small>Open training</small><h2>Practice</h2><p>One jump at a time. Slower timing cues and a personal best for each hill.</p>'+
   HILLS.map((v,i)=>button(v.name,'practice-'+i,'choice',!practiceAvailable(i,pf)?'LOCKED':pf.practice[i]?pf.practice[i]+' M':v.venue?'NEW':'→',!practiceAvailable(i,pf))).join('')+
   '<div class="row">'+button('Back','home','secondary','←')+'</div>';
 }
 else if(mode==='hills'){
  html='<small>Alpine circuit</small><h2>Venues</h2><p>Tour the new venues now, or unlock their meets in the circuit.</p>'+
   HILLS.map((v,i)=>{
    const tour=v.venue&&i>pf.unlocked;
    return button(v.name,tour?'practice-'+i:'hill'+i,'choice',tour?'EXPLORE':i>pf.unlocked?'LOCKED':pf.best[i]?pf.best[i].toFixed(1)+' PTS':'→',!tour&&i>pf.unlocked);
   }).join('')+'<div class="row">'+button('Back','home','secondary','←')+'</div>';
 }
 else if(mode==='kits'){html='<small>Equipment</small><h2>Ski suits</h2>'+Object.keys(names).filter(k=>!['aurora','ember'].includes(k)||support[k]||pf[k]).map(k=>button(names[k],'kit-'+k,'choice',pf.kit===k?'✓':owned(k)?'◇':k==='summit'?'4 STARS':k==='gold'?'12 STARS':'LOCKED',!owned(k))).join('');
  if(support.aurora&&!pf.aurora)html+='<p class="reward">Like this game in GameWave to unlock Aurora Violet.</p>';
  if(support.ember&&!pf.ember)html+='<p class="reward">Post a direct comment in GameWave to unlock Ember Orange.</p>';
  html+='<div class="row">'+button('Back','settings','secondary','←')+'</div>';
 }else if(tourStage(run)){html=tourPanel()}
 else if(run.activity!=='circuit'){html=activityPanel()}
 else if(run.phase==='ready'){html='<small>'+h.name+' · Jump '+(run.attempt+1)+' / 2</small><h2>At the gate</h2><p>Tap when the timing bar reaches mint. Two jumps to score '+h.target+' points.</p>'+button('Start descent','start')}
 else if(run.phase==='between'||run.phase==='result'){
  const done=run.phase==='result',win=total(run)>=h.target,finalHill=run.hill===HILLS.length-1;
  html='<small>'+h.name+' · '+(done?'Meet results':'Jump 1 of 2')+'</small><h2>'+(done?(win?(finalHill?'Circuit champion':'Hill cleared'):'Try another meet'):'First mark')+'</h2>'+(win&&done?'<div class="medal" aria-hidden="true">✦</div>':'')+marks(run)+'<p>'+total(run).toFixed(1)+' / '+h.target+' points'+(done&&win&&!finalHill?' · '+HILLS[run.hill+1].name+' unlocked':'')+'</p>';
  html+=done?(win&&!finalHill?button('Next hill','next'):'')+'<div class="row">'+button('Jump again','replay',win&&!finalHill?'secondary':'primary','↻')+button('Venues','hills','secondary','◭')+'</div>':button('Next jump','second');
 }
 $('panel').innerHTML=html;
}
function press(){
 if(paused||wide.matches||mode!=='race'||!view)return;
 unlockAudio();
 let e=action(run);
 if(e==='start'){host.connect();host.start();save();tone([320,470]);panel()}
 if(e==='take'||e==='land'){
  const q=e==='take'?run.take:run.land;
  if(e==='take'&&q>=.81&&tourStage(run))notice('YEET!',true);
  else notice(q>=.81?(e==='take'?'CLEAN TAKEOFF':'TELEMARK READY'):q>=.45?'GOOD TIMING':'OFF THE MARK');
  tone(q>=.81?[480,645,815]:[325,430]);if(q>=.81)navigator.vibrate?.(14);
 }
}
$('panel').addEventListener('click',ev=>{
 const b=ev.target.closest('[data-do]');if(!b)return;const id=b.dataset.do;
 unlockAudio();
 if(id==='start'){press();return}
 if(id==='resume'){paused=false;panel();return}
 if(id==='sound'){pf.sound=!pf.sound;save();if(pf.sound)tone([500]);panel();return}
 if(id==='music'){pf.music=!pf.music;if(pf.music)unlockAudio();else music?.update(false);save();panel();return}
 tone([380]);
 if(id==='enter')selectRun(circuit);
 else if(id==='tour')selectRun(tour);
 else if(id==='tour-next'&&run===tour&&run.phase==='result'&&tourIndex(run)<TOUR.length-1)selectRun(newTourRun(tourIndex(run)+1));
 else if(id==='tour-reset'&&run===tour&&run.phase==='result')selectRun(newTourRun());
 else if(id==='resume-side'&&side)selectRun(side);
 else if(['home','hills','kits','settings','more','challenges','practice'].includes(id))mode=id;
 else if(id==='second'){nextAttempt(run);mode='race';save()}
 else if(id.startsWith('challenge-')){
  const i=Number(id.slice(10)),challenge=CHALLENGES[i];
  if(challenge&&available(i,pf))selectRun(side?.activity===challenge.id&&side.phase!=='result'?side:newRun(challenge.hill,challenge.id));
 }else if(id.startsWith('practice-')){
  const i=Number(id.slice(9));
  if(practiceAvailable(i,pf))selectRun(newRun(i,'practice'));
 }else if(id==='replay'){selectRun(newRun(run.hill,run.activity))}
 else if(id==='next'||/^hill\d+$/.test(id)){
  const n=id==='next'?run.hill+1:Number(id.slice(4));
  if(n>pf.unlocked||n>=HILLS.length)return;
  selectRun(newRun(n))
 }else if(id.startsWith('kit-')){const k=id.slice(4);if(owned(k)){pf.kit=k;save()}}
 panel()
});
$('tap').addEventListener('click',press);
$('menu').addEventListener('click',()=>{unlockAudio();tone([335]);if(active()){paused=!paused;if(paused)music?.update(false)}else{mode=mode==='home'?'settings':'home'}panel()});
window.addEventListener('keydown',e=>{if(e.repeat||e.target.closest?.('button'))return;if(e.code==='Space'&&active()){e.preventDefault();press()}});
function freeze(){music?.update(false);if(active()&&!paused){paused=true;panel()}}
document.addEventListener('visibilitychange',()=>{if(document.hidden)freeze()});wide.addEventListener('change',()=>{if(wide.matches)freeze()});
window.addEventListener('pagehide',()=>{freeze();host.stop()});window.addEventListener('pageshow',e=>{if(e.persisted)location.reload()});
function controls(){
 let fly=run.phase==='flight'||run.phase==='brake',b=$('tap'),h=HILLS[run.hill],duration=fly?flightTime(run):h.time,target=fly?targetLand(run):targetTake(run),width=h.window*.52;
 const gold=!fly&&takeoffBand(run);
 const landing=fly?challengeFor(run)?.landing:undefined;
 const precision=landing?Math.min(width,(1-landing)*h.window*1.8):width;
 const [left,right]=gold||[target-precision,target+precision];
 const hot=run.phase!=='brake'&&run.t>=left&&run.t<=right&&!run.mark;
 b.classList.toggle('landing',fly);b.classList.toggle('hot',hot);
 b.disabled=run.phase==='brake'||run.mark||run.t<target-.82;
 const title=fly?'LAND':'JUMP';b.querySelector('span').textContent=title;b.setAttribute('aria-label',fly?'Prepare landing':'Take off');
 $('step').textContent=fly?'02 / LANDING':'01 / TAKEOFF';
 $('hint').textContent=run.phase==='brake'?'Skis on snow':run.mark?(fly?'Landing set':'Takeoff set'):hot?'Tap now!':gold?'Watch for the gold zone':fly?'Watch for the mint zone':'Watch the stripe';
 $('needle').style.left=(run.phase==='brake'?100:clamp(run.t/duration)*100)+'%';
 $('zone').style.left=(clamp(left/duration)*100)+'%';
 $('zone').style.right=(100-clamp(right/duration)*100)+'%';
 $('zone').classList.toggle('gold',Boolean(gold));
 $('jump').textContent=tourStage(run)?'SLED '+(tourIndex(run)+1)+' / '+TOUR.length:'JUMP '+(run.attempt+1)+' / '+jumpLimit(run);
 $('wind').textContent=h.wind===0?'— Calm':(h.wind>0?'→ ':'← ')+Math.abs(h.wind).toFixed(1)+' m/s';
 $('meters').firstChild.textContent=Math.round(Math.min(Math.max(0,run.z),distanceWorld(run))*2.36)+' ';
}
function frame(ms){
 requestAnimationFrame(frame);const dt=Math.min(.08,(ms-(last||ms))/1000);last=ms;
 if(document.hidden||wide.matches)return;
 music?.update(pf.music&&!paused&&mode==='race'&&active(),run.phase==='flight');
 if(noticeUntil&&ms>noticeUntil){$('toast').textContent='';noticeUntil=0}
 if(active()&&mode==='race'&&!paused){
  const training=run.activity==='practice'||Boolean(takeoffBand(run));
  const tutorial=(training||run.hill===0&&run.attempt===0)&&!run.mark&&(run.phase==='inrun'&&run.t>targetTake(run)-(training?.76:.55)||run.phase==='flight'&&run.t>targetLand(run)-.55);
  const e=tick(run,dt*(tutorial?.61:1));
  if(e==='flight'){
   if(!run.take)notice('OFF THE LIP');
   const stage=tourStage(run);
   if(stage){if(pf.sound)playRideSound(ctx,stage.id,'launch')}
   else tone([280,410],'triangle');
  }
  if(e==='touchdown'){
   fx={x:run.x,y:ground(run.z),z:run.z,t:1};
   if(!rideLanding(run)){notice(run.land>.81?'CLEAN TELEMARK':run.land>.45?'SAFE LANDING':'HARD LANDING');tone(run.land>.81?[325,490,650]:[165,120],'triangle')}
   navigator.vibrate?.(run.land>.81?25:45)
  }
  if(e==='between'||e==='result'){
   host.end();
   if(e==='result'){
    const clear=run.activity==='circuit'?settle(run,pf):recordActivity(run,pf);
    if(clear){notice(run.activity==='circuit'?'HILL CLEARED':'CHALLENGE CLEARED');tone([440,550,660,880])}
   }
   save();panel();
  }
  controls()
 }
 if(!paused&&fx)fx.t=Math.max(0,fx.t-dt*1.24);
 view.render(run,pf.kit,mode,fx,reduced.matches,paused?0:dt,displayedRide());
}
try{view=new AlpineView($('stage'));view.render(run,pf.kit,mode,null,reduced.matches,1/60,displayedRide());panel();host.poll();requestAnimationFrame(frame)}
catch(e){console.error(e);$('panel').innerHTML='<small>Alpine Air</small><h2>3D unavailable</h2><p>This game needs WebGL. Try opening it in Safari, Chrome or Edge with hardware acceleration enabled.</p>'}

