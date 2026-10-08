import {friendlyTo} from './arcade.js';
import { groundHeight,STEP } from './game.js';
import { damageRider } from './health.js';
export const WEAPONS=['arrow','spear','stone'];
const specs={arrow:{speed:24,gravity:5,range:34,cooldown:3.2,radius:.45},spear:{speed:19,gravity:8,range:28,cooldown:4.2,radius:.55},stone:{speed:16,gravity:9.81,range:23,cooldown:3.8,radius:.65}};
export function createCombat(){return {projectiles:[],nextId:0};}
export const hitRider=(rider,type='arrow')=>damageRider(rider,type);
export function stepCombat(combat,orcs,riders,dt=STEP,time=0){
 for(const orc of orcs){
  orc.weapon=WEAPONS[orc.id%WEAPONS.length];orc.shotCooldown=Math.max(0,(orc.shotCooldown||0)-dt);
  const target=riders.find(r=>r.id===orc.targetId&&r.health!==0&&!r.finished&&!friendlyTo(orc,r.id,time)),cfg=specs[orc.weapon];
  const d=target?Math.hypot(target.x-orc.x,target.z-orc.z):Infinity;
  if(!target||d<6||d>cfg.range){orc.windup=0;continue;}
  if(orc.shotCooldown>0)continue;
  orc.windup=(orc.windup||0)+dt;
  if(orc.windup<.65)continue;
  const flight=d/cfg.speed,lead=Math.min(flight*.65,.7);
  const aimX=target.x+Math.sin(target.yaw)*target.speed*lead,aimZ=target.z+Math.cos(target.yaw)*target.speed*lead;
  const dx=aimX-orc.x,dz=aimZ-orc.z,length=Math.hypot(dx,dz),duration=length/cfg.speed;
  const y=groundHeight(orc.x,orc.z,orc.trackId)+1.55,aimY=target.y+.85;
  combat.projectiles.push({id:++combat.nextId,owner:orc.id,targetId:target.id,type:orc.weapon,trackId:orc.trackId,x:orc.x,z:orc.z,y,vx:dx/length*cfg.speed,vz:dz/length*cfg.speed,vy:(aimY-y+.5*cfg.gravity*duration*duration)/duration,gravity:cfg.gravity,radius:cfg.radius,life:4});
  orc.shotCooldown=cfg.cooldown;orc.windup=0;orc.lastShot=time;
 }
 const alive=[];
 for(const p of combat.projectiles){
  const before={x:p.x,y:p.y,z:p.z};p.x+=p.vx*dt;p.z+=p.vz*dt;p.y+=p.vy*dt-.5*p.gravity*dt*dt;p.vy-=p.gravity*dt;p.life-=dt;
  let hit=false;
  for(const rider of riders){
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
