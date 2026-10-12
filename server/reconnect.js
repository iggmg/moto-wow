export const RECONNECT_GRACE=20000;
export function rememberDisconnect(room,player,code,now=Date.now()){
 if(![1001,1006,4000].includes(code))return false;
 room.detached||=new Map();if(room.detached.size>=8)return false;
 player.state.cargoCarrier=false;if(room.mode==='elimination'){player.state.finished=true;player.state.adventure.eliminated=true;}
 room.detached.set(player.user.id,{state:player.state,seq:player.seq,actionSeq:player.actionSeq,round:room.round,time:room.time,phase:room.phase,runSerial:player.runSerial,recorder:player.recorder,activityRecorder:player.activityRecorder,resultSaved:player.resultSaved,lastEvent:player.lastEvent,recordHits:player.recordHits,cosmetic:player.cosmetic,expires:now+RECONNECT_GRACE});return true;
}
export function resumable(room,userId,now=Date.now()){const cached=room.detached?.get(userId);return cached&&cached.expires>now&&cached.round===room.round?cached:null;}
export function restoreDisconnected(room,userId,now=Date.now()){
 const cached=resumable(room,userId,now);room.detached?.delete(userId);if(!cached)return null;
 const s=cached.state,gap=Math.max(0,room.time-cached.time);const racingGap=cached.phase==='racing'?gap:cached.phase==='countdown'?Math.max(0,room.time-Math.max(cached.time,room.startAt??room.time)):0;if(!s.finished){s.lapTime+=racingGap;s.raceTime+=racingGap;if(s.activity?.running)s.activity.seconds+=racingGap;}
 s.speed=0;s.steer=0;s.rearBrake=0;s.contactVX=s.contactVZ=0;s.contactShield=2;s.hitCooldown=Math.max(0,s.hitCooldown-gap);s.cargoCarrier=room.adventure?.cargo.ownerId===userId;return {...cached,state:s};
}
export function expireDisconnected(room,now=Date.now()){for(const [id,c]of room.detached||[])if(c.expires<=now||c.round!==room.round)room.detached.delete(id);}
