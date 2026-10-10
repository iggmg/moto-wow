import test from 'node:test';
import assert from 'node:assert/strict';
import {createRider,stepRider,STEP,trackData,trackPoint,trackHeading,groundHeight,BIKES,TRACKS} from '../shared/game.js';
import {initArcade,createArcade,stepArcade,oilPuddles} from '../shared/arcade.js';
import {createCombat,stepCombat} from '../shared/combat.js';
import {createStunt,stepStunt} from '../shared/stunt.js';
function patch(off=false){const id='meadow',p=trackPoint(.04,id),yaw=trackHeading(.04,id),offset=off?17:0,x=p.x+Math.cos(yaw)*offset,z=p.z-Math.sin(yaw)*offset;return Object.assign(createRider('mt07',0,id),{x,z,y:groundHeight(x,z,id),yaw,travelYaw:yaw,speed:30,hitCooldown:99});}
test('checkpoint requires a forward crossing, not parking nearby or passing backwards',()=>{
 const id='meadow',gate=trackData(id).GATES[1],yaw=trackHeading(gate.t,id);
 const s=Object.assign(createRider('cub',0,id),{x:gate.x,z:gate.z,yaw,travelYaw:yaw,speed:0});stepRider(s,{},STEP,0,[]);assert.equal(s.nextGate,1,'parking cannot collect a gate');
 Object.assign(s,{x:gate.x+Math.sin(yaw)*.04,z:gate.z+Math.cos(yaw)*.04,yaw:yaw+Math.PI,travelYaw:yaw+Math.PI,speed:8});stepRider(s,{},STEP,1,[]);assert.equal(s.nextGate,1,'wrong-way crossing cannot collect a gate');
 Object.assign(s,{x:gate.x-Math.sin(yaw)*.04,z:gate.z-Math.cos(yaw)*.04,yaw,travelYaw:yaw,speed:8});stepRider(s,{},STEP,2,[]);assert.equal(s.nextGate,2,'forward crossing collects gate');
});
test('a moving bike decelerates progressively on a slower surface instead of hitting an invisible speed wall',()=>{
 for(const weather of ['clear','rain','snow']){const s=patch(true);stepRider(s,{},STEP,0,[],weather);assert(s.speed>29,'surface cannot discard half the momentum in one frame');const before=s.speed;for(let n=0;n<180;n++)stepRider(s,{},STEP,n*STEP,[],weather);assert(s.speed<before-5);}
});
test('airborne momentum ignores throttle, both brakes, and the surface beneath the jump',()=>{
 const a=patch(),b=patch(true);for(const s of [a,b])Object.assign(s,{airborne:true,y:30,vy:0});const c=structuredClone(a);
 for(let n=0;n<30;n++){stepRider(a,{},STEP,n*STEP,[]);stepRider(b,{throttle:1,brake:1,rearBrake:1},STEP,n*STEP,[],'snow');stepRider(c,{throttle:1},STEP,n*STEP,[]);}
 assert(a.airborne&&b.airborne&&c.airborne);assert(Math.abs(a.speed-b.speed)<1e-9);assert(Math.abs(a.speed-c.speed)<1e-9);
});
test('flying above an oil puddle does not oil the tyres; ground contact does',()=>{
 const s=initArcade(createRider()),p=oilPuddles('rift')[0],w=createArcade('rift');Object.assign(s,p,{airborne:true,y:groundHeight(p.x,p.z)+5});stepArcade(w,[s],[],createCombat(),STEP,10);assert.equal(s.arcade.slipUntil,0);s.airborne=false;s.y=groundHeight(p.x,p.z);stepArcade(w,[s],[],createCombat(),STEP,11);assert(s.arcade.slipUntil>11);
});
test('stunt brake comes to rest without creating reverse motion or jitter',()=>{
 const s=createStunt();for(let n=0;n<120;n++)stepStunt(s,{});s.vx=.01;const x=s.x;for(let n=0;n<120;n++)stepStunt(s,{brake:1});assert(s.x>=x-.001,'brake must not pull a stopped bike backwards');assert(Math.abs(s.vx)<.001,'brake should settle at rest');assert(!s.failed);
});
test('eight-bike starting grids have two rows aligned with the track, without overlapping slots',()=>{
 for(const t of TRACKS){const riders=Array.from({length:8},(_,slot)=>createRider(BIKES[slot%6].id,slot,t.id)),yaw=trackHeading(0,t.id);for(let i=0;i<4;i++){const a=riders[i],b=riders[i+4],along=(b.x-a.x)*Math.sin(yaw)+(b.z-a.z)*Math.cos(yaw),cross=(b.x-a.x)*Math.cos(yaw)-(b.z-a.z)*Math.sin(yaw);assert(Math.abs(along+3)<1e-9);assert(Math.abs(cross)<1e-9);assert.equal(a.y,groundHeight(a.x,a.z,t.id));assert.equal(b.y,groundHeight(b.x,b.z,t.id));}}
});

test('defeated and finished racers cannot shield live racers from an incoming projectile',()=>{
 const y=groundHeight(0,0),dead=Object.assign(createRider(),{id:1,x:0,z:0,y,health:0,finished:true}),live=Object.assign(createRider(),{id:2,x:2,z:0,y}),combat=createCombat();combat.projectiles.push({id:1,owner:0,type:'arrow',trackId:'rift',x:-1,z:0,y:y+.85,vx:30,vz:0,vy:0,gravity:0,radius:.45,life:4});stepCombat(combat,[],[dead,live],.1,0);assert.equal(live.health,88);assert.equal(dead.health,0);
});
