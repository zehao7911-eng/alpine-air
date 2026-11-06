import {HILLS,clamp,ground,profile,newRun,restoreRun,snapshotRun,targetTake,flightTime,targetLand,distanceWorld,action,tick,nextAttempt,total,settle} from './core.mjs';
import {AlpineView} from './view.mjs';
import {AlpineHost} from './sdk.mjs';
const $=id=>document.getElementById(id),key='alpine-air-v1';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let data;try{data=JSON.parse(localStorage.getItem(key)||'null')}catch{}
const valid=v=>v?.game==='alpine-air'&&v.v===1&&v.profile&&typeof v.profile==='object';
let pf=profile(valid(data)?data.profile:undefined), run=restoreRun(valid(data)?data.run:null,pf)||newRun(),mode='home',paused=false,changed=false,support={},fx=null,noticeUntil=0,last=0,ctx=null,view;
const host=new AlpineHost(window,{
 status(v){support=v;if(mode==='kits')panel()},
 reward(kit){if(pf[kit])return;pf[kit]=true;save();notice(kit==='aurora'?'Aurora suit unlocked':'Ember suit unlocked');tone([490,650,800]);if(mode==='kits')panel()},
 load(v){if(!valid(v))return;let cloud=profile(v.profile);if(!changed&&!valid(data)){pf=cloud;run=restoreRun(v.run,pf)||newRun();try{localStorage.setItem(key,JSON.stringify(payload()))}catch{}}else{pf.unlocked=Math.max(pf.unlocked,cloud.unlocked);pf.best=pf.best.map((n,i)=>Math.max(n,cloud.best[i]));pf.aurora||=cloud.aurora;pf.ember||=cloud.ember;save()}if(!active()||paused)panel()}
});
function payload(){return {game:'alpine-air',v:1,profile:pf,run:snapshotRun(run)}}
function save(){changed=true;let p=payload();try{localStorage.setItem(key,JSON.stringify(p))}catch{}host.save(p)}
function tone(notes,type='sine'){if(!pf.sound)return;try{ctx??=new (window.AudioContext||window.webkitAudioContext)();if(ctx.state==='suspended')ctx.resume().catch(()=>{});const at=ctx.currentTime;notes.forEach((freq,i)=>{const t=at+i*.073,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.063,t+.025);g.gain.exponentialRampToValueAtTime(.0001,t+.20);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+.205)})}catch{}}
function notice(s){$('toast').textContent=s;noticeUntil=performance.now()+1050}
const button=(label,id,cl='primary',tail='→',disabled=false)=>'<button type="button" class="'+cl+'" data-do="'+id+'" '+(disabled?'disabled':'')+'><span>'+label+'</span><span aria-hidden="true">'+tail+'</span></button>';
const names={blue:'Basin Blue',rose:'Glacier Rose',ice:'Ridge Ice',aurora:'Aurora Violet',ember:'Ember Orange'};
const owned=k=>k==='blue'||k==='rose'&&pf.unlocked>=1||k==='ice'&&pf.best[2]>=HILLS[2].target||((k==='aurora'||k==='ember')&&pf[k]);
const active=()=>['inrun','flight','brake'].includes(run.phase);
const wide=matchMedia('(orientation:landscape) and (max-height:540px)');
function panel(){
 let h=HILLS[run.hill],html='';
 $('meet').textContent=h.code+' · '+h.name;$('menu').setAttribute('aria-label',active()?'Pause':'Open menu');$('hud').hidden=mode!=='race'||!active();
 $('controls').hidden=mode!=='race'||!active()||paused;
 if(!view)return;
 if(paused){html='<small>Alpine circuit</small><h2>Paused</h2>'+button('Resume','resume')+'<div class="row">'+button(pf.sound?'Sound on':'Sound off','sound','secondary','♪')+'</div>'}
 else if(mode==='home'){html='<small>THE ALPINE CIRCUIT</small><h1>Catch the air.</h1><p>Tap to jump at the edge. Tap again just before your skis touch down.</p>'+button(run.phase==='result'?'View results':run.results.length?'Continue meet':'Enter meet','enter')+'<div class="row">'+button('Hills','hills','secondary','◭')+button('Suits','kits','secondary','◇')+'</div>'}
 else if(mode==='hills'){html='<small>Alpine circuit</small><h2>Hills</h2>'+HILLS.map((v,i)=>button(v.name,'hill'+i,'choice',i>pf.unlocked?'LOCKED':pf.best[i]?pf.best[i].toFixed(1)+' PTS':'→',i>pf.unlocked)).join('')+'<div class="row">'+button('Back','home','secondary','←')+'</div>'}
 else if(mode==='kits'){html='<small>Equipment</small><h2>Ski suits</h2>'+Object.keys(names).filter(k=>!['aurora','ember'].includes(k)||support[k]||pf[k]).map(k=>button(names[k],'kit-'+k,'choice',pf.kit===k?'✓':owned(k)?'◇':'LOCKED',!owned(k))).join('');
  if(support.aurora&&!pf.aurora)html+='<p class="reward">Like this game in GameWave to unlock Aurora Violet.</p>';
  if(support.ember&&!pf.ember)html+='<p class="reward">Post a direct comment in GameWave to unlock Ember Orange.</p>';
  html+='<div class="row">'+button('Back','home','secondary','←')+button(pf.sound?'Sound on':'Sound off','sound','secondary','♪')+'</div>';
 }else if(run.phase==='ready'){html='<small>'+h.name+' · Jump '+(run.attempt+1)+' / 2</small><h2>At the gate</h2><p>Tap when the timing bar reaches mint. Two jumps to score '+h.target+' points.</p>'+button('Start descent','start')}
 else if(run.phase==='between'||run.phase==='result'){
  const done=run.phase==='result',win=total(run)>=h.target;
  html='<small>'+h.name+' · '+(done?'Meet results':'Jump 1 of 2')+'</small><h2>'+(done?(win?(run.hill===2?'Circuit champion':'Hill cleared'):'Try another meet'):'First mark')+'</h2>'+(win&&done?'<div class="medal" aria-hidden="true">✦</div>':'')+'<div class="scores">'+run.results.map((v,i)=>'<div class="score"><strong>'+v.distance+' m</strong><span>Style '+v.style.toFixed(1)+'</span><b>'+v.points.toFixed(1)+' pts</b></div>').join('')+'</div><p>'+total(run).toFixed(1)+' / '+h.target+' points'+(done&&win&&run.hill<2?' · '+HILLS[run.hill+1].name+' unlocked':'')+'</p>';
  html+=done?(win&&run.hill<2?button('Next hill','next'):'')+'<div class="row">'+button('Jump again','replay',win&&run.hill<2?'secondary':'primary','↻')+button('Hills','hills','secondary','◭')+'</div>':button('Next jump','second');
 }
 $('panel').innerHTML=html;
}
function press(){
 if(paused||wide.matches||mode!=='race'||!view)return;
 let e=action(run);
 if(e==='start'){host.connect();host.start();save();tone([320,470]);panel()}
 if(e==='take'||e==='land'){
  const q=e==='take'?run.take:run.land;
  notice(q>=.81?(e==='take'?'CLEAN TAKEOFF':'TELEMARK READY'):q>=.45?'GOOD TIMING':'OFF THE MARK');
  tone(q>=.81?[480,645,815]:[325,430]);if(q>=.81)navigator.vibrate?.(14);
 }
}
$('panel').addEventListener('click',ev=>{
 const b=ev.target.closest('[data-do]');if(!b)return;const id=b.dataset.do;
 if(id==='start'){press();return}
 if(id==='resume'){paused=false;panel();return}
 if(id==='sound'){pf.sound=!pf.sound;save();if(pf.sound)tone([500]);panel();return}
 tone([380]);
 if(id==='enter')mode='race';
 else if(id==='home'||id==='hills'||id==='kits')mode=id;
 else if(id==='second'){nextAttempt(run);mode='race';save()}
 else if(id==='replay'||id==='next'||/^hill[0-2]$/.test(id)){
  const n=id==='next'?run.hill+1:id==='replay'?run.hill:Number(id.slice(4));
  if(n>pf.unlocked||n>=HILLS.length)return;
  run=newRun(n);mode='race';save()
 }else if(id.startsWith('kit-')){const k=id.slice(4);if(owned(k)){pf.kit=k;save()}}
 panel()
});
$('tap').addEventListener('click',press);
$('menu').addEventListener('click',()=>{tone([335]);if(active()){paused=!paused}else{mode=mode==='home'?'kits':'home'}panel()});
window.addEventListener('keydown',e=>{if(e.repeat||e.target.closest?.('button'))return;if(e.code==='Space'&&active()){e.preventDefault();press()}});
function freeze(){if(active()&&!paused){paused=true;panel()}}
document.addEventListener('visibilitychange',()=>{if(document.hidden)freeze()});wide.addEventListener('change',()=>{if(wide.matches)freeze()});
window.addEventListener('pagehide',()=>{freeze();host.stop()});window.addEventListener('pageshow',e=>{if(e.persisted)location.reload()});
function controls(){
 let fly=run.phase==='flight'||run.phase==='brake',b=$('tap'),h=HILLS[run.hill],duration=fly?flightTime(run):h.time,target=fly?targetLand(run):targetTake(run),width=h.window*.52;
 const hot=Math.abs(run.t-target)<=width&&!run.mark;
 b.classList.toggle('landing',fly);b.classList.toggle('hot',hot);
 b.disabled=run.phase==='brake'||run.mark||run.t<target-.82;
 const title=fly?'LAND':'JUMP';b.querySelector('span').textContent=title;b.setAttribute('aria-label',fly?'Prepare landing':'Take off');
 $('step').textContent=fly?'02 / LANDING':'01 / TAKEOFF';
 $('hint').textContent=run.phase==='brake'?'Skis on snow':run.mark?(fly?'Landing set':'Takeoff set'):hot?'Tap now!':fly?'Watch for the mint zone':'Watch the stripe';
 $('needle').style.left=(clamp(run.t/duration)*100)+'%';
 $('zone').style.left=(clamp((target-width)/duration)*100)+'%';
 $('zone').style.right=(100-clamp((target+width)/duration)*100)+'%';
 $('jump').textContent='JUMP '+(run.attempt+1)+' / 2';
 $('wind').textContent=h.wind===0?'— Calm':(h.wind>0?'→ ':'← ')+Math.abs(h.wind).toFixed(1)+' m/s';
 $('meters').firstChild.textContent=Math.round(Math.min(Math.max(0,run.z),distanceWorld(run))*2.36)+' ';
}
function frame(ms){
 requestAnimationFrame(frame);const dt=Math.min(.08,(ms-(last||ms))/1000);last=ms;
 if(document.hidden||wide.matches)return;
 if(noticeUntil&&ms>noticeUntil){$('toast').textContent='';noticeUntil=0}
 if(active()&&mode==='race'&&!paused){
  const tutorial=run.hill===0&&run.attempt===0&&!run.mark&&(run.phase==='inrun'&&run.t>targetTake(run)-.55||run.phase==='flight'&&run.t>targetLand(run)-.55);
  const e=tick(run,dt*(tutorial?.61:1));
  if(e==='flight'){if(!run.take)notice('OFF THE LIP');tone([280,410],'triangle')}
  if(e==='touchdown'){fx={x:run.x,y:ground(run.z),z:run.z,t:1};notice(run.land>.81?'CLEAN TELEMARK':run.land>.45?'SAFE LANDING':'HARD LANDING');tone(run.land>.81?[325,490,650]:[165,120],'triangle');navigator.vibrate?.(run.land>.81?25:45)}
  if(e==='between'||e==='result'){host.end();if(e==='result'&&settle(run,pf)){notice('HILL CLEARED');tone([440,550,660,880])}save();panel()}
  controls()
 }
 if(!paused&&fx)fx.t=Math.max(0,fx.t-dt*1.24);
 view.render(run,pf.kit,mode,fx,reduced.matches);
}
try{view=new AlpineView($('stage'));view.render(run,pf.kit,mode,null,reduced.matches);panel();host.poll();requestAnimationFrame(frame)}
catch(e){console.error(e);$('panel').innerHTML='<small>Alpine Air</small><h2>3D unavailable</h2><p>This game needs WebGL. Try opening it in Safari, Chrome or Edge with hardware acceleration enabled.</p>'}
