import {nearestTrack,routePoint,routeHeading,trackData} from './tracks.js';
export function createWorldEvents(trackId){return {trackId,elapsed:0,nextAt:20,nextId:0,active:[],phase:'calm',message:''};}
export function eventObstacles(event,time){
 if(time<event.activeAt||time>=event.endAt)return [];const sin=Math.sin(event.heading),cos=Math.cos(event.heading),u=(time-event.activeAt)/(event.endAt-event.activeAt),span=event.roadWidth+14;
 if(event.type==='gate')return [{id:-1000-event.id*8,type:'gate',x:event.x+cos*event.roadWidth*.25,z:event.z-sin*event.roadWidth*.25,radius:2.1,height:1.9,vx:0,vz:0}];
 const count=event.type==='boars'?4:1,speed=span/(event.endAt-event.activeAt);return Array.from({length:count},(_,i)=>{const cross=(u-.5)*span+i*.9,along=event.type==='boars'?(i%2-.5)*2:0;return {id:-1000-event.id*8-i,type:event.type==='boars'?'boar':'cart',x:event.x+cos*cross+sin*along,z:event.z-sin*cross+cos*along,radius:event.type==='boars'?.85:1.75,height:event.type==='boars'?.9:2.55,vx:cos*speed,vz:-sin*speed};});
}
export function worldObstacles(events,time){return events?.active.flatMap(e=>eventObstacles(e,time))||[];}
export function stepWorldEvents(events,riders,orcs,dt,time){
 events.elapsed+=dt;events.active=events.active.filter(e=>time<e.endAt);
 const alive=riders.filter(s=>!s.finished&&s.health>0&&!s.safeCamp),focus=alive.find(s=>s.cargoCarrier)||alive[events.nextId%Math.max(1,alive.length)];
 if(!focus){events.phase='calm';events.message='';return;}
 const pressure=orcs.filter(o=>o.targetId===focus.id).length,relief=focus.health<35||pressure>=3;
 events.phase=relief?'relief':events.active.length?'danger':'calm';
 if(events.elapsed>=events.nextAt){events.nextAt=events.elapsed+(relief?10:40);if(!relief&&!events.active.length){const near=nearestTrack(focus.x,focus.z,focus.trackId,focus.branchId),ahead=Math.max(45,Math.abs(focus.speed)*4),t=near.t+ahead/trackData(focus.trackId).length,p=routePoint(t,focus.trackId,near.branchId),type=['cart','boars','gate'][events.nextId%3];events.active.push({id:++events.nextId,type,x:p.x,z:p.z,heading:routeHeading(t,focus.trackId,near.branchId),roadWidth:near.width,activeAt:time+2.5,endAt:time+(type==='gate'?10:8.5)});}}
 const warning=events.active.find(e=>time<e.activeAt);events.message=warning?({cart:'ПОВОЗКА ВЫЕЗЖАЕТ · СМОТРИ ВПЕРЁД',boars:'КАБАНЫ ПЕРЕБЕГАЮТ ДОРОГУ',gate:'ЧАСТЬ ДОРОГИ СКОРО ПЕРЕКРОЕТСЯ'}[warning.type]):events.phase==='relief'?'ПЕРЕДЫШКА · ПОПОЛНИ ЗАПАСЫ':'';
}
