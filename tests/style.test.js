import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRider} from '../shared/game.js';
import {initArcade} from '../shared/arcade.js';
import {stepRidingStyle} from '../shared/riding-style.js';
import {createStuntStyle,stepStuntStyle} from '../shared/stunt-style.js';
test('a clean sustained drift earns boost once per sector/lap and a hit breaks the chain',()=>{
 const s=initArcade(createRider());s.speed=12;s.slipAngle=.3;s.rearBrake=.5;s.hitCooldown=0;for(let i=0;i<60;i++)stepRidingStyle(s,1/60,i/60);s.slipAngle=0;s.rearBrake=0;stepRidingStyle(s,1/60,1);assert.equal(s.arcade.score,20);assert(s.arcade.boostUntil>1);
 s.slipAngle=.3;for(let i=0;i<60;i++)stepRidingStyle(s,1/60,2+i/60);s.slipAngle=0;stepRidingStyle(s,1/60,3);assert.equal(s.arcade.score,20);s.hits++;stepRidingStyle(s,1/60,4);assert.equal(s.arcade.style.combo,0);
});
test('stunt style banks a stable full rotation, keeps independent scoring and rejects checkpoint farming',()=>{
 const s={style:createStuntStyle(),contacts:[false,false],time:0,x:42,angle:0,omega:0,vx:10,failed:false};for(let i=0;i<60;i++){s.time=i/60;s.angle=i/60*Math.PI*2;stepStuntStyle(s,1/60);}s.contacts=[true,true];s.angle=Math.PI*2;s.time=1;stepStuntStyle(s,1/60);s.time=1.2;stepStuntStyle(s,1/60);assert(s.style.points>=125);const points=s.style.points;
 s.contacts=[false,false];s.time=2;s.angle=0;stepStuntStyle(s,1/60);s.time=3;s.angle=Math.PI*2;stepStuntStyle(s,1);s.contacts=[true,true];s.time=3.1;stepStuntStyle(s,1/60);s.time=3.3;stepStuntStyle(s,1/60);assert.equal(s.style.points,points);
});

test('jumping from off-road cannot be relabelled as a clean landing by crossing the verge in flight',()=>{const s=initArcade(createRider());s.speed=12;s.offRoad=true;s.airborne=true;stepRidingStyle(s,.1,0);s.offRoad=false;for(let i=0;i<6;i++)stepRidingStyle(s,.1,.1+i*.1);s.airborne=false;stepRidingStyle(s,.1,1);assert.equal(s.arcade.score,0);});
