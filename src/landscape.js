import * as T from 'three';
import * as courses from '../shared/tracks.js';
import { add,box,tube,profile,mat } from './model-geometry.js';
function positionFeature(group,feature){group.position.set(feature.x,0,feature.z);group.rotation.y=feature.heading;}
function localToWorld(feature,x,z){return {x:feature.x+x*Math.cos(feature.heading)+z*Math.sin(feature.heading),z:feature.z-x*Math.sin(feature.heading)+z*Math.cos(feature.heading)};}
function sign(scene,feature,text,id){const baseHeight=(x,z)=>courses.baseHeight(x,z,id);const g=new T.Group();positionFeature(g,feature);scene.add(g);const y=baseHeight(feature.x,feature.z);tube(g,[-9,y,-5],[-9,y+2.7,-5],.07,mat(0x5b4431));const board=box(g,-9,y+2.2,-5,2,.85,.09,mat(0x725c3b));
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=192;const ctx=canvas.getContext('2d');ctx.fillStyle='#563d25';ctx.fillRect(0,0,512,192);ctx.strokeStyle='#d8bb7d';ctx.lineWidth=10;ctx.strokeRect(12,12,488,168);ctx.fillStyle='#ffe5ac';ctx.font='bold 54px sans-serif';ctx.textAlign='center';ctx.fillText(text,256,113);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const mesh=add(g,new T.PlaneGeometry(1.9,.73),new T.MeshBasicMaterial({map:texture}),-9,y+2.2,-5-.05);mesh.rotation.y=Math.PI;return g;}
export function buildLandscape(scene,id=courses.DEFAULT_TRACK){
 const {RAMPS,RIVERS,sand}=courses.trackData(id),trackPoint=t=>courses.trackPoint(t,id),trackHeading=t=>courses.trackHeading(t,id),groundHeight=(x,z)=>courses.groundHeight(x,z,id),baseHeight=(x,z)=>courses.baseHeight(x,z,id),naturalHeight=(x,z)=>courses.naturalHeight(x,z,id);
 const dynamic=[],water=[];
 for(const ramp of RAMPS){
  const g=new T.Group();positionFeature(g,ramp);scene.add(g);const wood=mat(0x685438,0,.9),iron=mat(0x535452,.7,.5);
  const y=baseHeight(ramp.x,ramp.z),half=ramp.length/2;
  for(const x of [-ramp.width/2+.4,0,ramp.width/2-.4]){profile(g,[[-half,y],[half,y],[half,y+ramp.height],[-half,y+.03]],.12,wood).position.x=x;tube(g,[x,y,half],[x,y+ramp.height,half],.08,wood);}
  for(let i=0;i<25;i++){const z=-half+i/24*ramp.length,p=localToWorld(ramp,0,z),height=groundHeight(p.x,p.z)+.065;const plank=box(g,0,height,z,ramp.width,.11,.34,wood);plank.rotation.x=-Math.atan(ramp.height/ramp.length);for(const x of [-ramp.width/2+.3,ramp.width/2-.3])box(g,x,height+.064,z,.075,.022,.055,iron);}
  for(const x of [-ramp.width/2-.3,ramp.width/2+.3]){tube(g,[x,y,-half],[x,y+1,-half],.055,wood);tube(g,[x,y,half],[x,y+ramp.height+1,half],.055,wood);tube(g,[x,y+1,-half],[x,y+ramp.height+1,half],.055,wood);}
  sign(scene,ramp,'ТРАМПЛИН',id);
 }
 for(const river of RIVERS){
  const positions=[],uv=[],indices=[],N=82,M=8;
  for(let i=0;i<=N;i++)for(let j=0;j<=M;j++){const cross=(i/N-.5)*river.length,along=(j/M-.5)*river.width,p=localToWorld(river,cross,along),centre=localToWorld(river,cross,0);positions.push(p.x,naturalHeight(centre.x,centre.z)-.02,p.z);uv.push(i/N,j/M);if(i<N&&j<M){const k=i*(M+1)+j;indices.push(k,k+1,k+M+1,k+1,k+M+2,k+M+1);}}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const material=new T.MeshPhysicalMaterial({color:0x537d80,roughness:.20,metalness:.25,transparent:true,opacity:.77,clearcoat:1,clearcoatRoughness:.12,side:T.DoubleSide});
  const timeUniform={value:0};material.onBeforeCompile=shader=>{shader.uniforms.uFlowTime=timeUniform;shader.vertexShader='varying vec3 vRiverPosition;varying vec2 vRiverUV;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvRiverPosition=position;vRiverUV=uv;');shader.fragmentShader='uniform float uFlowTime;varying vec3 vRiverPosition;varying vec2 vRiverUV;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat flow=sin(vRiverPosition.x*1.7+vRiverPosition.z*2.5-uFlowTime*2.7);diffuseColor.rgb*=.92+.10*flow;diffuseColor.a*=smoothstep(0.0,.13,min(vRiverUV.y,1.0-vRiverUV.y));');shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\nnormal=normalize(normal+vec3(sin(vRiverPosition.x*3.0+uFlowTime*2.0)*.12,cos(vRiverPosition.z*4.0-uFlowTime)*.08,0.0));');};material.customProgramCacheKey=()=>'river-ripples-v1';
  const mesh=add(scene,geometry,material);mesh.castShadow=false;water.push({mesh,timeUniform,base:Float32Array.from(positions)});dynamic.push(mesh);
  // Foam at the banks and current streaks across the ford.
  const foamGeo=new T.BufferGeometry(),lines=[];
  for(let i=0;i<80;i++){const cross=(i/80-.5)*river.length,along=(i%5-2)*1.0,p=localToWorld(river,cross,along),q=localToWorld(river,cross+.45,along+.1),h=naturalHeight(p.x,p.z)+.025;lines.push(p.x,h,p.z,q.x,h,q.z);}
  foamGeo.setAttribute('position',new T.Float32BufferAttribute(lines,3));const foam=new T.LineSegments(foamGeo,new T.LineBasicMaterial({color:0xccd8d0,transparent:true,opacity:.35}));scene.add(foam);dynamic.push(foam);sign(scene,river,'БРОД',id);
 }
 if(sand.length){const t=sand[0][0];sign(scene,{...trackPoint(t),heading:trackHeading(t)},'ПЕСОК',id);}
 return {dynamic,water,update(time){for(const {mesh,base,timeUniform}of water){timeUniform.value=time;const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,base[i*3+1]+Math.sin(time*2.7+base[i*3]*.9+base[i*3+2]*.6)*.017);p.needsUpdate=true;}}};
}
