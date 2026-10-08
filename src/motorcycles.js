import * as T from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { Font } from 'three/addons/loaders/FontLoader.js';
import fontData from 'three/examples/fonts/helvetiker_regular.typeface.json' with { type:'json' };
import { bikeById } from '../shared/game.js';
import { mat,add,box,ellipsoid,tube,profile,shell,curvedTube,bolt,fender,riderModel,optimize } from './model-geometry.js';
const font=new Font(fontData);
const rubber=mat(0x111519,0,.92),seat=mat(0x191d20,0,.84),black=mat(0x171d22,.3,.38),chrome=mat(0xbcc6cc,.92,.24),steel=mat(0x555e64,.78,.42),bronze=mat(0x9c7956,.72,.4),white=mat(0xe0e4e6,.15,.3);
const lamp=new T.MeshStandardMaterial({color:0xe0f1fa,emissive:0xbedce7,emissiveIntensity:.25,roughness:.15});
const tail=new T.MeshStandardMaterial({color:0xbe222e,emissive:0x830d16,emissiveIntensity:.35,roughness:.24});
const amber=mat(0xcf8231,.12,.34);
function label(g,text,x,y,z,size=.035,color=0xc9d0d0,side=1){const geo=new TextGeometry(text,{font,size,depth:.0008,curveSegments:3,bevelEnabled:false});const m=add(g,geo,mat(color,.25,.44),x,y,z);m.rotation.y=side*Math.PI/2;return m;}
function sidePatch(g,side,points,color){const geo=new T.BufferGeometry(),positions=[],indices=[];for(const [z,y,x]of points)positions.push(side*(x+.038),y,z);for(let i=1;i<points.length-1;i++)side>0?indices.push(0,i+1,i):indices.push(0,i,i+1);geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();const mesh=add(g,geo,mat(color,.28,.35));mesh.material.side=T.DoubleSide;return mesh;}
function roundCase(g,x,y,z,r,w,m){const o=add(g,new T.CylinderGeometry(r,r,w,40),m,x,y,z);o.rotation.z=Math.PI/2;return o;}
function bikeWheel(radius,width,rimColor,wire=false,knobby=false){
 const g=new T.Group();g.userData.dynamic=true;
 const tire=add(g,new T.TorusGeometry(radius-.055,.055,16,64),rubber);tire.rotation.y=Math.PI/2;tire.scale.z=width/.11;
 const rimMat=mat(rimColor,.72,.32),rimRadius=radius-.084;
 for(const side of [-1,1]){
  const rim=add(g,new T.TorusGeometry(rimRadius,.014,8,56),rimMat,side*width*.33);rim.rotation.y=Math.PI/2;
  if(wire)for(let i=0;i<28;i++){const a=i/28*Math.PI*2;tube(g,[side*.036,Math.sin(a+.3)*.045,Math.cos(a+.3)*.045],[side*width*.33,Math.sin(a)*rimRadius,Math.cos(a)*rimRadius],.0025,chrome,5);}
  else for(let i=0;i<5;i++){const a=i/5*Math.PI*2;const p=new T.Group();p.rotation.x=a;g.add(p);profile(p,[[-.025,.047],[-.065,rimRadius*.75],[-.034,rimRadius],[.012,rimRadius],[.008,.13],[.025,.047]],.020,rimMat).position.x=side*width*.24;}
 }
 roundCase(g,0,0,0,.035,width,steel);
 const disc=add(g,new T.RingGeometry(radius*.22,radius*.50,48),chrome,width*.48);disc.rotation.y=Math.PI/2;disc.material.side=T.DoubleSide;
 // Dark drill marks read as perforations against the brake rotor.
 for(let i=0;i<18;i++){const a=i/18*6.283;const hole=add(g,new T.CircleGeometry(.0045,6),black,width*.48+.0008,Math.sin(a)*radius*.41,Math.cos(a)*radius*.41);hole.rotation.y=Math.PI/2;}
 for(let i=0;i<64;i++){const a=i/64*6.283;for(const side of [-1,1]){const tread=box(g,side*width*.24,Math.sin(a)*(radius-.002),Math.cos(a)*(radius-.002),width*.35,knobby?.012:.003,knobby?.025:.012,black);tread.rotation.x=-a;tread.rotation.z=side*.45;}}
 return g;
}
function engine(g,b){
 const big=b.class==='naked'||b.class==='adventure',y=big?.49:.40,z=big?-.02:-.13;
 roundCase(g,0,y,z,big?.16:.115,big?.35:.25,steel);
 for(const side of [-1,1]){roundCase(g,side*(big?.19:.135),y,z,big?.115:.086,.012,black);for(let i=0;i<7;i++){const a=i/7*6.283;bolt(g,side*(big?.20:.145),y+Math.sin(a)*(big?.145:.10),z+Math.cos(a)*(big?.145:.10));}}
 if(b.class==='scooter'){
  // PCX has an enclosed rear CVT drive and a visible right-hand silencer.
  profile(g,[[-.75,.23],[-.20,.25],[-.12,.38],[-.37,.46],[-.70,.43]],.14,black).position.x=-.10;
  curvedTube(g,[[.16,.32,-.13],[.20,.27,-.35],[.23,.29,-.54]],.022,bronze);
  const muffler=tube(g,[.23,.28,-.34],[.28,.39,-.84],.07,black,24);tube(g,[.245,.285,-.35],[.30,.40,-.85],.045,chrome,24);
  for(const z of [-.46,-.70])bolt(g,.31,.34,z);return;
 }
 for(let cylinder=0;cylinder<(b.class==='naked'?2:1);cylinder++){
  const x=b.class==='naked'?(cylinder-.5)*.15:0;
  const block=box(g,x,y+.18,z+.09,big?.14:.15,big?.22:.14,.17,black);block.rotation.x=-.15;
  if(b.class!=='naked')for(let i=0;i<9;i++)box(g,x,y+.13+i*.018,z+.1,big?.28:.22,.007,.19,steel);
  curvedTube(g,[[x,y+.20,z+.2],[x,y-.02,.20],[x+.06,.23,.1],[.22,.23,-.37]],big?.028:.020,bronze);
 }
 if(big){box(g,0,.62,.29,.28,.30,.055,black);for(let i=0;i<14;i++)box(g,0,.49+i*.019,.324,.265,.005,.004,steel);}
 const exhaustZ=b.class==='adventure'?-.63:-.57,exhaustY=b.class==='adventure'?.58:.39;
 curvedTube(g,[[.21,.23,-.3],[.24,.28,-.43],[.26,exhaustY,exhaustZ]],.026,bronze);
 const can=tube(g,[.26,exhaustY-.035,exhaustZ+.13],[.28,exhaustY+.04,exhaustZ-.19],b.class==='naked'?.063:.051,black,24);
 for(const t of [0,.8]){const ring=add(g,new T.TorusGeometry(b.class==='naked'?.065:.053,.006,6,24),chrome,.26+t*.02,exhaustY-.035+t*.075,exhaustZ+.13-t*.32);ring.quaternion.copy(can.quaternion);ring.rotateX(Math.PI/2);}
}
function controls(g,b,h,headZ){
 curvedTube(g,[[-.36,h+.055,headZ-.03],[-.23,h+.04,headZ],[0,h,headZ],[.23,h+.04,headZ],[.36,h+.055,headZ-.03]],.013,black);
 for(const side of [-1,1]){
  tube(g,[side*.27,h+.048,headZ-.02],[side*.37,h+.048,headZ-.03],.022,rubber,16);
  curvedTube(g,[[side*.25,h+.07,headZ+.01],[side*.30,h+.23,headZ+.08],[side*.39,h+.26,headZ+.06]],.008,black);
  ellipsoid(g,side*.39,h+.27,headZ+.06,.069,.045,.018,black);
  tube(g,[side*.25,h+.04,headZ+.04],[side*.36,h+.05,headZ+.04],.006,chrome);
  curvedTube(g,[[side*.11,h,headZ],[side*.09,h-.2,headZ+.12],[side*.09,.54,headZ+.14]],.005,black);
 }
 const cluster=box(g,0,h+.008,headZ+.07,.17,.04,.10,black);cluster.rotation.x=.35;
 const display=box(g,0,h+.032,headZ+.074,.105,.003,.055,mat(0x53747a,.2,.2));display.rotation.x=.35;
 for(let i=0;i<5;i++)box(g,-.043+i*.018,h+.036,headZ+.08,.010,.002,.023,white);
}
function seatShape(g,b,zFront,zRear,width){const mid=(zFront+zRear)/2;shell(g,[[zRear-.015,b.seatY-.02,.006,width*.25,0],[zRear+.04,b.seatY-.008,.041,width*.45,0],[mid,b.seatY-.02,.032,width*.48,0],[zFront-.04,b.seatY-.025,.025,width*.33,0],[zFront,b.seatY-.028,.006,width*.16,0]],seat);for(const side of [-1,1])curvedTube(g,[[side*(width*.45),b.seatY-.025,zRear+.06],[side*(width*.47),b.seatY-.036,mid],[side*(width*.31),b.seatY-.030,zFront-.04]],.003,steel);}
export function buildBike(id,{rider=false,optimizeMeshes=true}={}){
 const b=bikeById(id),root=new T.Group(),g=new T.Group();root.name=b.name;g.name='BikeBody';root.add(g);
 const paint=mat(b.color,b.class==='scooter'?.20:.27,b.class==='scooter'?.34:.31),r=b.wheel,fr=b.frontWheel||r,front=b.wheelbase/2,rear=-front,wire=['underbone','adventure'].includes(b.class),naked=b.class==='naked',scooter=b.class==='scooter';
 const backWheel=bikeWheel(r,naked?.18:scooter?.13:.115,id==='winner'?0xf3751e:naked?0x3da8a2:wire?0xb8c1c8:0x202830,wire,b.class==='adventure');backWheel.position.set(0,r,rear);backWheel.name='WheelRear';g.add(backWheel);
 const frontWheel=bikeWheel(fr,naked?.12:.105,id==='winner'?0x147fdb:naked?0x3da8a2:wire?0xb8c1c8:0x202830,wire,b.class==='adventure');frontWheel.position.set(0,fr,front);frontWheel.name='WheelFront';g.add(frontWheel);
 const headZ=front-.18,h=b.class==='adventure'?1.12:naked?1.04:id==='cub'?1.0:1.01;
 // Axles, swingarm, steering head and fork rake are separate from the body panels.
 for(const side of [-1,1]){
  const x=side*.065;tube(g,[x,r,rear],[x,.42,-.07],.026,black);tube(g,[x,.42,-.07],[x,b.seatY-.14,-.27],.024,black);
  tube(g,[x,b.seatY-.14,-.27],[x,h-.16,headZ],.026,black);
  tube(g,[x,fr,front],[x,h-.10,headZ],naked?.022:.016,chrome);tube(g,[x,fr,front],[x,fr+.24,front-.055],naked?.031:.026,black);
  roundCase(g,x,fr,front,.022,.05,chrome);
  if(id==='cub'||scooter){tube(g,[side*.085,r+.03,rear],[side*.095,.69,rear+.11],.022,steel);for(let i=0;i<10;i++){const spring=add(g,new T.TorusGeometry(.026,.005,5,12),id==='pcx'?mat(0x783846):chrome,side*.09,r+.12+i*.020,rear+.035+i*.005);spring.rotation.x=Math.PI/2;}}
 }
 engine(g,b);fender(g,front,fr,paint);if(id==='cub')fender(g,rear,r,paint);
 if(id==='cub'){
  // Continuous step-through chassis and large ivory leg shield: Super Cub silhouette.
  shell(g,[[-.82,.57,.025,.025,0],[-.65,.63,.09,.11,0],[-.37,.58,.10,.10,0],[-.08,.42,.07,.064,0],[.18,.44,.07,.065,0],[.35,.68,.09,.075,0],[headZ,.86,.04,.055,0]],paint);
  profile(g,[[-.09,.27],[.07,.31],[.20,.45],[.34,.74],[.39,.92],[.28,.92],[.18,.79],[.07,.61],[-.06,.49]],.39,mat(0xddd4bb,.08,.41));
  seatShape(g,b,-.17,-.72,.25);
  shell(g,[[headZ-.07,.98,.055,.09,0],[headZ,.99,.085,.16,0],[headZ+.10,.98,.065,.15,0],[headZ+.15,.98,.03,.10,0]],paint);
  profile(g,[[headZ+.12,.938],[headZ+.18,.938],[headZ+.18,1.05],[headZ+.12,1.05]],.19,chrome);box(g,0,.995,headZ+.183,.165,.087,.006,lamp);
  for(const side of [-1,1]){ellipsoid(g,side*.18,.986,headZ+.12,.045,.055,.032,amber);label(g,'CUB',side*.205,.78,.31,.040,0x756148,side);tube(g,[side*.1,b.seatY-.02,-.61],[side*.13,b.seatY-.02,-.91],.009,chrome);}
  for(let i=0;i<5;i++)tube(g,[-.13,b.seatY-.02,-.72-i*.035],[.13,b.seatY-.02,-.72-i*.035],.006,chrome);
 }else if(scooter){
  // A long low scooter tail, central tunnel, footboards, tall angular front apron.
  shell(g,[[-.92,.62,.015,.045,0],[-.80,.67,.065,.14,0],[-.61,.65,.13,.215,0],[-.33,.60,.15,.205,0],[-.13,.48,.09,.14,0],[.15,.43,.06,.11,0]],paint);
  profile(g,[[-.89,.65],[-.70,.71],[-.18,.66],[.08,.43],[-.01,.33],[-.58,.37],[-.78,.43]],.40,paint);
  seatShape(g,b,-.08,-.86,.38);seatShape(g,{...b,seatY:b.seatY+.045},-.48,-.86,.35);
  for(const side of [-1,1]){profile(g,[[-.55,.28],[.22,.28],[.25,.36],[-.38,.42]],.065,black).position.x=side*.18;sidePatch(g,side,[[-.84,.64,.12],[-.45,.61,.218],[-.14,.45,.155],[-.23,.51,.196],[-.56,.72,.202]],0x38464e);}
  shell(g,[[.11,.41,.08,.16,0],[.21,.56,.17,.205,0],[.33,.78,.23,.22,0],[.47,.94,.14,.24,-.035],[.56,.97,.09,.185,-.025],[.61,.92,.01,.03,0]],paint);
  profile(g,[[.16,.32],[.28,.43],[.48,.68],[.65,.88],[.58,1.02],[.42,1.08],[.30,.90],[.22,.60]],.39,paint);
  shell(g,[[.32,.92,.07,.19,0],[.47,.91,.16,.23,0],[.61,.88,.10,.15,0],[.68,.84,.015,.028,0]],paint);
  for(const side of [-1,1]){
   curvedTube(g,[[side*.08,.90,.65],[side*.17,.96,.58],[side*.20,1.01,.47]],.009,lamp);
   sidePatch(g,side,[[.66,.87,.04],[.57,.94,.175],[.39,1.01,.207],[.39,.96,.214],[.58,.88,.159]],0xa1bbcb);
   sidePatch(g,side,[[.59,.87,.152],[.41,.94,.213],[.32,.91,.202],[.40,.865,.218]],0xe5f2f5);
   sidePatch(g,side,[[.47,.81,.222],[.31,.76,.211],[.22,.51,.203],[.30,.57,.222]],0x222c32);
   label(g,'PCX',side*.240,.63,-.50,.047,0xaab2b7,side);
  }
  const wind=profile(g,[[.32,1.02],[.41,1.23],[.46,1.26],[.51,1.06]],.29,mat(0x1c2e35,.44,.20));
  roundCase(g,-.08,.29,-.44,.095,.23,black);profile(g,[[-.87,.23],[-.37,.23],[-.11,.36],[-.27,.43],[-.67,.43]],.15,black).position.x=-.10;
 }else if(naked||b.class==='adventure'){
  const adv=b.class==='adventure';
  // Open engine and high fuel tank make these motorcycles unlike an underbone.
  shell(g,[[-.32,.77,.05,.105,0],[-.18,.88,.16,adv?.215:.245,0],[.08,.91,.19,adv?.225:.25,0],[.28,.89,.12,.18,0],[.39,.79,.045,.065,0]],paint);
  seatShape(g,b,-.25,-.71,.30);if(naked)seatShape(g,{...b,seatY:.86},-.55,-.84,.24);
  for(const side of [-1,1]){
   curvedTube(g,[[side*.13,.42,-.20],[side*.19,.69,-.18],[side*.13,.76,.25],[side*.09,.98,headZ]],.022,black);
   profile(g,[[-.72,.71],[-.27,.66],[-.19,.70],[-.53,.85],[-.77,.84]],.035,paint).position.x=side*.13;
   sidePatch(g,side,[[.27,.94,.184],[.31,.79,.164],[.04,.73,.233],[-.02,.85,.252]],adv?0x939b9a:0x213036);
   label(g,adv?'ROYAL ENFIELD':'MT-07',side*(adv?.240:.282),.90,.12,adv?.022:.043,adv?0xd4d6d1:0x49b2ae,side);
   if(naked)sidePatch(g,side,[[.30,.88,.188],[.27,.78,.20],[.11,.75,.237],[.15,.81,.255]],0xb95343);
  }
  if(adv){
   const surround=add(g,new T.CylinderGeometry(.105,.105,.10,40),black,0,1.065,.54);surround.rotation.x=Math.PI/2;add(g,new T.CircleGeometry(.097,40),lamp,0,1.065,.592);
   const wind=profile(g,[[.40,1.09],[.36,1.40],[.40,1.43],[.52,1.15]],.27,new T.MeshPhysicalMaterial({color:0xadc5ce,roughness:.12,transparent:true,opacity:.32,side:T.DoubleSide}));
   for(const side of [-1,1]){curvedTube(g,[[side*.29,.39,.06],[side*.29,.72,.31],[side*.23,.97,.28],[side*.23,1.0,-.08],[side*.29,.72,-.19]],.014,black);tube(g,[side*.2,.82,-.5],[side*.2,.88,-.91],.012,black);tube(g,[side*.2,.88,-.91],[-side*.2,.88,-.91],.010,black);}
   profile(g,[[-.14,.23],[.30,.23],[.34,.31],[-.10,.35]],.30,steel);
   box(g,0,.86,-.79,.38,.022,.26,black);profile(g,[[front-.06,.79],[front+.26,.70],[front+.28,.68],[front-.08,.74]],.18,paint);
  }else{
   profile(g,[[.44,.83],[.52,.91],[.48,1.055],[.37,1.11],[.32,.94]],.26,paint);
   add(g,new T.CircleGeometry(.042,24),lamp,0,.98,.523);
   for(const side of [-1,1])curvedTube(g,[[side*.08,1.063,.485],[side*.115,1.04,.49],[side*.12,.99,.492]],.009,lamp);
   tube(g,[0,.72,rear+.14],[0,.50,-.04],.04,black);for(let i=0;i<9;i++){const ring=add(g,new T.TorusGeometry(.045,.007,6,12),bronze,0,.54+i*.016,-.12-i*.025);ring.rotation.x=-.6;}
  }
 }else{
  const win=id==='winner',accent=mat(win?0x187bc2:0x9860e3,.38,.27);
  // Underbone seat/tunnel and front fairing; no big-bike fuel tank.
  shell(g,[[-.89,.70,.015,.045,0],[-.73,.73,.065,.125,0],[-.45,.65,.12,.16,0],[-.20,.51,.08,.10,0],[.08,.42,.045,.09,0],[.24,.56,.14,.14,0],[.36,.83,.08,.09,0]],paint);
  seatShape(g,b,-.16,-.81,.27);
  for(const side of [-1,1]){
   const panel=profile(g,[[-.12,.31],[.10,.36],[.27,.55],[.44,.80],[.36,.87],[.17,.77],[.05,.52]],.025,paint);panel.position.x=side*.14;
   sidePatch(g,side,[[.38,.84,.165],[.25,.68,.185],[.01,.37,.165],[-.07,.33,.165],[.13,.79,.165]],win?0x147ab8:0x7845c4);
   sidePatch(g,side,[[.38,.865,.170],[.28,.80,.176],[.10,.70,.182],[.01,.48,.181],[.10,.54,.182]],win?0xe77629:0xb99be3);
   sidePatch(g,side,[[-.77,.72,.131],[-.46,.61,.164],[-.16,.50,.142],[-.41,.665,.169],[-.70,.775,.141]],win?0x3d8bbc:0x8650cf);
   sidePatch(g,side,[[-.73,.765,.147],[-.40,.655,.172],[-.18,.555,.157],[-.38,.684,.174]],win?0xe27a2b:0xc3acd8);
   label(g,win?'WINNER X':'EXCITER',side*.204,.674,-.45,.033,0xe1e5e8,side);
  }
  if(win){
   shell(g,[[.29,.84,.03,.08,0],[.41,.83,.12,.19,0],[.55,.80,.08,.13,0],[.59,.77,.015,.025,0]],paint);
   for(const side of [-1,1]){sidePatch(g,side,[[.55,.82,.117],[.46,.88,.17],[.33,.89,.144],[.41,.83,.19]],0xc8dde7);sidePatch(g,side,[[.46,.81,.177],[.39,.79,.184],[.43,.74,.165],[.53,.77,.111]],0xe4f0f4);}
   shell(g,[[headZ-.04,1.01,.035,.10,0],[headZ+.04,1.035,.06,.18,0],[headZ+.12,1.00,.03,.13,0]],paint);
  }else{
   shell(g,[[headZ-.04,1.00,.03,.08,0],[headZ+.04,1.00,.072,.18,0],[headZ+.12,.98,.06,.16,0],[headZ+.17,.96,.015,.05,0]],paint);
   profile(g,[[headZ+.13,.968],[headZ+.15,1.02],[headZ+.18,1.00],[headZ+.18,.96]],.22,lamp);
   shell(g,[[.24,.67,.055,.10,0],[.34,.80,.16,.17,0],[.45,.85,.09,.16,0],[.50,.82,.025,.10,0]],paint);
  }
  box(g,0,.53,.10,.22,.21,.05,black);for(let i=0;i<9;i++)box(g,0,.44+i*.021,.129,.20,.004,.003,steel);
 }
 controls(g,b,h,headZ);
 for(const side of [-1,1]){const x=side*.19;box(g,x,.35,-.09,.10,.025,.075,rubber);box(g,x,fr+.04,front-.115,.034,.065,.065,bronze);tube(g,[x*.7,.43,-.32],[x*.7,r,rear],.005,steel);ellipsoid(g,side*.17,h-.09,headZ+.16,.030,.018,.025,amber);}
 box(g,0,b.seatY-.07,-.88,.12,.043,.018,tail);const plate=box(g,0,.50,-.87,.14,.095,.009,white);plate.rotation.x=-.25;
 if(rider)g.add(riderModel(b));
 root.userData={wheels:[backWheel,frontWheel],body:g,bike:id};
 if(optimizeMeshes){optimize(backWheel);optimize(frontWheel);optimize(g);}return root;
}
