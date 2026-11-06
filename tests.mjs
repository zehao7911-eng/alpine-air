import assert from 'node:assert/strict';
import {HILLS,newRun,profile,action,tick,flightTime,targetTake,targetLand,nextAttempt,settle,total,restoreRun,snapshotRun} from './core.mjs';
import {CHALLENGES,practiceAvailable,available,jumpLimit,takeoffBand,challengeResult,recordActivity} from './core.mjs';
import {AlpineHost} from './sdk.mjs';
let n=0;const check=(v,msg)=>{assert.ok(v,msg);n++};
const flush=()=>new Promise(r=>setImmediate(r));
function jump(r,good=true,st=()=>{},en=()=>{}){
 check(action(r)==='start','real descent begins');st();let phases=[];
 for(let i=0;i<1500&&['inrun','flight','brake'].includes(r.phase);i++){
  if(good&&r.phase==='inrun'&&r.t>=targetTake(r)&&!r.mark){check(action(r)==='take','takeoff committed');check(!action(r),'no double takeoff')}
  if(good&&r.phase==='flight'&&r.t>=targetLand(r)&&!r.mark){check(action(r)==='land','landing committed');check(!action(r),'no double landing')}
  let e=tick(r,.01);if(e)phases.push(e);
 }
 check(phases.includes('flight')&&phases.includes('touchdown'),'physical phase progression');en();
}
let p=profile();for(let i=0;i<HILLS.length;i++){
 let r=newRun(i);jump(r);
 check(r.phase==='between'&&r.results.length===1,'exactly one recorded jump');
 let first=r.results[0];r=restoreRun(snapshotRun(r),p);
 check(r.phase==='ready'&&r.attempt===1&&r.results[0].points===first.points,'preserves scored jump through reload');
 jump(r);check(settle(r,p)&&total(r)>=HILLS[i].target,'clean jumps clear target');
 check(restoreRun(snapshotRun(r),p).phase==='result','results restore');
}
let poor=newRun();jump(poor,false);check(nextAttempt(poor),'second attempt');jump(poor,false);check(!settle(poor,profile()),'missed timing fails hill');
check(!restoreRun({hill:2,results:[]},profile()),'locked hill cannot restore');
check(flightTime({...newRun(),take:1})>flightTime(newRun()),'takeoff changes air time');
function env(neonlib){let next=0,jobs=new Map();return {neonlib,jobs,setTimeout(f){jobs.set(++next,f);return next},clearTimeout(k){jobs.delete(k)}}}
let starts=0,ends=0,off=0,like,comment,scope=[],rewards=0,status,p2=profile();
const E=env();const attach=()=>new AlpineHost(E,{status:s=>status=s,reward(k){if(!p2[k]){p2[k]=true;rewards++}}});
let h=attach(),r=newRun();h.connect();jump(r,true,()=>h.start(),()=>{});
E.neonlib={};h.connect();
Object.assign(E.neonlib,{gameStart(){starts++},gameOver(){ends++},onLike:async fn=>{like=fn;return {code:0,data:{unsubscribe(){off++}}}},onComment:async fn=>{comment=fn;return {code:0,data:{unsubscribe(){off++}}}},loadUserGameState:async()=>({}),saveUserGameState:async v=>scope.push(v)});
h.connect();await flush();check(starts===1&&status.aurora&&status.ember,'late SDK starts active jump and registers');
like({status:false,project_id:'001',count:2});comment({content:'x',project_id:1});comment({project_id:'001'});check(rewards===0,'ignore invalid callbacks');
like({status:true,project_id:'001',count:0});comment({content:'',project_id:'001',count:0});like({status:true,project_id:'001'});comment({content:'again',project_id:'001'});check(rewards===2,'only first confirmed like and direct comment unlock');
h.end();h.end();h.save({game:'alpine-air',v:1,run:snapshotRun(r),profile:p2});await flush();h.stop();
check(ends===1&&off===2&&scope.at(-1).run.results.length===1,'round ended once, saved and cleaned listeners');
h=attach();h.connect();await flush();r=restoreRun(scope.at(-1).run,profile(scope.at(-1).profile));check(starts===1&&r.phase==='ready','reload between jumps does not prematurely start');
jump(r,true,()=>{h.start();h.start()},()=>{h.end();h.end()});h.stop();check(starts===2&&ends===2&&off===4,'restored real jump has one start/end pair');
let resolve,lateOff=0,saves=0;
let e=env({onLike:()=>new Promise(r=>resolve=r)});h=new AlpineHost(e);h.connect();h.stop();resolve({code:0,data:{unsubscribe(){lateOff++}}});await flush();check(lateOff===1,'late registration unsubscribes after cleanup');
e=env({loadUserGameState:()=>new Promise(()=>{}),saveUserGameState(){saves++},onComment:()=>new Promise(r=>resolve=r)});
h=new AlpineHost(e);h.connect();h.save({game:'alpine-air',v:1});for(let f of [...e.jobs.values()])f();resolve({code:0,data:{unsubscribe(){lateOff++}}});await flush();h.stop();check(lateOff===2&&!saves,'registration timeout cleans up and unknown cloud is not overwritten');
h=new AlpineHost(env({gameStart:()=>Promise.reject(Error()),gameOver(){throw Error()},onLike:()=>Promise.reject(Error()),onComment:async()=>({code:-6}),loadUserGameState:async()=>({game:'foreign'}),saveUserGameState(){saves++}}));
h.connect();h.start();h.end();h.save({game:'alpine-air',v:1});await flush();h.stop();check(!saves,'async failures and foreign cloud state stay isolated');
const medals=profile({unlocked:0,best:[123]});
check(restoreRun({hill:0,results:[]},medals).activity==='circuit','existing circuit snapshot still loads');
check(!available(1,medals),'challenge two starts locked');
check(profile({unlocked:2,best:[120,150,185]}).unlocked===3,'existing Aurora champions can enter the fjord meet');
check(practiceAvailable(4,medals)&&restoreRun(snapshotRun(newRun(4,'practice')),medals)?.hill===4,'new venues are open for practice and restore on a new profile');
check(!restoreRun(snapshotRun(newRun(4)),medals),'touring a venue does not unlock its circuit meet');
let contentStarts=0,contentEnds=0;
const activityHost=new AlpineHost(env({gameStart(){contentStarts++},gameOver(){contentEnds++}}));
activityHost.connect();
function playActivity(run,{miss=false,customAim=true}={}){
 check(action(run)==='start','activity starts on descent');
 activityHost.start();
 const band=customAim&&takeoffBand(run);
 const aim=band?(band[0]+band[1])/2:targetTake(run);
 for(let i=0;i<2000&&['inrun','flight','brake'].includes(run.phase);i++){
  if(run.phase==='inrun'&&!run.mark&&run.t>=aim)action(run);
  if(!miss&&run.phase==='flight'&&!run.mark&&run.t>=targetLand(run))action(run);
  tick(run,.005);
 }
 check(['between','result'].includes(run.phase),'activity completes with a recorded jump');
 activityHost.end();
}
const missed=newRun(0,CHALLENGES[0].id);
playActivity(missed,{customAim:false});
check(!recordActivity(missed,medals)&&!available(1,medals),'overshooting the target does not unlock the next challenge');
for(const [i,challenge] of CHALLENGES.entries()){
 check(available(i,medals),'cleared challenge unlocks next card');
 let run=newRun(challenge.hill,challenge.id);
 check(jumpLimit(run)===challenge.jumps,'correct jump count');
 playActivity(run);
 if(challenge.jumps===2){
  const first=run.results[0].distance;
  run=restoreRun(snapshotRun(run),medals);
  check(run.phase==='ready'&&run.attempt===1&&run.results[0].distance===first,'restored challenge keeps its first mark');
  playActivity(run);
 }
 check(challengeResult(run).stars===3&&recordActivity(run,medals),'challenge is achievable at gold tier');
 check(restoreRun(snapshotRun(run),medals).phase==='result','finished challenge restores');
}
const practice=newRun(0,'practice');
playActivity(practice,{miss:true});
recordActivity(practice,medals);
check(medals.practice[0]>0&&medals.best[0]===123&&medals.unlocked===0,'practice and challenge records are independent of the circuit');
check(contentStarts===10&&contentEnds===10,'only played jumps notify the SDK, including resumed pairs');
activityHost.stop();
console.log('PASS '+n+' gameplay, save and GameWave mock checks');

