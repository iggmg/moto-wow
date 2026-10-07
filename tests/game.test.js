import test from 'node:test';
import assert from 'node:assert/strict';
import { BIKES,STEP,TRACK,createRider,stepRider,resetRider,trackPoint,trackHeading,nearestTrack,surfaceAt,angleDiff,clamp,normalizeInput,GATES,groundHeight } from '../shared/game.js';
function drive(s,maxSteps=18000){let time=0;for(let i=0;i<maxSteps;i++){const n=nearestTrack(s.x,s.z),target=n.t>s.nextGate/16+.002&&n.t-s.nextGate/16<.25?GATES[s.nextGate%16]:trackPoint((n.t+.018)%1),desired=Math.atan2(target.x-s.x,target.z-s.z),err=angleDiff(desired,s.yaw);const input={throttle:s.speed<13?1:0,brake:s.speed>15?1:0,steer:clamp(-err*2.7,-1,1)};const lap=stepRider(s,input,STEP,time);time+=STEP;if(lap)return {lap,time};}return null;}
test('all six bikes accelerate and steer with different performance',()=>{const speeds=[];for(const bike of BIKES){const s=createRider(bike.id);for(let i=0;i<180;i++)stepRider(s,{throttle:1},STEP,0);assert(s.speed>8);assert(Number.isFinite(s.yaw));speeds.push(s.speed);}assert(new Set(speeds).size===BIKES.length);});
test('input normalization rejects infinite and oversized controls',()=>{assert.deepEqual(normalizeInput({throttle:Infinity,brake:-8,steer:90}),{throttle:1,brake:0,steer:1});});
test('mud and grass affect surfaces',()=>{const p=trackPoint(.23);assert.equal(surfaceAt(p.x,p.z).name,'mud');assert.equal(surfaceAt(0,0).name,'grass');});
test('a finish-line shortcut cannot complete a lap',()=>{const s=createRider();const finish=trackPoint(0);s.x=finish.x;s.z=finish.z;stepRider(s,{},STEP,0);assert.equal(s.completed,0);assert.equal(s.nextGate,1);});
test('riding around the whole track produces a valid lap',()=>{const s=createRider('himalayan');const result=drive(s);assert(result,`No completed lap: next gate ${s.nextGate}, position ${s.x}, ${s.z}`);assert(s.completed===1);assert(result.lap.lap>25);assert.equal(s.best,s.last);});
test('reset goes to the latest checkpoint with a five-second penalty',()=>{const s=createRider();s.nextGate=5;s.x=0;s.z=0;resetRider(s);assert.equal(s.x,GATES[4].x);assert.equal(s.z,GATES[4].z);assert.equal(s.penalty,5);});
test('simulation produces identical state for identical inputs',()=>{const a=createRider(),b=createRider();for(let i=0;i<400;i++){const input={throttle:1,steer:Math.sin(i/40)};stepRider(a,input,STEP,i*STEP);stepRider(b,input,STEP,i*STEP);}assert.deepEqual(a,b);});

test('right and left controls turn to the corresponding side of the rider',()=>{
 for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2]){
  for(const steer of [-1,1]){const s=createRider();s.x=0;s.z=0;s.yaw=yaw;s.speed=12;
   for(let i=0;i<30;i++)stepRider(s,{throttle:1,steer},STEP,0);
   const screenRightX=-Math.cos(yaw),screenRightZ=Math.sin(yaw);
   assert((s.x*screenRightX+s.z*screenRightZ)*steer>0,'steering must match the camera-relative direction');
  }
 }
});
