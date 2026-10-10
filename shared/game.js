import { friendlyTo,strikeOrc } from './arcade.js';
import { damageRider } from './health.js';
export const VERSION = 10;
export const STEP = 1 / 60;
import {DEFAULT_TRACK,PHYSICS_VERSION,CHECKPOINTS,trackData,trackById,trackPoint,trackHeading,groundHeight,baseHeight,rampAt,featureCoords,surfaceAt,ORCS} from './tracks.js';
export * from './tracks.js';
export const BIKES = [
  { id:'cub', name:'Honda CUB', type:'Классика · тёмный кузов, кремовый щит', color:0x172b27, maxSpeed:24, acceleration:5.5, handling:1.2, mudGrip:.68, wheel:.30, wheelbase:1.22, seatY:.75, mass:110, label:'CUB', class:'underbone' },
  { id:'exciter', name:'Yamaha Exciter', type:'Спорт · фиолетовая раскраска', color:0x7040bf, maxSpeed:36, acceleration:8.4, handling:1.06, mudGrip:.51, wheel:.30, wheelbase:1.29, seatY:.79, mass:121, label:'EXCITER', class:'sport' },
  { id:'himalayan', name:'Royal Enfield Himalayan', type:'Турэндуро · заводской Granite Black', color:0x343b3c, maxSpeed:33, acceleration:6.8, handling:.88, mudGrip:.91, wheel:.35, frontWheel:.365, wheelbase:1.465, seatY:.80, mass:199, label:'HIMALAYAN', class:'adventure' },
  { id:'winner', name:'Honda Winner', type:'Спорт · сине-оранжевые акценты', color:0x142027, maxSpeed:35, acceleration:8, handling:1.14, mudGrip:.59, wheel:.30, wheelbase:1.27, seatY:.78, mass:122, label:'WINNER', class:'sport' },
  { id:'pcx', name:'Honda PCX', type:'Скутер · чёрный кузов', color:0x11171c, maxSpeed:29, acceleration:6.2, handling:1.01, mudGrip:.43, wheel:.27, wheelbase:1.315, seatY:.76, mass:131, label:'PCX', class:'scooter' },
  { id:'mt07', name:'Yamaha MT-07', type:'Нейкед · бирюзовые колёса', color:0x303b3e, maxSpeed:42, acceleration:10.5, handling:.95, mudGrip:.55, wheel:.30, wheelbase:1.40, seatY:.80, mass:184, label:'MT-07', class:'naked' }
];
export const bikeById = id => BIKES.find(b=>b.id===id) || BIKES[0];
export const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
export const angleDiff = (a,b) => Math.atan2(Math.sin(a-b), Math.cos(a-b));
export const WEATHER=['clear','rain','snow'];
export const WEATHER_LABELS={clear:'Ясно',rain:'Дождь',snow:'Снег'};
export function orcPosition(orc,time) {
  const cross=Math.sin(time*.65+orc.id*1.7)*8;
  return {x:orc.x+Math.cos(orc.heading)*cross,z:orc.z-Math.sin(orc.heading)*cross};
}
export function createOrcs(time=0,trackId=DEFAULT_TRACK) {
  return trackData(trackId).ORCS.map(home=>({...orcPosition(home,time),id:home.id,trackId:home.trackId,yaw:home.heading,mode:'patrol',targetId:null,speed:0,attackCooldown:0}));
}
// The same fixed-step AI runs locally in training and once per authoritative room.
export function stepOrcs(orcs,riders,dt=STEP,time=0) {
  for(const orc of orcs) {
    const home=trackData(orc.trackId).ORCS[orc.id];
    let target=riders.find(r=>r.id===orc.targetId&&r.health!==0&&!r.finished&&!friendlyTo(orc,r.id,time));
    const distance=r=>Math.hypot(r.x-orc.x,r.z-orc.z);
    if(!target||distance(target)>100||Math.hypot(orc.x-home.x,orc.z-home.z)>110)target=null;
    if(!target) {
      let nearest=Infinity;
      for(const rider of riders) {
        if(rider.health===0||rider.finished||friendlyTo(orc,rider.id,time))continue;
        const d=distance(rider),alert=rider.arcade?.huntUntil>time?100:rider.speed<1?90:36;
        if(d<alert&&d<nearest&&Math.hypot(rider.x-home.x,rider.z-home.z)<110){target=rider;nearest=d;}
      }
    }
    orc.targetId=target?.id??null;
    const goal=target||orcPosition(home,time),d=Math.hypot(goal.x-orc.x,goal.z-orc.z);
    orc.attackCooldown=Math.max(0,orc.attackCooldown-dt);
    if(target&&d<1.4&&orc.attackCooldown===0)orc.attackCooldown=1.2;
    orc.mode=target?(orc.attackCooldown>0?'attack':'chase'):Math.hypot(orc.x-home.x,orc.z-home.z)>10?'return':'patrol';
    // Swing recovery gives even a slow bike time to pull away from contact.
    const speed=orc.mode==='attack'||orc.windup>0?0:target?4.2:orc.mode==='return'?4:2.2;
    const travel=Math.min(speed*dt,Math.max(0,d-(target?1.05:0)));
    orc.speed=travel/dt;
    if(d>.01) {
      const heading=Math.atan2(goal.x-orc.x,goal.z-orc.z);
      orc.yaw+=clamp(angleDiff(heading,orc.yaw),-6*dt,6*dt);
      orc.x+=(goal.x-orc.x)/d*travel;orc.z+=(goal.z-orc.z)/d*travel;
    }
  }
}
export function createRider(bike='cub',slot=0,trackId=DEFAULT_TRACK) {
  trackId=trackById(trackId).id;const p=trackPoint(0,trackId),yaw=trackHeading(0,trackId),offset=(slot%4-1.5)*2;
  return {trackId,trackRevision:trackById(trackId).revision,physicsVersion:PHYSICS_VERSION,contactShield:2,contactVX:0,contactVZ:0,health:100,lastDamage:null,finished:false,raceTime:0,totalPenalty:0,lapLimit:0,bike,x:p.x+Math.cos(yaw)*offset,z:p.z-Math.sin(yaw)*offset-(Math.floor(slot/4)*3),yaw,travelYaw:yaw,slipAngle:0,obstacleContact:null,speed:0,steer:0,y:groundHeight(p.x,p.z,trackId),vy:0,nextGate:1,lap:1,lapTime:0,best:0,last:0,hits:0,hitCooldown:0,surface:'dirt',distance:0,completed:0,penalty:0,airborne:false,lastRamp:null};
}
export function resetRider(s) {
  if(s.health===0||s.finished)return;
  const gate=Math.max(0,s.nextGate-1),t=gate/CHECKPOINTS,p=trackPoint(t,s.trackId);
  if(s.arcade&&s.arcade.fuel===0)s.arcade.fuel=20;s.contactShield=2;s.contactVX=0;s.contactVZ=0;s.x=p.x;s.z=p.z;s.yaw=trackHeading(t,s.trackId);s.travelYaw=s.yaw;s.slipAngle=0;s.obstacleContact=null;s.speed=0;s.y=groundHeight(p.x,p.z,s.trackId);s.vy=0;s.airborne=false;s.lastRamp=null;s.penalty+=5;s.totalPenalty=(s.totalPenalty||0)+5;
}
export function normalizeInput(input={}) {
  if(!input||typeof input!=='object')input={};
  return {throttle:clamp(Number(input.throttle)||0,0,1),brake:clamp(Number(input.brake)||0,0,1),steer:clamp(Number(input.steer)||0,-1,1)};
}
export function stepRider(s,rawInput,dt=STEP,time=0,orcs=null,weather='clear') {
  if(s.health===0||s.finished){s.speed=0;return null;}
  s.raceTime=(s.raceTime||0)+dt;s.contactShield=Math.max(0,(s.contactShield||0)-dt);
  const {GATES,RAMPS,ORCS,OBSTACLES}=trackData(s.trackId);
  const input=normalizeInput(rawInput),bike=bikeById(s.bike),surface=surfaceAt(s.x,s.z,weather,s.trackId);
  s.surface=surface.name;s.hitCooldown=Math.max(0,s.hitCooldown-dt);s.lapTime+=dt;
  const baseGrip={mud:bike.mudGrip,grass:.43,sand:.62,water:.48,snow:.45}[surface.name]??1;
  const slip=s.arcade?.slipUntil>time,boost=s.arcade?.boostUntil>time;const grip=baseGrip*(slip?.32:1)*(weather==='rain'?.80:1),drag={mud:1.5,grass:2.5,sand:1.6,water:2.2,snow:1.1}[surface.name]||0;
  const max=(s.arcade?.fuel===0?6:bike.maxSpeed*(boost?1.22:1))*({mud:.53+grip*.3,grass:.5,sand:.7,water:.55,snow:.68}[surface.name]??1);
  // Snow remains slippery for steering; low gear still supplies enough drive to restart uphill.
  const driveGrip=surface.name==='snow'?.80*(slip?.32:1):grip;
  const previous={x:s.x,z:s.z};
  if(s.speed<.5||!Number.isFinite(s.travelYaw))s.travelYaw=s.yaw;
  const resistance=.3+s.speed*s.speed*.004+drag;
  s.speed=clamp(s.speed+(input.throttle*bike.acceleration*driveGrip*(boost?1.8:1)-input.brake*14-resistance)*dt,0,max);
  s.steer+=(input.steer-s.steer)*Math.min(1,dt*7);
  s.yaw-=s.steer*(s.airborne?.15:1)*bike.handling*(.35+s.speed*.042)/(1+s.speed*.018)*dt*Math.sqrt(grip);
  // Lateral tyre response preserves the direction of momentum on slippery ground.
  // Low-speed assistance keeps uphill starts and tight hairpins controllable.
  if(!s.airborne){const traction=12*grip*grip+Math.max(0,10-s.speed)*2;s.travelYaw+=angleDiff(s.yaw,s.travelYaw)*(1-Math.exp(-traction*dt));}
  s.slipAngle=angleDiff(s.travelYaw,s.yaw);
  const dx=Math.sin(s.travelYaw)*s.speed*dt,dz=Math.cos(s.travelYaw)*s.speed*dt;
  s.x+=dx+(s.contactVX||0)*dt;s.z+=dz+(s.contactVZ||0)*dt;s.contactVX=(s.contactVX||0)*Math.exp(-dt*6);s.contactVZ=(s.contactVZ||0)*Math.exp(-dt*6);s.distance+=Math.hypot(dx,dz);
  s.x=clamp(s.x,-220,220);s.z=clamp(s.z,-180,180);
  const gy=groundHeight(s.x,s.z,s.trackId),ramp=rampAt(s.x,s.z,s.trackId);
  const hill=baseHeight(s.x+Math.sin(s.travelYaw),s.z+Math.cos(s.travelYaw),s.trackId)-baseHeight(s.x,s.z,s.trackId);
  if(s.speed>0&&!s.airborne)s.speed=clamp(s.speed-hill*2*dt,0,max);
  if(!s.airborne&&ramp){s.lastRamp=ramp.id;s.y=gy;s.vy=0;}
  else if(!s.airborne&&s.lastRamp!==null){
    const last=RAMPS[s.lastRamp],q=featureCoords(last,s.x,s.z),forward=Math.cos(s.yaw-last.heading);
    if(q.along>last.length/2&&forward>.4&&s.speed>5){s.airborne=true;s.vy=s.speed*last.height/last.length*forward+2.0;}
    s.lastRamp=null;
  }
  if(s.airborne){s.vy-=9.81*dt;s.y+=s.vy*dt;if(s.y<=gy){s.y=gy;s.vy=0;s.airborne=false;}}
  else {s.y=gy;s.vy=0;}
  if(s.obstacleContact!==null){const held=OBSTACLES[s.obstacleContact];if(!held||Math.hypot(s.x-held.x,s.z-held.z)>held.radius+.65)s.obstacleContact=null;}
  if(!s.airborne){
    for(const obstacle of OBSTACLES){
      const radius=obstacle.radius+.5,mx=s.x-previous.x,mz=s.z-previous.z,ox=previous.x-obstacle.x,oz=previous.z-obstacle.z;
      const a=mx*mx+mz*mz,b=2*(ox*mx+oz*mz),c=ox*ox+oz*oz-radius*radius,disc=b*b-4*a*c;
      let t=null;if(c<=0)t=0;else if(a>1e-12&&disc>=0){const entry=(-b-Math.sqrt(disc))/(2*a);if(entry>=0&&entry<=1)t=entry;}
      if(t===null)continue;
      let nx=ox+mx*t,nz=oz+mz*t,len=Math.hypot(nx,nz);if(len<.0001){nx=-Math.sin(s.travelYaw);nz=-Math.cos(s.travelYaw);len=1;}nx/=len;nz/=len;
      let vx=Math.sin(s.travelYaw)*s.speed+(s.contactVX||0),vz=Math.cos(s.travelYaw)*s.speed+(s.contactVZ||0);
      const impact=Math.max(0,-(vx*nx+vz*nz)),fresh=s.obstacleContact!==obstacle.id;
      if(fresh&&impact>1.5)damageRider(s,obstacle.type,impact);
      if(impact>1.5)s.obstacleContact=obstacle.id;
      // Remove motion into the solid object; a glancing contact keeps its tangent.
      vx+=nx*impact;vz+=nz*impact;const tangent=Math.hypot(vx,vz);
      s.x=obstacle.x+nx*(radius+.002);s.z=obstacle.z+nz*(radius+.002);
      s.speed=s.health>0?tangent*.92:0;s.contactVX=0;s.contactVZ=0;
      if(s.speed>.01)s.travelYaw=Math.atan2(vx,vz);s.slipAngle=angleDiff(s.travelYaw,s.yaw);s.y=groundHeight(s.x,s.z,s.trackId);
    }
  }
  if(s.hitCooldown<=0&&!s.airborne) {
    const enemies=orcs||ORCS.map(o=>orcPosition(o,time));
    const enemy=enemies.find(o=>Math.hypot(o.x-s.x,o.z-s.z)<1.4);
    if(enemy&&s.arcade&&s.speed>=6)strikeOrc(s,enemy,enemies,time);
    const melee=enemy&&!friendlyTo(enemy,s.id,time);
    if(melee)damageRider(s,'melee',s.speed);
  }
  if(s.health===0)return null;
  const gate=GATES[s.nextGate%CHECKPOINTS];
  if(Math.hypot(s.x-gate.x,s.z-gate.z)<10) {
    s.nextGate++;
    if(s.nextGate>CHECKPOINTS) {
      s.last=s.lapTime+s.penalty;s.best=s.best?Math.min(s.best,s.last):s.last;
      s.completed++;s.lap++;s.lapTime=0;s.penalty=0;s.nextGate=1;
      if(s.lapLimit&&s.completed>=s.lapLimit){s.finished=true;s.speed=0;}
      return {lap:s.last,bike:s.bike,trackId:s.trackId||DEFAULT_TRACK,trackRevision:trackById(s.trackId).revision,physicsVersion:PHYSICS_VERSION,weather};
    }
  }
  return null;
}
export function formatTime(seconds) {if(!seconds||!Number.isFinite(seconds))return '—';const ms=Math.floor(seconds*1000);return `${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}.${String(ms%1000).padStart(3,'0')}`;}
