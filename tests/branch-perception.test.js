import {test} from 'node:test';
import assert from 'node:assert/strict';
import {trackData,routePoint,routeHeading,routeGuidance,surfaceAt,groundHeight,revisionForRules} from '../shared/tracks.js';
import {createRider,stepRider,createOrcs,stepOrcs} from '../shared/game.js';
import {clearSight,perceives} from '../shared/perception.js';
test('all alternatives are real legal roads with matching alternate gates and guidance',()=>{
 for(const id of ['rift','canyon']){const data=trackData(id);assert.equal(data.BRANCHES.length,2);for(const branch of data.BRANCHES){const t=(branch.start+branch.end)/2,p=routePoint(t,id,branch.id),yaw=routeHeading(t,id,branch.id);assert.equal(surfaceAt(p.x,p.z,'clear',id).offRoad,false);const guide=routeGuidance({...p,yaw,speed:5,trackId:id});assert.equal(guide.branchId,branch.id);assert.equal(guide.offRoad,false);assert.equal(guide.wrongWay,false);
 for(const gate of data.GATES){const alt=gate.alternatives.find(g=>g.branchId===branch.id);if(!alt)continue;const s=createRider('winner',0,id);s.nextGate=Math.round(gate.t*16);Object.assign(s,{x:alt.x-Math.sin(alt.heading)*.04,z:alt.z-Math.cos(alt.heading)*.04,y:groundHeight(alt.x,alt.z,id),yaw:alt.heading,travelYaw:alt.heading,speed:6});stepRider(s,{},1/60,0,[]);assert.equal(s.nextGate,Math.round(gate.t*16)+1);assert.equal(s.offRoad,false);}
 }}assert.equal(revisionForRules('rift',14),2);assert.equal(revisionForRules('rift',15),3);
});
test('a rock blocks sight and moving riders outside hearing need the orc facing them',()=>{
 const id='rift',o=trackData(id).OBSTACLES.find(o=>o.type==='rock'&&!o.scenery),a={x:o.x-3,z:o.z,y:groundHeight(o.x,o.z,id),trackId:id,yaw:Math.PI/2},b={id:1,x:o.x+3,z:o.z,y:a.y,speed:10};assert.equal(clearSight(a,b,id),false);
 const orc=createOrcs()[0],front={x:orc.x+Math.sin(orc.yaw)*50,z:orc.z+Math.cos(orc.yaw)*50,speed:3};assert.equal(perceives(orc,{...front,practice:{noEnemies:true}},0),false);assert.equal(perceives(orc,{...front,safeCamp:true},0),false);
 const behind={x:orc.x-Math.sin(orc.yaw)*50,z:orc.z-Math.cos(orc.yaw)*50,speed:3};assert.equal(perceives(orc,behind,0),false);
});
test('orc forgets a hidden target after its search memory expires',()=>{
 const orcs=createOrcs(),orc=orcs[0],rider={id:1,x:orc.x+5,z:orc.z,speed:0};stepOrcs(orcs,[rider],1/60,1);assert.equal(orc.targetId,1);rider.x=orc.x-Math.sin(orc.yaw)*80;rider.z=orc.z-Math.cos(orc.yaw)*80;rider.speed=5;stepOrcs(orcs,[rider],1/60,5);assert.equal(orc.targetId,null);
});
