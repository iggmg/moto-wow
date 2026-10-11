import * as T from 'three';
import {TextGeometry} from 'three/addons/geometries/TextGeometry.js';
import {Font} from 'three/addons/loaders/FontLoader.js';
import fontData from 'three/examples/fonts/helvetiker_regular.typeface.json' with {type:'json'};
import {bikeById} from '../shared/game.js';
import {BIKE_VISUALS,BIKE_RIGS,tyreRadius} from './bike-specs.js';
import {add,box,ellipsoid,tube,riderModel,optimize} from './model-geometry.js';
import {finish,bevel,loft,skin,pipe,arcFender} from './bike-surfaces.js';
import {winnerBody,winnerControls,winnerPaint,winnerFootrest,winnerMechanical} from './winner-body.js';
const font=new Font(fontData),TAU=Math.PI*2;
const rubber=finish('tyre rubber',0x171a1c,0,.91,'rubber'),seat=finish('seat grain',0x14171a,0,.83,'seat'),black=finish('satin frame',0x161b20,.28,.43),plastic=finish('unpainted polymer',0x22272b,.02,.72),chrome=finish('polished aluminium',0xb9c1c8,.94,.21),steel=finish('cast aluminium',0x41484e,.55,.54),discSteel=finish('brushed brake steel',0x919b9e,.92,.37),bronze=finish('heat stained exhaust',0x777466,.80,.38),carbon=finish('carbon weave',0x10151a,.30,.33,'carbon');
const ivory=finish('ivory paint',0xe0d6bd,.06,.39),glass=finish('dark screen',0x15242c,.22,.18);
const lamp=finish('headlamp lens',0xdbe7ed,.22,.14),red=finish('tail lens',0xa31324,.1,.22),amber=finish('indicator lens',0xda7826,.08,.26);
lamp.emissive.setHex(0x8aadb9);lamp.emissiveIntensity=.14;red.emissive.setHex(0x6c0915);red.emissiveIntensity=.2;
function label(g,text,x,y,z,size=.026,color=0xd8dedf,side=1){const geo=new TextGeometry(text,{font,size,depth:.00035,curveSegments:3}),o=add(g,geo,finish('badge '+color,color,.6,.3),x,y,z);o.rotation.y=side*Math.PI/2;return o;}
function face(g,points,z,m,depth=.003){const s=new T.Shape();s.moveTo(...points[0]);for(const p of points.slice(1))s.lineTo(...p);s.closePath();const geo=new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.0015,bevelThickness:.0015,bevelSegments:2,steps:1});return add(g,geo,m,0,0,z);}
function cylinder(g,x,y,z,r,w,m,segments=32){const o=add(g,new T.CylinderGeometry(r,r,w,segments),m,x,y,z);o.rotation.z=Math.PI/2;return o;}
function fastener(g,x,y,z,r=.006){const o=cylinder(g,x,y,z,r,.004,chrome,6);cylinder(g,x+Math.sign(x)*.003,y,z,r*.45,.001,black,6);return o;}
function ring(g,x,y,z,r,t,m){const o=add(g,new T.TorusGeometry(r,t,6,48),m,x,y,z);o.rotation.y=Math.PI/2;return o;}
function disc(g,x,diameter){
 const r=diameter/2,s=new T.Shape();s.absarc(0,0,r,0,TAU,false);const hub=new T.Path();hub.absarc(0,0,r*.40,0,TAU,true);s.holes.push(hub);
 for(let row=0;row<2;row++)for(let i=0;i<18;i++){const a=(i+row*.45)/18*TAU,p=new T.Path();p.absarc(Math.sin(a)*r*(.72+row*.14),Math.cos(a)*r*(.72+row*.14),.004,0,TAU,true);s.holes.push(p);}
 const geo=new T.ExtrudeGeometry(s,{depth:.003,bevelEnabled:false,curveSegments:6});geo.rotateY(Math.PI/2);add(g,geo,discSteel,x);
 for(let i=0;i<6;i++){const a=i/6*TAU;tube(g,[x,Math.sin(a)*r*.23,Math.cos(a)*r*.23],[x,Math.sin(a+.16)*r*.55,Math.cos(a+.16)*r*.55],.007,black,6);cylinder(g,x+.004,Math.sin(a)*r*.55,Math.cos(a)*r*.55,.005,.003,bronze,8);}
}
function wheel(tyre,color,{wire=false,knobby=false,rotor=0,dual=false,spokes=5,spokeWidth=1,paintCalm=false}={}){
 const [diameter,width,height]=tyre,rim=diameter/2,r=tyreRadius(tyre),g=new T.Group();g.userData.dynamic=true;
 // Tyre section has separate bead, sidewall, shoulders and a rounded crown.
 const points=[[-.38*width,rim-.008],[-.5*width,rim+.012],[-.53*width,rim+height*.42],[-.44*width,rim+height*.76],[-.26*width,r-.004],[0,r],[.26*width,r-.004],[.44*width,rim+height*.76],[.53*width,rim+height*.42],[.5*width,rim+.012],[.38*width,rim-.008]].map(([x,y])=>new T.Vector2(y,x));
 const tyreGeo=new T.LatheGeometry(points,80);tyreGeo.rotateZ(-Math.PI/2);add(g,tyreGeo,rubber);
 const rimMat=paintCalm?finish('Winner wheel paint '+color,color,.35,.40):finish('wheel paint '+color,color,.68,.27);
 for(const side of [-1,1]){
  ring(g,side*width*.34,0,0,rim-.008,.010,rimMat);ring(g,side*width*.31,0,0,rim-.022,.008,rimMat);
  ring(g,side*width*.49,0,0,rim+height*.40,.0012,plastic);
  if(wire)for(let i=0;i<32;i++){const a=i/32*TAU,b=a+(i%2?.20:-.20);tube(g,[side*.025,Math.sin(a)*.039,Math.cos(a)*.039],[side*width*.28,Math.sin(b)*(rim-.022),Math.cos(b)*(rim-.022)],.0016,chrome,5);cylinder(g,side*width*.28,Math.sin(b)*(rim-.024),Math.cos(b)*(rim-.024),.003,.010,steel,6);}
  else for(let i=0;i<spokes;i++){const a=i/spokes*TAU,p=new T.Group();p.rotation.x=a;g.add(p);bevel(p,[[-.018,.035],[-.042,rim*.55],[-.047,rim-.018],[-.017,rim-.018],[.009,rim*.5],[.018,.035]].map(([x,y])=>[x*spokeWidth,y]),.013,rimMat,side*width*.22,.0018);}
 }
 cylinder(g,0,0,0,.036,width*.7,steel);
 // Curved tread sipes follow the tyre crown; adventure tyres use separate blocks.
 for(let i=0;i<(knobby?36:48);i++){
  const a=i/(knobby?36:48)*TAU;
  if(knobby){for(const side of [-1,0,1]){const t=box(g,side*width*.29,Math.sin(a)*(r-.001),Math.cos(a)*(r-.001),width*.27,.012,.025,rubber);t.rotation.x=-a;t.rotation.z=side*.18;}}
  else for(const side of [-1,1]){const points=[];for(let j=0;j<5;j++){const u=j/4,x=side*width*(.06+u*.39),aa=a+side*u*.16,rr=r-height*.19*u*u;points.push([x,Math.sin(aa)*rr,Math.cos(aa)*rr]);}pipe(g,points,.0012,black,6,3);}
 }
 if(rotor){disc(g,width*.48,rotor);if(dual)disc(g,-width*.48,rotor);}else cylinder(g,0,0,0,wire?.065:.068,width*.72,steel);
 return g;
}
function shock(g,a,b,r=.021,color=chrome){tube(g,a,b,r,black,12);const A=new T.Vector3(...a),B=new T.Vector3(...b),direction=B.clone().sub(A),points=[],turns=11;for(let i=0;i<=turns*10;i++){const u=i/(turns*10),v=A.clone().lerp(B,u),axis=direction.clone().normalize(),cross=new T.Vector3(1,0,0),other=new T.Vector3().crossVectors(axis,cross).normalize(),angle=u*turns*TAU;v.addScaledVector(cross,Math.cos(angle)*r*1.28).addScaledVector(other,Math.sin(angle)*r*1.28);points.push(v.toArray());}pipe(g,points,.0038,color,turns*10,5);}
function chainDrive(g,s,rearY,rearZ){
 const x=-.115-(s.id==='mt07'?.04:0),r=.095,frontZ=-.06,frontY=.39;
 cylinder(g,x,rearY,rearZ,r,.008,steel);ring(g,x-.006,rearY,rearZ,r-.014,.003,black);
 for(let i=0;i<24;i++){const a=i/24*TAU,part=box(g,x,rearY+Math.sin(a)*r,rearZ+Math.cos(a)*r,.012,.012,.018,steel);part.rotation.x=-a;}
 for(const upper of [-1,1]){
  const a=[x-.012,rearY+upper*r,rearZ],b=[x-.012,frontY+upper*.038,frontZ];tube(g,a,b,.006,black,6);
  for(let i=0;i<38;i++){const t=i/37,y=a[1]+(b[1]-a[1])*t,z=a[2]+(b[2]-a[2])*t;cylinder(g,x-.019,y,z,.004,.006,bronze,5);}
 }
 for(let i=0;i<6;i++){const a=i/6*TAU;cylinder(g,x-.010,rearY+Math.sin(a)*.063,rearZ+Math.cos(a)*.063,.011,.005,black,10);}
}
function engine(g,s){
 const big=s.id==='mt07'||s.id==='himalayan',y=big?.48:.38,z=big?-.02:-.10;
 if(s.id==='pcx'){
  bevel(g,[[-.85,.235],[-.68,.18],[-.24,.20],[-.12,.28],[-.17,.40],[-.37,.45],[-.71,.41],[-.88,.33]],.13,black,-.075,.008);
  cylinder(g,-.152,.29,-.31,.095,.01,steel);cylinder(g,-.158,.29,-.31,.073,.009,plastic);for(let i=0;i<9;i++)bevel(g,[[-.70+i*.031,.25],[-.685+i*.031,.25],[-.66+i*.031,.32],[-.675+i*.031,.32]],.008,steel,-.15,.001);
  for(const z of [-.79,-.58,-.29])fastener(g,-.165,.35,z);
  return;
 }
 const outline=big?[[-.26,.33],[-.20,.25],[.03,.27],[.18,.38],[.17,.57],[.06,.62],[-.18,.60],[-.27,.48]]:[[-.28,.29],[-.22,.25],[.08,.26],[.16,.35],[.11,.48],[-.05,.50],[-.23,.44]];
 bevel(g,outline,big?.30:.22,black,0,.027);
 for(const side of [-1,1])for(let rib=0;rib<3;rib++)pipe(g,[[side*(big?.158:.118),y+.095,z-.14],[side*(big?.159:.119),y+.10-rib*.032,z+.065],[side*(big?.158:.118),y+.075-rib*.026,z+.14]],.004,steel,16,5);
 for(const side of [-1,1]){
  const x=side*(big?.181:.139),r=big?.107:.087;cylinder(g,x,y,z,r,.018,black);ring(g,x+side*.012,y,z,r*.87,.003,steel);cylinder(g,x+side*.014,y,z,r*.44,.004,steel);
  for(let i=0;i<8;i++){const a=i/8*TAU;fastener(g,x+side*.018,y+Math.sin(a)*r*.88,z+Math.cos(a)*r*.88);}
  label(g,s.id==='mt07'?'YAMAHA':s.id==='himalayan'?'RE':'HONDA',x+side*.017,y-.009,z+.042,.011,0x919b9d,side);
 }
 if(s.id==='cub'){
  // The Cub's cylinder is nearly horizontal, unlike the vertical engines below.
  for(let i=0;i<9;i++)bevel(g,[[.00+i*.013,.34],[.00+i*.013,.46],[.009+i*.013,.46],[.009+i*.013,.34]],.18,steel,0,.002);
  cylinder(g,0,.40,.16,.060,.16,black);pipe(g,[[0,.38,.20],[.12,.27,.24],[.17,.25,-.22]],.018,bronze);return;
 }
 const twin=s.id==='mt07',cy=big?.66:.535;
 if(twin){for(const side of [-1,1]){bevel(g,[[z+.015,cy-.095],[z+.16,cy-.075],[z+.245,cy+.065],[z+.065,cy+.095]],.135,steel,side*.076,.018);bevel(g,[[z+.048,cy+.095],[z+.25,cy+.095],[z+.26,cy+.16],[z+.06,cy+.165]],.149,black,side*.076,.008);for(let i=0;i<3;i++)pipe(g,[[side*.16,cy-.065+i*.043,z+.055],[side*.167,cy-.059+i*.043,z+.14],[side*.16,cy-.049+i*.043,z+.20]],.003,black,12,5);}}else bevel(g,[[z+.01,cy-.08],[z+.18,cy-.06],[z+.25,cy+.15],[z+.05,cy+.15]],big?.235:.17,black,0,.017);
 if(s.id==='himalayan')for(let i=0;i<12;i++)bevel(g,[[z+.005,cy-.05+i*.016],[z+.22,cy-.05+i*.016],[z+.22,cy-.046+i*.016],[z+.005,cy-.046+i*.016]],.26,steel,0,.001);
 else for(let i=0;i<4;i++)bevel(g,[[z+.05,cy+.09+i*.016],[z+.23,cy+.09+i*.016],[z+.23,cy+.096+i*.016],[z+.05,cy+.096+i*.016]],twin?.32:.19,steel,0,.002);
 for(let i=0;i<(twin?2:1);i++){const x=twin?(i-.5)*.14:0;pipe(g,[[x,cy+.05,z+.23],[x,cy-.15,.33],[x+.025,.24,.21],[.19,.245,-.31]],twin?.025:.020,bronze,28,10);}
 if(s.id!=='himalayan'){
  bevel(g,[[.275,.46],[.34,.46],[.36,.72],[.29,.73]],big?.27:.19,plastic,0,.004);for(let i=0;i<15;i++)tube(g,[-(big?.13:.095),.47+i*.016,.347],[(big?.13:.095),.47+i*.016,.347],.002,steel,4);
  pipe(g,[[-.14,.60,.20],[-.18,.51,.24],[-.16,.45,.34]],.012,rubber);
 }
}
function exhaust(g,s){
 const pcx=s.id==='pcx',adv=s.id==='himalayan',cub=s.id==='cub',x=pcx?.235:s.id==='mt07'?.26:.20,y=adv?.52:pcx?.31:.33,z=adv?-.67:-.65,r=cub?.035:adv?.063:pcx?.068:.055;
 if(!cub)pipe(g,[[.18,.245,-.28],[x,.26,-.38],[x,y,z+.22]],.021,bronze,22,10);
 const a=[x,y,z+.23],b=[x+.025,y+.09,z-.20],m=pcx||s.id==='winner'||s.id==='mt07'?carbon:chrome,can=tube(g,a,b,r,m,32);
 const direction=new T.Vector3(...b).sub(new T.Vector3(...a)).normalize();for(const u of [.06,.78]){const p=new T.Vector3(...a).lerp(new T.Vector3(...b),u),o=add(g,new T.TorusGeometry(r+.001,.005,6,32),chrome,...p.toArray());o.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),direction);}
 const tip=add(g,new T.CylinderGeometry(r*.77,r*.90,.05,24),steel,...b);tip.quaternion.copy(can.quaternion);const hole=add(g,new T.CircleGeometry(r*.50,24),black,...new T.Vector3(...b).addScaledVector(direction,.027).toArray());hole.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),direction);
 bevel(g,[[z+.15,y+.05],[z+.05,y+.10],[z-.11,y+.12],[z-.16,y+.07]],.016,black,x+.025,.002);for(const zz of [z+.11,z-.12])fastener(g,x+r+.005,y+.07,zz);
}
function controls(g,s,headZ){
 const h=s.barY,w=s.barWidth/2;
 pipe(g,[[-w,h+.03,headZ-.055],[-w*.63,h,headZ+.01],[0,h-.02,headZ+.01],[w*.63,h,headZ+.01],[w,h+.03,headZ-.055]],.012,chrome);
 for(const side of [-1,1]){
  tube(g,[side*(w-.09),h+.028,headZ-.04],[side*w,h+.034,headZ-.054],.019,rubber,16);
  for(let i=0;i<9;i++)cylinder(g,side*(w-.08+i*.009),h+.032,headZ-.048,.020,.0017,plastic,16);
  tube(g,[side*(w-.12),h+.06,headZ+.016],[side*(w+.01),h+.052,headZ+.005],.005,chrome);
  ellipsoid(g,side*(w+.01),h+.052,headZ+.005,.009,.009,.009,chrome);
  box(g,side*(w-.10),h+.042,headZ-.047,.039,.047,.043,black);box(g,side*(w-.10),h+.068,headZ-.036,.017,.007,.012,side>0?red:plastic);
  pipe(g,[[side*(w-.11),h+.060,headZ-.017],[side*(w-.085),h+.21,headZ+.03],[side*(w+.012),h+.26,headZ+.055]],.0065,black);
  const mirror=ellipsoid(g,side*(w+.012),h+.26,headZ+.055,s.id==='cub'?.043:.065,.039,.016,s.id==='pcx'?carbon:black);mirror.rotation.z=side*.2;
  ellipsoid(g,side*(w+.012),h+.26,headZ+.039,s.id==='cub'?.036:.057,.032,.002,chrome);
  pipe(g,[[side*(w-.1),h,headZ],[side*.07,h-.15,headZ-.02],[side*.09,.62,.20]],.0035,rubber,20,5);
 }
 if(s.id==='himalayan'){
  for(const [x,r]of [[-.072,.062],[.06,.039]]){const o=add(g,new T.CylinderGeometry(r,r,.025,32),black,x,h-.027,headZ+.04);o.rotation.x=.36;const dial=add(g,new T.CircleGeometry(r*.85,32),plastic,x,h-.012,headZ+.035);dial.rotation.x=-Math.PI/2+.36;for(let i=0;i<10;i++){const a=i/10*TAU;box(g,x+Math.sin(a)*r*.69,h+.001,headZ+.03+Math.cos(a)*r*.69,.003,.002,.008,chrome);}}
 }else{
  const cluster=bevel(g,[[headZ-.02,h-.022],[headZ+.1,h-.022],[headZ+.095,h+.025],[headZ+.01,h+.039]],s.id==='pcx'?.23:.17,black,0,.005);
  const display=box(g,0,h+.038,headZ+.055,.113,.003,.060,finish('LCD instrument',0x475d61,.12,.27));display.rotation.x=.28;
  for(let i=0;i<6;i++)box(g,-.047+i*.016,h+.042,headZ+.045,.010,.001,.025,chrome);
 }
}
function seatShape(g,s,front,back,width,raise=0){
 const y=s.seatY+raise;loft(g,[[back,y-.012,width*.10,.010],[back+.05,y-.012,width*.39,.040],[(back+front)/2,y-.025,width*.49,.035],[front-.05,y-.028,width*.34,.027],[front,y-.032,width*.10,.006]],seat,28,20);
 for(const side of [-1,1])pipe(g,[[side*width*.29,y-.028,back+.035],[side*width*.47,y-.043,(back+front)/2],[side*width*.31,y-.045,front-.055]],.0018,steel,24,4);
}
function chassis(g,s,front,rear,fr,rr,headZ){
 for(const side of [-1,1]){
  const wide=s.id==='mt07'?.115:s.id==='pcx'?.080:.066;
  tube(g,[side*wide,rr,rear],[side*wide,.41,-.09],s.id==='mt07'?.033:.022,black,12);tube(g,[side*.065,.41,-.09],[side*.065,s.seatY-.11,-.29],.023,black);
  pipe(g,[[side*.065,s.seatY-.11,-.29],[side*.060,.66,.12],[side*.045,s.barY-.12,headZ]],.021,black);
  tube(g,[side*.063,fr,front],[side*.063,s.barY-.11,headZ],s.id==='mt07'||s.id==='himalayan'?.0205:.0155,chrome,20);
  tube(g,[side*.063,fr,front],[side*.063,fr+.25,front-.058],s.id==='mt07'||s.id==='himalayan'?.028:.022,black,20);
  if(s.id==='himalayan')for(let i=0;i<10;i++){const o=add(g,new T.TorusGeometry(.026,.004,5,20),rubber,side*.063,fr+.29+i*.012,front-.07-i*.003);o.rotation.x=Math.PI/2;}
  fastener(g,side*.09,fr,front,.010);box(g,side*.065,s.barY-.14,headZ,.035,.045,.070,steel);
  if(s.frontDisc){const x=side*(s.front[1]*.48+.026);if(side>0||s.id==='mt07'){bevel(g,[[front-.16,fr+.015],[front-.085,fr+.01],[front-.07,fr+.12],[front-.11,fr+.16],[front-.18,fr+.13]],.035,black,x,.003);pipe(g,[[x,fr+.15,front-.14],[side*.07,fr+.33,front-.05],[side*.05,s.barY-.16,headZ]],.003,rubber,24,5);}}
  if(s.id==='cub'||s.id==='pcx')shock(g,[side*.10,rr+.02,rear+.015],[side*.11,s.seatY-.06,rear+.16],.020,s.id==='pcx'?finish('purple spring',0x6b324e,.5,.35):chrome);
  tube(g,[side*.13,.365,-.13],[side*.22,.365,-.13],.014,steel,8);tube(g,[side*.16,.365,-.13],[side*.25,.365,-.13],.022,rubber,12);
  if(s.id==='winner')winnerFootrest(g,side);else bevel(g,[[-.51,.57],[-.27,.36],[-.18,.38],[-.33,.62]],.016,steel,side*.135,.003);fastener(g,side*.15,.40,-.28);
 }
 if(!['pcx','cub'].includes(s.id)){shock(g,[0,.44,-.21],[0,s.seatY-.09,-.50],s.id==='mt07'?.027:.021);chainDrive(g,s,rr,rear);}
 tube(g,[-.10,s.barY-.12,headZ],[.10,s.barY-.12,headZ],.014,steel,10);
 if(s.id!=='winner')arcFender(g,front,fr,fr,s.front[1],s.paint,s.id==='himalayan'?-.92:-1.05,s.id==='himalayan'?.97:1.12);
 if(s.id==='cub')arcFender(g,rear,rr,rr,.09,s.paint,-1.25,1.2);
}
function cubBody(g,s,headZ){
 loft(g,[[-.83,.58,.026,.030],[-.67,.63,.087,.075],[-.34,.61,.078,.090],[-.09,.40,.048,.054],[.18,.40,.046,.050],[.34,.66,.060,.085],[headZ,.87,.046,.060]],s.paint);
 loft(g,[[.10,.461,.106,.02],[.20,.602,.150,.021],[.30,.784,.188,.022],[.36,.88,.165,.018]],ivory,34,20);
 for(const side of [-1,1]){
  skin(g,[[[.055,.91,.30],[.060,.79,.20],[.065,.55,.01],[.040,.39,-.12]],[[.155,.90,.34],[.195,.77,.28],[.18,.55,.07],[.10,.34,-.08]],[[.184,.87,.30],[.218,.74,.20],[.21,.51,.00],[.11,.34,-.08]]],side,ivory,24,8);
  pipe(g,[[side*.184,.87,.30],[side*.218,.74,.20],[side*.21,.51,0],[side*.11,.34,-.08]],.003,ivory);
  label(g,'CUB',side*.187,.80,.25,.032,0x69594c,side);
  bevel(g,[[-.54,.51],[-.28,.49],[-.26,.68],[-.44,.71],[-.60,.66]],.026,s.paint,side*.086,.010);label(g,'HONDA',side*.105,.61,-.42,.017,0xd9ded7,side);
  pipe(g,[[side*.105,.72,-.53],[side*.13,.72,-.81],[side*.13,.72,-.93]],.007,chrome);
 }
 seatShape(g,s,-.18,-.70,.27);
 for(let i=0;i<6;i++)tube(g,[-.13,.723,-.73-i*.033],[.13,.723,-.73-i*.033],.0045,chrome,8);
 loft(g,[[headZ-.09,s.barY-.03,.07,.037],[headZ+.01,s.barY-.025,.155,.068],[headZ+.125,s.barY-.037,.128,.055],[headZ+.17,s.barY-.037,.096,.043]],s.paint,26,20);
 face(g,[[-.097,.960],[.097,.960],[.097,1.044],[-.097,1.044]],headZ+.171,chrome,.010);face(g,[[-.083,.969],[.083,.969],[.083,1.035],[-.083,1.035]],headZ+.184,lamp);
 for(let i=0;i<9;i++)tube(g,[-.079+i*.019,.972,headZ+.191],[-.079+i*.019,1.032,headZ+.191],.0008,chrome,3);
 for(const side of [-1,1])ellipsoid(g,side*.178,s.barY-.036,headZ+.105,.027,.036,.025,amber);
}
function sportsBody(g,s,headZ){
 const win=s.id==='winner',blue=finish('blue graphic paint',win?0x087dd1:0x8957d8,.3,.29),orange=finish('orange graphic paint',win?0xed651b:0xc9b2eb,.25,.29);
 loft(g,[[-.91,.74,.012,.010],[-.78,.73,.11,.035],[-.58,.70,.145,.057],[-.37,.58,.13,.075],[-.15,.46,.075,.065],[.03,.41,.07,.045],[.22,.58,.1,.14],[.32,.82,.07,.055]],s.paint,44,20);
 seatShape(g,s,-.16,-.83,.275);
 for(const side of [-1,1]){
  skin(g,[[[.080,.85,.31],[.098,.68,.21],[.090,.47,.03],[.092,.31,-.08]],[[.18,.89,.35],[.215,.74,.17],[.187,.47,-.01],[.145,.28,-.12]],[[.201,.83,.30],[.230,.70,.12],[.198,.45,-.07],[.145,.28,-.12]]],side,s.paint,24,8);
  skin(g,[[[.202,.841,.31],[.231,.719,.15],[.198,.474,-.055]],[[.203,.797,.30],[.233,.671,.12],[.200,.438,-.065]]],side,blue,20,3);
  skin(g,[[[.204,.856,.30],[.225,.796,.19],[.240,.739,.09]],[[.206,.840,.30],[.231,.778,.18],[.241,.715,.09]]],side,orange,18,3);
  skin(g,[[[.241,.703,.08],[.213,.516,-.03],[.159,.307,-.112]],[[.243,.676,.09],[.215,.495,-.025],[.160,.299,-.116]]],side,orange,18,3);
  skin(g,[[[.104,.74,-.83],[.153,.70,-.58],[.135,.58,-.34]],[[.110,.69,-.83],[.150,.647,-.59],[.139,.56,-.34]]],side,s.paint,20,6);
  skin(g,[[[.116,.725,-.79],[.157,.68,-.55],[.145,.584,-.32]],[[.12,.711,-.79],[.159,.665,-.55],[.146,.572,-.32]]],side,blue,18,3);
  label(g,win?'WINNER X':'EXCITER',side*.158,.689,-.59,.025,0xd9dfe3,side);label(g,win?'150':'155 VVA',side*.139,.722,-.75,.012,0xd4dce1,side);
  for(const z of [.28,.12,-.045])fastener(g,side*.232,.72-(.28-z)*.75,z,.0045);
 }
 for(const side of [-1,1]){
  skin(g,[[[.14,.706,-.68],[.172,.65,-.43],[.135,.52,-.16]],[[.152,.522,-.65],[.183,.48,-.42],[.153,.405,-.15]],[[.102,.435,-.62],[.133,.397,-.37],[.115,.38,-.15]]],side,s.paint,24,8);
  skin(g,[[[.156,.586,-.59],[.186,.532,-.41],[.174,.47,-.29]],[[.158,.576,-.59],[.188,.516,-.41],[.175,.458,-.29]]],side,blue,18,3);
 }
 loft(g,[[.21,.642,.075,.06],[.31,.823,.105,.085],[.42,.879,.152,.079],[.53,.835,.11,.048]],s.paint,36,24);
 if(win){
  loft(g,[[.29,.852,.072,.042],[.40,.84,.183,.090],[.53,.80,.15,.055],[.63,.76,.022,.015]],s.paint,32,12);
  face(g,[[-.148,.837],[-.038,.817],[-.025,.754],[-.128,.785]],.638,lamp);face(g,[[.148,.837],[.038,.817],[.025,.754],[.128,.785]],.638,lamp);
  for(const side of [-1,1])skin(g,[[[.09,.89,.36],[.18,.845,.43],[.12,.81,.57]],[[.09,.861,.39],[.181,.826,.45],[.12,.804,.57]]],side,chrome,16,3);
  loft(g,[[headZ-.06,s.barY,.10,.025],[headZ+.035,s.barY+.018,.176,.043],[headZ+.13,s.barY-.028,.107,.021]],s.paint,28,20);
  face(g,[[-.10,1.071],[.10,1.071],[.068,1.128],[-.066,1.128]],headZ+.02,glass);
 }else{
  loft(g,[[.26,.67,.09,.048],[.36,.81,.155,.125],[.49,.83,.160,.075],[.57,.78,.05,.016]],s.paint,32,20);
  for(const side of [-1,1])face(g,[[side*.020,.836],[side*.150,.852],[side*.131,.797],[side*.051,.790]],.552,lamp);
  loft(g,[[headZ-.055,s.barY-.012,.08,.030],[headZ+.04,s.barY-.006,.174,.063],[headZ+.16,s.barY-.049,.118,.039],[headZ+.21,s.barY-.066,.050,.015]],s.paint,28,20);
  face(g,[[-.125,1.024],[-.095,1.065],[.095,1.065],[.125,1.024],[.074,.993],[-.074,.993]],headZ+.173,lamp);
 }
}
function pcxBody(g,s){
 loft(g,[[-.94,.66,.026,.011],[-.84,.69,.135,.051],[-.64,.65,.217,.105],[-.33,.59,.217,.125],[-.12,.45,.136,.09],[.10,.39,.095,.048]],s.paint,44,24);
 loft(g,[[-.91,.798,.035,.012],[-.84,.818,.147,.027],[-.60,.821,.178,.028],[-.47,.774,.178,.033],[-.24,.753,.177,.029],[-.055,.732,.048,.008]],seat,44,24);
 for(const side of [-1,1])pipe(g,[[side*.13,.791,-.87],[side*.175,.794,-.61],[side*.18,.749,-.43],[side*.167,.730,-.20],[side*.08,.723,-.063]],.002,steel,28,4);
 for(const side of [-1,1]){
  skin(g,[[[.125,.674,-.90],[.216,.651,-.63],[.214,.59,-.29],[.140,.45,-.08]],[[.12,.51,-.88],[.21,.423,-.61],[.218,.375,-.30],[.176,.326,.15]]],side,s.paint,28,10);
  skin(g,[[[.173,.32,-.61],[.196,.32,-.35],[.186,.32,.14]],[[.226,.335,-.59],[.226,.335,-.35],[.220,.335,.16]],[[.240,.31,-.59],[.240,.31,-.35],[.229,.31,.16]]],side,plastic,24,6);
  for(let i=0;i<8;i++)tube(g,[side*.197,.338,-.49+i*.063],[side*.224,.34,-.49+i*.063],.0018,rubber,4);
  label(g,'PCX',side*.225,.598,-.57,.035,0x9da7ac,side);
  pipe(g,[[side*.153,.720,-.50],[side*.165,.727,-.76],[side*.117,.720,-.91]],.009,black);
 }
 loft(g,[[.11,.47,.130,.11],[.22,.64,.20,.24],[.35,.79,.227,.26],[.46,.89,.231,.17],[.55,.92,.185,.105],[.635,.877,.062,.023]],s.paint,48,24);
 for(const side of [-1,1]){
  skin(g,[[[.04,1.077,.36],[.15,1.017,.38],[.232,.892,.36],[.208,.616,.20],[.209,.38,.12]],[[.075,1.085,.42],[.18,1.032,.47],[.249,.874,.44],[.235,.64,.28],[.229,.38,.14]],[[.12,1.025,.54],[.185,.948,.59],[.225,.819,.50],[.225,.55,.29],[.229,.38,.14]]],side,carbon,28,12);
  pipe(g,[[side*.080,.884,.63],[side*.176,.948,.58],[side*.220,.984,.47]],.006,lamp);
  face(g,[[side*.025,.883],[side*.160,.952],[side*.204,.973],[side*.169,.904],[side*.062,.861]],.627,chrome);
  face(g,[[side*.048,.883],[side*.165,.940],[side*.185,.946],[side*.154,.904],[side*.07,.878]],.634,lamp);
  skin(g,[[[.229,.814,.43],[.232,.704,.34],[.229,.553,.26]],[[.232,.802,.46],[.239,.690,.36],[.235,.54,.27]]],side,black,20,3);
 }
 loft(g,[[.25,.92,.10,.051],[.36,1.073,.18,.07],[.43,1.145,.155,.049],[.46,1.178,.13,.024]],glass,32,24);
 face(g,[[-.13,1.057],[-.10,1.19],[.10,1.19],[.13,1.057]],.405,glass);
 for(const side of [-1,1])fastener(g,side*.12,1.076,.415,.004);
}
function bigBody(g,s,headZ){
 const adv=s.id==='himalayan';
 loft(g,adv?[[-.32,.83,.074,.027],[-.21,.889,.182,.112],[.04,.897,.222,.143],[.24,.885,.19,.114],[.37,.795,.063,.043]]:[[-.28,.81,.059,.029],[-.19,.89,.164,.112],[-.045,.94,.221,.156],[.12,.957,.241,.169],[.27,.902,.177,.142],[.37,.787,.061,.031]],s.paint,48,32);
 const cap=add(g,new T.CylinderGeometry(.033,.035,.004,32),chrome,0,adv?1.042:1.125,adv?.03:.07);cap.rotation.x=.07;for(let i=0;i<5;i++){const a=i/5*TAU;ellipsoid(g,Math.sin(a)*.025,cap.position.y+.003,cap.position.z+Math.cos(a)*.025,.002,.001,.002,black);}
 seatShape(g,s,-.23,-.69,.30);seatShape(g,s,-.54,-.88,adv?.31:.235,adv?.020:.061);
 for(const side of [-1,1]){
  pipe(g,[[side*.13,.42,-.20],[side*.185,.68,-.17],[side*.135,.81,.20],[side*.071,s.barY-.08,headZ]],.019,black);
  bevel(g,[[-.74,.70],[-.27,.65],[-.22,.70],[-.55,.835],[-.77,.835]],.025,s.paint,side*.12,.005);
  if(adv){label(g,'ROYAL ENFIELD',side*.224,.941,.16,.017,0xe5e4d8,side);label(g,'HIMALAYAN',side*.139,.738,-.51,.018,0xc5c9c7,side);}
  else{
   skin(g,[[[.092,1.039,.32],[.206,1.032,.18],[.255,.937,-.04]],[[.133,.966,.35],[.263,.880,.10],[.221,.818,-.07]],[[.138,.853,.28],[.231,.756,.07],[.20,.795,-.08]]],side,s.paint,24,10);
   skin(g,[[[.265,.897,.105],[.24,.832,.23],[.141,.965,.343]],[[.270,.874,.102],[.243,.811,.236],[.144,.944,.344]]],side,black,20,4);
   bevel(g,[[.035,.829],[.26,.842],[.28,.869],[.093,.942]],.009,finish('turquoise graphic paint',0x43b1a9,.30,.28),side*.253,.001);
   bevel(g,[[.01,.824],[.032,.824],[.102,.965],[.079,.965]],.011,finish('red graphic paint',0xb54942,.28,.32),side*.260,.001);
   label(g,'MT-07',side*.27,.875,.195,.029,0x192f32,side);
   for(let i=0;i<12;i++)box(g,side*.172,.826+i*.010,-.116,.005,.006,.089,plastic);
   cylinder(g,side*.212,.979,.065,.026,.004,chrome);cylinder(g,side*.216,.979,.065,.022,.004,black);label(g,'Y',side*.221,.968,.074,.019,0xc3ccd1,side);
  }
 }
 if(adv){
  const surround=add(g,new T.CylinderGeometry(.107,.107,.096,48),black,0,1.06,.52);surround.rotation.x=Math.PI/2;const bezel=add(g,new T.TorusGeometry(.098,.006,8,48),chrome,0,1.06,.572);add(g,new T.CircleGeometry(.095,48),lamp,0,1.06,.578);
  for(let i=0;i<12;i++)tube(g,[-.072+i*.013,1.01,.581],[-.072+i*.013,1.11,.581],.001,chrome,3);
  face(g,[[-.12,1.09],[-.133,1.29],[-.095,1.37],[.095,1.37],[.133,1.29],[.12,1.09]],.425,finish('windscreen clear',0xadbcc2,.05,.17));
  const screen=g.children.at(-1);screen.material.transparent=true;screen.material.opacity=.43;screen.material.depthWrite=false;screen.rotation.x=-.10;
  for(const side of [-1,1]){
   pipe(g,[[side*.285,.37,.02],[side*.297,.70,.31],[side*.25,.987,.28],[side*.23,1.00,-.06],[side*.28,.70,-.19],[side*.285,.37,.02]],.011,black,40,8);
   pipe(g,[[side*.23,.88,-.45],[side*.23,.88,-.93],[-side*.23,.88,-.93]],.010,black);
   tube(g,[side*.17,.91,.38],[side*.13,1.11,.48],.009,black);
   ellipsoid(g,side*.20,1.031,.495,.031,.020,.027,amber);box(g,side*.16,.68,-.58,.045,.24,.032,black);
  }
  bevel(g,[[-.14,.225],[.30,.225],[.34,.30],[-.10,.34]],.30,steel,0,.005);for(const zz of [-.06,.06,.18])tube(g,[-.08,.236,zz],[.08,.236,zz],.005,black,5);
  bevel(g,[[.59,.79],[.93,.72],[.97,.701],[.64,.738]],.18,s.paint,0,.005);box(g,0,.877,-.84,.36,.017,.21,black);
 }else{
  // 2018–2020 angular headlight, not the later central projector design.
  loft(g,[[.36,.966,.068,.079],[.43,.96,.145,.151],[.49,.93,.116,.112],[.54,.90,.055,.035]],s.paint,26,20);
  face(g,[[-.095,1.043],[-.064,1.09],[.064,1.09],[.095,1.043],[.071,.965],[0,.885],[-.071,.965]],.544,chrome);
  face(g,[[-.079,1.031],[-.052,1.066],[.052,1.066],[.079,1.031],[.058,.968],[0,.91],[-.058,.968]],.552,lamp);
  for(const side of [-1,1]){pipe(g,[[side*.073,1.065,.512],[side*.099,1.025,.5],[side*.083,.984,.521]],.003,black);ellipsoid(g,side*.204,.965,.41,.023,.012,.032,amber);}
 }
}
export function buildBike(id,{rider=false,optimizeMeshes=true}={}){
 const base=bikeById(id),s={...base,...BIKE_VISUALS[base.id]},root=new T.Group(),g=new T.Group();root.name=s.name;g.name='BikeBody';root.add(g);s.paint=finish(s.id+' body paint',s.color,s.id==='himalayan'?.12:.16,s.id==='himalayan'?.48:.30);
 if(id==='winner')s.paint=winnerPaint(s.color);
 const front=s.wheelbase/2,rear=-front,fr=tyreRadius(s.front),rr=tyreRadius(s.rear),headZ=front-(id==='winner'?.285:.18);
 const rearColor=id==='winner'?0xef641d:id==='mt07'?0x36aaa3:s.wire?0xbdc3c7:id==='exciter'?0x492574:0x1c232b,frontColor=id==='winner'?0x087edb:rearColor;
 const backWheel=wheel(s.rear,rearColor,{wire:s.wire,knobby:id==='himalayan',rotor:s.rearDisc,spokes:id==='winner'?6:5,spokeWidth:id==='winner'?.5:1,paintCalm:id==='winner'});backWheel.name='WheelRear';backWheel.position.set(0,rr,rear);g.add(backWheel);
 const frontWheel=wheel(s.front,frontColor,{wire:s.wire,knobby:id==='himalayan',rotor:s.frontDisc,dual:id==='mt07',spokes:id==='winner'?8:5,spokeWidth:id==='winner'?.38:1,paintCalm:id==='winner'});frontWheel.name='WheelFront';frontWheel.position.set(0,fr,front);g.add(frontWheel);
 chassis(g,s,front,rear,fr,rr,headZ);if(id==='winner')winnerMechanical(g,s,front,fr,label);else{engine(g,s);exhaust(g,s);}
 if(id==='cub')cubBody(g,s,headZ);else if(id==='winner')winnerBody(g,s,headZ,label);else if(id==='pcx')pcxBody(g,s);else if(['mt07','himalayan'].includes(id))bigBody(g,s,headZ);else sportsBody(g,s,headZ);
 if(id==='winner')winnerControls(g,s,headZ);else controls(g,s,headZ);
 const tailZ=id==='himalayan'?-.91:-.94,tailY=id==='winner'?.932:s.seatY;face(g,[[-.060,tailY-.080],[.060,tailY-.080],[.055,tailY-.046],[-.055,tailY-.046]],tailZ,red);
 bevel(g,[[tailZ,tailY-.12],[tailZ-.03,tailY-.18],[tailZ-.045,.46],[tailZ-.025,.46]],.065,plastic,0,.001);
 const plate=face(g,[[-.058,.477],[.058,.477],[.058,.555],[-.058,.555]],tailZ-.040,finish('blank number plate',0xbcc6c5,.06,.52));plate.rotation.y=Math.PI;plate.position.z=tailZ-.04;
 for(const side of [-1,1]){tube(g,[side*.04,tailY-.135,tailZ],[side*.12,tailY-.135,tailZ],.006,black,8);ellipsoid(g,side*.13,tailY-.135,tailZ,.024,.012,.021,amber);}
 if(rider)g.add(riderModel(id==='winner'?{...s,...BIKE_RIGS.winner}:s));root.userData={wheels:[backWheel,frontWheel],body:g,bike:id,wheelRadii:[rr,fr],visualGeneration:s.generation};
 if(optimizeMeshes){optimize(backWheel);optimize(frontWheel);optimize(g);}return root;
}

// Parts rebuilt for the photographed generation of licensed base meshes.
export function referenceDetails(id){
 const s={...bikeById(id),...BIKE_VISUALS[id]},g=new T.Group();s.paint=finish(id+' reference paint',s.color,.16,.32);
 if(id==='cub'){
  const z=s.wheelbase/2-.18;controls(g,s,z);seatShape(g,s,-.18,-.80,.28);
  loft(g,[[z-.09,1.00,.07,.037],[z+.01,.99,.155,.068],[z+.125,.978,.128,.055],[z+.17,.978,.096,.043]],s.paint,26,20);
  face(g,[[-.097,.938],[.097,.938],[.097,1.022],[-.097,1.022]],z+.174,chrome,.008);
  face(g,[[-.083,.947],[.083,.947],[.083,1.013],[-.083,1.013]],z+.184,lamp);
  for(let i=0;i<9;i++)tube(g,[-.079+i*.019,.950,z+.190],[-.079+i*.019,1.010,z+.190],.0008,chrome,3);
  for(const side of [-1,1])ellipsoid(g,side*.176,.979,z+.105,.027,.033,.024,amber);
 }else if(id==='mt07'){
  loft(g,[[-.26,.82,.058,.026],[-.15,.88,.16,.08],[.05,.888,.235,.108],[.22,.87,.231,.116],[.38,.813,.08,.04]],s.paint,48,32);
  const cap=add(g,new T.CylinderGeometry(.034,.034,.006,32),chrome,0,.999,.08);
  for(let i=0;i<6;i++){const a=i/6*TAU;ellipsoid(g,Math.sin(a)*.026,1.003,.08+Math.cos(a)*.026,.002,.001,.002,black);}
  loft(g,[[.40,.967,.065,.079],[.48,.954,.128,.139],[.55,.918,.105,.104],[.59,.892,.050,.03]],s.paint,28,24);
  face(g,[[-.091,1.032],[-.061,1.078],[.061,1.078],[.091,1.032],[.068,.955],[0,.884],[-.068,.955]],.592,chrome);
  face(g,[[-.076,1.021],[-.050,1.054],[.050,1.054],[.076,1.021],[.055,.961],[0,.909],[-.055,.961]],.600,lamp);
  for(const side of [-1,1]){
   pipe(g,[[side*.265,1.045,.40],[side*.30,1.19,.44],[side*.36,1.23,.46]],.006,black);
   const m=ellipsoid(g,side*.36,1.23,.46,.065,.035,.013,black);m.rotation.z=side*.2;
   ellipsoid(g,side*.36,1.23,.447,.058,.030,.002,chrome);
   bevel(g,[[.07,.84],[.25,.83],[.27,.87],[.11,.95]],.006,finish('MT photo turquoise trim',0x36aaa3,.3,.32),side*.239,.0005);
   bevel(g,[[.044,.844],[.064,.840],[.113,.952],[.093,.957]],.006,finish('MT photo red trim',0xb34542,.25,.38),side*.240,.0005);
   label(g,'MT-07',side*.246,.869,.19,.022,0x1a262b,side);
  }
 }
 return g;
}
