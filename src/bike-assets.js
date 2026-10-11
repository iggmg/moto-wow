import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {buildBike} from './models.js';
import {disposeBike} from './model-geometry.js';
import {BIKE_VISUALS,tyreRadius} from './bike-specs.js';
let manifestRequest;
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
 let loaded;
 try{const entry=(await manifest())[id];if(!entry?.file)throw new Error('Bike not exported');const gltf=await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/${entry.file}?v=${entry.revision}`);loaded=gltf.scene;return configureBikeAsset(loaded,id,options);}
 catch{if(loaded){loaded.userData.ownedMaterials=true;disposeBike(loaded);}return buildBike(id,options);}
}
