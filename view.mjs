import {HILLS,clamp,ground,flightTime,distanceWorld} from './core.mjs';
const T=window.THREE;
const V=(x,y,z)=>new T.Vector3(x,y,z);
const mix=(a,b,t)=>a+(b-a)*t;
const kitColors={blue:0x1769a5,rose:0xc83a66,ice:0x42acbe,aurora:0x5e3db5,ember:0xdb5331};
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
  if(this.map){this.map.traverse(o=>{if(o.isMesh&&o.geometry!==this.boxGeo&&o.geometry!==this.ballGeo)o.geometry.dispose();if(o.material?.map){o.material.map.dispose();o.material.dispose()}});this.s.remove(this.map)}
  const p=this.map=new T.Group(),h=HILLS[id];this.s.add(p);this.s.background=new T.Color(h.sky);this.s.fog=new T.FogExp2(h.sky,.0088);
  let seed=12393+id*77;let rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  this.box(p,0,-12,37,380,8,315,0xaac8db);
  for(let j=0;j<4;j++)for(let i=0;i<9;i++){
   let x=(i-4)*25+(rand()-.5)*13,z=89+j*30+rand()*12,ht=15+rand()*22+j*5,rad=12+rand()*12;
   let mountain=this.mesh(p,new T.ConeGeometry(rad,ht,5),[0x7294b2,0x8eabc2,0x98b6cc,0xb3cbdc][j],x,-9+ht/2,z);mountain.rotation.y=rand();
   let cap=this.mesh(p,new T.ConeGeometry(rad*.47,ht*.47,5),[0xe2eef5,0xd0e0ec,0xd6e5f0,0xdce9f3][j],x,-9+ht*.765,z);cap.rotation.y=mountain.rotation.y;
  }
  const shoulder=(x,z)=>Math.max(-8,ground(z)-.06-(Math.abs(x)-4.05)*(.39+.10*Math.sin(z*.07)));
  for(let side of [-1,1]){
   const pts=[],ix=[],cols=13,rows=34;
   for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){let x=side*(4.05+i*3),z=-44+j*3.75;pts.push(x,shoulder(x,z),z);if(j<rows&&i<cols){let k=j*(cols+1)+i,a=k+cols+1;ix.push(...(side>0?[k,a,k+1,k+1,a,a+1]:[k,k+1,a,k+1,a+1,a]))}}
   const land=new T.BufferGeometry();land.setAttribute('position',new T.Float32BufferAttribute(pts,3));land.setIndex(ix);land.computeVertexNormals();this.mesh(p,land,[0xc7e0ee,0xe1d5e8,0x9db2dc][id],0,0,0);
  }
  const pineGeo=new T.ConeGeometry(1,1,7);
  for(let i=0;i<73;i++){let side=i%2?-1:1,x=side*(8.4+rand()*27),z=-38+rand()*116,scale=.65+rand()*1.20,y=shoulder(x,z)-.18;
   this.box(p,x,y+.5*scale,z,.25*scale,1.6*scale,.25*scale,0x6a6773);
   for(let k=0;k<3;k++){let a=this.mesh(p,pineGeo,[0x2b556a,0x42677a,0x5a7d8e][k],x,y+(1.35+k*.7)*scale,z);a.scale.set((1.1-.18*k)*scale,1.8*scale,(1.1-.18*k)*scale);let b=this.mesh(p,pineGeo,0xd7eaf5,x,y+(1.69+k*.7)*scale,z);b.scale.set((.69-.11*k)*scale,1.1*scale,(.69-.11*k)*scale)}
  }
  this.strip(p,-4.05,4.05,-36,67,h.snow,.001);
  this.strip(p,-1.73,1.73,-36,0,id===2?0x9ab9dc:0xc7e0ed,.018);
  for(let a of [-1,-.52,.52,1])this.strip(p,a-.045,a+.045,-36,0,0x86a9bd,.022);
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
  this.box(p,0,ground(-36)-.52,-36,9,1,3.8,0x2c506a);
  this.box(p,0,ground(-36)+3.65,-36,8.9,.23,.28,0x13364e);
  for(let x of [-3.9,3.9]){this.box(p,x,ground(-36)+1.7,-36,.31,3.6,.34,0x194660);this.box(p,x,ground(-36)-4.2,-36,.48,8,.48,0x3a5871)}
  this.sign(p,0,ground(-36)+3.17,-35.8,5.25,1.13,h.name.toUpperCase()).rotation.y=0;
  for(let side of [-1,1])for(let z of [8,23,39,54]){
   let x=side*5.4,y=ground(z)-.16, clr=side>0?0xff7e70:0x51b0ca;
   this.box(p,x,y+1.45,z,.10,3.1,.12,0x34546e);this.box(p,x+side*.46,y+2.63,z,.9,.54,.085,clr);
   this.box(p,x+side*.46,y+2.6,z-.05,.62,.07,.025,0xf1faff);
  }
  for(let side of [-1,1]){
   const x=side*7.7,z=52,y=ground(z)-.36;
   this.box(p,x,y-.7,z,5.5,1.1,9.7,0x3f6079);
   for(let i=0;i<3;i++){this.box(p,x+side*i*.62,y+i*.40,z,1.55,.33,9.5,0x8ab0c6);
    for(let j=0;j<11;j++){let a=x+side*(i*.62-.24),b=z-4.1+j*.8,k=y+i*.40;this.box(p,a,k+.42,b,.36,.58,.34,[0xda684d,0x2b567d,0x768acc,0x216d71,0xeab16e][(i+j+id)%5]);this.ball(p,a,k+.82,b,.19,.22,.19,[0xf1bd9a,0x9b614b,0xe5a887][j%3])}
   }
  }
  this.shad=this.ball(p,0,0,0,.56,.026,1.17,0x93afc5);
  this.hero=new T.Group();p.add(this.hero);this.athlete(this.hero);
  this.flakes=[];const flakeGeo=new T.OctahedronGeometry(.065);for(let i=0;i<36;i++){let f=this.mesh(p,flakeGeo,i%3===0?0xbdf9eb:0xffffff,0,0,0);f.visible=false;this.flakes.push(f)}
  this.lastPhase='';this.id=id;
 }
 athlete(p){
  let navy=0x172d45, white=0xf4fbff,face=0xe5a979;
  this.body=new T.Group();p.add(this.body);const b=this.body;
  this.suit=[];
  this.suit.push(this.ball(b,0,.82,0,.42,.55,.27,0x1769a5));this.box(b,0,.91,.23,.53,.49,.075,white);
  this.box(b,0,1.06,.277,.48,.075,.016,0x39bfae);
  this.box(b,0,.85,.278,.085,.23,.016,navy);this.box(b,.105,.91,.278,.06,.12,.016,navy);
  this.ball(b,0,1.45,.035,.289,.321,.295,face);this.ball(b,0,1.57,-.01,.33,.30,.327,navy);
  this.ball(b,0,1.69,-.013,.283,.186,.278,white);
  this.ball(b,0,1.484,.243,.29,.135,.125,0xffa65f);
  this.ball(b,0,1.504,.292,.252,.092,.088,0x234364);
  this.box(b,-.075,1.54,.367,.187,.037,.013,0xa9ebec).rotation.z=.12;
  this.box(b,0,1.326,.283,.09,.046,.038,0x924d42);
  this.box(b,0,1.754,-.025,.12,.046,.33,0x28b3a8);
  this.arms=[];this.legs=[];this.skis=[];
  for(let side of [-1,1]){
   let a=new T.Group();a.position.set(side*.39,1.10,0);b.add(a);this.arms.push(a);
   this.suit.push(this.ball(a,0,-.20,0,.13,.28,.13,0x1769a5));
   this.ball(a,0,-.49,.035,.105,.19,.108,navy);this.ball(a,0,-.65,.043,.105,.10,.11,white);
   let l=new T.Group();p.add(l);this.legs.push(l);l.position.set(side*.19,.10,0);
   this.suit.push(this.ball(l,0,.35,-.018,.15,.37,.158,0x1769a5));this.box(l,0,.116,.055,.23,.19,.34,navy);
   this.box(l,0,.16,.222,.205,.035,.025,0x97d6d8);
   let ski=new T.Group();p.add(ski);this.skis.push(ski);ski.position.set(side*.21,.045,0);
   this.box(ski,0,0,0,.145,.062,2.64,navy);
   this.box(ski,0,.036,.05,.126,.020,2.44,0xf57962);
   this.box(ski,0,.047,.65,.105,.019,.35,0xfbf0cb);
   let tip=this.box(ski,0,.059,1.36,.145,.056,.37,0xf57962);tip.rotation.x=-.21;
  }
 }
 render(run,kit,mode,fx,reduced){
  if(run.hill!==this.id)this.make(run.hill);
  let r=run, z=r.z, x=r.x, fly=r.phase==='flight', u=fly?clamp(r.t/flightTime(r)):0, intro=mode==='home'||mode==='hills'||mode==='kits'||r.phase==='ready';
  let close=mode==='home'||mode==='hills'||mode==='kits';
  if(intro){z=close?-27:-35;x=0}
  const g=ground(z),slope=Math.atan2(ground(z+.12)-g,.12),air=fly?Math.sin(u*Math.PI)*(2.55+1.05*r.take):0;
  this.hero.position.set(x,g+.055+air,z);this.hero.rotation.x=-slope+(fly?-.18*Math.sin(u*Math.PI):0);this.hero.rotation.y=close?-1.94:0;
  this.body.position.set(0,fly?.34:.49,0);const pitch=intro?.12:fly?(r.mark?.55:1.07):r.phase==='inrun'?(r.mark?.64:1.03):r.land>.54?.27:.50;this.body.rotation.x=reduced||!this.lastPhase?pitch:mix(this.body.rotation.x,pitch,.18);
  this.suit.forEach(m=>m.material=this.m(kitColors[kit]||kitColors.blue));
  for(let i=0;i<2;i++){let d=i?1:-1;this.skis[i].rotation.y=fly&&!r.mark?d*(.16+.20*Math.sin(Math.PI*u)):0;this.skis[i].position.z=!fly&&r.phase!=='inrun'&&r.land>.54?d*.37:0;this.legs[i].position.z=this.skis[i].position.z;this.legs[i].rotation.x=intro?0:r.phase==='inrun'?-.58:fly?-.57:-.20;this.arms[i].rotation.x=intro?-.15:fly?.79:1.02;this.arms[i].rotation.z=d*(fly?-.24:-.13)}
  this.shad.position.set(x,g+.027,z);this.shad.rotation.x=-slope;this.shad.scale.x=.48+air*.11;this.shad.scale.z=1.03+air*.12;
  this.marker.visible=fly||r.phase==='brake';let a=distanceWorld(r)-1.7;const pos=this.marker.geometry.attributes.position;for(let i=0;i<pos.count;i++){let nz=a+Math.floor(i/2)*2/3;pos.setY(i,ground(nz)+.049);pos.setZ(i,nz)}pos.needsUpdate=true;this.marker.frustumCulled=false;
  this.flakes.forEach((f,i)=>{const k=(i+1)/36,t=fx?.t||0;f.visible=t>0;if(t>0){const age=1-t;f.position.set(fx.x+Math.sin(i*7.3)*age*(1+k)*2,fx.y+.12+Math.sin(i*2.2)**2*Math.sin(Math.PI*age)*1.45,fx.z+Math.cos(i*3.3)*age*3);f.scale.setScalar(t*(.6+k*1.65));f.rotation.set(i,age*5,i*.5)}});
  let ca=close?V(-5.55,g+3.7,z-3.4):intro?V(3.25,g+3.05,z-5.5):V(3.3+(fly?1.05*Math.sin(u*Math.PI):0),g+air+3.05,z-5.45);
  let look=close?V(.05,g+.50,z+.31):V(x*.50,g+air-.22,z+5.7);
  if(!close&&(r.phase==='result'||r.phase==='between')){ca=V(x-4.4,g+2.72,z+5.4);look=V(x,g+.15,z+.2)}
  if(!this.lastPhase||reduced||this.lastPhase==='result'&&r.phase==='ready'||intro&&this.lastPhase!=='ready'){this.cam.copy(ca);this.look.copy(look)}else{this.cam.lerp(ca,.12);this.look.lerp(look,.15)}
  this.lastPhase=r.phase;this.c.position.copy(this.cam);this.c.lookAt(this.look);this.r.render(this.s,this.c);
 }
}
