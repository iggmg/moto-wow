import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorldEvents,stepWorldEvents,worldObstacles} from '../shared/world-events.js';
import {createRider,stepRider} from '../shared/game.js';
test('adventure events give an advance warning, share bounded collision shapes and expire',()=>{
 const e=createWorldEvents('rift'),s=createRider();s.id=1;s.speed=15;e.elapsed=19.9;stepWorldEvents(e,[s],[],.2,20);assert.equal(e.active.length,1);assert(e.message.includes('ПОВОЗКА'));assert.equal(worldObstacles(e,21).length,0);const objects=worldObstacles(e,24);assert.equal(objects.length,1);assert.equal(objects[0].type,'cart');assert.notDeepEqual(worldObstacles(e,25),objects);stepWorldEvents(e,[s],[],.1,40);assert.equal(e.active.length,0);
});
test('low health or stacked pursuit postpones hazards; dynamic obstacle impact causes health loss',()=>{
 const e=createWorldEvents('rift'),s=createRider();s.id=1;s.health=20;e.elapsed=20;stepWorldEvents(e,[s],[],.1,20);assert.equal(e.active.length,0);assert.equal(e.phase,'relief');s.health=100;s.speed=20;s.hitCooldown=0;const x=s.x+Math.sin(s.yaw)*.1,z=s.z+Math.cos(s.yaw)*.1;stepRider(s,{throttle:1},1/60,0,[],'clear',[{id:-1001,type:'cart',x,z,radius:1.5,height:2,vx:0,vz:0}]);assert(s.health<100);
});
