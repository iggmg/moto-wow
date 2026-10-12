import {TRACKS,PHYSICS_VERSION,trackById} from './tracks.js';
const bikeIds=['cub','exciter','himalayan','winner','pcx','mt07'];
export function applyPracticeRules(s,mode){
 s.practice={training:mode==='training',noEnemies:mode==='training'||mode==='timeattack'};
 if(mode==='training'||mode==='open')s.lapLimit=0;
 if(mode==='timeattack')s.lapLimit=1;
 return s;
}
export function dailyChallenge(day=new Date().toISOString().slice(0,10)){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day+'T00:00:00Z'))||new Date(day+'T00:00:00Z').toISOString().slice(0,10)!==day)throw new Error('Invalid challenge day');
 let hash=2166136261;for(const c of day)hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;
 const track=TRACKS[hash%TRACKS.length],bike=bikeIds[Math.floor(hash/7)%bikeIds.length];
 return {id:`daily-${day}-v${PHYSICS_VERSION}`,day,mode:'timeattack',bike,trackId:track.id,trackRevision:trackById(track.id).revision,physicsVersion:PHYSICS_VERSION,weather:track.weather,laps:1};
}
