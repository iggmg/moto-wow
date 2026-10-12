import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RidingCamera,RIDING_CAMERAS,loadVisualSettings} from '../src/riding-camera.js';
const state={x:0,z:0,y:2,yaw:0,speed:15,airborne:false};
test('default view reveals a bike side and anticipates a bend without altering simulation',()=>{
 const rig=new RidingCamera(),s={...state};const straight=rig.pose(s,{immediate:true}),bend=rig.pose(s,{roadYaw:.7,immediate:true});
 assert.ok(straight.position[0]>1);assert.ok(Math.abs(bend.position[0]-straight.position[0])>.5);assert.deepEqual(s,state);
});
test('reverse view is behind reverse travel; inspection gives full angles and moving view restores',()=>{
 const rig=new RidingCamera();assert.ok(rig.pose({...state,speed:-2},{immediate:true}).position[2]>0);
 rig.reset();rig.drag(400,0,false);const side=rig.pose({...state,speed:0},{mode:'orbit',motion:0,immediate:true});assert.ok(side.position[2]>0);
 for(let n=0;n<300;n++)rig.pose(state);assert.ok(Math.abs(rig.look)<.001);
});
test('camera profiles and reduced motion stay finite on portrait, ramps and reverse',()=>{
 for(const mode of Object.keys(RIDING_CAMERAS))for(const speed of [-3,0,42]){
  const rig=new RidingCamera(),s={...state,speed,airborne:true};const pose=rig.pose(s,{mode,aspect:.46,motion:0,immediate:true});
  assert.ok([...pose.position,...pose.target,pose.fov].every(Number.isFinite));
  assert.equal(pose.fov,rig.pose({...s,speed:0},{mode,motion:0}).fov);
 }
});
test('corrupt preferences use safe defaults and system reduced motion overrides saved animation',()=>{
 const storage={getItem:key=>key==='moto-visual'?'{"camera":"bad","motion":1,"quality":"bad"}':'bad'};
 assert.deepEqual(loadVisualSettings(storage,true),{camera:'chase',motion:0,quality:'auto'});
});
