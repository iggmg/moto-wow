import {STUNT_LEVELS} from './stunt.js';
import {SETUPS} from './tuning.js';
import {BIKES,VERSION,WEATHER,trackById,angleDiff} from './game.js';
export const REPLAY_VERSION=1;
const modes=['solo','timeattack','race','open','arcade','courier','elimination','totem','stunt'];
export function replayContext(s,mode,weather,challengeId=''){return {bike:s.bike,mode,weather,trackId:s.trackId,trackRevision:s.trackRevision,physicsVersion:VERSION,challengeId,setup:s.setup||'stock',level:s.level||'',laps:mode==='race'?(s.lapLimit||1):['courier','elimination','totem','stunt'].includes(mode)?0:1,variant:s.variant||'standard'};}
export function sameReplayContext(a,b){return ['bike','mode','weather','trackId','trackRevision','physicsVersion','challengeId','setup','level','laps','variant'].every(k=>(a[k]??(k==='setup'?'stock':k==='variant'?'standard':k==='laps'?(['courier','elimination','totem','stunt'].includes(a.mode)?0:1):''))===(b[k]??(k==='setup'?'stock':k==='variant'?'standard':k==='laps'?(['courier','elimination','totem','stunt'].includes(b.mode)?0:1):'')));}
export function validateReplay(data){
 if(!data||data.version!==REPLAY_VERSION||!data.context||!Array.isArray(data.frames)||data.frames.length<2||data.frames.length>9002)throw new Error('Повтор повреждён или слишком большой.');
 const c=data.context;if(c.laps!==undefined&&![0,1,3,5].includes(c.laps)||c.variant!==undefined&&!['standard','casual'].includes(c.variant))throw new Error('Некорректные правила повтора.');const track=trackById(c.trackId);if(c.mode==='stunt'&&!STUNT_LEVELS.some(l=>l.id===c.level))throw new Error('Неизвестный уровень станта.');if(!BIKES.some(b=>b.id===c.bike)||!modes.includes(c.mode)||!WEATHER.includes(c.weather)||track.id!==c.trackId||track.revision!==c.trackRevision||c.physicsVersion!==VERSION)throw new Error('Повтор относится к другим правилам или трассе.');
 if(!Number.isFinite(data.seconds)||data.seconds<=0||data.seconds>1800||!Number.isFinite(data.duration)||data.duration<=0||data.duration>900)throw new Error('Некорректное время повтора.');
 let last=-1;for(const f of data.frames){if(!Array.isArray(f)||f.length!==8||!f.every(Number.isFinite)||f[0]<0||f[0]<=last||f[0]>data.duration+.05||Math.abs(f[1])>230||Math.abs(f[3])>190||Math.abs(f[2])>100||Math.abs(f[4])>10000||Math.abs(f[5])>4||Math.abs(f[6])>4||Math.abs(f[7])>80)throw new Error('Некорректные точки повтора.');last=f[0];}
 if(Math.abs(last-data.duration)>.15||!Array.isArray(data.sectors)||data.sectors.length>16||data.sectors.some(f=>!Array.isArray(f)||f.length!==2||!Number.isInteger(f[0])||f[0]<1||f[0]>16||!Number.isFinite(f[1])||f[1]<0||f[1]>data.seconds+.05))throw new Error('Некорректные секторы повтора.');
 return {version:REPLAY_VERSION,source:data.source==='friend'?'friend':'own',context:{bike:c.bike,mode:c.mode,weather:c.weather,trackId:c.trackId,trackRevision:c.trackRevision,physicsVersion:VERSION,challengeId:typeof c.challengeId==='string'?c.challengeId.slice(0,40):'',setup:Object.hasOwn(SETUPS,c.setup)?c.setup:'stock',level:c.mode==='stunt'?c.level:'',laps:c.laps??(['courier','elimination','totem','stunt'].includes(c.mode)?0:1),variant:c.variant==='casual'?'casual':'standard'},seconds:data.seconds,duration:data.duration,events:cleanReplayEvents(data.events,data.duration),frames:data.frames.map(f=>f.slice()),sectors:data.sectors.map(f=>f.slice())};
}
export class ReplayRecorder {
 constructor(context,s){this.context=context;this.frames=[];this.interval=.099;this.sectors=[];this.events=[];this.initialScore=s.arcade?.score||0;this.initialStyle=s.arcade?.style?.points||0;this.initialHits=s.hits||0;this.origin=s.raceTime||0;this.gate=s.nextGate;this.update(s,true);}
 update(s,force=false){const t=+(Math.max(0,s.raceTime-this.origin)).toFixed(3);if(t>900)return;if(s.nextGate>this.gate){this.sectors.push([s.nextGate-1,t+(s.penalty||0)]);this.gate=s.nextGate;}
  if(this.frames.length&&t<=this.frames.at(-1)[0]||!force&&this.frames.length&&t-this.frames.at(-1)[0]<this.interval)return;
  if(this.frames.length>=4500){this.frames=this.frames.filter((_,i)=>i%2===0);this.interval*=2;}
  this.frames.push([t,s.x,s.y,s.z,s.yaw,s.lean||0,s.pitch||0,s.speed].map((n,i)=>i?+n.toFixed(3):n));
 }
 event(type,s){const t=+(Math.max(0,s.raceTime-this.origin)).toFixed(3);if(t<=900){this.events.push({type,time:t});if(this.events.length>64)this.events.shift();}}
 finish(seconds,s){this.update(s,true);const duration=this.frames.at(-1)?.[0]||0;if(this.context.mode!=='stunt')this.sectors.push([16,seconds]);return validateReplay({version:REPLAY_VERSION,context:this.context,frames:this.frames,sectors:this.sectors.slice(0,16),events:this.events,duration,seconds});}
}
export function sampleReplay(replay,time){
 if(!replay||time<0||time>replay.duration+.1)return null;const frames=replay.frames;let a=0,b=frames.length-1;while(b-a>1){const m=(a+b)>>1;if(frames[m][0]<=time)a=m;else b=m;}
 const lo=frames[a],hi=frames[b],f=Math.max(0,Math.min(1,(time-lo[0])/(hi[0]-lo[0]))),v=lo.map((x,i)=>i===4||i===6&&replay.context.mode==='stunt'?x+angleDiff(hi[i],x)*f:x+(hi[i]-x)*f);
 return {x:v[1],y:v[2],z:v[3],yaw:v[4],lean:v[5],pitch:v[6],speed:v[7]};
}

const replayEventTypes=['hit','jump','drift','pickup','pass','bank','rescue','fuel','distract','extra','drop','eliminate','finish','reset'];
export function cleanReplayEvents(events,duration){if(events===undefined)return [];if(!Array.isArray(events)||events.length>64)throw new Error('Некорректные события повтора.');return events.map(e=>{if(!e||!replayEventTypes.includes(e.type)||!Number.isFinite(e.time)||e.time<0||e.time>duration+.05)throw new Error('Некорректное событие повтора.');return {type:e.type,time:e.time};});}
