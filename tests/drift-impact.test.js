import test from 'node:test';
import assert from 'node:assert/strict';
import {createRider,resetRider,stepRider,STEP,trackPoint,trackHeading,groundHeight,trackData,angleDiff} from '../shared/game.js';
function corner(weather,oil=false){
 const p=trackPoint(.06,'meadow'),yaw=trackHeading(.06,'meadow'),s=Object.assign(createRider('mt07',0,'meadow'),p,{yaw,travelYaw:yaw,speed:14,hitCooldown:100});
 if(oil)s.arcade={slipUntil:100};
 for(let i=0;i<75;i++)stepRider(s,{throttle:1,steer:.55},STEP,i*STEP,[],weather);
 return s;
}
test('snow and oil preserve lateral momentum, with more heading lag than dry ground',()=>{
 const dry=corner('clear'),snow=corner('snow'),oil=corner('clear',true);
 assert(Math.abs(snow.slipAngle)>Math.abs(dry.slipAngle)*2);
 assert(Math.abs(oil.slipAngle)>Math.abs(dry.slipAngle)*2);
 for(const s of [dry,snow,oil])assert([s.x,s.z,s.yaw,s.travelYaw,s.speed].every(Number.isFinite));
});
test('countersteering reduces a snowy drift; braking and reset recover stable heading',()=>{
 const s=corner('snow'),initial=Math.abs(s.slipAngle);
 for(let i=0;i<30;i++)stepRider(s,{brake:.3,steer:-1},STEP,2+i*STEP,[],'snow');
 assert(Math.abs(s.slipAngle)<initial);
 for(let i=0;i<180;i++)stepRider(s,{brake:1},STEP,3+i*STEP,[],'snow');
 assert.equal(s.speed,0);assert(Math.abs(s.slipAngle)<.001);
 resetRider(s);assert.equal(s.travelYaw,s.yaw);assert.equal(s.slipAngle,0);
});
test('mud retains lateral slip while the bike remains inside the muddy section',()=>{
 const p=trackPoint(.23),yaw=trackHeading(.23),s=Object.assign(createRider('mt07'),p,{yaw,travelYaw:yaw,speed:14,hitCooldown:100});
 for(let i=0;i<45;i++)stepRider(s,{throttle:1,steer:.55},STEP,i*STEP,[]);
 assert.equal(s.surface,'mud');assert(Math.abs(s.slipAngle)>.05);
});
test('airborne steering rotates the bike while preserving its travel direction',()=>{
 const s=corner('clear');s.airborne=true;s.y+=10;s.vy=3;const heading=s.travelYaw,yaw=s.yaw;
 for(let i=0;i<20;i++)stepRider(s,{steer:1},STEP,2+i*STEP,[]);
 assert(s.airborne);assert.equal(s.travelYaw,heading);assert(Math.abs(angleDiff(s.yaw,yaw))>.01);
});
function impact(type,speed,{glancing=false}={}){
 const o=trackData('meadow').OBSTACLES.find(o=>o.type===type),radius=o.radius+.5;
 const x=o.x+(glancing?radius-.025:0),z=o.z-(glancing?.4:radius+.2);
 const s=Object.assign(createRider('mt07',0,'meadow'),{x,z,y:groundHeight(x,z,'meadow'),yaw:0,travelYaw:0,speed});
 for(let i=0;i<80&&!s.hits;i++)stepRider(s,{},STEP,i*STEP,[]);
 return {s,o,radius};
}
test('logs and rocks damage health by inward impact; fast head-on hits exceed slow and grazing hits',()=>{
 for(const type of ['log','rock']){
  const slow=impact(type,5),fast=impact(type,22),graze=impact(type,22,{glancing:true});
  assert.equal(slow.s.lastDamage.type,type);assert.equal(fast.s.lastDamage.type,type);
  assert(fast.s.lastDamage.amount>slow.s.lastDamage.amount);
  assert((graze.s.lastDamage?.amount||0)<fast.s.lastDamage.amount);
  assert(graze.s.speed>fast.s.speed);
  assert(Math.hypot(fast.s.x-fast.o.x,fast.s.z-fast.o.z)>=fast.radius);
 }
});
test('holding throttle against one obstacle causes one impact; leaving and returning permits another',()=>{
 const {s,o,radius}=impact('rock',12),health=s.health;
 for(let i=0;i<360;i++)stepRider(s,{throttle:1},STEP,2+i*STEP,[]);
 assert.equal(s.hits,1);assert.equal(s.health,health);
 s.z=o.z-radius-3;s.y=groundHeight(s.x,s.z,'meadow');stepRider(s,{},STEP,9,[]);assert.equal(s.obstacleContact,null);
 s.speed=12;for(let i=0;i<60&&s.hits===1;i++)stepRider(s,{},STEP,10+i*STEP,[]);
 assert.equal(s.hits,2);
});
test('swept impacts stop high-speed tunneling through rocks even across a long step',()=>{
 const o=trackData('meadow').OBSTACLES.find(o=>o.type==='rock'),radius=o.radius+.5,x=o.x,z=o.z-radius-.1;
 const s=Object.assign(createRider('mt07',0,'meadow'),{x,z,y:groundHeight(x,z,'meadow'),yaw:0,travelYaw:0,speed:42});
 stepRider(s,{throttle:1},.15,0,[]);
 assert.equal(s.hits,1);assert(s.z<o.z);assert(s.health<100);
});
