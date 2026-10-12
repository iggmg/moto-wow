import * as T from 'three';
import {bikeById} from '../shared/game.js';
import {loadBikeAsset} from './bike-assets.js';
import {disposeBike} from './model-geometry.js';
import {sampleReplay} from './replays.js';
export function createGhostView(scene,replay){
 let model=null,disposed=false;
 const ready=loadBikeAsset(replay.context.bike,{rider:false}).then(root=>{if(disposed){disposeBike(root);return;}model=root;root.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;for(const m of Array.isArray(o.material)?o.material:[o.material]){m.transparent=true;m.opacity=.26;m.depthWrite=false;m.color?.set(0x75cde0);}}});scene.add(root);root.visible=false;});
 return {ready,update(time){if(!model)return;const s=sampleReplay(replay,time);model.visible=!!s;if(!s)return;if(replay.context.mode==='stunt'){model.position.set(s.x,s.y-bikeById(replay.context.bike).wheel-.25,0);model.quaternion.setFromAxisAngle(new T.Vector3(0,0,1),s.pitch).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI/2));return;}model.position.set(s.x,s.y+.025,s.z);model.rotation.y=s.yaw;model.userData.body.rotation.z=s.lean;model.userData.body.rotation.x=s.pitch;},dispose(){disposed=true;if(model)disposeBike(model);}};
}
