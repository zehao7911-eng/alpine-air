import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {action, ground, HILLS, newRun, targetLand, targetTake, tick} from './core.mjs';

const require = createRequire(import.meta.url);
const THREE = require('./vendor/three.min.js');
globalThis.window = {THREE};
const ctx = {
  fillRect(){}, fillText(){}, setLineDash(){}, strokeRect(){}, beginPath(){},
  moveTo(){}, lineTo(){}, fill(){}, save(){}, translate(){}, rotate(){}, restore(){},
  createLinearGradient(){return {addColorStop(){}}}
};
globalThis.document = {createElement:()=>({getContext:()=>ctx})};
const {AlpineAthlete} = await import('./athlete.mjs');
const {AlpineView} = await import('./view.mjs');

const point = new THREE.Vector3();
const root = new THREE.Group();
const view = {
  boxGeo: new THREE.BoxGeometry(), hero: root, marker: new THREE.Mesh(new THREE.PlaneGeometry()),
  shad: new THREE.Object3D(), cam: new THREE.Vector3(), look: new THREE.Vector3(),
  flags: [], c: new THREE.PerspectiveCamera(), r: {render(){}}, drawSnow(){}
};
view.shad.material = {};
view.athlete = new AlpineAthlete(view,root);
let frames = 0;
let minSole = Infinity;
let minGap = Infinity;
const phases = new Set();

function verifyFrame(run, mode, dt, reduced) {
  view.id = run.hill;
  AlpineView.prototype.render.call(view,run,'blue',mode,null,reduced,dt);
  root.updateMatrixWorld(true);
  phases.add(run.phase);
  frames++;
  for (const {side,ski} of view.athlete.limbs) {
    const vertices = ski.children[0].geometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      point.fromBufferAttribute(vertices,i).applyMatrix4(ski.matrix);
      const centerGap = side * point.x;
      assert.ok(centerGap > .02, 'Ski entered the other ski’s lane');
      minGap = Math.min(minGap, centerGap);
      point.applyMatrix4(root.matrixWorld);
      const clearance = point.y - ground(point.z);
      assert.ok(clearance > .050, 'Ski crossed the rendered track');
      minSole = Math.min(minSole, clearance);
    }
  }
  if (Math.abs(view.cam.x)<4.1) assert.ok(view.cam.y>=ground(view.cam.z)+1.15);
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
assert.deepEqual([...phases],['ready','inrun','flight','brake','between']);
console.log('PASS '+frames+' posed frames. Minimum ski separation '+(minGap*2).toFixed(3)+
  ' and minimum snow clearance '+minSole.toFixed(3)+' world units.');
