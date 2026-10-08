import * as T from 'three';
import { mergeGeometries,mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
const materials=new Map();
function mat(color,metalness=0,roughness=.6){const key=`${color}/${metalness}/${roughness}`;if(!materials.has(key))materials.set(key,new T.MeshPhysicalMaterial({color,metalness,roughness,clearcoat:metalness>.3?.5:0,clearcoatRoughness:.22}));return materials.get(key);}
const rubber=mat(0x161b1d,0,.92),chrome=mat(0xb4bfc4,.85,.23),steel=mat(0x566069,.75,.38),black=mat(0x22262a,.25,.55),seat=mat(0x17191b,0,.82),amber=mat(0xffa830,.12,.25);
function add(g,geo,m,x=0,y=0,z=0){const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
function box(g,x,y,z,w,h,d,m){return add(g,new T.BoxGeometry(w,h,d),m,x,y,z);}
function ellipsoid(g,x,y,z,sx,sy,sz,m){const mesh=add(g,new T.SphereGeometry(1,24,16),m,x,y,z);mesh.scale.set(sx,sy,sz);return mesh;}
function tube(g,a,b,r,m,segments=10){const v1=new T.Vector3(...a),v2=new T.Vector3(...b),v=v2.clone().sub(v1),o=add(g,new T.CylinderGeometry(r,r,v.length(),segments),m);o.position.copy(v1.add(v2).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return o;}
function profile(g,points,width,m){const s=new T.Shape();s.moveTo(points[0][0],points[0][1]);for(const p of points.slice(1))s.lineTo(p[0],p[1]);s.closePath();const geo=new T.ExtrudeGeometry(s,{depth:width,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.025,bevelThickness:.025,curveSegments:16});geo.rotateY(-Math.PI/2);geo.translate(width/2,0,0);return add(g,geo,m);}
// Curved sheet metal, rather than a tube over the wheel.
function fender(g,z,r,m){
 const positions=[],indices=[],steps=40;
 for(let i=0;i<=steps;i++){const a=-1.16+i/steps*2.32;for(let j=0;j<=8;j++){const u=j/8*2-1;positions.push(u*.105,r+Math.cos(a)*(r+.072)+.018*(1-u*u),z+Math.sin(a)*(r+.072));if(i<steps&&j<8){const k=i*9+j;indices.push(k,k+9,k+1,k+1,k+9,k+10);}}}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();const o=add(g,geo,m);o.material.side=T.DoubleSide;return o;
}
// Cross sections produce a continuous curved body shell with a real volume.
function shell(g,sections,m){
 const curves=[0,1,2,3].map(k=>new T.CatmullRomCurve3(sections.map(s=>new T.Vector3(s[0],s[k+1],0))));
 const positions=[],uv=[],indices=[],N=48,M=24;
 for(let i=0;i<=N;i++){const q=curves.map(c=>c.getPoint(i/N)),z=q[0].x,cy=q[0].y,ry=q[1].y,rx=q[2].y,shape=q[3].y;
  for(let j=0;j<=M;j++){const a=j/M*Math.PI*2,x=Math.sin(a)*rx,y=cy+Math.cos(a)*ry;positions.push(x,y+shape*Math.sin(a)**2,z);uv.push(j/M,i/N);if(i<N&&j<M){const k=i*(M+1)+j;indices.push(k,k+M+1,k+1,k+1,k+M+1,k+M+2);}}
 }const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();return add(g,geo,m);
}
function curvedTube(g,points,r,m){return add(g,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),24,r,8,false),m);}
function bolt(g,x,y,z){const o=add(g,new T.CylinderGeometry(.011,.011,.009,6),chrome,x,y,z);o.rotation.z=Math.PI/2;}
function visor(g,center,rx,ry,rz,m){
 const geo=new T.SphereGeometry(1,40,16,Math.PI/2-.98,1.96,.95,1.1);const o=add(g,geo,m,...center);o.scale.set(rx,ry,rz);return o;
}
function limb(g,a,b,ra,rb,m){const A=new T.Vector3(...a),B=new T.Vector3(...b),v=B.clone().sub(A);const o=add(g,new T.CylinderGeometry(rb,ra,v.length(),16,1),m);o.position.copy(A.add(B).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());ellipsoid(g,...a,ra,ra,ra,m);ellipsoid(g,...b,rb,rb,rb,m);}
function riderModel(b){
 const g=new T.Group();g.name='Rider';g.userData.dynamic=true;
 const suit=mat(0x384644,0,.86),panels=mat(0x889385,0,.79),trim=mat(0xc6652e,0,.65),armor=mat(0x14181b,.1,.55),helmet=mat(0xdfded7,.2,.24),glass=mat(0x10222a,.65,.12);
 const seatY=b.seatY;
 // Fitted riding jacket, broad shoulders, tapered waist and a curved back.
 const pos=[],indices=[],rings=[[.12,.145,.10],[.23,.16,.112],[.35,.19,.12],[.47,.225,.13],[.54,.21,.115],[.59,.085,.07]],segments=24;
 for(let i=0;i<rings.length;i++){const [y,rx,rz]=rings[i];for(let j=0;j<=segments;j++){const a=j/segments*6.283185;pos.push(Math.sin(a)*rx,seatY+y,-.34+y*.24+Math.cos(a)*rz);if(i<rings.length-1&&j<segments){const k=i*(segments+1)+j;indices.push(k,k+1,k+segments+1,k+1,k+segments+2,k+segments+1);}}}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setIndex(indices);geo.computeVertexNormals();add(g,geo,suit);
 ellipsoid(g,0,seatY+.09,-.35,.16,.08,.12,suit);
 const back=ellipsoid(g,0,seatY+.35,-.41,.125,.17,.018,panels);back.rotation.x=.2;
 for(const side of [-1,1])curvedTube(g,[[side*.12,seatY+.52,-.33],[side*.10,seatY+.34,-.44],[side*.07,seatY+.18,-.39]],.009,trim);
 for(const side of [-1,1]){
  const shoulder=[side*.21,seatY+.51,-.19],elbow=[side*.29,seatY+.29,.05],wrist=[side*.30,(b.class==='adventure'?1.12:b.class==='naked'?1.04:b.id==='cub'?1:1.01)+.048,b.wheelbase/2-.20];
  limb(g,shoulder,elbow,.092,.068,suit);limb(g,elbow,wrist,.066,.047,panels);
  ellipsoid(g,...shoulder,.095,.078,.095,panels);ellipsoid(g,...elbow,.069,.065,.072,armor);
  curvedTube(g,[[side*.16,seatY+.55,-.25],[side*.25,seatY+.48,-.14],[side*.28,seatY+.33,-.01]],.013,trim);
  ellipsoid(g,...wrist,.052,.043,.066,armor);for(let finger=0;finger<4;finger++)ellipsoid(g,wrist[0]+(finger-1.5)*.015,wrist[1]+.028,wrist[2]+.035,.007,.009,.022,panels);
  const hip=[side*.135,seatY+.06,-.35],knee=[side*.22,.62,.14],ankle=[side*.23,.39,-.06];
  limb(g,hip,knee,.105,.078,suit);limb(g,knee,ankle,.075,.058,panels);
  ellipsoid(g,side*.235,.63,.17,.082,.10,.035,armor);
  ellipsoid(g,side*.23,.39,-.035,.065,.095,.09,armor);ellipsoid(g,side*.23,.355,.04,.066,.045,.135,armor);
  box(g,side*.23,.32,.03,.125,.018,.23,rubber);
  for(let i=0;i<3;i++)box(g,side*.23,.43+i*.028,-.01,.13,.01,.11,trim);
 }
 limb(g,[0,seatY+.54,-.15],[0,seatY+.63,-.13],.07,.064,armor);
 const headY=seatY+.77;
 ellipsoid(g,0,headY,-.105,.17,.195,.18,helmet);
 visor(g,[0,headY,-.105],.174,.198,.184,glass);
 // Jaw protector and a separate chin vent give the helmet a full-face silhouette.
 ellipsoid(g,0,headY-.095,.012,.14,.061,.105,helmet);
 box(g,0,headY-.092,.105,.095,.033,.011,armor);
 for(const x of [-.13,.13])ellipsoid(g,x,headY-.015,-.065,.013,.027,.027,steel);
 curvedTube(g,[[0,headY-.12,-.25],[0,headY+.14,-.24],[0,headY+.196,-.10],[0,headY+.16,.02]],.019,trim);
 box(g,0,seatY+.39,-.085,.008,.22,.013,black);
 optimize(g);return g;
}
function optimize(group){
  const buckets=new Map(),dynamic=[];
  group.updateMatrixWorld(true);
  const inverse=new T.Matrix4().copy(group.matrixWorld).invert();
  group.traverse(o=>{
    if(!o.isMesh)return;let p=o.parent;while(p&&p!==group){if(p.userData.dynamic)return;p=p.parent;}
    const key=o.material.uuid;if(!buckets.has(key))buckets.set(key,{mat:o.material,geos:[]});
    const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();
    if(!geo.attributes.uv)geo.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(geo.attributes.position.count*2),2));
    buckets.get(key).geos.push(geo.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,o.matrixWorld)));
  });
  for(const c of group.children)if(c.userData.dynamic)dynamic.push(c);
  group.clear();for(const c of dynamic)group.add(c);
  for(const b of buckets.values()){const combined=mergeGeometries(b.geos,false),merged=combined?mergeVertices(combined):null;if(merged)add(group,merged,b.mat);for(const geo of b.geos)geo.dispose();}
}

export { mat,add,box,ellipsoid,tube,profile,shell,curvedTube,bolt,fender,limb,riderModel,optimize };
