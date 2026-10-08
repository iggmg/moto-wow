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
  const avx=Math.sin(a.yaw)*a.speed+(a.contactVX||0),avz=Math.cos(a.yaw)*a.speed+(a.contactVZ||0),bvx=Math.sin(b.yaw)*b.speed+(b.contactVX||0),bvz=Math.cos(b.yaw)*b.speed+(b.contactVZ||0);
  const closing=Math.max(0,(avx-bvx)*nx+(avz-bvz)*nz),impulse=Math.min(8,closing*.6);
  a.contactVX=(a.contactVX||0)-nx*impulse;a.contactVZ=(a.contactVZ||0)-nz*impulse;b.contactVX=(b.contactVX||0)+nx*impulse;b.contactVZ=(b.contactVZ||0)+nz*impulse;
  for(const r of [a,b]){const v=Math.hypot(r.contactVX,r.contactVZ);if(v>10){r.contactVX*=10/v;r.contactVZ*=10/v;}}
  a.speed=Math.max(0,a.speed-impulse*.25);b.speed=Math.max(0,b.speed-impulse*.25);
  if(damage&&closing>4){const severity=Math.min(24,Math.round(closing*.8));damageRider(a,'rider',severity);damageRider(b,'rider',severity);}
 }
}
