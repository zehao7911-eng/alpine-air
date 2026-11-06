import {ground} from './core.mjs';
const VenueThree=window.THREE;
const venueVector=(x,y,z)=>new VenueThree.Vector3(x,y,z);

export function buildVenue(view,parent,theme,shoulder,floor,random){
 const site=new VenueThree.Group();
 parent.add(site);
 const box=(x,y,z,w,h,d,color)=>view.box(site,x,y,z,w,h,d,color);
 const pole=(a,b,r,color)=>view.tube(site,venueVector(...a),venueVector(...b),r,color);
 const group=(x,y,z)=>{
  const object=new VenueThree.Group();
  object.position.set(x,y,z);
  site.add(object);
  return object;
 };
 const part=(p,x,y,z,w,h,d,c)=>view.box(p,x,y,z,w,h,d,c);
 const glow=(p,x,y,z,w,h,d,c)=>{
  const object=part(p,x,y,z,w,h,d,c);
  object.material=view.venueGlow(c);
  return object;
 };
 const sign=(x,y,z,width,label)=>view.sign(site,x,y,z,width,.72,label);
 function finishGate(label,frame,trim){
  const z=64.6,y=ground(z);
  for(const side of [-1,1]){
   box(side*4.58,y+1.28,z,.24,3.35,.35,frame);
   box(side*4.58,y+.22,z,.48,.44,.55,trim);
  }
  box(0,y+3.11,z,9.4,.31,.32,frame);
  sign(0,y+2.81,z-.22,4.65,label);
 }

 function lodge(x,z,w,d,color,roof){
  // A solid stone base bridges the grade under the long wall.
  const foundation=Math.min(shoulder(x-w/2,z+d/2),shoulder(x+w/2,z+d/2))-.25;
  const y=Math.max(shoulder(x-w/2,z-d/2),shoulder(x+w/2,z-d/2));
  const house=group(x,y,z);
  part(house,0,(foundation-y)/2-.04,0,w+.12,y-foundation+.10,d+.12,0x43566a);
  part(house,0,.91,0,w,1.82,d,color);
  for(const column of [-1,1]){
   const roofPanel=part(house,column*w*.26,2.04,0,w*.64,.17,d+.39,roof);
   roofPanel.rotation.z=-column*.43;
   const trim=part(house,column*w*.26,2.11,0,w*.60,.075,d+.32,0xe2edf5);
   trim.rotation.z=-column*.43;
  }
  for(const end of [-1,1]){
   part(house,0,1.82,end*(d/2-.09),w,.16,.21,0x3a3046);
   const wallZ=end*(d/2+.013);
   part(house,0,.54,wallZ,.49,1.02,.075,0x352e41);
   for(const side of [-1,1]){
    part(house,side*w*.30,1.03,wallZ,.66,.63,.07,0x392e40);
    glow(house,side*w*.30,1.03,wallZ+end*.05,.50,.48,.03,0xffc677);
    part(house,side*w*.30,1.03,wallZ+end*.08,.045,.50,.021,0x70516a);
   }
  }
  for(const side of [-1,1])for(const offset of [-.25,.25]){
   const face=side*(w*.5+.023);
   part(house,face,1.06,d*offset,.08,.62,.69,0x362e44);
   glow(house,face+side*.049,1.06,d*offset,.026,.46,.51,0xffb966);
  }
  part(house,w*.24,2.43,d*.22,.31,1.04,.32,0x6e5763);
  part(house,w*.24,2.96,d*.22,.41,.16,.42,0xe5eafa);
 }

 if(theme==='fjord'){
  for(const side of [-1,1]){
   const center=side*45;
   box(center,floor+.025,70,58,.025,70,0x397b9a);
   for(let i=0;i<26;i++){
    const x=side*(19+random()*48),z=40+random()*56;
    const floe=view.mesh(site,new VenueThree.CylinderGeometry(1,1,.08,5,1),i%3===0?0x8dbecf:0xb3d6df,x,floor+.053,z);
    floe.scale.set(.8+random()*3,1,.45+random()*1.1);
    floe.rotation.y=random()*Math.PI;
   }
  }
  lodge(8.2,-16,3.4,4.8,0x3a7886,0x2c5269);
  lodge(-8.4,16,3.2,4.0,0xa65244,0x344b63);
  lodge(8.5,34,3.4,5,0x3b7789,0x2c5269);
  const dockY=floor+.74;
  box(-20,dockY,59,20,.37,3.5,0x796d68);
  for(let i=0;i<9;i++){
   box(-10-i*2.4,dockY-.53,57.6,.23,1.38,.24,0x3b4658);
   box(-10-i*2.4,dockY+.55,57.7,.17,.82,.18,0xb38e69);
  }
  box(-23,dockY+.25,63,5.4,.72,2.1,0x213e58);
  box(-23,dockY+.62,63,5.1,.28,2.0,0xb64e49);
  box(-23.7,dockY+1.06,63,1.9,.85,1.6,0xe4e8e0);
  box(-23.65,dockY+1.28,62.16,1.3,.36,.09,0x385f77);
  pole([-23,dockY+1.45,63],[-23,dockY+3.6,63],.049,0x516079);
  sign(-10,dockY+1.72,57.35,3.1,'FJORD DOCK');
  finishGate('BEACON HARBOR',0x31576e,0xe2a969);
  const tx=7.45,tz=58,base=shoulder(tx,tz);
  view.mesh(site,new VenueThree.CylinderGeometry(1.74,2.30,.9,10),0x426a7a,tx,base+.18,tz);
  for(let i=0;i<5;i++){
   const bottom=1.35-i*.12;
   view.mesh(site,new VenueThree.CylinderGeometry(bottom-.12,bottom,1.32,12,1,true),i%2?0xbd5f52:0xe0eceb,tx,base+1.04+i*1.32,tz);
  }
  view.mesh(site,new VenueThree.CylinderGeometry(1.34,1.05,.37,12),0x38556d,tx,base+7.06,tz);
  const beacon=group(tx,base+7.65,tz);
  glow(beacon,0,0,0,1.32,.85,1.30,0xffd690);
  part(beacon,.70,0,0,.15,.78,.68,0xffe8ae);
  for(let i=0;i<8;i++){
   const a=i*Math.PI/4;
   box(tx+Math.sin(a)*.83,base+7.64,tz+Math.cos(a)*.83,.09,1.14,.09,0x243d51);
  }
  view.mesh(site,new VenueThree.ConeGeometry(1.30,1.03,12),0x2e465b,tx,base+8.66,tz);
  sign(tx,base+1.18,tz-1.40,2.8,'BEACON 04');
  return (time,reduced)=>{beacon.rotation.y=reduced?0:time*.72};
 }

 for(const [x,z,w,d,c] of [
  [-8.4,-28,4.4,5.6,0x915b55],[8.7,-18,4,5,0x665b78],
  [-9.0,1,4.3,5.5,0x6d626f],[8.4,10,3.8,4.3,0x965d55],
  [-8.6,29,4.3,5,0x69516b],[9.3,38,5.4,6,0x8d5455],
  [-8.7,54,4.2,6,0x665675],[11.9,55,4.7,5.8,0x9b6159]
 ])lodge(x,z,w,d,c,0x4d4761);

 for(const side of [-1,1])for(const z of [-31,-21,-11,1,13,25,37,49,59]){
  const x=side*5.15,y=shoulder(x,z);
  box(x,y+.87,z,.10,1.90,.10,0x574156);
  const lantern=group(x,y+1.88,z);
  part(lantern,0,-.12,0,.31,.071,.30,0x573a51);
  glow(lantern,0,0,0,.23,.24,.23,0xffc47f);
  part(lantern,0,.14,0,.32,.072,.32,0x654155);
 }
 sign(-8.3,shoulder(-8.3,58)+1.30,57,3.45,'LANTERN LODGE');
 finishGate('LANTERN SQUARE',0x5f415e,0xf7b875);
 const railX=-8.4,start=[railX,shoulder(railX,-33)+7.6,-33],end=[railX,shoulder(railX,58)+6.4,58];
 pole(start,end,.052,0x3e3b54);
 for(const z of [-33,-5,23,58]){
  const f=(z+33)/91,top=start[1]+(end[1]-start[1])*f,base=shoulder(railX,z);
  pole([railX+.83,base-.2,z],[railX+.83,top,z],.16,0x424058);
  pole([railX+.83,top,z],[railX-.22,top,z],.089,0x424058);
 }
 const cabin=group(...start);
 part(cabin,0,-.31,0,.077,.66,.09,0x302d4a);
 part(cabin,0,-1.05,0,1.46,1.12,1.34,0xaf5a56);
 part(cabin,0,-1.64,0,1.48,.13,1.34,0x4a3e58);
 for(const side of [-1,1]){
  glow(cabin,side*.747,-.93,0,.038,.47,1.03,0xffbd76);
  glow(cabin,0,-.93,side*.684,1.03,.47,.037,0xffcf93);
 }
 const moon=view.ball(site,-11,23,100,4.6,4.6,4.6,0xffd7aa);
 moon.material=view.venueGlow(0xffd7aa);
 return (time,reduced)=>{
  const t=reduced?.44:.10+.80*(.5+.5*Math.sin(time*.29));
  cabin.position.set(railX,start[1]+(end[1]-start[1])*t,start[2]+(end[2]-start[2])*t);
  cabin.rotation.z=reduced?0:.07*Math.cos(time*.71);
 };
}
