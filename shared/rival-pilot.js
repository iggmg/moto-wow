import {routeGuidance,nearestTrack,trackPoint,trackData,cornerAdvice,angleDiff,clamp} from './game.js';
export function rivalInput(s,weather='clear',pace=1){
 const n=nearestTrack(s.x,s.z,s.trackId),point=trackPoint(n.t+5/trackData(s.trackId).length,s.trackId),advice=cornerAdvice(s,weather),aim=Math.atan2(point.x-s.x,point.z-s.z),target=Math.min(advice.speed,weather==='snow'?11:17)*pace;
 return {steer:clamp(-angleDiff(aim,s.yaw)*4,-1,1),throttle:s.speed<target?1:0,brake:s.speed>target+.2?.7:0,rearBrake:0,reverse:0};
}
