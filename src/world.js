import {friendlyTo} from '../shared/arcade.js';
import * as T from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { mergeGeometries,mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { orcPosition } from '../shared/game.js';
import * as courses from '../shared/tracks.js';
import { buildOrc } from './models.js';
import { buildLandscape } from './landscape.js';
import { loadOrcs,animateOrc } from './enemies.js';
const mat=(color,roughness=.85,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
const loader=new T.TextureLoader(),textureCache=new Map();
function texture(name,kind,repeat=1){const key=`${name}/${kind}/${repeat}`;if(textureCache.has(key))return textureCache.get(key);const t=loader.load(`${import.meta.env.BASE_URL}textures/${name}-${kind}.jpg`);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(repeat,repeat);t.anisotropy=8;if(kind==='color')t.colorSpace=T.SRGBColorSpace;textureCache.set(key,t);return t;}
function surface(name,color=0xffffff,repeat=1){return new T.MeshStandardMaterial({color,map:texture(name,'color',repeat),normalMap:texture(name,'normal',repeat),normalScale:new T.Vector2(.75,.75),roughnessMap:texture(name,'roughness',repeat),roughness:1});}
export function setupLighting(scene,renderer){
 scene.fog=new T.FogExp2(0x94a7a0,.0052);
 const sky=new Sky();sky.scale.setScalar(2000);const u=sky.material.uniforms;u.turbidity.value=7;u.rayleigh.value=2;u.mieCoefficient.value=.008;u.mieDirectionalG.value=.82;
 const sunPosition=new T.Vector3(-.48,.42,-.7).normalize();u.sunPosition.value.copy(sunPosition);scene.add(sky);
 // A diffuse outdoor reflection dome avoids baking the sky's bright sun into every surface.
 const envScene=new T.Scene(),dome=new T.SphereGeometry(100,32,24),domeColors=[];
 for(let i=0;i<dome.attributes.position.count;i++){const y=dome.attributes.position.getY(i)/100,t=Math.max(0,y),c=new T.Color(y>0?0xb6cad0:0x52634b);if(y>0)c.lerp(new T.Color(0x829cbe),t);domeColors.push(c.r,c.g,c.b);}
 dome.setAttribute('color',new T.Float32BufferAttribute(domeColors,3));envScene.add(new T.Mesh(dome,new T.MeshBasicMaterial({vertexColors:true,side:T.BackSide})));const pm=new T.PMREMGenerator(renderer);scene.environment=pm.fromScene(envScene,.04,.1,200).texture;pm.dispose();scene.environmentIntensity=1.15;
 scene.add(new T.HemisphereLight(0xbbd2df,0x2d3826,1.1));
 const sun=new T.DirectionalLight(0xffd3a0,2.6);sun.position.copy(sunPosition).multiplyScalar(130);sun.castShadow=true;
 sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-48,right:48,top:48,bottom:-48,far:260});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.035;sun.shadow.bias=-.00015;scene.add(sun,sun.target);return sun;
}
function seeded(seed){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function mesh(parent,geo,m,x=0,y=0,z=0){const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function branchGeometry(points,r){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),geo=new T.TubeGeometry(curve,12,r,7,false),pos=geo.attributes.position;for(let i=0;i<pos.count;i++){const t=Math.floor(i/8)/12,c=curve.getPointAt(t),v=new T.Vector3().fromBufferAttribute(pos,i).sub(c).multiplyScalar(1-t*.78).add(c);pos.setXYZ(i,v.x,v.y,v.z);}geo.computeVertexNormals();return geo;}
export function treeGeometry(seed){const rnd=seeded(seed),parts=[branchGeometry([[0,0,0],[.15,3,.1],[-.1,7,.2],[.3,11,0],[.1,15,.2]],.35)];
 for(let j=0;j<12;j++){const a=j*2.4,y=4+j*.65,len=2.8+rnd()*2.1;parts.push(branchGeometry([[0,y,0],[Math.cos(a)*len*.5,y+1,Math.sin(a)*len*.5],[Math.cos(a)*len,y+2.8,Math.sin(a)*len]],.10-j*.004));}
 for(let j=0;j<7;j++){const a=j/7*Math.PI*2;parts.push(branchGeometry([[0,.6,0],[Math.cos(a)*.7,.1,Math.sin(a)*.7],[Math.cos(a)*1.5,-.1,Math.sin(a)*1.5]],.13));}
 return mergeGeometries(parts,false);
}
export function foliageTexture(fern=false){const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d'),rnd=seeded(fern?79:42);ctx.lineCap='round';
 for(let stem=0;stem<(fern?9:25);stem++){const sx=256+(rnd()-.5)*120,sy=450,ex=30+rnd()*450,ey=20+rnd()*260;ctx.strokeStyle='#45582a';ctx.lineWidth=fern?3:5;ctx.beginPath();ctx.moveTo(sx,sy);ctx.quadraticCurveTo(sx,ey,ex,ey);ctx.stroke();
  for(let j=0;j<(fern?20:15);j++){const f=j/(fern?20:15),x=sx+(ex-sx)*f,y=sy+(ey-sy)*f;for(const side of [-1,1]){ctx.save();ctx.translate(x,y);ctx.rotate((ex-sx)*.003+side*(fern?.9:1.2));const size=fern?26*(1-f)+8:12+rnd()*18;ctx.fillStyle=`hsl(${85+rnd()*35} ${25+rnd()*25}% ${22+rnd()*25}%)`;ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(-size*.6,-size*.6,-size*.6,-size*1.1,0,-size*1.5);ctx.bezierCurveTo(size*.6,-size*1.1,size*.6,-size*.6,0,0);ctx.fill();ctx.strokeStyle='#bbbf5b60';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-size*1.3);ctx.stroke();ctx.restore();}}
 }
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;
}
function road(scene,id){const {width:TRACK_WIDTH}=courses.trackData(id),trackPoint=t=>courses.trackPoint(t,id),trackHeading=t=>courses.trackHeading(t,id),groundHeight=(x,z)=>courses.groundHeight(x,z,id),surfaceAt=(x,z)=>courses.surfaceAt(x,z,'clear',id);const pos=[],uv=[],colors=[],indices=[],groups=[],N=512,M=24;
 for(let i=0;i<=N;i++){const p=trackPoint(i/N),a=trackHeading(i/N),nx=Math.cos(a),nz=-Math.sin(a),mud=surfaceAt(p.x,p.z).name==='mud';
  for(let j=0;j<=M;j++){const offset=(j/M-.5)*TRACK_WIDTH,x=p.x+nx*offset,z=p.z+nz*offset,rut=Math.exp(-(((Math.abs(offset)-1.05)/.3)**2)),edge=Math.abs(offset)/(TRACK_WIDTH/2);
   pos.push(x,groundHeight(x,z)+.045-.02*rut+.013*Math.sin(i*2+j),z);uv.push(j/M*3,i/5);
   const c=new T.Color(surfaceAt(p.x,p.z).name==='sand'?0xd4bd85:mud?0x756a58:0xa3937a).multiplyScalar(1-rut*.19);if(edge>.85)c.multiplyScalar(.8);colors.push(c.r,c.g,c.b);
   if(i<N&&j<M){const k=i*(M+1)+j;indices.push(k,k+M+1,k+1,k+1,k+M+1,k+M+2);}
  }if(i<N){const last=groups.at(-1);if(last?.materialIndex===(surfaceAt(p.x,p.z).name==='sand'?2:mud?1:0))last.count+=M*6;else groups.push({start:i*M*6,count:M*6,materialIndex:surfaceAt(p.x,p.z).name==='sand'?2:mud?1:0});}
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();for(const group of groups)geo.addGroup(group.start,group.count,group.materialIndex);const materials=[surface('gravelly_sand'),surface('mud_forest'),surface('gravelly_sand',0xe0c995)];for(const m of materials){m.vertexColors=true;m.userData.snowCoverage=.32;}mesh(scene,geo,materials).castShadow=false;
}
function scatter(scene,geometry,material,points){const o=new T.InstancedMesh(geometry,material,points.length),obj=new T.Object3D();for(let i=0;i<points.length;i++){const p=points[i];obj.position.set(p.x,p.y,p.z);obj.scale.set(...(p.scale||[1,1,1]));obj.rotation.set(...(p.rotation||[0,0,0]));obj.updateMatrix();o.setMatrixAt(i,obj.matrix);if(p.color)o.setColorAt(i,new T.Color(p.color));}o.receiveShadow=true;scene.add(o);return o;}
function mergeScenery(scene,exclude){
 const buckets=new Map(),remove=[];scene.updateMatrixWorld(true);
 scene.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||o.material.isShaderMaterial)return;let p=o;while(p){if(exclude.has(p))return;p=p.parent;}if(Array.isArray(o.material))return;
  const key=o.material.uuid;if(!buckets.has(key))buckets.set(key,{material:o.material,geos:[],shadow:o.castShadow});
  const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.applyMatrix4(o.matrixWorld);buckets.get(key).geos.push(geo);remove.push(o);
 });
 for(const o of remove)o.removeFromParent();for(const b of buckets.values()){const g=mergeGeometries(b.geos,false);if(g){const o=mesh(scene,g,b.material);o.castShadow=b.shadow;}for(const geo of b.geos)geo.dispose();}
}
export function buildWorld(parent,id=courses.DEFAULT_TRACK){
 const scene=new T.Group();parent.add(scene);const course=courses.trackData(id),{TRACK,GATES,OBSTACLES,ORCS,width:TRACK_WIDTH}=course;
 const trackPoint=t=>courses.trackPoint(t,id),trackHeading=t=>courses.trackHeading(t,id),groundHeight=(x,z)=>courses.groundHeight(x,z,id),nearestTrack=(x,z)=>courses.nearestTrack(x,z,id),riverAt=(x,z)=>courses.riverAt(x,z,id);
 const mobile=matchMedia('(pointer:coarse)').matches,alpine=course.biome==='summit',canyon=course.biome==='canyon';
 const landscape=buildLandscape(scene,id);
 const castleZ=course.bounds.maxZ+28;const rnd=seeded(111),terrain=new T.PlaneGeometry(520,420,180,150);terrain.rotateX(-Math.PI/2);const positions=terrain.attributes.position;
 for(let i=0;i<positions.count;i++){const x=positions.getX(i),z=positions.getZ(i);positions.setY(i,groundHeight(x,z));}terrain.computeVertexNormals();const ground=surface('forest_floor',alpine?0x9babae:canyon?0xc1a77c:course.biome==='meadow'?0xb4c58d:0xa9b093,100);ground.map.repeat.set(100,80);ground.normalMap.repeat.copy(ground.map.repeat);ground.roughnessMap.repeat.copy(ground.map.repeat);mesh(scene,terrain,ground).castShadow=false;road(scene,id);
 const bark=surface('bark_brown_01',0xb6ab93),rockMat=surface('rock_boulder_dry',0x6c7c70),stone=surface('rock_boulder_dry',0x8c9a92),darkStone=surface('rock_boulder_dry',0x4d6059),gold=mat(0xc49c52,.43,.65),banner=mat(0x67333d);
 const trees=[],leaves=[],ferns=[],rocks=[],grass=[];
 // Reflective roadside stakes remain visible when snow covers the terrain.
 const stakes=[],reflectors=[],count=Math.ceil(course.length/12);for(let i=0;i<count;i++){const t=i/count,p=trackPoint(t),a=trackHeading(t);for(const side of [-1,1]){const offset=side*(TRACK_WIDTH/2+1.2),x=p.x+Math.cos(a)*offset,z=p.z-Math.sin(a)*offset,y=groundHeight(x,z);stakes.push({x,y:y+.65,z});reflectors.push({x,y:y+1.12,z});}}
 scatter(scene,new T.CylinderGeometry(.10,.14,1.3,6),mat(0x3a3630),stakes);const reflectorMat=mat(0xff9c27);reflectorMat.emissive.set(0xbd5f0d);reflectorMat.emissiveIntensity=.3;scatter(scene,new T.CylinderGeometry(.16,.16,.36,6),reflectorMat,reflectors);

 for(let i=0;i<(mobile?300:alpine?360:650);i++){const x=(rnd()-.5)*450,z=(rnd()-.5)*350,n=nearestTrack(x,z);if(riverAt(x,z)||n.distance<TRACK_WIDTH/2+4||Math.hypot(x+25,z-castleZ)<25)continue;const y=groundHeight(x,z),s=.75+rnd()*.75,rot=rnd()*6.28;trees.push({x,y,z,scale:[s,s,s],rotation:[0,rot,0]});
  for(let j=0;j<28;j++){const a=rnd()*6.28,r=Math.sqrt(rnd())*4.8*s;leaves.push({x:x+Math.cos(a)*r,y:y+(8.5+rnd()*6)*s,z:z+Math.sin(a)*r,scale:[(5+rnd()*3)*s,(4+rnd()*3)*s,1],rotation:[(rnd()-.5)*1.5,rnd()*6.28,(rnd()-.5)*.6],color:new T.Color().setHSL(.24+rnd()*.07,.35,.32+rnd()*.13)});}
 }
 scatter(scene,treeGeometry(36),bark,trees).castShadow=true;
 const leafMaterial=new T.MeshStandardMaterial({map:foliageTexture(),alphaTest:.5,side:T.DoubleSide,roughness:1});scatter(scene,new T.PlaneGeometry(1,1),leafMaterial,leaves).castShadow=true;
 for(let i=0;i<(mobile?700:alpine?700:1700);i++){const x=(rnd()-.5)*400,z=(rnd()-.5)*310,n=nearestTrack(x,z);if(riverAt(x,z)||n.distance<TRACK_WIDTH/2+1.2)continue;const s=.65+rnd()*1.3;for(let j=0;j<3;j++)ferns.push({x,y:groundHeight(x,z)+s*.55,z,scale:[s*2,s*1.1,1],rotation:[-.2,j*Math.PI/3+rnd()*.4,0]});}
 const fernMaterial=new T.MeshStandardMaterial({map:foliageTexture(true),alphaTest:.5,side:T.DoubleSide,roughness:1,color:0x8eb16e});scatter(scene,new T.PlaneGeometry(1,1),fernMaterial,ferns);
 // Narrow curved blades give the verges an uneven silhouette without thousands of draw calls.
 const blades=[],bladeUV=[],bladeIndices=[];
 for(let j=0;j<12;j++){const a=rnd()*6.28,x=(rnd()-.5)*.9,z=(rnd()-.5)*.9,h=.25+rnd()*.55,w=.018+rnd()*.015,k=blades.length/3;blades.push(x-w,0,z,x+w,0,z,x+Math.sin(a)*h*.3-w*.4,h*.6,z+Math.cos(a)*h*.2,x+Math.sin(a)*h*.3+w*.4,h*.6,z+Math.cos(a)*h*.2,x+Math.sin(a)*h*.5,h,z+Math.cos(a)*h*.4);bladeUV.push(0,0,1,0,0,.6,1,.6,.5,1);bladeIndices.push(k,k+1,k+2,k+1,k+3,k+2,k+2,k+3,k+4);}
 const grassGeo=new T.BufferGeometry();grassGeo.setAttribute('position',new T.Float32BufferAttribute(blades,3));grassGeo.setAttribute('uv',new T.Float32BufferAttribute(bladeUV,2));grassGeo.setIndex(bladeIndices);grassGeo.computeVertexNormals();
 for(let i=0;i<(mobile?1600:3500);i++){const t=rnd(),p=trackPoint(t),a=trackHeading(t),d=(rnd()<.5?-1:1)*(TRACK_WIDTH/2+.7+rnd()*11),x=p.x+Math.cos(a)*d,z=p.z-Math.sin(a)*d,s=.7+rnd()*.8;grass.push({x,y:groundHeight(x,z),z,scale:[s,s,s],rotation:[0,rnd()*6.28,0],color:new T.Color().setHSL(.20+rnd()*.1,.32,.24+rnd()*.12)});}
 scatter(scene,grassGeo,new T.MeshStandardMaterial({color:0x8caa65,side:T.DoubleSide,roughness:1}),grass);
 const rockGeo=mergeVertices(new T.IcosahedronGeometry(1,2)),rp=rockGeo.attributes.position;for(let i=0;i<rp.count;i++){const v=new T.Vector3().fromBufferAttribute(rp,i);v.multiplyScalar(1+.16*Math.sin(v.x*12+v.y*8)*Math.cos(v.z*8));rp.setXYZ(i,v.x,v.y,v.z);}rockGeo.computeVertexNormals();
 for(const o of course.SCENERY_ROCKS)rocks.push({...o,y:groundHeight(o.x,o.z)+o.baseOffset});const rockInstances=scatter(scene,rockGeo,rockMat,rocks);rockInstances.castShadow=true;rockInstances.userData.obstacles=course.SCENERY_ROCKS;
 // Layered cliffs outside the driving area, rather than geometric cones.
 const mountains=new T.PlaneGeometry(950,750,190,150);mountains.rotateX(-Math.PI/2);const mp=mountains.attributes.position,mi=[];
 for(let i=0;i<mp.count;i++){const x=mp.getX(i),z=mp.getZ(i),border=Math.max(Math.abs(x)-230,Math.abs(z)-190),h=Math.max(0,border)*(.75+.25*Math.sin(x*.026)+.2*Math.cos(z*.035));mp.setY(i,groundHeight(x,z)+h);}
 for(let y=0;y<150;y++)for(let x=0;x<190;x++){const k=y*191+x,wx=mp.getX(k),wz=mp.getZ(k);if(Math.abs(wx)<215&&Math.abs(wz)<175)continue;mi.push(k,k+191,k+1,k+1,k+191,k+192);}
 mountains.setIndex(mi);mountains.computeVertexNormals();const mountainMat=surface('rock_boulder_dry',alpine?0x8e9bab:canyon?0xa38a68:0x7e8a7f,50);mesh(scene,mountains,mountainMat).castShadow=false;
 for(const o of OBSTACLES){if(o.scenery)continue;const y=groundHeight(o.x,o.z);if(o.type==='rock'){const rock=mesh(scene,rockGeo,rockMat,o.x,y+.6,o.z);rock.scale.set(1.35,1.05,1.13);for(let j=0;j<4;j++){const rubble=mesh(scene,rockGeo,rockMat,o.x+Math.cos(j*2)*1.1,y+.15,o.z+Math.sin(j*2)*.8);rubble.scale.setScalar(.20+j*.04);}}else{const group=new T.Group();group.position.set(o.x,y+.43,o.z);group.rotation.y=o.heading;scene.add(group);const log=mesh(group,new T.CylinderGeometry(.37,.47,3.1,20),bark);log.rotation.z=Math.PI/2;
  for(const side of [-1,1]){const end=mesh(group,new T.CircleGeometry(.36,32),mat(0xaf956d),side*1.56,0,0);end.rotation.y=side*Math.PI/2;for(let j=1;j<5;j++){const ring=mesh(group,new T.TorusGeometry(j*.065,.006,4,32),mat(0x755b39),side*1.565,0,0);ring.rotation.y=Math.PI/2;}}mesh(group,branchGeometry([[.6,.1,0],[.8,.4,.3],[.9,.65,.55]],.085),bark);}}
 // Wet patches occupy the mud sectors and reflect the sky.
 const waterMask=document.createElement('canvas');waterMask.width=waterMask.height=128;const waterContext=waterMask.getContext('2d'),gradient=waterContext.createRadialGradient(64,64,32,64,64,64);gradient.addColorStop(0,'white');gradient.addColorStop(.78,'#dddddd');gradient.addColorStop(1,'black');waterContext.fillStyle=gradient;waterContext.fillRect(0,0,128,128);
 const puddleMaterial=new T.MeshPhysicalMaterial({color:0x293329,roughness:.23,metalness:.08,clearcoat:.45,transparent:true,opacity:.8,alphaMap:new T.CanvasTexture(waterMask),depthWrite:false});
 for(let i=0;i<course.mud.length*16;i++){const sector=course.mud[Math.floor(i/16)],t=sector[0]+.004+(i%16)/16*(sector[1]-sector[0]-.008),p=trackPoint(t),a=trackHeading(t),offset=(rnd()-.5)*7,x=p.x+Math.cos(a)*offset,z=p.z-Math.sin(a)*offset;const puddle=mesh(scene,new T.CircleGeometry(1,48),puddleMaterial,x,groundHeight(x,z)+.25,z);const vertices=puddle.geometry.attributes.position;for(let v=1;v<vertices.count;v++){const x=vertices.getX(v),y=vertices.getY(v),a=Math.atan2(y,x),r=1+.10*Math.sin(a*7+i)+.06*Math.cos(a*11);vertices.setXY(v,x*r,y*r);}puddle.rotation.x=-Math.PI/2;puddle.rotation.z=a;puddle.scale.set(.45+rnd()*.85,1+rnd()*1.8,1);puddle.castShadow=false;}
 // Original jokes on roadside boards; keep clear of driving and landing areas.
 const jokes=['Агро снял?\nГаз добавь!','Лут справа.\nОрк тоже.','Хил на откате —\nтормози!','Не стой в луже.\nДаже в красивой.','За Орду?\nСначала заправься.'];
 for(let i=0;i<jokes.length;i++){const t=.11+i*.17;if(course.RAMPS.some(r=>Math.abs(r.t-t)<.035))continue;const p=trackPoint(t),a=trackHeading(t),offset=TRACK_WIDTH/2+3.5,group=new T.Group();group.position.set(p.x+Math.cos(a)*offset,groundHeight(p.x+Math.cos(a)*offset,p.z-Math.sin(a)*offset),p.z-Math.sin(a)*offset);group.rotation.y=a+Math.PI;scene.add(group);for(const x of [-1.3,1.3])mesh(group,new T.CylinderGeometry(.1,.13,3.2,8),bark,x,1.6,0);mesh(group,new T.BoxGeometry(3.8,1.65,.15),bark,0,2.7,0);const canvas=document.createElement('canvas');canvas.width=768;canvas.height=320;const ctx=canvas.getContext('2d');ctx.fillStyle='#253b32';ctx.fillRect(0,0,768,320);ctx.strokeStyle='#c9a466';ctx.lineWidth=10;ctx.strokeRect(12,12,744,296);ctx.fillStyle='#ffedb9';ctx.textAlign='center';ctx.font='bold 49px sans-serif';jokes[i].split('\n').forEach((line,j)=>ctx.fillText(line,384,135+j*72));const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;mesh(group,new T.PlaneGeometry(3.65,1.5),new T.MeshBasicMaterial({map:texture,side:T.DoubleSide}),0,2.7,.083);}
 const orcs=ORCS.map(o=>{const model=buildOrc();scene.add(model);const relation=new T.Mesh(new T.TorusGeometry(.85,.06,5,28),new T.MeshBasicMaterial({color:0x86eb96,depthWrite:false}));relation.rotation.x=Math.PI/2;relation.visible=false;scene.add(relation);return {data:o,model,relation};});
 // Masonry courses, inset windows, roof battlements and buttresses.
 for(let i=0;i<3;i++){const x=-40+i*19,z=castleZ+(i%2)*9,y=groundHeight(x,z);mesh(scene,new T.CylinderGeometry(5,5.7,18,20),darkStone,x,y+9,z);
  for(let level=0;level<10;level++)for(let j=0;j<16;j++){const a=(j+(level%2)*.5)/16*6.28,block=mesh(scene,new T.BoxGeometry(1.75,1.65,.5),stone,x+Math.sin(a)*5.4,y+.9+level*1.8,z+Math.cos(a)*5.4);block.rotation.y=a;}
  for(let j=0;j<10;j++){const a=j/10*6.28,block=mesh(scene,new T.BoxGeometry(1.5,2.6,1.6),stone,x+Math.sin(a)*5.2,y+19.4,z+Math.cos(a)*5.2);block.rotation.y=a;}
  for(let level=0;level<3;level++)mesh(scene,new T.BoxGeometry(.9,1.6,.12),mat(0x122523),x,y+5+level*4,z-5.72);mesh(scene,new T.BoxGeometry(2.4,6,.12),banner,x+2,y+11,z-5.75);
  if(i<2){mesh(scene,new T.BoxGeometry(14,9,3),stone,x+9,y+4.5,z);for(let j=0;j<5;j++)mesh(scene,new T.BoxGeometry(1.5,1.9,3.2),darkStone,x+5+j*2.8,y+9.8,z);}
 }
 const gateMeshes=[];GATES.forEach((p,i)=>{const group=new T.Group();group.position.set(p.x,groundHeight(p.x,p.z),p.z);group.rotation.y=trackHeading(p.t);scene.add(group);const activeMat=new T.MeshStandardMaterial({color:0xbaacd9,emissive:0x7850cc,emissiveIntensity:.28,roughness:.4,metalness:.3});
  for(const x of [-TRACK_WIDTH/2-1.1,TRACK_WIDTH/2+1.1]){mesh(group,new T.BoxGeometry(i===0?1.5:.35,i===0?8:3.2,i===0?1.4:.35),i===0?stone:bark,x,i===0?4:1.6,0);mesh(group,new T.OctahedronGeometry(i===0?.45:.26),activeMat,x,i===0?8.3:3.5,0);if(i)mesh(group,new T.BoxGeometry(.7,1.2,.05),banner,x,2,-.21);}
  if(i===0){mesh(group,new T.BoxGeometry(TRACK_WIDTH+4,1,1.5),stone,0,7.8,0);for(const x of [-6,6]){mesh(group,new T.BoxGeometry(1.8,3,.12),banner,x,5.4,-.9);for(let j=0;j<4;j++)mesh(group,new T.BoxGeometry(1.6,.12,1.55),darkStone,x+(x>0?1.1:-1.1),1+j*1.8,0);}
   const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#24392f';ctx.fillRect(0,0,1024,128);ctx.strokeStyle='#be9b5a';ctx.lineWidth=6;ctx.strokeRect(8,8,1008,112);ctx.fillStyle='#ecd8a5';ctx.font='bold 48px Georgia';ctx.textAlign='center';ctx.fillText(course.name.toUpperCase(),512,88);const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;mesh(group,new T.PlaneGeometry(10,1.25),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}),0,7.8,-.81);
   for(let j=0;j<TRACK_WIDTH;j++){const tile=mesh(group,new T.PlaneGeometry(1.05,.6),mat(j%2?0xe2d9bc:0x30382e),j-(TRACK_WIDTH-1)/2,.25,0);tile.rotation.x=-Math.PI/2;}
  }gateMeshes.push({group,activeMat});
 });
 // Timber barriers mark difficult corners and connect the scenery to the course.
 for(let i=0;i<64;i++){const t=i/64,p=trackPoint(t),a=trackHeading(t);if(t<.1||i%7===0)continue;const group=new T.Group();group.position.set(p.x+Math.cos(a)*(TRACK_WIDTH/2+2),groundHeight(p.x,p.z),p.z-Math.sin(a)*(TRACK_WIDTH/2+2));group.rotation.y=a;scene.add(group);for(const z of [-1.8,1.8])mesh(group,new T.CylinderGeometry(.12,.16,1.6,8),bark,0,.8,z);for(const y of [.65,1.3]){const beam=mesh(group,new T.CylinderGeometry(.09,.09,3.6,8),bark,0,y,0);beam.rotation.x=Math.PI/2;}}
 const portal=new T.Group();portal.position.set(25,groundHeight(25,castleZ+6)+4,castleZ+6);scene.add(portal);mesh(portal,new T.TorusGeometry(3,.4,12,60),darkStone);const energy=mesh(portal,new T.CircleGeometry(2.7,48),new T.MeshBasicMaterial({color:0x7961dc,transparent:true,opacity:.68,side:T.DoubleSide}),0,0,.04);for(let i=0;i<12;i++){const a=i/12*6.28;mesh(portal,new T.OctahedronGeometry(.18),new T.MeshBasicMaterial({color:0xc9b0ff}),Math.cos(a)*3,Math.sin(a)*3,.5);}
 mergeScenery(scene,new Set([portal,...landscape.dynamic,...orcs.flatMap(o=>[o.model,o.relation]),...gateMeshes.map(o=>o.group)]));
 const ready=loadOrcs(orcs).catch(e=>{console.warn('Orc model fallback',e.message);});
 return {root:scene,trackId:id,orcs,gateMeshes,portal,ready,landscape,dispose(){scene.removeFromParent();const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){materials.add(m);for(const v of Object.values(m))if(v?.isCanvasTexture)textures.add(v);}});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();},update(time,nextGate,enemies=null,dt=1/60,riderId=null){landscape.update(time);for(const {data,model,relation}of orcs){
   const p=enemies?.find(o=>o.id===data.id)||orcPosition(data,time),running=p.speed>3,attacking=p.mode==='attack',phase=time*(running?11:4)+data.id;
   relation.visible=riderId!==null&&friendlyTo(p,riderId,time);relation.material.color.set(p.friends?.[riderId]?.helper?0x7dc5ff:0x86eb96);relation.position.set(p.x,groundHeight(p.x,p.z)+.15,p.z);
   const position=new T.Vector3(p.x,groundHeight(p.x,p.z)+Math.abs(Math.sin(phase))*(running?.09:.025),p.z);
   // Smooth 20 Hz authoritative snapshots without changing gameplay positions.
   if(enemies&&model.userData.live)model.position.lerp(position,1-Math.exp(-dt*20));else model.position.copy(position);
   model.userData.live=!!enemies;const yaw=p.yaw??data.heading+Math.cos(time*.65+data.id*1.7)*Math.PI/2;
   model.rotation.y+=Math.atan2(Math.sin(yaw-model.rotation.y),Math.cos(yaw-model.rotation.y))*Math.min(1,dt*20);
   model.rotation.z=Math.sin(phase)*(running?.045:.02);model.rotation.x=attacking?-.12:running?.10:0;
   if(animateOrc(model,p,dt))continue;
   for(const [i,leg]of (model.userData.legs||[]).entries())leg.rotation.x=Math.sin(phase+i*Math.PI)*(running?.6:.14);
   for(const [i,arm]of (model.userData.arms||[]).entries())arm.rotation.x=attacking?-.9+Math.sin(time*8)*.6:-Math.sin(phase+i*Math.PI)*(running?.55:.12);
 }energy.scale.setScalar(1+Math.sin(time*2)*.025);for(let i=0;i<gateMeshes.length;i++)gateMeshes[i].activeMat.emissiveIntensity=i===nextGate%16?1.8:.2;}};
}
