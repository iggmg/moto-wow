import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRoom} from '../server/rooms.js';
import {createRider} from '../shared/game.js';
import {initAdventure} from '../shared/adventure.js';
import {rememberDisconnect,restoreDisconnected,resumable,expireDisconnected} from '../server/reconnect.js';
test('abnormal disconnect preserves identity/progress but charges elapsed time and clears latched input/momentum',()=>{
 const room=createRoom('TEST',{mode:'race'},1),state=createRider();state.nextGate=8;state.lapTime=12;state.raceTime=12;state.health=55;state.speed=20;const p={user:{id:1},state,seq:50,actionSeq:3};room.phase='racing';room.time=20;assert(rememberDisconnect(room,p,1006,1000));room.time=24;const restored=restoreDisconnected(room,1,2000);assert.equal(restored.state.nextGate,8);assert.equal(restored.state.health,55);assert.equal(restored.state.lapTime,16);assert.equal(restored.state.speed,0);assert.equal(restored.seq,50);assert.equal(resumable(room,1,2000),null);
});
test('normal exit is not resumable, stale rounds expire and elimination disconnect forfeits competition',()=>{
 const room=createRoom('TEST',{mode:'elimination'},1),p={user:{id:1},state:initAdventure(createRider(),'elimination'),seq:2};assert.equal(rememberDisconnect(room,p,1000,1000),false);assert(rememberDisconnect(room,p,1006,1000));assert.equal(p.state.adventure.eliminated,true);room.round++;expireDisconnected(room,2000);assert.equal(room.detached.size,0);
});

test('disconnect during countdown charges only racing time and preserves replay recorder identity',()=>{const s=createRider();s.id=8;const recorder={frames:[[0]]},room={mode:'race',round:1,time:1,phase:'countdown',startAt:3},p={user:{id:8},state:s,seq:5,actionSeq:2,recorder,lastEvent:7,resultSaved:null};rememberDisconnect(room,p,1006,1000);room.time=8;room.phase='racing';const resumed=restoreDisconnected(room,8,2000);assert.equal(resumed.state.raceTime,5);assert.equal(resumed.recorder,recorder);assert.equal(resumed.lastEvent,7);});
