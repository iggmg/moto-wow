import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RidingCamera,RIDING_CAMERAS,loadVisualSettings} from '../src/riding-camera.js';
const state={x:0,z:0,y:2,yaw:0,speed:15,airborne:false};
test('centered riding views keep the road axis on bends, drift, jumps and countdown without changing simulation',()=>{
 for(const mode of ['chase','sport'])for(const aspect of [.46,1.44])for(const extra of [{},{travelYaw:.5,slipAngle:.6},{airborne:true},{finished:true}]){
  const s={...state,...extra},before={...s},rig=new RidingCamera(),heading=s.travelYaw??s.yaw;
  const pose=rig.pose(s,{mode,aspect,roadYaw:heading+1.2,intro:true,immediate:true});
  const dx=pose.position[0]-s.x,dz=pose.position[2]-s.z;
  assert.ok(Math.abs(dx*Math.cos(heading)-dz*Math.sin(heading))<1e-8,'no automatic lateral offset');
  assert.ok(dx*Math.sin(heading)+dz*Math.cos(heading)<-4,'camera behind travel');
  assert.ok(Math.abs((pose.target[0]-s.x)*Math.cos(heading)-(pose.target[2]-s.z)*Math.sin(heading))<1e-8,'target on travel axis');
  assert.deepEqual(s,before);
 }
});
test('centered camera follows a sharp turn without a long sideways lag and allows intentional manual look',()=>{
 const rig=new RidingCamera();for(let n=0;n<60;n++)rig.pose(state);
 const turning={...state,yaw:1.5,travelYaw:1.5};for(let n=0;n<30;n++)rig.pose(turning,{roadYaw:-1});
 assert.ok(Math.abs(rig.followYaw-1.5)<.02);rig.drag(-100,0,true);rig.dragging=true;
 const pose=rig.pose(turning,{immediate:true});assert.ok(Math.abs(rig.look)>.5);assert.ok(pose.position.every(Number.isFinite));
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
