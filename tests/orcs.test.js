import test from 'node:test';
import assert from 'node:assert/strict';
import { STEP,ORCS,createOrcs,stepOrcs,createRider,stepRider,groundHeight } from '../shared/game.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function tick(orcs,rider,input,steps=1){for(let i=0;i<steps;i++){stepOrcs(orcs,[rider],STEP,i*STEP);stepRider(rider,input,STEP,i*STEP,orcs);}}
test('orcs find a parked racer at the start and attack repeatedly without rider input',()=>{
 const rider={id:0,...createRider()},orcs=createOrcs(),start={...rider};
 tick(orcs,rider,{},1);assert(orcs.some(o=>o.targetId===0&&o.mode==='chase'));
 tick(orcs,rider,{},1200);
 assert(rider.hits>=2);assert(rider.penalty>=4);assert.equal(rider.speed,0);assert.equal(rider.x,start.x);assert.equal(rider.z,start.z);
 assert.equal(rider.health,0);assert.equal(rider.finished,true);assert(orcs.every(o=>o.targetId!==rider.id));
});
test('a slow bike can escape an attack along the road during the swing recovery',()=>{
 const orcs=createOrcs(),orc=orcs[0],rider={id:42,...createRider('cub')};
 rider.x=orc.x;rider.z=orc.z+1.2;rider.y=groundHeight(rider.x,rider.z);rider.yaw=orc.yaw;
 tick(orcs,rider,{},1);assert.equal(rider.hits,1);assert.equal(orc.mode,'attack');
 tick(orcs,rider,{throttle:1},300);assert.equal(rider.hits,1);assert(distance(orc,rider)>2);
});
test('orcs chase the nearest visible rider, retarget after disconnect and return without teleporting',()=>{
 const orcs=createOrcs(),orc=orcs[0],near={id:7,x:orc.x+12,z:orc.z,speed:0},far={...near,id:8,x:orc.x+25};
 stepOrcs(orcs,[far,near]);assert.equal(orc.targetId,7);
 stepOrcs(orcs,[far]);assert.equal(orc.targetId,8);
 const before={...orc};stepOrcs(orcs,[],STEP,10);assert.equal(orc.targetId,null);assert(distance(before,orc)<=4*STEP+.00001);
 orc.x=ORCS[0].x+60;orc.z=ORCS[0].z;const fromHome=distance(orc,ORCS[0]);
 stepOrcs(orcs,[],STEP,10);assert.equal(orc.mode,'return');assert(distance(orc,ORCS[0])<fromHome);
});
test('a racer outside the pursuit range escapes and the AI is deterministic',()=>{
 const a=createOrcs(),b=createOrcs(),rider={id:9,x:a[0].x+20,z:a[0].z,speed:12};
 for(let i=0;i<100;i++){stepOrcs(a,[rider],STEP,i*STEP);stepOrcs(b,[rider],STEP,i*STEP);}assert.deepEqual(a,b);assert.equal(a[0].targetId,9);
 rider.x=ORCS[0].x+150;stepOrcs(a,[rider]);assert.equal(a[0].targetId,null);
});
