import {trackPoint,trackHeading,groundHeight,nearestTrack,trackData,CHECKPOINTS} from './tracks.js';
export const PICKUP_NAMES={fuel:'Бензин',oil:'Масло · ремонт',boost:'Ускорение',food:'Еда для орков'};
export function arcadeFeatures(trackId){return Array.from({length:32},(_,i)=>{const t=(i+.55)/32,p=trackPoint(t,trackId),yaw=trackHeading(t,trackId),offset=(i%3-1)*2;return {id:i,type:['fuel','food','oil','boost'][i%4],x:p.x+Math.cos(yaw)*offset,z:p.z-Math.sin(yaw)*offset};});}
export function oilPuddles(trackId){return [.16,.33,.49,.66,.82].map((t,id)=>({id,...trackPoint(t,trackId),radius:2}));}
export function createArcade(trackId){return {items:arcadeFeatures(trackId).map(p=>({...p,readyAt:0}))};}
export function initArcade(s){s.arcade={fuel:100,food:0,score:0,boostUntil:0,slipUntil:0,huntUntil:0,feedReady:0,helpReady:0,message:'Собирай бензин и еду. F — покормить орка.'};return s;}
export const friendlyTo=(orc,id,time)=> (orc.friends?.[id]?.until||0)>time;
export function strikeOrc(s,orc,orcs,time){if(!s.arcade||s.speed<6)return;const a=s.arcade;a.huntUntil=time+25;a.message='Ты сбил орка! Охота: 25 секунд.';for(const o of orcs){if(o.friends)delete o.friends[s.id];o.targetId=s.id;}}
export function feedOrc(s,orcs,combat,time){const a=s.arcade;if(!a||s.finished||a.food<1||time<a.feedReady)return false;const o=orcs.filter(o=>Math.hypot(o.x-s.x,o.z-s.z)<9).sort((p,q)=>Math.hypot(p.x-s.x,p.z-s.z)-Math.hypot(q.x-s.x,q.z-s.z))[0];if(!o){a.message='Подъедь к орку ближе: не больше 9 м.';return false;}
 const helper=friendlyTo(o,s.id,time);a.food--;a.feedReady=time+.75;a.score+=10;a.huntUntil=0;o.friends||={};o.friends[s.id]={until:time+35,helper};if(o.targetId===s.id){o.targetId=null;o.windup=0;o.attackCooldown=0;}
 // Shots aimed at the feeding rider by this orc are cancelled immediately.
 combat.projectiles=combat.projectiles.filter(p=>!(p.owner===o.id&&p.targetId===s.id));a.message=helper?'Орк стал помощником на 35 секунд.':'Орк сыт на 35 секунд. Ещё порция — и он поможет.';return true;
}
export function stepArcade(world,riders,orcs,combat,dt,time){
 for(const s of riders){const a=s.arcade;if(!a||s.finished)continue;
  a.fuel=Math.max(0,a.fuel-(s.speed>.05?dt*s.speed*.035:0));
  if(oilPuddles(s.trackId).some(p=>Math.hypot(s.x-p.x,s.z-p.z)<p.radius))a.slipUntil=time+1.2;
  for(const p of world.items){if(p.readyAt>time||Math.abs(s.y-groundHeight(p.x,p.z,s.trackId))>1.5||Math.hypot(s.x-p.x,s.z-p.z)>1.65)continue;p.readyAt=time+18;a.score+=5;
   if(p.type==='fuel')a.fuel=Math.min(100,a.fuel+35);if(p.type==='oil')s.health=Math.min(100,s.health+18);if(p.type==='food')a.food=Math.min(4,a.food+1);if(p.type==='boost')a.boostUntil=time+4;a.message=PICKUP_NAMES[p.type]+' +';
  }
  if(time>=a.helpReady&&s.speed<2&&nearestTrack(s.x,s.z,s.trackId).distance>trackData(s.trackId).width/2+3&&orcs.some(o=>friendlyTo(o,s.id,time)&&o.friends[s.id].helper&&Math.hypot(o.x-s.x,o.z-s.z)<16)){
   const t=Math.max(0,s.nextGate-1)/CHECKPOINTS,p=trackPoint(t,s.trackId);s.x=p.x;s.z=p.z;s.y=groundHeight(p.x,p.z,s.trackId);s.yaw=trackHeading(t,s.trackId);s.vy=0;s.speed=0;s.airborne=false;s.contactVX=s.contactVZ=0;s.contactShield=2;s.penalty+=3;s.totalPenalty+=3;a.helpReady=time+20;a.message='Орк вернул тебя к пройденной точке. Штраф +3 с.';
  }
 }
}
