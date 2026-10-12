import {clearSight,ROLE_WEAPONS} from './perception.js';
import {friendlyTo} from './arcade.js';
import { trackData,groundHeight,STEP } from './game.js';
import { damageRider } from './health.js';
export const WEAPONS=['arrow','spear','stone','orb'];
const specs={orb:{speed:13,gravity:0,range:26,cooldown:5.5,radius:.55},arrow:{speed:24,gravity:5,range:34,cooldown:3.2,radius:.45},spear:{speed:19,gravity:8,range:28,cooldown:4.2,radius:.55},stone:{speed:16,gravity:9.81,range:23,cooldown:3.8,radius:.65}};
export function createCombat(){return {projectiles:[],nextId:0};}
export const hitRider=(rider,type='arrow')=>damageRider(rider,type);
export function stepCombat(combat,orcs,riders,dt=STEP,time=0,extraObstacles=[]){
 for(const orc of orcs){
  orc.weapon=ROLE_WEAPONS[orc.role]||WEAPONS[orc.id%3];orc.shotCooldown=Math.max(0,(orc.shotCooldown||0)-dt);
  const target=riders.find(r=>r.id===orc.targetId&&!r.practice?.noEnemies&&!r.safeCamp&&r.health!==0&&!r.finished&&!friendlyTo(orc,r.id,time)),cfg=specs[orc.weapon];
  const d=target?Math.hypot(target.x-orc.x,target.z-orc.z):Infinity;
  if(!target||d<6||d>cfg.range||!clearSight(orc,target,orc.trackId)){orc.windup=0;continue;}
  if(orc.shotCooldown>0)continue;
  orc.windup=(orc.windup||0)+dt;
  if(orc.windup<.65)continue;
  const flight=d/cfg.speed,lead=Math.min(flight*.65,.7);
  const aimX=target.x+Math.sin(target.travelYaw??target.yaw)*target.speed*lead,aimZ=target.z+Math.cos(target.travelYaw??target.yaw)*target.speed*lead;
  const dx=aimX-orc.x,dz=aimZ-orc.z,length=Math.hypot(dx,dz),duration=length/cfg.speed;
  const y=groundHeight(orc.x,orc.z,orc.trackId)+1.55,aimY=target.y+.85;
  combat.projectiles.push({id:++combat.nextId,owner:orc.id,targetId:target.id,type:orc.weapon,trackId:orc.trackId,x:orc.x,z:orc.z,y,vx:dx/length*cfg.speed,vz:dz/length*cfg.speed,vy:(aimY-y+.5*cfg.gravity*duration*duration)/duration,gravity:cfg.gravity,radius:cfg.radius,life:4});
  orc.shotCooldown=cfg.cooldown;orc.windup=0;orc.lastShot=time;
 }
 const alive=[];
 for(const p of combat.projectiles){
  const before={x:p.x,y:p.y,z:p.z};p.x+=p.vx*dt;p.z+=p.vz*dt;p.y+=p.vy*dt-.5*p.gravity*dt*dt;p.vy-=p.gravity*dt;p.life-=dt;
  let hit=false;
  const dx=p.x-before.x,dz=p.z-before.z,length=dx*dx+dz*dz;
  const obstacles=trackData(p.trackId).OBSTACLES;
  for(const o of extraObstacles.length?obstacles.concat(extraObstacles):obstacles){if(o.x<Math.min(before.x,p.x)-o.radius||o.x>Math.max(before.x,p.x)+o.radius||o.z<Math.min(before.z,p.z)-o.radius||o.z>Math.max(before.z,p.z)+o.radius)continue;const t=length?Math.max(0,Math.min(1,((o.x-before.x)*dx+(o.z-before.z)*dz)/length)):0;if(Math.hypot(before.x+dx*t-o.x,before.z+dz*t-o.z)<o.radius&&before.y+(p.y-before.y)*t<groundHeight(o.x,o.z,p.trackId)+o.height){hit=true;break;}}
  for(const rider of riders){
   if(hit||rider.practice?.noEnemies||rider.safeCamp||rider.finished||rider.health===0)continue;
   if(friendlyTo(orcs.find(o=>o.id===p.owner)||{},rider.id,time))continue;
   // Swept collision avoids arrows skipping a rider at low render rates.
   const dx=p.x-before.x,dy=p.y-before.y,dz=p.z-before.z,l=dx*dx+dy*dy+dz*dz;
   const t=l?Math.max(0,Math.min(1,((rider.x-before.x)*dx+(rider.y+.85-before.y)*dy+(rider.z-before.z)*dz)/l)):0;
   if(Math.hypot(before.x+dx*t-rider.x,before.z+dz*t-rider.z)<p.radius+.4&&Math.abs(before.y+dy*t-rider.y-.85)<.8){hitRider(rider,p.type);hit=true;break;}
  }
  if(!hit&&p.life>0&&p.y>groundHeight(p.x,p.z,p.trackId)+.05)alive.push(p);
 }
 combat.projectiles=alive;
}
