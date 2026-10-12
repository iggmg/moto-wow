import {configureRiderAnimation} from './rider-animation.js';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {buildBike} from './models.js';
import {disposeBike} from './model-geometry.js';
import {BIKE_VISUALS,tyreRadius} from './bike-specs.js';
let manifestRequest;
const templates=new Map();
function releaseTemplate(entry){
 entry.users--;entry.lastUsed=performance.now();
 const idle=[...templates.values()].filter(e=>e.template&&e.users===0).sort((a,b)=>b.lastUsed-a.lastUsed);
 for(const stale of idle.slice(1)){templates.delete(stale.key);stale.template.userData.ownedMaterials=true;disposeBike(stale.template);}
}
async function manifest(){
 if(!manifestRequest)manifestRequest=fetch(`${import.meta.env.BASE_URL}models/manifest.json?v=5`).then(r=>{if(!r.ok)throw new Error('Bike manifest unavailable');return r.json();}).catch(e=>{manifestRequest=null;throw e;});
 return manifestRequest;
}
export function configureBikeAsset(root,id,{rider=true}={}){
 root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(id==='winner')for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.name.startsWith('Winner'))m.envMapIntensity=m.name.includes('paint')?.15:.50;}});
 const body=root.getObjectByName('BikeBody'),wheels=['WheelRear','WheelFront'].map(n=>root.getObjectByName(n));
 if(!body||wheels.some(w=>!w))throw new Error('Bike animation hierarchy is incomplete');
 const person=root.getObjectByName('Rider');if(person)person.visible=rider;
 root.updateMatrixWorld(true);const radii=wheels.map((wheel,i)=>new T.Box3().setFromObject(wheel,true).getSize(new T.Vector3()).y/2||tyreRadius(BIKE_VISUALS[id][i?'front':'rear']));
 root.userData={ownedMaterials:true,bike:id,body,wheels,wheelRadii:radii};return root;
}
export async function loadBikeAsset(id,options={}){
 let loaded,cached;
 try{
  const entry=(await manifest())[id];if(!entry?.file)throw new Error('Bike not exported');const key=id+'/'+entry.revision;
  cached=templates.get(key);if(!cached){cached={key,users:0,lastUsed:performance.now(),template:null};cached.promise=new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/${entry.file}?v=${entry.revision}`).then(gltf=>{cached.template=gltf.scene;return gltf.scene;}).catch(error=>{templates.delete(key);throw error;});templates.set(key,cached);}
  cached.users++;const template=await cached.promise;loaded=template.clone(true);const materials=new Map();
  loaded.traverse(o=>{if(!o.isMesh)return;const own=m=>{if(!materials.has(m))materials.set(m,m.clone());return materials.get(m);};o.material=Array.isArray(o.material)?o.material.map(own):own(o.material);});
  configureBikeAsset(loaded,id,options);configureRiderAnimation(loaded,id);let released=false;loaded.userData.releaseAssets=()=>{if(!released){released=true;releaseTemplate(cached);}};return loaded;
 }catch{if(loaded){loaded.userData.ownedMaterials=true;loaded.userData.releaseAssets=()=>releaseTemplate(cached);disposeBike(loaded);}return buildBike(id,options);}
}
