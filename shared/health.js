export const DAMAGE={arrow:12,spear:20,stone:16,melee:20,log:18,rock:22};
export function damageRider(rider,type='melee',speed=0){
 if(rider.health===0||rider.finished||rider.hitCooldown>0)return false;
 const severity=(type==='log'||type==='rock')?Math.min(1.6,.65+speed/35):1;
 const amount=Math.round((DAMAGE[type]||20)*severity);
 rider.health=Math.max(0,(rider.health??100)-amount);rider.lastDamage={type,amount};
 rider.speed*=.45;rider.hits++;rider.penalty+=2;rider.totalPenalty=(rider.totalPenalty||0)+2;rider.hitCooldown=1.8;
 if(!rider.health){rider.speed=0;rider.finished=true;}
 return true;
}
