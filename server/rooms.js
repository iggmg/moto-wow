import {applyPracticeRules,dailyChallenge} from '../shared/practice.js';
import {ReplayRecorder,replayContext} from '../shared/replay.js';
import {randomUUID} from 'node:crypto';
import {ADVENTURE_MODES,createAdventure,initAdventure} from '../shared/adventure.js';
import {createArcade,initArcade} from '../shared/arcade.js';
import { createRider, createOrcs, WEATHER, trackById, VERSION } from '../shared/game.js';
import { createCombat } from '../shared/combat.js';
export const synchronizedMode=mode=>mode==='race'||ADVENTURE_MODES.includes(mode);
export const validLaps=n=>[1,3,5].includes(n)?n:3;
export function createRoom(code,msg,userId){
 const mode=['timeattack','race','arcade',...ADVENTURE_MODES].includes(msg.mode)?msg.mode:'open',track=trackById(msg.trackId);
 return {code,time:0,mode,trackId:track.id,trackRevision:track.revision,physicsVersion:VERSION,championship:mode==='race'&&msg.championship===true,challengeId:mode==='timeattack'&&msg.challengeId?dailyChallenge().id:'',enemies:mode==='timeattack'?false:mode==='race'&&msg.championship===true?true:msg.enemies!==false,contactDamage:(['race','elimination','totem'].includes(mode)||msg.contactDamage===true)&&!(mode==='race'&&msg.friendly===true&&msg.championship!==true),phase:mode==='timeattack'?'countdown':synchronizedMode(mode)?'lobby':'racing',hostId:userId,laps:mode==='race'&&msg.championship===true?1:validLaps(msg.laps),startAt:mode==='timeattack'?3:null,round:0,weather:mode==='race'&&msg.championship===true?track.weather:WEATHER.includes(msg.weather)?msg.weather:track.weather,matchId:randomUUID(),adventure:createAdventure(mode,track.id),arcade:['arcade','courier'].includes(mode)?createArcade(track.id):null,combat:createCombat(),orcs:mode==='timeattack'||msg.enemies===false&&msg.championship!==true?[]:createOrcs(0,track.id),players:new Map()};
}
export function roomInfo(room){return {trackId:room.trackId,trackRevision:room.trackRevision,physicsVersion:room.physicsVersion,championship:room.championship,fieldSize:room.fieldSize||room.players.size,challengeId:room.challengeId,contactDamage:room.contactDamage,enemies:room.enemies,code:room.code,mode:room.mode,phase:room.phase,hostId:room.hostId,laps:room.laps,startAt:room.startAt,round:room.round,players:room.players.size,weather:room.weather};}
export function startRoom(room,userId){
 if(!synchronizedMode(room.mode)||room.phase!=='lobby'||room.hostId!==userId)return false;
 room.fieldSize=room.players.size;room.phase='countdown';room.startAt=room.time+3;room.round++;room.orcs=room.enemies?createOrcs(0,room.trackId):[];room.combat=createCombat();room.adventure=createAdventure(room.mode,room.trackId);room.matchId=randomUUID();if(room.mode==='courier')room.arcade=createArcade(room.trackId);
 let slot=0;for(const p of room.players.values()){const best=p.state.best;p.state=createRider(p.state.bike,slot++,room.trackId);p.state.best=best;p.state.id=p.user?.id??p.state.id;if(ADVENTURE_MODES.includes(room.mode))initAdventure(p.state,room.mode);else p.state.lapLimit=room.laps;p.state.fieldSize=room.fieldSize;p.state.variant=(room.mode!=='timeattack'&&!room.enemies||room.mode==='race'&&!room.contactDamage)?'casual':'standard';p.state.cosmetic=p.cosmetic||'';p.recorder=new ReplayRecorder(replayContext(p.state,room.mode,room.weather,room.challengeId),p.state);p.lastEvent=0;p.resultSaved=null;p.actionSeq=0;p.input={};}
 return true;
}
export function returnToLobby(room,userId){
 if(!synchronizedMode(room.mode)||room.phase!=='finished'||room.hostId!==userId)return false;
 room.phase='lobby';room.startAt=null;
 for(const p of room.players.values()){p.state.finished=false;p.state.health=100;p.state.speed=0;p.input={};}
 return true;
}
