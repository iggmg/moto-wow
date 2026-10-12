import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BIKES,createRider,stepRider,angleDiff,clamp} from '../shared/game.js';
import {trackData,nearestTrack,routePoint,routeHeading,routeScale,groundHeight} from '../shared/tracks.js';
test('every motorcycle can drive each alternative in clear/rain/snow using normal steering and brakes',()=>{
 for(const id of ['rift','canyon'])for(const branch of trackData(id).BRANCHES)for(const bike of BIKES)for(const weather of ['clear','rain','snow']){
  const t=branch.start+.0002,p=routePoint(t,id,branch.id),s=createRider(bike.id,0,id);Object.assign(s,{x:p.x,z:p.z,y:groundHeight(p.x,p.z,id),yaw:routeHeading(t,id,branch.id),travelYaw:routeHeading(t,id,branch.id),nextGate:Math.ceil(branch.start*16),hitCooldown:9999});let reached=false,widest=0;
  const length=trackData(id).length*routeScale(id,branch.id);
  for(let i=0;i<3600;i++){const n=nearestTrack(s.x,s.z,id,s.branchId),point=routePoint(n.t+4/length,id,branch.id),angle=angleDiff(Math.atan2(point.x-s.x,point.z-s.z),s.yaw);let bend=0;for(const d of [4,8,12,16])bend=Math.max(bend,Math.abs(angleDiff(routeHeading(n.t+(d+2)/length,id,branch.id),routeHeading(n.t+(d-2)/length,id,branch.id)))/4);const speed=clamp(Math.sqrt((weather==='snow'?4:weather==='rain'?5:6)/Math.max(.01,bend))*.7,2.5,weather==='snow'?7:10);
   stepRider(s,{throttle:s.speed<speed?1:0,brake:s.speed>speed+.1?.7:0,steer:clamp(-angle*4,-1,1)},1/60,i/60,[],weather);widest=Math.max(widest,nearestTrack(s.x,s.z,id,s.branchId).distance-nearestTrack(s.x,s.z,id,s.branchId).width/2);if(n.t>branch.end&&n.t<branch.end+.03){reached=true;break;}
  }
  assert(reached,`${id}/${branch.id}/${bike.id}/${weather} rejoins the route`);assert(widest<=.15,`${id}/${branch.id}/${bike.id}/${weather} stays on legal roads`);
 }
});
