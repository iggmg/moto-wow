import {nearestTrack} from './tracks.js';
const freshStyle=()=>({points:0,combo:0,lastEarned:-99,driftTime:0,driftDistance:0,airTime:0,airborne:false,lastHits:0,awards:[]});
function earn(s,type,zone,base,time){const a=s.arcade,t=a.style,key=`${s.completed}-${type}-${zone}`;if(t.awards.includes(key))return false;t.awards.push(key);if(t.awards.length>64)t.awards.shift();t.combo=time-t.lastEarned<8?Math.min(4,t.combo+1):1;t.lastEarned=time;const points=Math.round(base*(1+(t.combo-1)*.25));t.points+=points;a.score+=points;a.boostUntil=Math.max(a.boostUntil,time+.9);a.message=`${type==='drift'?'Чистый дрифт':'Чистое приземление'} +${points} · цепочка ${t.combo}`;return true;}
export function stepRidingStyle(s,dt,time){
 if(!s.arcade||s.finished)return;const a=s.arcade,t=a.style||=freshStyle(),zone=Math.floor(nearestTrack(s.x,s.z,s.trackId).t*16);
 if(s.hits>t.lastHits||s.offRoad){t.combo=0;t.driftTime=0;t.driftDistance=0;t.airTime=0;t.cleanAir=false;}t.lastHits=s.hits;
 const sliding=!s.airborne&&!s.offRoad&&s.speed>5&&Math.abs(s.slipAngle||0)>.18&&Math.abs(s.slipAngle||0)<.9;
 if(sliding){if(t.driftTime===0)t.driftZone=zone;t.driftTime+=dt;t.driftDistance+=s.speed*dt;}
 else if(!s.airborne&&Math.abs(s.slipAngle||0)<.1&&(s.rearBrake||0)<.15){if(t.driftTime>.7&&t.driftDistance>8&&s.speed>4&&!s.offRoad&&s.hitCooldown===0)earn(s,'drift',t.driftZone,20,time);t.driftTime=0;t.driftDistance=0;}
 if(s.airborne){if(!t.airborne){t.airTime=0;t.cleanAir=!s.offRoad&&s.hitCooldown===0;t.airZone=zone;}t.airTime+=dt;}
 else if(t.airborne){if(t.cleanAir&&t.airTime>.3&&Math.abs(s.lean||0)<.7&&!s.offRoad&&s.hitCooldown===0)earn(s,'jump',t.airZone,25,time);t.airTime=0;}
 t.airborne=!!s.airborne;if(time-t.lastEarned>8)t.combo=0;
}
