export const HILLS=[
 {name:'Pine Basin',code:'PB / 01',target:108,wind:0,time:3.6,window:.37,sky:0xc5e0ee,snow:0xe6f4ff,accent:0xbafde9},
 {name:'Rose Glacier',code:'RG / 02',target:147,wind:1.2,time:3.45,window:.30,sky:0xe0acc2,snow:0xf6ebff,accent:0xffce9d},
 {name:'Aurora Ridge',code:'AR / 03',target:184,wind:-1.9,time:3.3,window:.25,sky:0x7581bc,snow:0xcedcff,accent:0xc8dbff}
];
export const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
export function ground(z){
 if(z<0){let t=clamp((z+36)/36);return 30-16*(1-Math.pow(1-t,1.42))-.39*Math.pow(t,12)}
 const q=Math.min(z,43), u=clamp((z-43)/19);
 return 13.61-.46*q-8.74*(u-u*u/2);
}
export function profile(v={}){return {unlocked:Number.isInteger(v.unlocked)?clamp(v.unlocked,0,2):0,best:HILLS.map((_,i)=>clamp(Number(v.best?.[i])||0,0,350)),aurora:v.aurora===true,ember:v.ember===true,kit:['blue','rose','ice','aurora','ember'].includes(v.kit)?v.kit:'blue',sound:v.sound!==false}}
export function newRun(hill=0){return {hill,attempt:0,results:[],phase:'ready',t:0,take:0,land:0,mark:false,z:-35,x:0}}
export function restoreRun(r,p){
 if(!r||!Number.isInteger(r.hill)||r.hill<0||r.hill>p.unlocked||!Array.isArray(r.results)||r.results.length>2)return null;
 const s=newRun(r.hill);
 s.results=r.results.filter(v=>v&&[v.distance,v.style,v.points,v.take,v.land].every(Number.isFinite)).map(v=>({distance:clamp(v.distance,0,150),style:clamp(v.style,0,20),points:clamp(v.points,0,200),take:clamp(v.take),land:clamp(v.land)}));
 s.attempt=Math.min(1,s.results.length);if(s.results.length===2){s.phase='result';s.take=s.results[1].take;s.land=s.results[1].land;s.z=distanceWorld(s)+9;s.x=HILLS[s.hill].wind}return s;
}
export function snapshotRun(r){return r&&{hill:r.hill,results:r.results}}
export function targetTake(r){return HILLS[r.hill].time-.14}
export function flightTime(r){return 2.15+r.take*1.18+r.hill*.10}
export function targetLand(r){return flightTime(r)-.23}
export function distanceWorld(r){return 25+20*r.take+r.hill*1.6}
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
  if(u>=1){r.results.push(scoreJump(r));r.phase=r.results.length===2?'result':'between';r.t=0;return r.phase}
 }
 return '';
}
export function nextAttempt(r){if(r.phase!=='between')return false;Object.assign(r,newRun(r.hill),{attempt:1,results:r.results});return true}
export function total(r){return Math.round(r.results.reduce((s,v)=>s+v.points,0)*10)/10}
export function settle(r,p){
 if(r.phase!=='result'||r.results.length!==2)return false;
 let t=total(r);p.best[r.hill]=Math.max(t,p.best[r.hill]);
 if(t>=HILLS[r.hill].target)p.unlocked=Math.max(p.unlocked,Math.min(2,r.hill+1));
 return t>=HILLS[r.hill].target;
}
