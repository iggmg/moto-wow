import test from 'node:test';
import assert from 'node:assert/strict';
import {createRider,stepRider,normalizeInput,STEP,trackPoint,trackHeading,cornerAdvice,angleDiff} from '../shared/game.js';
function rider(){const p=trackPoint(.04,'meadow'),yaw=trackHeading(.04,'meadow');return Object.assign(createRider('mt07',0,'meadow'),p,{yaw,travelYaw:yaw,speed:18,hitCooldown:99});}
test('rear brake independently initiates drift, reduces speed and releases without snapping momentum',()=>{
 const plain=rider(),rear=rider();for(let i=0;i<30;i++){stepRider(plain,{steer:1},STEP,i*STEP,[]);stepRider(rear,{steer:1,rearBrake:1},STEP,i*STEP,[]);}
 assert(rear.speed<plain.speed-2);assert(Math.abs(rear.slipAngle)>Math.abs(plain.slipAngle)*2);assert(rear.rearBrake>.9);
 const before=rear.travelYaw;stepRider(rear,{},STEP,1,[]);assert(Math.abs(angleDiff(rear.travelYaw,before))<.15);assert(rear.rearBrake<.9&&rear.rearBrake>0);
 for(let i=0;i<150;i++)stepRider(rear,{brake:.15},STEP,2+i*STEP,[]);assert(rear.rearBrake<.001);assert(Math.abs(rear.slipAngle)<.03);
});
test('ordinary brake stops faster and retains more grip than rear brake',()=>{
 const front=rider(),rear=rider();for(let i=0;i<40;i++){stepRider(front,{steer:.5,brake:1},STEP,i*STEP,[]);stepRider(rear,{steer:.5,rearBrake:1},STEP,i*STEP,[]);}
 assert(front.speed<rear.speed);assert(Math.abs(front.slipAngle)<Math.abs(rear.slipAngle));assert(front.pitch>0);assert(rear.lean>0);
});
test('rear brake is bounded, deterministic and cannot brake wheels in mid-air',()=>{
 assert.equal(normalizeInput({rearBrake:999}).rearBrake,1);assert.equal(normalizeInput({rearBrake:-1}).rearBrake,0);assert.equal(normalizeInput({rearBrake:NaN}).rearBrake,0);
 const a=rider(),b=rider();for(const s of [a,b]){s.airborne=true;s.y+=20;s.vy=5;}
 for(let i=0;i<20;i++){stepRider(a,{},STEP,i*STEP,[]);stepRider(b,{rearBrake:1},STEP,i*STEP,[]);}assert(a.airborne&&b.airborne);assert.equal(a.speed,b.speed);assert.equal(a.travelYaw,b.travelYaw);
});
test('parked steering does not spin the motorcycle and corner advice never drives it',()=>{
 const s=createRider('himalayan',0,'summit'),yaw=s.yaw;for(let i=0;i<60;i++)stepRider(s,{steer:1},STEP,i*STEP,[],'snow');assert.equal(s.yaw,yaw);
 let advice;for(let i=0;i<256;i++){const p=trackPoint(i/256,'summit');Object.assign(s,p,{speed:20});const before=structuredClone(s);const a=cornerAdvice(s,'snow');assert.deepEqual(s,before);if(a.tight&&a.brake)advice=a;}
 assert(advice);assert(advice.speed>=4&&advice.speed<20);assert(['налево','направо'].includes(advice.side));
});
