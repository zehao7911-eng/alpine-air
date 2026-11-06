const RideThree=window.THREE;

export function makeRide(athlete,id){
 const root=new RideThree.Group();
 athlete.root.add(root);
 const mats=new Map();
 const material=color=>{
  if(!mats.has(color))mats.set(color,new RideThree.MeshStandardMaterial({color,roughness:.52,metalness:.10}));
  return mats.get(color);
 };
 const block=(x,y,z,w,h,d,color)=>athlete.block(root,material(color),x,y,z,w,h,d);
 const oval=(x,y,z,w,h,d,color)=>athlete.oval(root,material(color),x,y,z,w,h,d);
 const rail=(x,y,z,length,color)=>block(x,y,z,.044,.045,length,color);
 const wheels=[];
 const steel=0x718e9e,cream=0xf1eee0,navy=0x244157;
 block(0,.076,-.045,.75,.073,1.64,id==='cart'?steel:0x54768a);
 for(const z of [-.71,.63])block(0,.078,z,.76,.074,.13,navy);
 if(id==='tub'){
  for(const side of [-1,1]){
   oval(side*.367,.218,-.055,.126,.153,.93,0x67c4cb);
   oval(side*.376,.332,-.052,.103,.059,.94,cream);
   block(side*.30,.105,-.68,.14,.15,.18,0xc89458);
  }
  oval(0,.24,1.00,.467,.183,.20,0x67c4cb);
  oval(0,.35,.998,.467,.055,.19,cream);
  oval(0,.27,-1.04,.457,.189,.17,0x67c4cb);
  oval(0,.39,-1.04,.458,.055,.17,cream);
  block(.20,.55,1.05,.08,.31,.09,0xe0b568);
  block(.20,.70,1.00,.080,.072,.19,0xe0b568);
  block(.20,.656,.92,.07,.11,.07,0xb9854b);
  for(const [x,y,z,s] of [[-.25,.43,-.93,.13],[-.34,.52,-.89,.082],[-.17,.48,-1.06,.095]]){
   oval(x,y,z,s,s,s,0xc6edf0);
  }
 }else if(id==='cart'){
  const red=0xe86664;
  for(const side of [-1,1]){
   rail(side*.42,.30,-.04,1.78,steel);
   rail(side*.40,.135,-.04,1.72,steel);
   for(let i=0;i<7;i++)block(side*.412,.217,-.81+i*.255,.037,.205,.041,steel);
   for(const z of [-.73,.70]){
    const wheel=new RideThree.Group();
    wheel.position.set(side*.43,.15,z);
    root.add(wheel);
    const tire=new RideThree.CylinderGeometry(.12,.12,.074,12).rotateZ(Math.PI/2);
    athlete.mesh(wheel,tire,material(0x263d52));
    athlete.block(wheel,material(0xf3c06d),side*.042,0,0,.019,.153,.030);
    wheels.push(wheel);
   }
   const handle=block(side*.41,.43,-.98,.058,.34,.058,steel);
   handle.rotation.x=-.20;
  }
  for(const z of [-.94,.87]){
   block(0,.30,z,.87,.045,.046,steel);
   for(let i=-3;i<=3;i++)block(i*.123,.218,z,.033,.20,.033,steel);
  }
  block(0,.601,-1.01,.91,.085,.082,red);
  block(0,.21,.902,.37,.18,.053,red);
  block(0,.208,.932,.27,.041,.013,0xffdb94);
 }else if(id==='duck'){
  const yellow=0xf0c441,orange=0xf38c39;
  for(const side of [-1,1]){
   oval(side*.399,.229,-.07,.172,.185,.92,yellow);
   oval(side*.52,.299,-.21,.090,.129,.47,0xe8aa36);
   oval(side*.558,.338,-.21,.050,.085,.33,0xf9d96b);
  }
  oval(0,.22,-.99,.44,.19,.29,yellow);
  oval(0,.40,-1.19,.24,.13,.20,yellow).rotation.x=-.34;
  oval(0,.246,.89,.44,.23,.33,yellow);
  oval(0,.515,1.039,.287,.303,.28,yellow);
  oval(0,.474,1.317,.234,.088,.204,orange);
  oval(0,.439,1.338,.212,.052,.173,0xdf6831);
  for(const side of [-1,1]){
   oval(side*.175,.588,1.238,.073,.088,.051,0xfff3da);
   oval(side*.190,.590,1.277,.042,.060,.027,0x26354a);
   oval(side*.185,.611,1.300,.012,.017,.010,0xffffff);
  }
 }
 return {root,wheels};
}
