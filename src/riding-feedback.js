import {BIKE_VISUALS} from './bike-specs.js';
import {updateRiderAnimation} from './rider-animation.js';
import * as T from 'three';
import {bikeById,groundHeight} from '../shared/game.js';
const rigs=new WeakMap();
export function animateRidingBike(model,s,dt,time,{cockpit=false,weather='clear'}={}){
 let rig=rigs.get(model);if(!rig){const materials=[];if(model.userData.ownedMaterials)model.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(!materials.some(v=>v.material===m))materials.push({material:m,roughness:m.roughness,color:m.color?.clone()});});rig={bodyY:model.userData.body.position.y,wheelHomes:model.userData.wheels.map(w=>w.position.clone()),rider:model.getObjectByName('Rider'),materials,speed:s.speed,airborne:!!s.airborne,compression:0,dirt:0};rigs.set(model,rig);}
 let frontDelta=0,rearDelta=0,slope=0;if(!s.airborne&&Number.isFinite(s.x)&&Number.isFinite(s.z)){const b=bikeById(s.bike),sin=Math.sin(s.yaw),cos=Math.cos(s.yaw),center=groundHeight(s.x,s.z,s.trackId);frontDelta=groundHeight(s.x+sin*b.wheelbase/2,s.z+cos*b.wheelbase/2,s.trackId)-center;rearDelta=groundHeight(s.x-sin*b.wheelbase/2,s.z-cos*b.wheelbase/2,s.trackId)-center;slope=-Math.atan2(frontDelta-rearDelta,b.wheelbase);}
 const factor=cockpit?.65:1,body=model.userData.body,acceleration=(s.speed-rig.speed)/Math.max(.001,dt),landing=rig.airborne&&!s.airborne;
 const rough=['grass','mud','sand','snow'].includes(s.surface),contact=!s.airborne&&Math.abs(s.speed)>1;
 const compression=(landing?.075:0)+(!s.airborne?Math.min(.035,Math.abs(acceleration)*.001)+(contact&&rough?(Math.sin(time*18)*.008+Math.sin(time*31)*.004):0):-.025);
 rig.compression+=(compression-rig.compression)*(1-Math.exp(-dt*(landing?25:10)));
 body.position.y=rig.bodyY-rig.compression*factor;body.rotation.z=(s.lean||0)*factor;body.rotation.x=((s.pitch||0)+slope+(s.airborne?Math.max(-.4,Math.min(.4,-Math.atan2(s.vy||0,Math.max(2,Math.abs(s.speed)))))*.55:0))*factor;
 const lean=body.rotation.z,pitch=body.rotation.x;model.userData.wheels.forEach((wheel,i)=>{const home=rig.wheelHomes[i],tyre=(BIKE_VISUALS[s.bike||model.userData.bike]?.[i?'front':'rear']?.[1]||.08)/2,contactY=home.y*Math.cos(lean)+tyre*Math.abs(Math.sin(lean))+(i?frontDelta:rearDelta);wheel.position.y=(contactY+rig.compression*factor-Math.sin(lean)*Math.cos(pitch)*home.x+Math.sin(pitch)*home.z)/(Math.cos(lean)*Math.cos(pitch));});
 if(rig.rider){rig.rider.position.x=Math.sin(s.lean||0)*.035;rig.rider.position.y=-Math.max(0,rig.compression)*.22;rig.rider.rotation.y=-Math.max(-.3,Math.min(.3,s.steer||0))*.08;}
 rig.dirt=Math.min(1,rig.dirt+(contact&&rough?Math.abs(s.speed)*dt*.0004:0));if(s.surface==='water')rig.dirt*=Math.exp(-dt*.2);
 const wet=weather==='rain'||s.surface==='water';for(const {material,roughness,color} of rig.materials){if(Number.isFinite(roughness))material.roughness=Math.max(.12,roughness*(wet?.72:1));if(color&&material.color)material.color.copy(color).multiplyScalar(1-rig.dirt*.09);}
 updateRiderAnimation(rig.rider,s,time);rig.speed=s.speed;rig.airborne=!!s.airborne;
}

// A bounded particle pool follows actual rear tyre contact. No per-frame meshes.
export function createContactEffects(scene,trackId,capacity=128){
 const positions=new Float32Array(capacity*3),colors=new Float32Array(capacity*3),alphas=new Float32Array(capacity),velocities=new Float32Array(capacity*3),ages=new Float32Array(capacity),lives=new Float32Array(capacity);
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));geometry.setAttribute('color',new T.BufferAttribute(colors,3));geometry.setAttribute('alpha',new T.BufferAttribute(alphas,1).setUsage(T.DynamicDrawUsage));
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,vertexColors:true,uniforms:{pixelScale:{value:500}},vertexShader:'attribute float alpha; varying vec3 tint; varying float fade; uniform float pixelScale; void main(){tint=color;fade=alpha;vec4 p=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*p;gl_PointSize=clamp(pixelScale*.095/max(1.0,-p.z),1.0,26.0);}',fragmentShader:'varying vec3 tint; varying float fade; void main(){float d=length(gl_PointCoord-.5)*2.0;if(d>1.0||fade<=0.0)discard;gl_FragColor=vec4(tint,(1.0-d*d)*fade*.55);#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'});
 // Shader includes must begin on their own source line.
 material.fragmentShader=material.fragmentShader.replace(';#include',';\n#include');
 const points=new T.Points(geometry,material);points.frustumCulled=false;scene.add(points);let index=0,emission=0,last=null;
 const palette={water:[.56,.75,.8],snow:[.88,.93,.96],sand:[.64,.49,.28],mud:[.25,.19,.12],grass:[.36,.34,.19],dirt:[.52,.42,.29]};
 return {points,update(s,dt,quality='auto',viewport=innerHeight){
  points.visible=quality!=='low';material.uniforms.pixelScale.value=viewport;const speed=Math.abs(s.speed),allowed=quality!=='low',teleport=last&&Math.hypot(s.x-last.x,s.z-last.z)>5;last={x:s.x,z:s.z};
  if(teleport){alphas.fill(0);lives.fill(0);emission=0;}
  const contact=allowed&&!s.airborne&&!s.finished&&speed>3&&s.surface!=='ramp';emission+=contact?dt*Math.min(35,5+speed*.7+(Math.abs(s.slipAngle||0)>.15?12:0)):0;
  while(emission>=1){emission--;const i=index++%capacity,n=i*3,offset=bikeById(s.bike).wheelbase/2,paletteColor=palette[s.surface]||palette.dirt;
   positions[n]=s.x-Math.sin(s.yaw)*offset;positions[n+2]=s.z-Math.cos(s.yaw)*offset;positions[n+1]=groundHeight(positions[n],positions[n+2],trackId)+.12;
   velocities[n]=-Math.sin(s.travelYaw??s.yaw)*speed*.08+(Math.random()-.5)*1.2;velocities[n+2]=-Math.cos(s.travelYaw??s.yaw)*speed*.08+(Math.random()-.5)*1.2;velocities[n+1]=(s.surface==='water'?1.6:.7)+Math.random()*.7;colors.set(paletteColor,n);ages[i]=0;lives[i]=s.surface==='water'?.55:.85;alphas[i]=1;
  }
  for(let i=0;i<capacity;i++){if(!lives[i])continue;const n=i*3;ages[i]+=dt;if(ages[i]>=lives[i]){lives[i]=0;alphas[i]=0;continue;}velocities[n+1]-=dt*(s.surface==='water'?4:1.2);for(let j=0;j<3;j++)positions[n+j]+=velocities[n+j]*dt;alphas[i]=1-ages[i]/lives[i];}
  geometry.attributes.position.needsUpdate=true;geometry.attributes.alpha.needsUpdate=true;geometry.attributes.color.needsUpdate=true;
 },dispose(){scene.remove(points);geometry.dispose();material.dispose();}};
}
