import {BIKE_VISUALS} from './bike-specs.js';
export function configureRiderAnimation(root,id){
 const rider=root.getObjectByName('Rider');if(!rider)return;
 const uniforms={uRiderLean:{value:0},uRiderTurn:{value:0},uRiderDuck:{value:0},uRiderBreath:{value:0},uRiderSeat:{value:BIKE_VISUALS[id].seatY}},materials=new Map();
 rider.traverse(o=>{if(!o.isMesh)return;const configure=source=>{if(materials.has(source))return materials.get(source);const material=source.clone(),previous=material.onBeforeCompile;
  material.onBeforeCompile=shader=>{previous.call(material,shader);Object.assign(shader.uniforms,uniforms);shader.vertexShader='uniform float uRiderLean,uRiderTurn,uRiderDuck,uRiderBreath,uRiderSeat;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nfloat headNormal=smoothstep(uRiderSeat+.61,uRiderSeat+.70,position.y);float normalTurn=uRiderTurn*headNormal;objectNormal.xz=mat2(cos(normalTurn),-sin(normalTurn),sin(normalTurn),cos(normalTurn))*objectNormal.xz;');shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   float torso=smoothstep(uRiderSeat+.13,uRiderSeat+.5,position.y)*(1.0-smoothstep(-.12,.23,position.z));
   transformed.x+=uRiderLean*torso;transformed.y-=(uRiderDuck-uRiderBreath)*torso;
   float head=smoothstep(uRiderSeat+.61,uRiderSeat+.70,position.y);
   float turn=uRiderTurn*head;vec2 h=vec2(transformed.x,transformed.z+.105);
   transformed.x=cos(turn)*h.x+sin(turn)*h.y;transformed.z=-sin(turn)*h.x+cos(turn)*h.y-.105;
  `);};material.customProgramCacheKey=()=>'rider-flex-v1';material.needsUpdate=true;materials.set(source,material);return material;};o.material=Array.isArray(o.material)?o.material.map(configure):configure(o.material);});
 const retained=new Set();root.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)retained.add(m);});for(const source of materials.keys())if(!retained.has(source))source.dispose();
 rider.userData.flex=uniforms;
}
export function updateRiderAnimation(rider,s,time){const u=rider?.userData.flex;if(!u)return;u.uRiderLean.value=-(s.lean||0)*.07;u.uRiderTurn.value=-(s.steer||0)*.38;u.uRiderDuck.value=Math.min(.055,Math.abs(s.speed||0)*.0012)+(s.airborne?.025:0);u.uRiderBreath.value=Math.sin(time*2)*.004;}
