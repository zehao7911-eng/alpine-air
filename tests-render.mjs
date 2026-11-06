import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {action, ground, HILLS, CHALLENGES, TOUR, newRun, newTourRun, targetLand, targetTake, takeoffBand, tick} from './core.mjs';

const require = createRequire(import.meta.url);
const THREE = require('./vendor/three.min.js');
globalThis.window = {THREE};
const ctx = {
  fillRect(){}, fillText(){}, setLineDash(){}, strokeRect(){}, beginPath(){},
  moveTo(){}, lineTo(){}, fill(){}, save(){}, translate(){}, rotate(){}, restore(){},
  createLinearGradient(){return {addColorStop(){}}},
  createRadialGradient(){return {addColorStop(){}}}
};
globalThis.document = {createElement:()=>({getContext:()=>ctx})};
const {AlpineView} = await import('./view.mjs');

const point = new THREE.Vector3();
const direction = new THREE.Vector3();
const ray = new THREE.Raycaster();
const view = Object.assign(Object.create(AlpineView.prototype), {
  s: new THREE.Scene(), mat: new Map(), boxGeo: new THREE.BoxGeometry(),
  ballGeo: new THREE.SphereGeometry(1,14,10), cam: new THREE.Vector3(),
  look: new THREE.Vector3(), c: new THREE.PerspectiveCamera(), r: {render(){}}
});
let frames = 0;
let minSole = Infinity;
let minGap = Infinity;
const phases = new Set();

function verifyFrame(run, mode, dt, reduced,ride='skis') {
  view.render(run,'blue',mode,null,reduced,dt,ride);
  view.s.updateMatrixWorld(true);
  phases.add(run.phase);
  frames++;
  const sceneGeometry = view.map.children.filter(mesh =>
    mesh.visible && mesh !== view.hero && mesh !== view.shad && mesh !== view.flakes);
  const anchors = [
    [view.athlete.head,.37,0],
    [view.athlete.torso,.35,0],
    ...view.athlete.limbs.flatMap(({ski})=>[[ski,.06,-.73],[ski,.06,.72]])
  ];
  for (const [anchor,y,z] of anchors) {
    point.set(0,y,z).applyMatrix4(anchor.matrixWorld);
    direction.subVectors(point,view.cam);
    ray.far=direction.length()-.04;
    ray.set(view.cam,direction.normalize());
    assert.equal(ray.intersectObjects(sceneGeometry,true).length,0,
      'Venue geometry hid the skier at hill '+(run.hill+1)+' / '+run.phase+' / z='+run.z.toFixed(2));
  }
  for (const {side,ski} of view.athlete.limbs) {
    const vertices = ski.children[0].geometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      point.fromBufferAttribute(vertices,i).applyMatrix4(ski.matrix);
      const centerGap = side * point.x;
      assert.ok(centerGap > .02, 'Ski entered the other ski’s lane');
      minGap = Math.min(minGap, centerGap);
      point.applyMatrix4(view.hero.matrixWorld);
      const clearance = point.y - ground(point.z);
      assert.ok(clearance > .050, 'Ski crossed the course height profile');
      minSole = Math.min(minSole, clearance);
    }
  }
  if (Math.abs(view.cam.x)<4.1) assert.ok(view.cam.y>=ground(view.cam.z)+1.15);
  if(ride!=='skis'){
    const sled=view.athlete.rides.get(ride).root;
    assert.ok(sled.visible);
    sled.traverse(mesh=>{
      if(!mesh.isMesh||!mesh.visible)return;
      const vertices=mesh.geometry.attributes.position;
      for(let i=0;i<vertices.count;i+=2){
        point.fromBufferAttribute(vertices,i).applyMatrix4(mesh.matrixWorld);
        assert.ok(point.y>ground(point.z)+.04,ride+' hardware entered the snow');
      }
    });
  }
}

for (let hill = 0; hill < HILLS.length; hill++) {
  for (const input of ['clean','early','miss']) {
    const run = newRun(hill);
    view.lastPhase = '';
    verifyFrame(run,'home',1/60,false);
    verifyFrame(run,'race',1/60,false);
    action(run);
    const dt = input === 'early' ? 1/30 : 1/60;
    while (['inrun','flight','brake'].includes(run.phase)) {
      const offset = input === 'early' ? .38 : 0;
      if(input!=='miss'&&!run.mark) {
        if(run.phase==='inrun'&&run.t>=targetTake(run)-offset)action(run);
        if(run.phase==='flight'&&run.t>=targetLand(run)-offset)action(run);
      }
      tick(run,dt);
      verifyFrame(run,'race',dt,input==='miss');
    }
  }
}
for (const challenge of CHALLENGES.filter(challenge=>challenge.band)) {
  const run = newRun(challenge.hill,challenge.id);
  const [left,right] = takeoffBand(run);
  view.lastPhase = '';
  action(run);
  while (['inrun','flight','brake'].includes(run.phase)) {
    if(run.phase==='inrun'&&run.t>=(left+right)/2&&!run.mark)action(run);
    if(run.phase==='flight'&&run.t>=targetLand(run)&&!run.mark)action(run);
    tick(run,1/60);
    verifyFrame(run,'race',1/60,false);
    if(run.phase==='flight')assert.ok(view.targetMarker.visible&&!view.marker.visible,'precision challenge shows only its landing band');
  }
}
assert.deepEqual([...phases],['ready','inrun','flight','brake','between','result']);
for(const [i,stage] of TOUR.entries()){
  const run=newTourRun(i),ride=stage.id;
  verifyFrame(run,'race',1/30,false,ride);
  action(run);
  while(['inrun','flight','brake'].includes(run.phase)){
    if(run.phase==='inrun'&&run.t>=targetTake(run)&&!run.mark)action(run);
    tick(run,1/30);
    verifyFrame(run,'race',1/30,false,ride);
  }
}
console.log('PASS '+frames+' frames against the actual venue mesh. Minimum ski separation '+(minGap*2).toFixed(3)+
  ' and minimum snow clearance '+minSole.toFixed(3)+' world units.');
