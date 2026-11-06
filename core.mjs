export const HILLS=[
 {name:'Pine Basin',code:'PB / 01',target:108,wind:0,time:3.6,window:.37,sky:0xc5e0ee,snow:0xe6f4ff,accent:0xbafde9},
 {name:'Rose Glacier',code:'RG / 02',target:147,wind:1.2,time:3.45,window:.30,sky:0xe0acc2,snow:0xf6ebff,accent:0xffce9d},
 {name:'Aurora Ridge',code:'AR / 03',target:184,wind:-1.9,time:3.3,window:.25,sky:0x7581bc,snow:0xcedcff,accent:0xc8dbff}
];
export const CHALLENGES=[
 {id:'blue-line',name:'Blue Line',hill:0,jumps:1,band:[74,87],landing:.45,detail:'Land at 74–87 m. Tap in the gold zone for a shorter jump.'},
 {id:'soft-snow',name:'Soft Snow',hill:0,jumps:1,min:88,landing:.82,detail:'Reach 88 m and land with a clean telemark.'},
 {id:'twin-tracks',name:'Twin Tracks',hill:1,jumps:2,min:87,gap:9,landing:.42,detail:'Jump at least 87 m twice, with no more than 9 m between your marks.'},
 {id:'rose-gate',name:'Rose Gate',hill:1,jumps:1,band:[92,103],landing:.68,detail:'Land inside the 92–103 m gold zone with a controlled landing.'},
 {id:'ridge-reach',name:'Ridge Reach',hill:2,jumps:1,min:104,landing:.66,detail:'Reach 104 m and land with control on Aurora Ridge.'},
 {id:'north-star',name:'North Star',hill:2,jumps:2,min:99,gap:7,landing:.75,detail:'Land two jumps of at least 99 m, within 7 m of each other.'}
];
export const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
export const challengeFor=run=>CHALLENGES.find(challenge=>challenge.id===run.activity);
export const jumpLimit=run=>run.activity==='circuit'?2:challengeFor(run)?.jumps??1;
export const available=(i,p)=>i===0||Boolean(p.medals[CHALLENGES[i-1]?.id]);
export function ground(z){
 if(z<0){let t=clamp((z+36)/36);return 30-16*(1-Math.pow(1-t,1.42))-.39*Math.pow(t,12)}
 const q=Math.min(z,43), u=clamp((z-43)/19);
 return 13.61-.46*q-8.74*(u-u*u/2);
}
export function profile(v={}){
 const medals={};
 for(const {id} of CHALLENGES)medals[id]=clamp(Math.floor(Number(v.medals?.[id])||0),0,3);
 return {unlocked:Number.isInteger(v.unlocked)?clamp(v.unlocked,0,2):0,best:HILLS.map((_,i)=>clamp(Number(v.best?.[i])||0,0,350)),practice:HILLS.map((_,i)=>clamp(Number(v.practice?.[i])||0,0,150)),medals,aurora:v.aurora===true,ember:v.ember===true,kit:['blue','rose','ice','aurora','ember','summit','gold'].includes(v.kit)?v.kit:'blue',sound:v.sound!==false}
}
export function newRun(hill=0,activity='circuit'){return {hill,activity,attempt:0,results:[],phase:'ready',t:0,take:0,land:0,mark:false,z:-35,x:0}}
export function restoreRun(r,p){
 if(!r||!Number.isInteger(r.hill)||!HILLS[r.hill]||!Array.isArray(r.results))return null;
 const s=newRun(r.hill,r.activity??'circuit');
 const challenge=challengeFor(s);
 if(challenge){if(challenge.hill!==s.hill||!available(CHALLENGES.indexOf(challenge),p))return null}
 else if(!['circuit','practice'].includes(s.activity)||s.hill>p.unlocked)return null;
 const limit=jumpLimit(s);
 if(r.results.length>limit)return null;
 s.results=r.results.filter(v=>v&&[v.distance,v.style,v.points,v.take,v.land].every(Number.isFinite)).map(v=>({distance:clamp(v.distance,0,150),style:clamp(v.style,0,20),points:clamp(v.points,0,200),take:clamp(v.take),land:clamp(v.land)}));
 s.attempt=Math.min(limit-1,s.results.length);
 if(s.results.length===limit){const last=s.results.at(-1);s.phase='result';s.take=last.take;s.land=last.land;s.z=distanceWorld(s)+9;s.x=HILLS[s.hill].wind}
 return s;
}
export function snapshotRun(r){return r&&{hill:r.hill,results:r.results,...(r.activity==='circuit'?{}:{activity:r.activity})}}
export function targetTake(r){return HILLS[r.hill].time-.14}
export function flightTime(r){return 2.15+r.take*1.18+r.hill*.10}
export function targetLand(r){return flightTime(r)-.23}
export function distanceWorld(r){return 25+20*r.take+r.hill*1.6}
export function takeoffBand(run){
 const band=challengeFor(run)?.band;
 if(!band)return null;
 const start=distanceWorld({...run,take:0})*2.36;
 const timing=metres=>targetTake(run)-(1-clamp((metres-start)/47.2))*HILLS[run.hill].window*1.75;
 return [timing(band[0]-.5),timing(band[1]+.499)];
}
export function action(r){
 if(r.phase==='ready'){r.phase='inrun';r.t=0;return 'start'}
 if(r.phase==='inrun'&&!r.mark&&r.t>=targetTake(r)-.82){
  r.take=clamp(1-Math.abs(r.t-targetTake(r))/(HILLS[r.hill].window*1.75));r.mark=true;return 'take';
 }
 if(r.phase==='flight'&&!r.mark&&r.t>=targetLand(r)-.82){
  r.land=clamp(1-Math.abs(r.t-targetLand(r))/(HILLS[r.hill].window*1.8));r.mark=true;return 'land';
 }
 return '';
}
export function scoreJump(r){
 const distance=Math.round(distanceWorld(r)*2.36)/1;
 const style=Math.round((r.take*7+r.land*13)*10)/10;
 return {distance,style,points:Math.round((distance*.87+style)*10)/10,take:r.take,land:r.land};
}
export function tick(r,dt){
 r.t+=dt;const h=HILLS[r.hill];
 if(r.phase==='inrun'){
  const u=clamp(r.t/h.time);r.z=-35+35*Math.pow(u,1.6);
  if(u>=1){r.phase='flight';r.t=0;r.mark=false;return 'flight'}
 }else if(r.phase==='flight'){
  const u=clamp(r.t/flightTime(r));r.z=distanceWorld(r)*u;r.x=h.wind*u*u;
  if(u>=1){r.phase='brake';r.t=0;return 'touchdown'}
 }else if(r.phase==='brake'){
  const u=clamp(r.t/1.35);r.z=distanceWorld(r)+9*(1-(1-u)*(1-u));
  if(u>=1){r.results.push(scoreJump(r));r.phase=r.results.length===jumpLimit(r)?'result':'between';r.t=0;return r.phase}
 }
 return '';
}
export function nextAttempt(r){if(r.phase!=='between')return false;Object.assign(r,newRun(r.hill,r.activity),{attempt:r.results.length,results:r.results});return true}
export function total(r){return Math.round(r.results.reduce((s,v)=>s+v.points,0)*10)/10}
export function settle(r,p){
 if(r.activity!=='circuit'||r.phase!=='result'||r.results.length!==2)return false;
 let t=total(r);p.best[r.hill]=Math.max(t,p.best[r.hill]);
 if(t>=HILLS[r.hill].target)p.unlocked=Math.max(p.unlocked,Math.min(2,r.hill+1));
 return t>=HILLS[r.hill].target;
}
export function challengeResult(run){
 const challenge=challengeFor(run);
 if(!challenge||run.phase!=='result'||run.results.length!==challenge.jumps)return {stars:0,reason:''};
 const distances=run.results.map(jump=>jump.distance);
 const shortest=Math.min(...distances),spread=Math.max(...distances)-shortest;
 const landing=Math.min(...run.results.map(jump=>jump.land));
 if(challenge.band&&distances.some(d=>d<challenge.band[0]||d>challenge.band[1]))return {stars:0,reason:'Your jump missed the gold distance zone.'};
 if(shortest<(challenge.min??0))return {stars:0,reason:'One of your jumps fell short of the distance goal.'};
 if(spread>(challenge.gap??Infinity))return {stars:0,reason:'Your two marks were '+spread+' m apart.'};
 if(landing<challenge.landing)return {stars:0,reason:'Tap closer to the center of the landing zone.'};
 const stars=landing>=.90&&spread<=(challenge.gap??Infinity)/2?3:landing>=Math.max(.68,challenge.landing+.04)?2:1;
 return {stars,reason:challenge.gap?'Your marks were '+spread+' m apart.':'Target reached.'};
}
export function recordActivity(run,p){
 if(run.phase!=='result')return false;
 if(run.activity==='practice'){
  p.practice[run.hill]=Math.max(p.practice[run.hill],run.results[0].distance);
  return false;
 }
 const {stars}=challengeResult(run);
 if(stars)p.medals[run.activity]=Math.max(p.medals[run.activity],stars);
 return stars>0;
}
