import { createRider, createOrcs, WEATHER, trackById, VERSION } from '../shared/game.js';
import { createCombat } from '../shared/combat.js';
export const validLaps=n=>[1,3,5].includes(n)?n:3;
export function createRoom(code,msg,userId){
 const mode=msg.mode==='race'?'race':'open',track=trackById(msg.trackId);
 return {code,time:0,mode,trackId:track.id,trackRevision:track.revision,physicsVersion:VERSION,phase:mode==='race'?'lobby':'racing',hostId:userId,laps:validLaps(msg.laps),startAt:null,round:0,weather:WEATHER.includes(msg.weather)?msg.weather:track.weather,combat:createCombat(),orcs:createOrcs(0,track.id),players:new Map()};
}
export function roomInfo(room){return {trackId:room.trackId,trackRevision:room.trackRevision,physicsVersion:room.physicsVersion,code:room.code,mode:room.mode,phase:room.phase,hostId:room.hostId,laps:room.laps,startAt:room.startAt,round:room.round,players:room.players.size,weather:room.weather};}
export function startRoom(room,userId){
 if(room.mode!=='race'||room.phase!=='lobby'||room.hostId!==userId)return false;
 room.phase='countdown';room.startAt=room.time+3;room.round++;room.orcs=createOrcs(0,room.trackId);room.combat=createCombat();
 let slot=0;for(const p of room.players.values()){const best=p.state.best;p.state=createRider(p.state.bike,slot++,room.trackId);p.state.best=best;p.state.lapLimit=room.laps;p.input={};}
 return true;
}
export function returnToLobby(room,userId){
 if(room.mode!=='race'||room.phase!=='finished'||room.hostId!==userId)return false;
 room.phase='lobby';room.startAt=null;
 for(const p of room.players.values()){p.state.finished=false;p.state.health=100;p.state.speed=0;p.input={};}
 return true;
}
