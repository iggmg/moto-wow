import * as T from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {add,box,tube,ellipsoid} from './model-geometry.js';
import {finish,loft,skin,pipe,bevel} from './bike-surfaces.js';

// Original mesh. Contours are reconstructed from the private photo and the
// 2021 Honda RS-X parts/owner manuals, not a manufacturer CAD asset.
export function winnerPaint(color){const m=finish('Winner black body paint',color,.02,.50);m.clearcoat=.08;m.clearcoatRoughness=.45;m.envMapIntensity=.15;return m;}
const black=finish('Winner inner polymer',0x0b1016,.03,.63),trim=finish('Winner panel joints',0x080b0e,0,.8),alloy=finish('Winner cast alloy',0x293039,.28,.57),chrome=finish('Winner polished metal',0x79878f,.68,.40),glass=finish('Winner reflector glass',0x748c98,.63,.21),rubber=finish('Winner rubber',0x101318,0,.87),blue=winnerPaint(0x006bc0),orange=winnerPaint(0xf06014);
glass.envMapIntensity=.7;
const led=finish('Winner white LED',0xd5e6ec,.25,.23);led.emissive.setHex(0x779ba8);led.emissiveIntensity=.1;
// Thin independent panels preserve the actual cutouts and creases. A small
// surface crown avoids both flat cardboard and the old inflated apron.
function panel(g,points,side,mat,crown=.002){
 const shape=points.map(p=>new T.Vector2(p[2],p[1])),tris=T.ShapeUtils.triangulateShape(shape,[]),positions=[],uv=[],N=7;
 const append=(p)=>{positions.push(side*p[0],p[1],p[2]);uv.push(p[2],p[1]);};
 for(const [a,b,c]of tris){const A=new T.Vector3(...points[a]),B=new T.Vector3(...points[b]),C=new T.Vector3(...points[c]);
  const at=(i,j)=>{const u=i/N,v=j/N,w=1-u-v,p=A.clone().multiplyScalar(w).addScaledVector(B,u).addScaledVector(C,v);p.x+=crown*27*u*v*w;return p.toArray();};
  for(let i=0;i<N;i++)for(let j=0;j<N-i;j++){const p=at(i,j),q=at(i+1,j),r=at(i,j+1);append(p);append(side>0?r:q);append(side>0?q:r);if(j<N-i-1){append(q);append(side>0?r:at(i+1,j+1));append(side>0?at(i+1,j+1):r);}}
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));const smooth=mergeVertices(geo,1e-5);smooth.computeVertexNormals();geo.dispose();mat.side=T.DoubleSide;return add(g,smooth,mat);
}
function line(g,p,side,mat=trim,r=.0015){return pipe(g,p.map(([x,y,z])=>[side*x,y,z]),r,mat,28,5);}
function cap(g,x,y,z,r,mat=alloy,depth=.018){const o=add(g,new T.CylinderGeometry(r,r,depth,40),mat,x,y,z);o.rotation.z=Math.PI/2;return o;}
function bolt(g,x,y,z,r=.004){cap(g,x,y,z,r,chrome,.005);cap(g,x+Math.sign(x)*.003,y,z,r*.43,trim,.002);}

export function winnerBody(g,s,headZ,label){
 const paint=winnerPaint(s.color),saddle=finish('Winner textured saddle',0x15191d,0,.84,'seat');
 // Low waist, stepped saddle and raised, tapering tail.
 loft(g,[[-.96,.861,.012,.018],[-.83,.836,.096,.016,.040],[-.65,.809,.135,.014,.068],[-.43,.766,.126,.014,.067],[-.19,.757,.092,.014,.111],[-.045,.725,.065,.026,.072],[.025,.651,.055,.027],[.15,.711,.055,.070],[.30,.861,.060,.040]],black,52,24);
 loft(g,[[-.901,.884,.019,.011],[-.825,.865,.113,.030,.020],[-.650,.844,.140,.036,.025],[-.510,.810,.142,.031,.025],[-.300,.796,.126,.033,.030],[-.120,.797,.099,.034,.051],[-.043,.767,.061,.029,.053]],saddle,56,32);
 for(const side of [-1,1]){
  skin(g,[[[0,.969,.301],[0,.834,.176],[0,.672,-.090],[0,.677,-.213]],[[.072,.972,.300],[.069,.830,.172],[.064,.670,-.090],[.089,.667,-.213]],[[.159,.944,.304],[.161,.804,.142],[.099,.649,-.071],[.089,.638,-.216]]],side,black,36,12);
  // Rear flank with a visible inset instead of a horizontal slab.
  panel(g,[[.057,.900,-.963],[.119,.857,-.842],[.151,.789,-.603],[.139,.718,-.368],[.105,.645,-.172],[.110,.593,-.270],[.143,.638,-.507],[.134,.734,-.775]],side,paint,.003);
  panel(g,[[.120,.841,-.838],[.153,.774,-.607],[.142,.704,-.378],[.117,.655,-.232],[.149,.695,-.493],[.141,.757,-.730]],side,blue,.001);
  panel(g,[[.120,.850,-.854],[.153,.786,-.621],[.144,.716,-.383],[.143,.704,-.385],[.151,.774,-.623],[.119,.838,-.854]],side,orange,0);
  panel(g,[[.147,.700,-.489],[.117,.650,-.235],[.110,.631,-.234],[.146,.683,-.490]],side,orange,0);
  panel(g,[[.105,.663,-.259],[.143,.641,-.405],[.143,.512,-.304],[.120,.432,-.151],[.108,.510,-.116]],side,black,.003);
  line(g,[[.059,.901,-.959],[.120,.857,-.839],[.152,.789,-.601],[.140,.718,-.366],[.106,.646,-.170]],side);
  line(g,[[.114,.883,-.835],[.155,.913,-.935],[.070,.938,-.965]],side,black,.009);
  // Upper side panel has a narrow trailing point by the waist.
  panel(g,[[.207,.858,.482],[.215,.834,.317],[.180,.750,.110],[.099,.649,-.071],[.089,.638,-.216],[.140,.577,-.037],[.210,.615,.256],[.227,.704,.436]],side,paint,.003);
  panel(g,[[.216,.826,.324],[.181,.751,.119],[.101,.650,-.071],[.090,.639,-.210],[.139,.583,-.026],[.205,.623,.242]],side,blue,.001);
  panel(g,[[.214,.840,.346],[.185,.776,.147],[.102,.669,-.060],[.105,.657,-.055],[.187,.764,.151],[.215,.828,.348]],side,orange,0);
  panel(g,[[.206,.678,.255],[.172,.662,.123],[.164,.643,.035],[.206,.648,.254]],side,orange,0);
  line(g,[[.211,.826,.322],[.179,.752,.111],[.098,.647,-.072],[.090,.637,-.216]],side);
  // Separate hooked lower shroud exposes the engine cylinder and clutch.
  panel(g,[[.227,.702,.436],[.210,.615,.256],[.201,.578,.344],[.188,.483,.251],[.165,.397,.207],[.163,.320,.227],[.147,.167,.322],[.167,.196,.173],[.170,.265,.063],[.161,.321,.078],[.146,.357,.119],[.141,.396,.069],[.152,.442,.065],[.180,.522,.172],[.206,.610,.258]],side,paint,.003);
  panel(g,[[.164,.322,.225],[.148,.174,.317],[.152,.186,.305],[.171,.318,.218]],side,orange,0);
  panel(g,[[.197,.526,.295],[.178,.459,.222],[.163,.399,.207],[.153,.374,.126],[.164,.415,.124],[.189,.493,.253]],side,blue,0);
  line(g,[[.202,.578,.344],[.189,.483,.251],[.166,.397,.207],[.164,.320,.227],[.148,.170,.319]],side);
  // The upper mask is a separate, broad wedge sitting above the lamps.
  skin(g,[[[0,.978,.310],[0,.922,.431],[0,.842,.630]],[[.096,.969,.307],[.139,.914,.455],[.034,.832,.652]]],side,paint,32,12);
  skin(g,[[[.096,.969,.307],[.139,.914,.455],[.034,.832,.652]],[[.160,.943,.305],[.220,.863,.435],[.183,.817,.545]]],side,paint,32,10);
  panel(g,[[.161,.944,.305],[.221,.864,.435],[.213,.811,.474],[.196,.807,.325],[.173,.852,.260]],side,paint,.003);
  // Side sweep / orange chevron on the top nose.
  skin(g,[[[.028,.976,.318],[.036,.922,.438],[.014,.847,.620]],[[.049,.974,.320],[.065,.921,.439],[.029,.847,.615]]],side,orange,30,3);
  skin(g,[[[.126,.946,.345],[.169,.905,.410],[.198,.865,.449]],[[.141,.943,.345],[.184,.902,.412],[.206,.859,.452]]],side,blue,25,3);
  // Two angular eye-shaped LED units: side corner rises toward the mask.
  const lamp=[ [.025,.821,.646],[.110,.879,.567],[.202,.859,.479],[.191,.804,.514],[.164,.780,.560],[.060,.773,.637] ];
  panel(g,lamp,side,trim,.001);
  const center=lamp.reduce((p,q)=>p.map((v,i)=>v+q[i]/lamp.length),[0,0,0]);const lens=lamp.map(p=>p.map((v,i)=>center[i]+(v-center[i])*.87+(i===2?.004:0)));panel(g,lens,side,glass,.002);
  for(let k=0;k<2;k++){
   const x=.082+k*.063,y=.810+k*.018,z=.628-k*.074;
   panel(g,[[x-.023,y+.016,z],[x+.018,y+.026,z-.041],[x+.029,y-.002,z-.041],[x-.015,y-.015,z+.004]],side,chrome,.001);
   panel(g,[[x-.016,y+.005,z+.003],[x+.016,y+.014,z-.034],[x+.019,y-.002,z-.034],[x-.010,y-.006,z+.006]],side,led,0);
  }
  line(g,[[.040,.826,.647],[.102,.873,.587],[.193,.854,.492]],side,led,.0022);
  // Pointed chin and dark central intake below the two eyes.
  skin(g,[[[0,.821,.658],[0,.754,.662],[0,.726,.590]],[[.036,.805,.649],[.065,.760,.645],[.111,.742,.577]],[[.063,.781,.637],[.164,.767,.562],[.191,.804,.514]]],side,paint,32,10);
  panel(g,[[.019,.808,.660],[.052,.779,.649],[.052,.756,.632],[.011,.776,.657]],side,trim,0);
  skin(g,[[[.227,.704,.436],[.210,.615,.256],[.140,.577,-.037]],[[.211,.687,.425],[.192,.601,.252],[.124,.570,-.035]]],side,black,28,5);
  skin(g,[[[.160,.943,.305],[.173,.852,.260],[.196,.807,.325]],[[.075,.958,.285],[.069,.834,.176],[.089,.735,.123]]],side,black,28,8);
  // Small stalk-mounted front turn signal (photo generation).
  tube(g,[side*.210,.713,.346],[side*.256,.713,.346],.009,black,12);
  ellipsoid(g,side*.266,.713,.346,.027,.015,.031,black);ellipsoid(g,side*.266,.718,.359,.022,.007,.023,glass);
  label(g,'WINNER X',side*.183,.895,.355,.017,0xc7d3dc,side);
  label(g,'150',side*.149,.781,-.703,.010,0xb0c4d2,side);
  bolt(g,side*.224,.712,.390);bolt(g,side*.168,.270,.142);
 }
 // Enlarged angular handlebar cowl, with the small central raised wind lip.
 for(const side of [-1,1]){
  skin(g,[[[0,1.116,headZ-.081],[0,1.143,headZ+.018],[0,1.080,headZ+.167]],[[.093,1.111,headZ-.084],[.116,1.111,headZ+.051],[.094,1.061,headZ+.180]],[[.157,1.073,headZ-.102],[.188,1.056,headZ+.031],[.157,1.035,headZ+.124]]],side,paint,28,14);
  skin(g,[[[.010,1.130,headZ+.020],[.058,1.122,headZ+.059],[.089,1.079,headZ+.139]],[[.013,1.121,headZ+.029],[.060,1.110,headZ+.063],[.087,1.070,headZ+.143]]],side,black,22,4);
 }
 loft(g,[[headZ-.121,1.049,.129,.040],[headZ+.019,1.042,.178,.029],[headZ+.140,1.032,.116,.016]],black,28,24);
 panel(g,[[.069,1.103,headZ-.089],[.066,1.121,headZ-.035],[.010,1.128,headZ-.030],[.009,1.106,headZ-.093]],1,glass,0);
 panel(g,[[.069,1.103,headZ-.089],[.066,1.121,headZ-.035],[.010,1.128,headZ-.030],[.009,1.106,headZ-.093]],-1,glass,0);
 loft(g,[[headZ-.10,.985,.072,.042],[headZ-.02,.990,.080,.045],[headZ+.04,.983,.063,.037]],black,22,20);tube(g,[0,.896,headZ],[0,1.052,headZ],.035,black,20);
}

export function winnerControls(g,s,headZ){
 const w=s.barWidth/2,h=s.barY;
 tube(g,[-w,h+.035,headZ-.050],[w,h+.035,headZ-.050],.012,black,16);
 for(const side of [-1,1]){
  tube(g,[side*(w-.10),h+.04,headZ-.05],[side*w,h+.04,headZ-.05],.020,rubber,24);
  for(let i=0;i<10;i++){const o=add(g,new T.TorusGeometry(.020,.0011,4,20),black,side*(w-.093+i*.009),h+.04,headZ-.05);o.rotation.y=Math.PI/2;}
  box(g,side*(w-.106),h+.04,headZ-.052,.037,.040,.039,black);
  pipe(g,[[side*(w-.127),h+.064,headZ+.003],[side*(w-.055),h+.055,headZ+.025],[side*(w+.006),h+.052,headZ+.010]],.005,chrome,20,8);
  const x=side*(w+.017),y=h+.242,z=headZ+.013;
  pipe(g,[[side*(w-.095),h+.079,headZ-.015],[side*(w-.058),h+.204,headZ+.010],[x,y,z]],.0055,black,20,8);
  for(const [mat,scale,depth,dz]of [[black,1,.014,0],[glass,.84,.002,-.003]]){
   const shape=new T.Shape(),pts=[[-.063,-.012],[-.041,-.030],[.041,-.025],[.065,.009],[.025,.039],[-.051,.025]].map(([a,b])=>[a*scale,b*scale]);shape.moveTo(...pts[0]);for(const p of pts.slice(1))shape.lineTo(...p);shape.closePath();
   const geo=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.004*scale,bevelThickness:.002,bevelSegments:3,steps:1}),o=add(g,geo,mat,x,y,z+dz);o.rotation.y=side*.52;o.rotation.z=side*.12;
  }
  pipe(g,[[side*(w-.11),h+.015,headZ-.02],[side*.100,.87,headZ-.03],[side*.09,.62,.24]],.003,rubber,22,5);
 }
 add(g,new T.CylinderGeometry(.013,.013,.024,16),chrome,w-.104,h+.089,headZ-.05);add(g,new T.CylinderGeometry(.014,.014,.006,16),black,w-.104,h+.104,headZ-.05);
}

export function winnerFootrest(g,side){
 const shape=new T.Shape(),p=[[-.415,.530],[-.398,.552],[-.333,.524],[-.262,.438],[-.140,.381],[-.149,.352],[-.290,.393],[-.357,.481]];
 shape.moveTo(...p[0]);for(const q of p.slice(1))shape.lineTo(...q);shape.closePath();
 for(const [z,y,r]of [[-.379,.514,.014],[-.311,.445,.012],[-.204,.391,.009]]){const h=new T.Path();h.absarc(z,y,r,0,Math.PI*2,true);shape.holes.push(h);}
 const geo=new T.ExtrudeGeometry(shape,{depth:.012,bevelEnabled:true,bevelSize:.002,bevelThickness:.001,bevelSegments:3,curveSegments:16,steps:1});geo.rotateY(-Math.PI/2);geo.translate(side*.144+.006,0,0);add(g,geo,chrome);
 tube(g,[side*.148,.514,-.39],[side*.225,.514,-.39],.013,black,12);
}
export function winnerMechanical(g,s,front,fr,label){
 // Cast crankcase with two unequal round covers, ribs and machined fasteners.
 loft(g,[[-.232,.391,.073,.077],[-.150,.402,.111,.105],[.012,.399,.112,.117],[.116,.443,.080,.091]],alloy,32,28);
 for(const side of [-1,1]){
  const x=side*.115;cap(g,x,.390,-.035,.098,alloy,.025);cap(g,x+side*.017,.390,-.035,.082,black,.012);
  cap(g,x+side*.025,.390,-.035,.075,alloy,.009);
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2;tube(g,[x+side*.031,.390+Math.sin(a)*.034,-.035+Math.cos(a)*.034],[x+side*.031,.390+Math.sin(a)*.068,-.035+Math.cos(a)*.068],.0018,alloy,5);}
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2;bolt(g,x+side*.029,.390+Math.sin(a)*.087,-.035+Math.cos(a)*.087,.0035);}
  cap(g,side*.119,.401,-.178,.055,alloy,.020);label(g,'HONDA',side*.146,.380,side>0?.006:-.065,.011,0x69767d,side);
  for(let i=0;i<4;i++)tube(g,[side*.111,.334+i*.017,-.204],[side*.118,.340+i*.017,-.124],.0028,alloy,5);
 }
 bevel(g,[[.024,.446],[.169,.437],[.271,.600],[.181,.652],[.105,.557]],.147,alloy,0,.008);
 for(let i=0;i<5;i++)bevel(g,[[.065+i*.018,.478+i*.018],[.135+i*.018,.468+i*.018],[.150+i*.018,.484+i*.018],[.079+i*.018,.497+i*.018]],.151,black,0,.001);
 loft(g,[[.180,.606,.071,.030],[.240,.638,.073,.036],[.273,.612,.055,.028]],black,22,20);
 box(g,0,.593,.322,.158,.211,.032,black);
 for(let i=0;i<20;i++)tube(g,[-.073,.500+i*.009,.343],[.073,.500+i*.009,.343],.0013,alloy,4);
 pipe(g,[[.080,.526,.250],[.145,.456,.261],[.112,.352,.227]],.010,rubber,22,8);
 pipe(g,[[0,.565,.250],[0,.393,.288],[-.018,.212,.159],[-.184,.214,-.209],[-.212,.285,-.400]],.018,finish('Winner exhaust header',0x827960,.74,.41),36,12);
 const a=[-.222,.299,-.411],b=[-.258,.516,-.845],r=.049,can=tube(g,a,b,r,finish('Winner carbon silencer',0x13181e,.12,.48,'carbon'),32),direction=new T.Vector3(...b).sub(new T.Vector3(...a)).normalize();
 for(const u of [.04,.79]){const p=new T.Vector3(...a).lerp(new T.Vector3(...b),u),o=add(g,new T.TorusGeometry(r+.001,.004,8,36),chrome,...p.toArray());o.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),direction);}
 const tip=add(g,new T.CircleGeometry(.032,32),trim,...new T.Vector3(...b).addScaledVector(direction,.002).toArray());tip.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),direction);
 // Moulded front fender with lateral shoulders and fork skirts.
 for(const side of [-1,1]){
  skin(g,[[[0,fr+.139,front-.308],[0,fr+.303,front-.090],[0,fr+.320,front+.110],[0,fr+.281,front+.247]],[[.076,fr+.105,front-.285],[.080,fr+.278,front-.088],[.082,fr+.292,front+.111],[.066,fr+.260,front+.241]],[[.080,fr+.086,front-.279],[.093,fr+.245,front-.088],[.092,fr+.261,front+.113],[.067,fr+.250,front+.239]]],side,winnerPaint(s.color),36,10);
  panel(g,[[.093,fr+.250,front-.081],[.084,fr+.145,front-.111],[.078,fr+.055,front-.078],[.076,fr+.054,front-.040],[.090,fr+.221,front+.019]],side,winnerPaint(s.color),.001);
 }
}
