import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { WEAPONS } from '../shared/combat.js';
import {ROLE_WEAPONS,ORC_ROLES} from '../shared/perception.js';
import { add,tube,curvedTube,mat } from './model-geometry.js';
function equipment(kind,scale){
 const g=new T.Group(),wood=mat(0x4f3020,0,.87),metal=mat(0x6d747a,.8,.45),size=1/scale;
 if(kind==='arrow'){
  curvedTube(g,[[0,-.65,.0],[0,-.48,.17],[0,0,.25],[0,.48,.17],[0,.65,0]].map(p=>p.map(v=>v*size)),.026*size,wood);
  tube(g,[0,-.65*size,0],[0,.65*size,0],.003*size,mat(0xbdb49a));
 }else if(kind==='orb'){tube(g,[0,-.9*size,0],[0,1.15*size,0],.035*size,wood);const crystal=add(g,new T.IcosahedronGeometry(.18*size,1),new T.MeshStandardMaterial({color:0x8cdf79,emissive:0x52a847,emissiveIntensity:1.2}),0,1.25*size,0);crystal.rotation.z=.3;}else if(kind==='spear'){
  tube(g,[0,-.9*size,0],[0,.85*size,0],.024*size,wood);
  add(g,new T.ConeGeometry(.07*size,.30*size,4),metal,0,1.0*size,0);
 }else add(g,new T.DodecahedronGeometry(.14*size,1),mat(0x747770,0,.98));
 return g;
}
export async function loadOrcs(orcs){
 const gltf=await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/orc.glb`);
 for(const {data,model}of orcs){const role=data.role||ORC_ROLES[data.id%ORC_ROLES.length];
  const rig=clone(gltf.scene),mixer=new T.AnimationMixer(rig),actions=new Map(gltf.animations.map(c=>[c.name,mixer.clipAction(c)]));
  actions.get('neutral')?.play();mixer.update(0);rig.updateMatrixWorld(true);
  rig.getObjectByName('warhammer').visible=false;
  const bounds=new T.Box3().setFromObject(rig.getObjectByName('orc')),scale=(role==='chief'?2.9:role==='shaman'?2.55:2.4)/(bounds.max.y-bounds.min.y);
  const container=new T.Group();container.scale.setScalar(scale);container.add(rig);rig.position.y-=bounds.min.y;
  rig.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  const wrist=rig.getObjectByName(role==='archer'?'wristL':'wristR')||rig.getObjectByName(role==='archer'?'wrist.L':'wrist.R');
  if(wrist)wrist.add(equipment(ROLE_WEAPONS[role]||WEAPONS[data.id%3],scale));
  const geometries=new Set(),materials=new Set();model.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)materials.add(m);});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();model.clear();model.add(container);model.userData={mixer,actions,loaded:true,active:'neutral',role,source:'Guillaume GuieA_7 Englert',scale};
 }
}
export function animateOrc(model,state,dt){
 const data=model.userData;if(!data.loaded)return false;
 const name=state.mode==='attack'||state.windup>0||state.shotCooldown>2.7?'attack':state.speed>.1?'walk':'wait';
 if(data.active!==name){const next=data.actions.get(name),previous=data.actions.get(data.active);if(next){next.reset().fadeIn(.18).play();previous?.fadeOut(.18);data.active=name;}}
 data.mixer.timeScale=name==='walk'?(state.speed>3?1.7:.65):name==='attack'?1.15:1;data.mixer.update(dt);return true;
}
