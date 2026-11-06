const RideThree=window.THREE;

export function makeRide(athlete,id){
 const root=new RideThree.Group();
 athlete.root.add(root);
 const mats=new Map();
 const material=color=>{
  if(!mats.has(color))mats.set(color,new RideThree.MeshStandardMaterial({color,roughness:.52,metalness:.10}));
  return mats.get(color);
 };
 let mount=root;
 const block=(x,y,z,w,h,d,color)=>athlete.block(mount,material(color),x,y,z,w,h,d);
 const oval=(x,y,z,w,h,d,color)=>athlete.oval(mount,material(color),x,y,z,w,h,d);
 const pivot=(x,y,z,build)=>{
  const joint=new RideThree.Group();
  joint.position.set(x,y,z);
  root.add(joint);
  mount=joint;
  build();
  mount=root;
  return joint;
 };
 const rail=(x,y,z,length,color)=>block(x,y,z,.044,.045,length,color);
 const wheels=[],bits=[];
 let gag=()=>{};
 const scatter=(count,color,rounded=false)=>{
  for(let i=0;i<count;i++){
   const piece=rounded?oval(0,0,0,.052,.055,.058,color):block(0,0,0,.093,.041,.075,color);
   piece.visible=false;
   bits.push(piece);
  }
 };
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
  const foam=pivot(0,.42,-.98,()=>{
   for(const [x,y,z,s] of [[-.25,.01,.05,.13],[-.34,.10,.09,.082],[-.17,.06,-.08,.095]])oval(x,y,z,s,s,s,0xc6edf0);
  });
  gag=(beat,impact)=>{foam.position.y=.42+Math.abs(Math.sin(beat*1.2))*.16+impact*.25};
  scatter(9,0xc6edf0,true);
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
  const bell=pivot(0,.29,.902,()=>{
   block(0,0,0,.37,.18,.053,red);
   block(0,0,.03,.27,.041,.013,0xffdb94);
  });
  gag=(beat,impact)=>{bell.rotation.z=Math.sin(beat*3.5)*(.17+impact*.65)};
  scatter(7,0xf3c06d);
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
  const beak=oval(0,.439,1.338,.212,.052,.173,0xdf6831);
  for(const side of [-1,1]){
   oval(side*.175,.588,1.238,.073,.088,.051,0xfff3da);
   oval(side*.190,.590,1.277,.042,.060,.027,0x26354a);
   oval(side*.185,.611,1.300,.012,.017,.010,0xffffff);
  }
  gag=(beat,impact)=>{beak.position.y=.439-(.035+impact*.11)*Math.abs(Math.sin(beat*2.6));beak.rotation.x=impact*.23};
  scatter(8,0xffe99b);
 }else if(id==='toilet'){
  oval(0,.232,.76,.45,.165,.53,cream);
  oval(0,.339,.79,.35,.041,.424,0x34465a);
  oval(0,.345,.82,.25,.028,.319,0x64c4d6);
  block(0,.353,-.84,.76,.55,.33,cream);
  const lid=pivot(0,.64,-.83,()=>{
   block(0,.01,.02,.81,.092,.39,0xfaf6e9);
   block(.32,.02,.16,.089,.075,.10,steel);
  });
  gag=(beat,impact)=>{lid.rotation.x=Math.sin(beat*2)*.15-impact*.63;lid.position.y=.64+impact*.22};
  scatter(9,0xf7f4e9);
 }else if(id==='toaster'){
  for(const side of [-1,1]){
   block(side*.392,.235,.01,.154,.34,1.55,0x9c7ac1);
   block(side*.466,.24,.03,.033,.23,1.28,0xd8bbeb);
  }
  block(0,.241,.86,.91,.363,.34,0xa47fc8);
  block(0,.43,.86,.88,.059,.33,0xece9ed);
  const toast=[];
  for(const x of [-.22,.22]){
   toast.push(pivot(x,.47,.86,()=>{
    oval(0,.078,0,.157,.17,.048,0xc9873e);
    oval(0,.088,.038,.129,.143,.025,0xf7d589);
    for(const dot of [-.047,.047])oval(dot,.11,.062,.012,.018,.012,navy);
   }));
  }
  gag=(beat,impact)=>toast.forEach((slice,i)=>{
   slice.position.y=.47+Math.abs(Math.sin(beat*1.6+i))*.19+impact*(.54+i*.14);
   slice.rotation.z=(i?1:-1)*impact*.72;
  });
  scatter(8,0xefbd70);
 }else if(id==='sofa'){
  const upholstery=0xa45362;
  for(const side of [-1,1]){
   oval(side*.419,.235,-.06,.128,.157,.83,upholstery);
   oval(side*.418,.321,.54,.141,.129,.23,0xd17a75);
  }
  block(0,.348,-.98,.99,.53,.30,upholstery);
  const cushion=pivot(.18,.608,-1.00,()=>{
   oval(0,.03,0,.193,.10,.145,0xeeb881);
   block(-.15,.11,.01,.085,.034,.21,0x484057);
  });
  gag=(beat,impact)=>{cushion.position.y=.608+.105*Math.abs(Math.sin(beat))+impact*.64;cushion.rotation.z=Math.sin(beat*1.6)*.20+impact*2.3};
  scatter(7,0xd8927e);
 }else if(id==='banana'){
  for(const side of [-1,1]){
   const peel=oval(side*.415,.229,-.02,.138,.175,.99,0xeab532);
   peel.rotation.x=side*.055;
  }
  oval(0,.226,-.99,.404,.180,.344,0xf0ca44);
  oval(0,.259,.97,.39,.182,.315,0xf5d64d);
  const stem=pivot(0,.327,1.17,()=>{
   oval(0,.16,.08,.115,.239,.116,0xd5a032).rotation.x=.49;
   oval(0,.348,.17,.096,.054,.09,0x665443);
  });
  gag=(beat,impact)=>{stem.rotation.x=Math.sin(beat*2)*(.23+impact*.65);stem.rotation.z=impact*.32};
  scatter(9,0xf7c837);
 }else if(id==='ufo'){
  const hull=0x7199bc;
  for(const side of [-1,1]){
   oval(side*.425,.24,-.02,.180,.151,.99,hull);
   for(const z of [-.71,-.35,0,.35,.71])oval(side*.576,.264,z,.039,.046,.060,0x8df3cf);
  }
  oval(0,.258,.99,.48,.166,.31,hull);
  oval(0,.275,-1.02,.47,.165,.26,hull);
  const alien=pivot(0,.36,1.0,()=>{
   oval(0,.02,0,.31,.08,.208,0x486487);
   oval(0,.165,0,.158,.135,.125,0x9adf87);
   for(const x of [-.063,.063])oval(x,.171,.10,.033,.042,.034,0x233b49);
   block(0,.31,0,.023,.096,.021,steel);
   oval(0,.367,0,.040,.042,.038,0xfad780);
  });
  gag=(beat,impact)=>{alien.rotation.y=beat*.70+impact*5.0;alien.position.y=.36+impact*.54};
  scatter(10,0x96efcb,true);
 }
 return {root,wheels,gag,bits};
}

export function animateRide(model,time,impact,braking,reduced){
 const strength=reduced?0:impact;
 model.gag(reduced?0:time*6,strength);
 for(const [i,piece] of model.bits.entries()){
  piece.visible=!reduced&&braking&&impact>.02;
  if(!piece.visible)continue;
  const a=i*2.399,reach=Math.min(1,time*1.8);
  piece.position.set(Math.cos(a)*(.43+reach*.55),.70+impact*(.45+(i%4)*.13),Math.sin(a)*(.62+reach*.80));
  piece.rotation.set(a+time*8,a*.5,time*5);
 }
}
