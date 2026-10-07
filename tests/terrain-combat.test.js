import test from 'node:test';
import assert from 'node:assert/strict';
import { STEP,BIKES,RAMPS,RIVERS,ORCS,createRider,createOrcs,stepOrcs,stepRider,surfaceAt,groundHeight,baseHeight,featureCoords,trackPoint } from '../shared/game.js';
import { createCombat,stepCombat } from '../shared/combat.js';
function point(feature,along,cross=0){return {x:feature.x+Math.sin(feature.heading)*along+Math.cos(feature.heading)*cross,z:feature.z+Math.cos(feature.heading)*along-Math.sin(feature.heading)*cross};}
test('ramps launch a forward racer and gravity brings it back to terrain',()=>{
 for(const ramp of RAMPS){const rider=createRider('himalayan'),p=point(ramp,-ramp.length/2+.2);Object.assign(rider,p,{y:groundHeight(p.x,p.z),yaw:ramp.heading,speed:18});let max=0,jumped=false,landed=false;
  for(let i=0;i<300;i++){stepRider(rider,{throttle:1},STEP,i*STEP,[]);max=Math.max(max,rider.y-baseHeight(rider.x,rider.z));if(rider.airborne)jumped=true;else if(jumped)landed=true;}
  assert(jumped);assert(landed);assert(max>2.5);assert(!rider.airborne);
 }
});
test('rivers, sand and snow are real surfaces; rain changes grip and movement',()=>{
 for(const river of RIVERS)assert.equal(surfaceAt(river.x,river.z).name,'water');
 const sand=trackPoint(.41);assert.equal(surfaceAt(sand.x,sand.z).name,'sand');
 const dirt=trackPoint(.06);assert.equal(surfaceAt(dirt.x,dirt.z,'snow').name,'snow');
 const speeds={};for(const weather of ['clear','rain','snow']){const s=createRider();Object.assign(s,dirt,{yaw:0});for(let i=0;i<30;i++)stepRider(s,{throttle:1},STEP,i*STEP,[],weather);speeds[weather]=s.speed;}
 assert(speeds.clear>speeds.rain);assert(speeds.rain>speeds.snow);
});
test('arrow, spear and stone fly ballistically and hit a stationary racer',()=>{
 for(const id of [0,1,2]){const orc=createOrcs()[id],rider={id:99,...createRider()},combat=createCombat();Object.assign(rider,{x:orc.x+12,z:orc.z,y:groundHeight(orc.x+12,orc.z)});orc.targetId=99;let fired=false;
  for(let i=0;i<180;i++){stepCombat(combat,[orc],[rider],STEP,i*STEP);if(combat.projectiles.length)fired=true;}
  assert(fired,`weapon ${id} never fired`);assert.equal(rider.hits,1);assert.equal(rider.penalty,2);
 }
});
test('moving away after a launch makes a projectile miss, and expired shots are removed',()=>{
 const orc=createOrcs()[0],rider={id:50,...createRider()},combat=createCombat();Object.assign(rider,{x:orc.x+15,z:orc.z,y:groundHeight(orc.x+15,orc.z)});orc.targetId=50;
 for(let i=0;i<40;i++)stepCombat(combat,[orc],[rider],STEP,i*STEP);assert(combat.projectiles.length);rider.z+=12;
 for(let i=0;i<300;i++)stepCombat(combat,[],[rider],STEP,i*STEP);assert.equal(rider.hits,0);assert.equal(combat.projectiles.length,0);
});
test('six motorcycle IDs include the reference MT-07 and all terrain state remains deterministic',()=>{
 assert.equal(BIKES.length,6);assert(BIKES.some(b=>b.id==='mt07'));const a=createRider(),b=createRider(),oa=createOrcs(),ob=createOrcs(),ca=createCombat(),cb=createCombat();a.id=b.id=4;
 for(let i=0;i<1200;i++)for(const [r,o,c]of [[a,oa,ca],[b,ob,cb]]){stepOrcs(o,[r],STEP,i*STEP);stepCombat(c,o,[r],STEP,i*STEP);stepRider(r,{throttle:i>900?1:0},STEP,i*STEP,o,'rain');}
 assert.deepEqual(a,b);assert.deepEqual(oa,ob);assert.deepEqual(ca,cb);
});
