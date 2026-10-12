import {trackPoint,trackHeading,groundHeight} from './tracks.js';
const ringCache=new Map();
export function campRings(id){if(!ringCache.has(id))ringCache.set(id,[.016,.03,.044,.058,.072,.086].map((t,i)=>({id:i,t,...trackPoint(t,id),heading:trackHeading(t,id)})));return ringCache.get(id);}
export function startCampSprint(s){const camp=trackPoint(0,s.trackId);if(s.finished||s.health===0||s.activity?.running||Math.hypot(s.x-camp.x,s.z-camp.z)>12)return false;s.activity={serial:(s.activity?.serial||0)+1,running:true,seconds:0,next:0,finished:false,lastPenalty:s.totalPenalty||0,hits:s.hits,previous:{x:s.x,z:s.z}};return true;}
export function campSprintSafe(s){return s.activity?.running&&campRings(s.trackId).some(p=>Math.hypot(p.x-s.x,p.z-s.z)<14);}
export function stepCampSprint(s,dt){const a=s.activity;if(!a?.running)return null;a.seconds+=dt;const ring=campRings(s.trackId)[a.next];if(a.seconds>90||s.finished||s.health===0){a.running=false;a.message='Попытка закончилась. Вернись к костру.';return null;}
 const before=a.previous,dx=s.x-before.x,dz=s.z-before.z,len=dx*dx+dz*dz,t=len?Math.max(0,Math.min(1,((ring.x-before.x)*dx+(ring.z-before.z)*dz)/len)):0;
 if(len>144){a.previous={x:s.x,z:s.z};return null;}
 // Ordered swept gates cannot be completed by holding a button at the camp.
 if(Math.hypot(before.x+dx*t-ring.x,before.z+dz*t-ring.z)<2.6&&Math.abs(s.y+1.2-groundHeight(ring.x,ring.z,s.trackId)-2.5)<2.5&&Math.cos(s.yaw-ring.heading)>.2){a.next++;if(a.next===6){a.running=false;a.finished=true;a.result=a.seconds+Math.max(0,(s.totalPenalty||0)-a.lastPenalty);a.message='Разминка пройдена! Все шесть колец.';return a.result;}}
 a.previous={x:s.x,z:s.z};return null;
}
