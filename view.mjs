import {HILLS,clamp,ground,flightTime,distanceWorld,challengeFor} from './core.mjs';
import {AlpineAthlete} from './athlete.mjs';
import {buildVenue} from './venues.mjs';
const T=window.THREE;
const V=(x,y,z)=>new T.Vector3(x,y,z);
const mix=(a,b,t)=>a+(b-a)*t;
const snowClearance=z=>ground(z)+.057;
export class AlpineView{
 constructor(el){
  this.el=el;this.s=new T.Scene();this.c=new T.PerspectiveCamera(51,1,.1,280);
  this.r=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  this.r.outputEncoding=T.sRGBEncoding;this.r.setClearColor(0xc5e0ee);el.append(this.r.domElement);
  this.s.add(new T.HemisphereLight(0xf0f7ff,0x9cacc7,1.04));let sun=new T.DirectionalLight(0xffead0,1.08);sun.position.set(-20,35,11);this.s.add(sun);
  this.mat=new Map();this.boxGeo=new T.BoxGeometry();this.ballGeo=new T.SphereGeometry(1,14,10);
  this.cam=V(0,0,0);this.look=V(0,0,0);this.lastPhase='';
  this.resize();new ResizeObserver(()=>this.resize()).observe(el);
 }
 resize(){let {width:w,height:h}=this.el.getBoundingClientRect();if(!w||!h)return;this.c.aspect=w/h;this.c.updateProjectionMatrix();this.r.setPixelRatio(Math.min(devicePixelRatio||1,1.5));this.r.setSize(w,h,false)}
 m(color){if(!this.mat.has(color))this.mat.set(color,new T.MeshLambertMaterial({color}));return this.mat.get(color)}
 venueGlow(color){
  this.glowMaterials??=new Map();
  if(!this.glowMaterials.has(color))this.glowMaterials.set(color,new T.MeshBasicMaterial({color}));
  return this.glowMaterials.get(color);
 }
 mesh(parent,geo,c,x,y,z){let a=new T.Mesh(geo,this.m(c));a.position.set(x,y,z);parent.add(a);return a}
 box(p,x,y,z,w,h,d,c){let m=this.mesh(p,this.boxGeo,c,x,y,z);m.scale.set(w,h,d);return m}
 ball(p,x,y,z,w,h,d,c){let m=this.mesh(p,this.ballGeo,c,x,y,z);m.scale.set(w,h,d);return m}
 tube(p,a,b,rad,c,tip=rad,n=8){let d=b.clone().sub(a),m=this.mesh(p,new T.CylinderGeometry(tip,rad,d.length(),n),c,0,0,0);m.position.copy(a).lerp(b,.5);m.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());return m}
 strip(p,a,b,lo,hi,color,lift=0){let points=[],indices=[],n=Math.max(1,Math.ceil((hi-lo)/.85));for(let i=0;i<=n;i++){let z=mix(lo,hi,i/n),y=ground(z)+lift;points.push(a,y,z,b,y,z);if(i<n){let k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3)}}let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.setIndex(indices);g.computeVertexNormals();return this.mesh(p,g,color,0,0,0)}
 label(text,w=512,h=128,fg='#e9fbff',bg='#173850'){
  const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,w,h);x.fillStyle='#7af3ce';x.fillRect(0,0,w,8);x.fillRect(0,h-8,w,8);
  x.fillStyle=fg;x.font='900 italic '+Math.round(h*.46)+'px system-ui';x.textAlign='center';x.textBaseline='middle';x.fillText(text,w/2,h/2+3,w-26);
  const tex=new T.CanvasTexture(c);tex.encoding=T.sRGBEncoding;return tex;
 }
 sign(p,x,y,z,w,h,words){let o=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:this.label(words),side:T.DoubleSide}));o.rotation.y=Math.PI;o.position.set(x,y,z);p.add(o);return o}
 make(id){
  this.athlete?.dispose();
  if(this.map){
   const geometries=new Set();
   this.map.traverse(o=>{
    if(o.isMesh&&o.geometry!==this.boxGeo&&o.geometry!==this.ballGeo)geometries.add(o.geometry);
    if(o.isInstancedMesh)o.dispose();
    if(o.material?.map){o.material.map.dispose();o.material.dispose()}
   });
   geometries.forEach(geometry=>geometry.dispose());
   this.s.remove(this.map);
  }
  const p=this.map=new T.Group(),h=HILLS[id];
  const fjord=h.venue==='fjord',village=h.venue==='village';
  const bankColor=[0xc7e0ee,0xe1d5e8,0x9db2dc,0xb0d4de,0xbcb5d2][id];
  this.s.add(p);this.s.background=new T.Color(h.sky);this.s.fog=new T.FogExp2(h.sky,fjord?.0075:.0088);
  let seed=12393+id*77;let rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  // The valley slab must sit below the lowest part of the runout.
  const valleyFloor=ground(67)-.22;
  this.box(p,0,valleyFloor-4,37,380,8,315,bankColor);
  for(let j=0;j<(h.venue?3:4);j++)for(let i=0;i<9;i++){
   if((fjord||village)&&i>=3&&i<=5&&j===0)continue;
   let x=(i-4)*25+(rand()-.5)*13,z=(village?116:89)+j*30+rand()*12,ht=(village?9:15)+rand()*(village?14:22)+j*5,rad=12+rand()*12;
   // Rock and snow meet at a shared ring, with one surface on either side.
   const mountainBase=valleyFloor-.25;
   const rock=this.mesh(p,new T.CylinderGeometry(rad*.47,rad,ht*.53,5,1,true),(village?[0x615776,0x80728e,0x9a88a4]:[0x7294b2,0x8eabc2,0x98b6cc,0xb3cbdc])[j],x,mountainBase+ht*.265,z);
   const cap=this.mesh(p,new T.ConeGeometry(rad*.47,ht*.47,5,1,true),[0xe2eef5,0xd0e0ec,0xd6e5f0,0xdce9f3][j],x,mountainBase+ht*.765,z);
   rock.rotation.y=cap.rotation.y=rand();
  }
  const shoulder=(x,z)=>Math.max(valleyFloor,ground(z)-.06-(Math.abs(x)-4.05)*(.39+.10*Math.sin(z*.07)));
  for(let side of [-1,1]){
   const pts=[],ix=[],cols=13,rows=34;
   for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){let x=side*(4.05+i*3),z=-44+j*3.75;pts.push(x,shoulder(x,z),z);if(j<rows&&i<cols){let k=j*(cols+1)+i,a=k+cols+1;ix.push(...(side>0?[k,a,k+1,k+1,a,a+1]:[k,k+1,a,k+1,a+1,a]))}}
   const land=new T.BufferGeometry();land.setAttribute('position',new T.Float32BufferAttribute(pts,3));land.setIndex(ix);land.computeVertexNormals();this.mesh(p,land,bankColor,0,0,0);
  }
  this.animateVenue=h.venue?buildVenue(this,p,h.venue,shoulder,valleyFloor,rand):null;
  this.venueTime=0;
  const pineGeo=new T.CylinderGeometry(.42,1,.58,7,1,true).translate(0,-.21,0);
  const pineSnowGeo=new T.ConeGeometry(.42,.42,7,1,true).translate(0,.29,0);
  const treeCount=fjord?17:village?34:73;
  const pineBatches=[0x28485d,0x3e6173,0x58788a,0xd7eaf5].map((color,i)=>{
   const batch=new T.InstancedMesh(i===3?pineSnowGeo:pineGeo,this.m(color),i===3?treeCount*3:treeCount);
   p.add(batch);
   return batch;
  });
  const transform=new T.Object3D();
  for(let i=0;i<treeCount;i++){let side=i%2?-1:1,x=side*((h.venue?15:8.4)+rand()*(fjord?14:27)),z=-38+rand()*(fjord?72:116),scale=.65+rand()*1.20,y=shoulder(x,z)-.18;
   this.box(p,x,y+.5*scale,z,.25*scale,1.6*scale,.25*scale,0x6a6773);
   transform.rotation.y=i*1.47;
   for(let k=0;k<3;k++){
    const branch=(1.10-.18*k)*scale;
    transform.position.set(x,y+(1.35+k*.7)*scale,z);
    transform.scale.set(branch,1.8*scale,branch);
    transform.updateMatrix();
    pineBatches[k].setMatrixAt(i,transform.matrix);
    pineBatches[3].setMatrixAt(i*3+k,transform.matrix);
   }
  }
  pineBatches.forEach(batch=>batch.instanceMatrix.needsUpdate=true);
  this.strip(p,-4.05,4.05,-36,67,h.snow,.001);
  this.strip(p,-1.73,1.73,-36,0,id===2?0x9ab9dc:0xc7e0ed,.018);
  for(let a of [-1,-.52,.52,1])this.strip(p,a-.023,a+.023,-36,0,0x9fb9c9,.022);
  for(let a of [-.177,.177]){
   this.strip(p,a-.087,a+.087,-36,0,id===2?0x7898be:0x91afc2,.025);
   this.strip(p,a-.054,a+.054,-36,0,id===2?0xb2c8e3:0xdceaf0,.028);
  }
  for(let a of [-2.93,-2.65,-2.37,2.37,2.65,2.93]){
   this.strip(p,a-.012,a+.012,2,63,bankColor,.016);
  }
  for(let side of [-1,1]){
   this.strip(p,side*3.35-.11,side*3.35+.11,-36,64,0x5886a5,.028);
   this.strip(p,side*3.9-.14,side*3.9+.14,-36,64,0xa7bed2,.025);
   for(let z=-35;z<2;z+=3.8){let y=ground(z);this.box(p,side*3.94,y+.53,z,.14,1.14,.14,0x3b6b83);this.box(p,side*3.94,y-1.8,z,.32,3.5,.32,0x35556c);
    if(z<-3){let a=V(side*3.94,y+1,z),b=V(side*3.94,ground(z+3.8)+1,z+3.8);this.tube(p,a,b,.067,0xdaedf3);this.tube(p,V(side*3.92,y-.2,z),V(side*3.92,ground(z+3.8)-2.6,z+3.8),.09,0x4f7290)}
   }
   for(let z=2;z<66;z+=4.7){let y=ground(z);this.box(p,side*3.91,y+.42,z,.12,.84,.12,0x336783);this.box(p,side*3.91,y+.87,z,.28,.14,.24,z%2?0xf67862:0xffcb69)}
  }
  for(let z=9;z<62;z+=4){const major=(z-9)%8===0;this.strip(p,-3.35,3.35,z,z+(major?.19:.09),major?0x8baec7:0xb0cada,.037);if(major)this.sign(p,-4.03,ground(z)+.52,z,1.04,.43,Math.round(z*2.36)+' M')}
  this.strip(p,-3.4,3.4,-2.08,-.88,0x5bd9ae,.042);
  this.strip(p,-3.43,3.43,-.32,-.04,0x1c6080,.043);
  this.marker=this.strip(p,-3.35,3.35,26,28,0x67eab7,.048);
  this.targetMarker=this.strip(p,-3.35,3.35,28,36,0xeab155,.045);
  this.targetMarker.frustumCulled=false;
  this.targetMarker.visible=false;
  this.markerBand=null;
  this.strip(p,-4.05,4.05,-38,-36,h.snow,.001);
  this.box(p,0,ground(-34.1)-.62,-36,9,1,3.8,0x2c506a);
  this.box(p,0,ground(-36)+3.65,-36,8.9,.23,.28,0x13364e);
  for(let x of [-3.9,3.9]){this.box(p,x,ground(-36)+1.7,-36,.31,3.6,.34,0x194660);this.box(p,x,ground(-36)-4.2,-36,.48,8,.48,0x3a5871)}
  this.sign(p,0,ground(-36)+3.17,-35.8,5.25,1.13,h.name.toUpperCase()).rotation.y=0;
  this.flags=[];
  for(let side of [-1,1])for(let z of [8,23,39,54]){
   let x=side*5.4,y=ground(z)-.16, clr=h.venue?h.accent:side>0?0xff7e70:0x51b0ca;
   this.box(p,x,y+1.45,z,.10,3.1,.12,0x34546e);
   this.ball(p,x,y+3.02,z,.084,.083,.084,0xf2c779);
   const flag=new T.Group();
   p.add(flag);
   flag.position.set(x,y+2.66,z);
   this.box(flag,side*.44,0,0,.88,.49,.041,clr);
   for(let offset of [-.086,.086]){
    this.box(flag,side*.44,offset,-.024,.67,.029,.008,0xf4faff);
    this.box(flag,side*.44,offset,.024,.67,.029,.008,0xf4faff);
   }
   this.flags.push(flag);
  }
  for(let side of [-1,1]){
   const x=side*7.7,z=52,y=ground(z)-.36;
   this.box(p,x,y-.7,z,5.5,1.1,9.7,0x3f6079);
   for(let i=0;i<3;i++){this.box(p,x+side*i*.62,y+i*.40,z,1.55,.33,9.5,0x8ab0c6);
    for(let j=0;j<11;j++){let a=x+side*(i*.62-.24),b=z-4.1+j*.8,k=y+i*.40;this.box(p,a,k+.42,b,.36,.58,.34,[0xda684d,0x2b567d,0x768acc,0x216d71,0xeab16e][(i+j+id)%5]);this.ball(p,a,k+.82,b,.19,.22,.19,[0xf1bd9a,0x9b614b,0xe5a887][j%3])}
   }
  }
  const shadowCanvas=document.createElement('canvas');
  shadowCanvas.width=shadowCanvas.height=64;
  const brush=shadowCanvas.getContext('2d');
  const gradient=brush.createRadialGradient(32,32,5,32,32,31);
  gradient.addColorStop(0,'rgba(22,55,82,.57)');
  gradient.addColorStop(.48,'rgba(22,55,82,.27)');
  gradient.addColorStop(1,'rgba(22,55,82,0)');
  brush.fillStyle=gradient;
  brush.fillRect(0,0,64,64);
  const shadowGeo=new T.PlaneGeometry(2,2).rotateX(-Math.PI/2);
  const shadowMaterial=new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
  this.shad=new T.Mesh(shadowGeo,shadowMaterial);
  p.add(this.shad);
  this.hero=new T.Group();p.add(this.hero);this.athlete=new AlpineAthlete(this,this.hero);
  const flakeGeo=new T.OctahedronGeometry(.065);
  this.flakes=new T.InstancedMesh(flakeGeo,this.m(0xeaf9ff),36);
  this.flakes.frustumCulled=false;
  this.flakes.visible=false;
  this.flakes.instanceMatrix.setUsage(T.DynamicDrawUsage);
  this.flakePose=new T.Object3D();
  p.add(this.flakes);
  this.lastPhase='';this.id=id;
 }
 render(run,kit,mode,fx,reduced,dt=1/60,ride='skis'){
  if(run.hill!==this.id)this.make(run.hill);
  this.venueTime+=dt;
  this.animateVenue?.(this.venueTime,reduced);
  let r=run, z=r.z, x=r.x, fly=r.phase==='flight', u=fly?clamp(r.t/flightTime(r)):0;
  const close=mode!=='race', intro=close||r.phase==='ready';
  if(intro){z=close?-27:-35;x=0}
  const g=ground(z),slope=Math.atan2(ground(z+.85)-ground(z-.85),1.70);
  const air=fly?Math.sin(u*Math.PI)*(2.55+1.05*r.take):0;
  this.hero.position.set(x,g+.045+air,z);
  this.hero.rotation.x=-slope+(fly?-.18*Math.sin(u*Math.PI):0);
  this.hero.rotation.y=close?-1.83:0;
  this.athlete.setRide(ride);
  this.athlete.pose(run,intro,dt,reduced);
  this.athlete.clearSnow(snowClearance);
  this.athlete.setKit(kit);
  this.shad.position.set(x,g+.043,z);
  this.shad.rotation.x=-slope;
  this.shad.scale.set(.46+air*.10,1,1.15+air*.18);
  this.shad.material.opacity=1/(1+air*.54);
  const band=challengeFor(r)?.band;
  const showMark=!close&&(fly||r.phase==='brake');
  this.marker.visible=showMark&&!band;
  if(this.marker.visible){
   const end=distanceWorld(r)+.30;
   this.moveMarker(this.marker,end-2,end,.049);
  }
  this.targetMarker.visible=showMark&&Boolean(band);
  if(this.targetMarker.visible&&this.markerBand!==band){
   this.moveMarker(this.targetMarker,(band[0]-.5)/2.36,(band[1]+.5)/2.36,.045);
   this.markerBand=band;
  }
  this.drawSnow(r,fx,reduced);
  this.flags.forEach((flag,i)=>{
   flag.rotation.y=.14*HILLS[r.hill].wind+(reduced?0:Math.sin(r.t*5+i*.83)*.20);
  });
  let ca=close?V(-4.60,g+3.68,z-3.1):V(x+1.9+(fly?.48*Math.sin(u*Math.PI):0),g+air+4.12,z-5.9);
  const tourLift=HILLS[r.hill].venue&&fly?.55:0;
  let look=close?V(.03,g+.75,z+.17):V(x,g+air+.20+tourLift,z+2.15);
  if(!close&&(r.phase==='result'||r.phase==='between')){ca=V(x-4.4,g+2.72,z+5.4);look=V(x,g+.75,z+.2)}
  if(!this.lastPhase||reduced||this.lastPhase==='result'&&r.phase==='ready'||intro&&this.lastPhase!=='ready'){this.cam.copy(ca);this.look.copy(look)}else{this.cam.lerp(ca,.12);this.look.lerp(look,.15)}
  if(Math.abs(this.cam.x)<4.1)this.cam.y=Math.max(this.cam.y,ground(this.cam.z)+1.15);
  this.lastPhase=r.phase;this.c.position.copy(this.cam);this.c.lookAt(this.look);this.r.render(this.s,this.c);
 }

 moveMarker(mesh,start,end,lift){
  const points=mesh.geometry.attributes.position;
  for(let i=0;i<points.count;i++){
   const z=mix(start,end,Math.floor(i/2)/(points.count/2-1));
   points.setY(i,ground(z)+lift);
   points.setZ(i,z);
  }
  points.needsUpdate=true;
  mesh.frustumCulled=false;
 }

 drawSnow(run,fx,reduced){
  const landing=(fx?.t||0)>0;
  const sliding=run.phase==='brake'&&run.t<.86;
  this.flakes.visible=!reduced&&(landing||sliding);
  if(!this.flakes.visible)return;
  const pose=this.flakePose;
  for(let i=0;i<this.flakes.count;i++){
   const noise=Math.sin(i*7.83);
   const plume=i<22&&landing;
   const age=plume?1-fx.t:(run.t*3.1+i*.31)%1;
   const x=plume?fx.x:run.x;
   const z=(plume?fx.z:run.z)-age*(plume?2.6:3.3);
   const height=Math.sin(age*Math.PI)*(.26+Math.abs(noise)*(plume?1.06:.55));
   pose.position.set(x+noise*(.16+age*(plume?1.44:.69)),ground(z)+.08+height,z);
   const size=(1-age)*(.45+Math.abs(noise)*1.14);
   pose.scale.set(size,size*.7,size);
   pose.rotation.set(i,age*5,i*.5);
   pose.updateMatrix();
   this.flakes.setMatrixAt(i,pose.matrix);
  }
  this.flakes.instanceMatrix.needsUpdate=true;
 }
}
