import test from 'node:test';
import assert from 'node:assert/strict';
import {BIKES,TRACKS,createRider,resetRider,stepRider,STEP,trackData,trackPoint,trackHeading,surfaceAt,groundHeight} from '../shared/game.js';
function placed(bike='cub',off=false,track='meadow'){
 const p=trackPoint(.04,track),yaw=trackHeading(.04,track),d=off?trackData(track).width/2+8:0;
 const x=p.x+Math.cos(yaw)*d,z=p.z-Math.sin(yaw)*d;
 return Object.assign(createRider(bike,0,track),{x,z,y:groundHeight(x,z,track),yaw,travelYaw:yaw,hitCooldown:999});
}
// Isolate the surface response at a fixed patch, rather than comparing different hills or collisions.
function sample(s,input,weather,n){const {x,z}=s;for(let i=0;i<n;i++){s.x=x;s.z=z;s.y=groundHeight(x,z,s.trackId);stepRider(s,input,STEP,i*STEP,[],weather);}return s;}
test('offroad snow is distinct from packed road; all bikes lose speed and steering authority beyond every-weather verge',()=>{
 for(const weather of ['clear','rain','snow'])for(const bike of BIKES){
  const road=sample(placed(bike.id),{throttle:1},weather,600),off=sample(placed(bike.id,true),{throttle:1},weather,600);
  assert.equal(surfaceAt(off.x,off.z,weather,'meadow').offRoad,true);
  assert(off.speed<road.speed*.75,`${bike.id}/${weather}: off ${off.speed}, road ${road.speed}`);
  const a=placed(bike.id),b=placed(bike.id,true);a.speed=b.speed=8;sample(a,{steer:.6},weather,30);sample(b,{steer:.6},weather,30);
  assert(Math.abs(b.yawRate)<Math.abs(a.yawRate)*.85,`${bike.id}/${weather}: offroad steering`);
  assert(Math.abs(b.slipAngle)>Math.abs(a.slipAngle)*1.3,`${bike.id}/${weather}: offroad slide`);
 }
});
test('a sustained exit adds visible-accountable penalties, short verge touches do not; no border farming and reset preserves penalty',()=>{
 const s=placed('cub',true);sample(s,{},'snow',40);assert.equal(s.penalty,0);
 sample(s,{},'snow',30);assert.equal(s.offRoadPenalty,3);assert.equal(s.penalty,3);assert.equal(s.totalPenalty,3);
 sample(s,{},'snow',120);assert.equal(s.offRoadPenalty,5);assert.equal(s.penalty,5);
 const road=placed();Object.assign(s,{x:road.x,z:road.z});sample(s,{},'snow',15);
 const off=placed('cub',true);Object.assign(s,{x:off.x,z:off.z});sample(s,{},'snow',45);assert(s.offRoadPenalty<9);
 resetRider(s);assert(s.penalty>=10);assert.equal(s.offRoadTime,0);assert.equal(s.offRoad,false);
 const brief=placed('cub',true);sample(brief,{},'clear',20);Object.assign(brief,{x:road.x,z:road.z});sample(brief,{},'clear',80);assert.equal(brief.penalty,0);
});
test('offroad checkpoint shortcuts are rejected but in-road ordered checkpoint completion keeps penalties in lap result',()=>{
 const s=placed(),data=trackData('meadow'),gate=data.GATES[1],yaw=trackHeading(gate.t,'meadow');
 Object.assign(s,{x:gate.x+Math.cos(yaw)*9.8,z:gate.z-Math.sin(yaw)*9.8,speed:0});stepRider(s,{},STEP,0,[]);assert.equal(s.nextGate,1);
 Object.assign(s,{x:gate.x,z:gate.z});stepRider(s,{},STEP,1,[]);assert.equal(s.nextGate,2);
 Object.assign(s,{x:data.GATES[0].x,z:data.GATES[0].z,nextGate:16,lapTime:40,penalty:5,offRoadPenalty:3,totalPenalty:5});stepRider(s,{},STEP,2,[]);assert(s.last>=45);assert.equal(s.penalty,0);assert.equal(s.offRoadPenalty,0);assert.equal(s.totalPenalty,5);
});
test('every rendered scenery boulder has shared solid bounds and moving impacts on all courses cost health; clear jumps avoid low obstacles',()=>{
 for(const track of TRACKS){const data=trackData(track.id);assert(data.SCENERY_ROCKS.length>80);for(const o of data.SCENERY_ROCKS)assert(data.OBSTACLES.includes(o));
  const o=data.SCENERY_ROCKS.find(o=>o.radius>1),z=o.z-o.radius-.7,s=Object.assign(createRider('mt07',0,track.id),{x:o.x,z,y:groundHeight(o.x,z,track.id),yaw:0,travelYaw:0,speed:16});
  for(let i=0;i<20&&!s.hits;i++)stepRider(s,{},STEP,i*STEP,[]);assert.equal(s.lastDamage?.type,'rock',track.id);assert(s.health<100);assert(s.speed<8);
  const h=s.health;for(let i=0;i<120;i++)stepRider(s,{throttle:1},STEP,1+i*STEP,[]);assert.equal(s.health,h);
 }
 const o=trackData('meadow').OBSTACLES.find(o=>o.type==='log'),z=o.z-o.radius-.6;
 for(const [height,hit]of [[.1,true],[5,false]]){const s=Object.assign(createRider('mt07',0,'meadow'),{x:o.x,z,y:groundHeight(o.x,z,'meadow')+height,yaw:0,travelYaw:0,speed:20,airborne:true,vy:2});stepRider(s,{},.08,0,[]);assert.equal(s.health<100,hit);}
});
