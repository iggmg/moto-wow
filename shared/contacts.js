import {bikeById} from './game.js';
import { damageRider } from './health.js';

// A short capsule sampled at three points fits all six motorcycle silhouettes.
function points(s){return [-.6,0,.6].map(d=>({x:s.x+Math.sin(s.yaw)*d,z:s.z+Math.cos(s.yaw)*d}));}
export function stepContacts(riders,time,{damage=true}={}){
 for(let i=0;i<riders.length;i++)for(let j=i+1;j<riders.length;j++){
  const a=riders[i],b=riders[j];
  if(a.finished||b.finished||Math.abs(a.y-b.y)>.9||a.contactShield>0||b.contactShield>0)continue;
  let contact=null;
  for(const p of points(a))for(const q of points(b)){const dx=q.x-p.x,dz=q.z-p.z,d=Math.hypot(dx,dz);if(d<.82&&(!contact||d<contact.d))contact={dx,dz,d};}
  if(!contact)continue;
  let {dx,dz,d}=contact;if(d<.001){dx=b.x-a.x;dz=b.z-a.z;d=Math.hypot(dx,dz);if(d<.001){dx=1;dz=0;d=1;}}const nx=dx/d,nz=dz/d,overlap=.82-contact.d;
  a.x-=nx*overlap*.5;a.z-=nz*overlap*.5;b.x+=nx*overlap*.5;b.z+=nz*overlap*.5;
  const avx=Math.sin(a.travelYaw??a.yaw)*a.speed+(a.contactVX||0),avz=Math.cos(a.travelYaw??a.yaw)*a.speed+(a.contactVZ||0),bvx=Math.sin(b.travelYaw??b.yaw)*b.speed+(b.contactVX||0),bvz=Math.cos(b.travelYaw??b.yaw)*b.speed+(b.contactVZ||0);
  const closing=Math.max(0,(avx-bvx)*nx+(avz-bvz)*nz),impulse=Math.min(16,closing*1.2),ma=bikeById(a.bike).mass+75+(a.cargoCarrier?20:0),mb=bikeById(b.bike).mass+75+(b.cargoCarrier?20:0),da=Math.min(8,impulse*mb/(ma+mb)),db=Math.min(8,impulse*ma/(ma+mb));
  a.contactVX=(a.contactVX||0)-nx*da;a.contactVZ=(a.contactVZ||0)-nz*da;b.contactVX=(b.contactVX||0)+nx*db;b.contactVZ=(b.contactVZ||0)+nz*db;
  for(const r of [a,b]){const v=Math.hypot(r.contactVX,r.contactVZ);if(v>10){r.contactVX*=10/v;r.contactVZ*=10/v;}}
  a.speed=Math.sign(a.speed)*Math.max(0,Math.abs(a.speed)-da*.25);b.speed=Math.sign(b.speed)*Math.max(0,Math.abs(b.speed)-db*.25);
  if(damage&&closing>4){const severity=Math.min(24,Math.round(closing*.8));damageRider(a,'rider',severity);damageRider(b,'rider',severity);}
 }
}
