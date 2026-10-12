import {groundHeight,trackData} from './tracks.js';
export const ORC_ROLES=['archer','spearman','thrower','shaman','chief'];
export const ROLE_WEAPONS={archer:'arrow',spearman:'spear',thrower:'stone',shaman:'orb',chief:'spear'};
export function clearSight(a,b,trackId=a.trackId){
 const ax=a.x,az=a.z,ay=(Number.isFinite(a.y)?a.y:groundHeight(ax,az,trackId))+1.5,bx=b.x,bz=b.z,by=(Number.isFinite(b.y)?b.y:groundHeight(bx,bz,trackId))+1.0,dx=bx-ax,dz=bz-az,length=dx*dx+dz*dz;
 if(length<1)return true;
 for(const o of trackData(trackId).OBSTACLES){if(o.x<Math.min(ax,bx)-o.radius||o.x>Math.max(ax,bx)+o.radius||o.z<Math.min(az,bz)-o.radius||o.z>Math.max(az,bz)+o.radius)continue;const t=Math.max(0,Math.min(1,((o.x-ax)*dx+(o.z-az)*dz)/length));if(t<.02||t>.98)continue;if(Math.hypot(ax+dx*t-o.x,az+dz*t-o.z)<o.radius*.85&&ay+(by-ay)*t<groundHeight(o.x,o.z,trackId)+o.height)return false;}
 for(const f of [.25,.5,.75])if(groundHeight(ax+dx*f,az+dz*f,trackId)>ay+(by-ay)*f-.12)return false;
 return true;
}
export function perceives(orc,rider,time){
 if(rider.practice?.noEnemies||rider.safeCamp)return false;const d=Math.hypot(rider.x-orc.x,rider.z-orc.z);if(d<4)return true;
 const loud=Math.abs(rider.speed||0)<1?60:Math.min(45,18+Math.abs(rider.speed||0)*.65),hunt=rider.arcade?.huntUntil>time&&rider.arcade.huntWitnesses?.includes(orc.id)||rider.cargoCarrier,viewRange=hunt?100:Math.abs(rider.speed||0)<1?90:55;
 const facing=Math.cos(Math.atan2(rider.x-orc.x,rider.z-orc.z)-orc.yaw)>.05;
 return d<loud||facing&&d<viewRange&&clearSight(orc,rider,orc.trackId);
}
