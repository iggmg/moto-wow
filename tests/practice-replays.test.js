import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRider,stepRider,resetRider,VERSION} from '../shared/game.js';
import {damageRider} from '../shared/health.js';
import {applyPracticeRules,dailyChallenge} from '../shared/practice.js';
import {ReplayRecorder,validateReplay,saveReplay,loadReplays,sampleReplay,replayContext,sameReplayContext} from '../src/replays.js';
test('safe training keeps physical contact and surface penalties separate from record mode',()=>{
 const s=applyPracticeRules(createRider(),'training');s.id=1;s.speed=8;assert.equal(damageRider(s,'rock',20),false);assert.equal(s.health,100);resetRider(s);assert.equal(s.penalty,0);assert.equal(s.lapLimit,0);
 s.x=210;s.z=150;for(let i=0;i<180;i++)stepRider(s,{},1/60,i/60,[]);assert.equal(s.penalty,0);assert.equal(s.offRoad,true);
 const trial=applyPracticeRules(createRider(),'timeattack');assert.equal(trial.lapLimit,1);assert.equal(damageRider(trial,'rock',20),true);
});
test('daily challenge is deterministic and versioned for every participant',()=>{
 const a=dailyChallenge('2026-10-12');assert.deepEqual(a,dailyChallenge('2026-10-12'));assert.equal(a.physicsVersion,VERSION);assert.equal(a.mode,'timeattack');assert.notEqual(a.id,dailyChallenge('2026-10-13').id);assert.throws(()=>dailyChallenge('bad'));
});
function replay(){const s=createRider('winner'),context=replayContext(s,'timeattack','clear'),r=new ReplayRecorder(context,s);for(let i=1;i<=20;i++){s.raceTime=i*.1;s.x=i;s.yaw=i*.1;s.nextGate=1+Math.floor(i/2);r.update(s);}return r.finish(2.2,s);}
test('replay interpolation, validation and storage keep exact mode/map/physics identity',()=>{
 const r=replay(),data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};saveReplay(r,storage);assert.equal(loadReplays(storage).length,1);assert.ok(Math.abs(sampleReplay(r,.55).x-5.5)<1e-9);assert.equal(sampleReplay(r,20),null);assert.equal(saveReplay({...r,seconds:3},storage).seconds,2.2);
 assert.throws(()=>validateReplay({...r,context:{...r.context,physicsVersion:1}}));assert.throws(()=>validateReplay({...r,frames:[[0,0,0,0,0,0,0,0],[1,Infinity,0,0,0,0,0,0]]}));assert.throws(()=>validateReplay({...r,frames:[...r.frames].reverse()}));
 const imported=validateReplay({...r,nickname:'PRIVATE',password:'PRIVATE',context:{...r.context,email:'PRIVATE'}});assert.ok(!JSON.stringify(imported).includes('PRIVATE'));
});

test('race recordings keep lap count separate and retain the finishing moment after many interactions',()=>{const s=createRider('winner');s.lapLimit=3;const a=replayContext(s,'race','clear');s.lapLimit=5;assert(!sameReplayContext(a,replayContext(s,'race','clear')));const r=new ReplayRecorder(a,s);for(let i=1;i<=100;i++){s.raceTime=i/100;r.event(i===100?'finish':'pass',s);r.update(s);}const data=r.finish(1,s);assert.equal(data.context.laps,3);assert.equal(data.events.length,64);assert.equal(data.events.at(-1).type,'finish');assert.throws(()=>validateReplay({...data,context:{...data.context,laps:17}}));});
