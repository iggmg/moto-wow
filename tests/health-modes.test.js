import test from 'node:test';
import assert from 'node:assert/strict';
import {createRider,stepRider,resetRider,OBSTACLES,GATES,groundHeight,STEP} from '../shared/game.js';
import {damageRider} from '../shared/health.js';
import {createRoom,startRoom,returnToLobby} from '../server/rooms.js';
test('health is bounded, invulnerability prevents repeated frame damage, reset cannot heal',()=>{
 const s=createRider();assert(damageRider(s,'arrow'));assert.equal(s.health,88);assert.equal(damageRider(s,'spear'),false);resetRider(s);assert.equal(s.health,88);assert.equal(s.hitCooldown,1.8);
 for(let i=0;i<10;i++){s.hitCooldown=0;damageRider(s,'melee');}assert.equal(s.health,0);assert(s.finished);const x=s.x;stepRider(s,{throttle:1});assert.equal(s.x,x);assert.equal(s.speed,0);
});
test('moving impacts with both logs and stones cause damage; resting beside an obstacle does not',()=>{
 for(const o of OBSTACLES.slice(0,2)){const s=createRider();Object.assign(s,{x:o.x,z:o.z,y:groundHeight(o.x,o.z),speed:0});stepRider(s,{},STEP,0,[]);assert.equal(s.health,100);s.speed=12;stepRider(s,{},STEP,0,[]);assert(s.health<100);assert.equal(s.lastDamage.type,o.type);}
});
test('one lap race finishes only after ordered checkpoints, keeps result and then stops',()=>{
 const s=createRider();s.lapLimit=1;for(let i=1;i<=16;i++){const gate=GATES[i%16];Object.assign(s,{x:gate.x,z:gate.z,y:groundHeight(gate.x,gate.z),hitCooldown:2});stepRider(s,{},STEP,i*STEP,[]);}assert(s.finished);assert.equal(s.completed,1);assert.equal(s.health,100);assert(s.raceTime>0);const before=structuredClone(s);assert.equal(stepRider(s,{throttle:1}),null);assert.deepEqual(s,before);
});
test('synchronized rooms permit only the host to start, reset health and support another round',()=>{
 const room=createRoom('RACE',{mode:'race',laps:5,weather:'snow'},7);room.players.set(7,{state:createRider(),input:{}});room.players.set(9,{state:createRider('mt07'),input:{}});room.players.get(7).state.health=20;
 assert.equal(startRoom(room,9),false);assert(startRoom(room,7));assert.equal(room.phase,'countdown');assert.equal(room.startAt,3);assert.equal(room.players.get(7).state.health,100);assert.equal(room.players.get(9).state.lapLimit,5);assert.equal(startRoom(room,7),false);room.phase='finished';assert.equal(returnToLobby(room,9),false);assert(returnToLobby(room,7));assert(startRoom(room,7));assert.equal(room.round,2);
});
