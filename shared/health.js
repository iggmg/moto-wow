export const DAMAGE={arrow:12,spear:20,stone:16,melee:20,log:18,rock:22,rider:10};
export function damageRider(rider,type='melee',speed=0){
 if(rider.health===0||rider.finished||rider.hitCooldown>0)return false;
 const severity=(type==='log'||type==='rock')?Math.min(1.6,.15+speed/25):1;
 const amount=Math.round((type==='rider'?Math.max(1,Math.min(24,speed)):DAMAGE[type]||20)*severity);
 rider.health=Math.max(0,(rider.health??100)-amount);rider.lastDamage={type,amount};
 // Enemy damage costs health, not an unavoidable stop-and-hit loop.
 rider.speed*=({arrow:.96,spear:.90,stone:.86,melee:.88,rider:.80}[type]??.45);rider.hits++;rider.penalty+=2;rider.totalPenalty=(rider.totalPenalty||0)+2;rider.hitCooldown=1.8;
 if(!rider.health){rider.speed=0;rider.finished=true;}
 return true;
}
