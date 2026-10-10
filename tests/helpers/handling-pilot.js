import {trackData,createRider,nearestTrack,trackPoint,trackHeading,angleDiff,clamp,stepRider,STEP} from '../../shared/game.js';
// Uses only ordinary controls. No resets, position corrections or heading snaps.
export function driveHandlingLap(bike,track,weather){
 const data=trackData(track.id),s=createRider(bike.id,0,track.id);s.hitCooldown=99999;let widest=0;
 for(let i=0;i<24000&&!s.completed;i++){
  const n=nearestTrack(s.x,s.z,track.id),p=trackPoint(n.t+5/data.length,track.id),angle=angleDiff(Math.atan2(p.x-s.x,p.z-s.z),s.yaw);let bend=0;
  for(const distance of [5,10,15,20,25])bend=Math.max(bend,Math.abs(angleDiff(trackHeading(n.t+(distance+3)/data.length,track.id),trackHeading(n.t+(distance-3)/data.length,track.id)))/6);
  const target=clamp(Math.sqrt((weather==='snow'?4.5:weather==='rain'?5.5:7)/Math.max(.008,bend))*.78,4,track.id==='summit'?8:weather==='snow'?11:13);
  widest=Math.max(widest,n.distance);stepRider(s,{throttle:s.speed<target?1:0,brake:s.speed>target+.15?.65:0,steer:clamp(-angle*4,-1,1)},STEP,i*STEP,[],weather);
 }
 return {state:s,widest,average:s.completed?data.length/s.last:0};
}
