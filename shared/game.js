import { damageRider } from './health.js';
export const VERSION = 5;
export const STEP = 1 / 60;
export const TRACK_WIDTH = 12;
export const CHECKPOINTS = 16;
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
export function trackPoint(t) {
  const a=t*Math.PI*2;
  return {x:Math.sin(a)*116+Math.sin(a*3)*11,z:Math.cos(a)*85+Math.sin(a*2)*10};
}
export function trackHeading(t) { const a=trackPoint(t),b=trackPoint(t+.0001);return Math.atan2(b.x-a.x,b.z-a.z); }
export const TRACK=Array.from({length:256},(_,i)=>trackPoint(i/256));
export const GATES=Array.from({length:CHECKPOINTS},(_,i)=>({...trackPoint(i/CHECKPOINTS),t:i/CHECKPOINTS}));
export function nearestTrack(x,z) {
  let d=Infinity,index=0,tx=0,tz=0;
  for(let i=0;i<TRACK.length;i++) {
    const a=TRACK[i],b=TRACK[(i+1)%TRACK.length],dx=b.x-a.x,dz=b.z-a.z;
    const f=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1);
    const px=a.x+f*dx,pz=a.z+f*dz,ds=(px-x)**2+(pz-z)**2;
    if(ds<d){d=ds;index=i;tx=px;tz=pz;}
  }
  return {distance:Math.sqrt(d),t:index/256,x:tx,z:tz};
}
export const WEATHER=['clear','rain','snow'];
export const WEATHER_LABELS={clear:'Ясно',rain:'Дождь',snow:'Снег'};
export const RAMPS=[.115,.505].map((t,id)=>({...trackPoint(t),id,t,heading:trackHeading(t),width:8,length:9,height:2.2}));
export const RIVERS=[.285,.755].map((t,id)=>({...trackPoint(t),id,t,heading:trackHeading(t),width:7,length:82}));
export function naturalHeight(x,z){return 1.3*Math.sin(x*.026)+2.3*Math.cos(z*.032)+1.1*Math.sin((x+z)*.043);}
export function baseHeight(x,z){const river=riverAt(x,z);if(!river)return naturalHeight(x,z);const q=featureCoords(river,x,z),bank=Math.min(1,Math.abs(q.along)/(river.width/2));return naturalHeight(x,z)-.38*(1-bank**6);}
export function featureCoords(feature,x,z){const dx=x-feature.x,dz=z-feature.z;return {cross:dx*Math.cos(feature.heading)-dz*Math.sin(feature.heading),along:dx*Math.sin(feature.heading)+dz*Math.cos(feature.heading)};}
export function rampAt(x,z){for(const ramp of RAMPS){const q=featureCoords(ramp,x,z);if(Math.abs(q.cross)<ramp.width/2&&q.along>=-ramp.length/2&&q.along<=ramp.length/2)return {...ramp,...q};}return null;}
export function riverAt(x,z){return RIVERS.find(r=>{const q=featureCoords(r,x,z);return Math.abs(q.along)<r.width/2&&Math.abs(q.cross)<r.length/2;});}
export function groundHeight(x,z){const ramp=rampAt(x,z);if(ramp)return baseHeight(x,z)+(ramp.along+ramp.length/2)/ramp.length*ramp.height;return baseHeight(x,z);}
export function surfaceAt(x,z,weather='clear') {
  const n=nearestTrack(x,z);
  const mud=(n.t>.19&&n.t<.27)||(n.t>.61&&n.t<.70),sand=n.t>.375&&n.t<.46;
  const name=rampAt(x,z)?'ramp':riverAt(x,z)?'water':n.distance>TRACK_WIDTH/2?(weather==='snow'?'snow':'grass'):sand?'sand':mud?'mud':weather==='snow'?'snow':'dirt';
  return {...n,name};
}
export const OBSTACLES=[.135,.175,.31,.36,.48,.54,.72,.79,.83,.9].map((t,i)=>{
  const p=trackPoint(t),heading=trackHeading(t);
  const offset=i%2?2.8:-2.8;
  return {id:i,x:p.x+Math.cos(heading)*offset,z:p.z-Math.sin(heading)*offset,radius:i%2?1.6:1.2,type:i%2?'log':'rock',heading};
});
export const ORCS=[.09,.30,.43,.57,.73,.86].map((t,i)=>({...trackPoint(t),t,id:i,heading:trackHeading(t)}));
export function orcPosition(orc,time) {
  const cross=Math.sin(time*.65+orc.id*1.7)*8;
  return {x:orc.x+Math.cos(orc.heading)*cross,z:orc.z-Math.sin(orc.heading)*cross};
}
export function createOrcs(time=0) {
  return ORCS.map(home=>({...orcPosition(home,time),id:home.id,yaw:home.heading,mode:'patrol',targetId:null,speed:0,attackCooldown:0}));
}
// The same fixed-step AI runs locally in training and once per authoritative room.
export function stepOrcs(orcs,riders,dt=STEP,time=0) {
  for(const orc of orcs) {
    const home=ORCS[orc.id];
    let target=riders.find(r=>r.id===orc.targetId&&r.health!==0&&!r.finished);
    const distance=r=>Math.hypot(r.x-orc.x,r.z-orc.z);
    if(!target||distance(target)>100||Math.hypot(orc.x-home.x,orc.z-home.z)>110)target=null;
    if(!target) {
      let nearest=Infinity;
      for(const rider of riders) {
        if(rider.health===0||rider.finished)continue;
        const d=distance(rider),alert=rider.speed<1?90:36;
        if(d<alert&&d<nearest&&Math.hypot(rider.x-home.x,rider.z-home.z)<110){target=rider;nearest=d;}
      }
    }
    orc.targetId=target?.id??null;
    const goal=target||orcPosition(home,time),d=Math.hypot(goal.x-orc.x,goal.z-orc.z);
    orc.attackCooldown=Math.max(0,orc.attackCooldown-dt);
    if(target&&d<1.4&&orc.attackCooldown===0)orc.attackCooldown=1.2;
    orc.mode=target?(orc.attackCooldown>0?'attack':'chase'):Math.hypot(orc.x-home.x,orc.z-home.z)>10?'return':'patrol';
    // Swing recovery gives even a slow bike time to pull away from contact.
    const speed=orc.mode==='attack'||orc.windup>0?0:target?6.5:orc.mode==='return'?4:2.2;
    const travel=Math.min(speed*dt,Math.max(0,d-(target?1.05:0)));
    orc.speed=travel/dt;
    if(d>.01) {
      const heading=Math.atan2(goal.x-orc.x,goal.z-orc.z);
      orc.yaw+=clamp(angleDiff(heading,orc.yaw),-6*dt,6*dt);
      orc.x+=(goal.x-orc.x)/d*travel;orc.z+=(goal.z-orc.z)/d*travel;
    }
  }
}
export function createRider(bike='cub',slot=0) {
  const p=trackPoint(0),yaw=trackHeading(0),offset=(slot%4-1.5)*2;
  return {health:100,lastDamage:null,finished:false,raceTime:0,totalPenalty:0,lapLimit:0,bike,x:p.x+Math.cos(yaw)*offset,z:p.z-Math.sin(yaw)*offset-(Math.floor(slot/4)*3),yaw,speed:0,steer:0,y:groundHeight(p.x,p.z),vy:0,nextGate:1,lap:1,lapTime:0,best:0,last:0,hits:0,hitCooldown:0,surface:'dirt',distance:0,completed:0,penalty:0,airborne:false,lastRamp:null};
}
export function resetRider(s) {
  if(s.health===0||s.finished)return;
  const gate=Math.max(0,s.nextGate-1),t=gate/CHECKPOINTS,p=trackPoint(t);
  s.x=p.x;s.z=p.z;s.yaw=trackHeading(t);s.speed=0;s.y=groundHeight(p.x,p.z);s.vy=0;s.airborne=false;s.lastRamp=null;s.penalty+=5;s.totalPenalty=(s.totalPenalty||0)+5;
}
export function normalizeInput(input={}) {
  if(!input||typeof input!=='object')input={};
  return {throttle:clamp(Number(input.throttle)||0,0,1),brake:clamp(Number(input.brake)||0,0,1),steer:clamp(Number(input.steer)||0,-1,1)};
}
export function stepRider(s,rawInput,dt=STEP,time=0,orcs=null,weather='clear') {
  if(s.health===0||s.finished){s.speed=0;return null;}
  s.raceTime=(s.raceTime||0)+dt;
  const input=normalizeInput(rawInput),bike=bikeById(s.bike),surface=surfaceAt(s.x,s.z,weather);
  s.surface=surface.name;s.hitCooldown=Math.max(0,s.hitCooldown-dt);s.lapTime+=dt;
  const baseGrip={mud:bike.mudGrip,grass:.43,sand:.62,water:.48,snow:.45}[surface.name]??1;
  const grip=baseGrip*(weather==='rain'?.80:1),drag={mud:1.5,grass:2.5,sand:1.6,water:2.2,snow:1.1}[surface.name]||0;
  const max=bike.maxSpeed*({mud:.53+grip*.3,grass:.5,sand:.7,water:.55,snow:.68}[surface.name]??1);
  const resistance=.3+s.speed*s.speed*.004+drag;
  s.speed=clamp(s.speed+(input.throttle*bike.acceleration*grip-input.brake*14-resistance)*dt,0,max);
  s.steer+=(input.steer-s.steer)*Math.min(1,dt*7*grip);
  s.yaw-=s.steer*(s.airborne?.15:1)*bike.handling*(.35+s.speed*.042)/(1+s.speed*.018)*dt*grip;
  const dx=Math.sin(s.yaw)*s.speed*dt,dz=Math.cos(s.yaw)*s.speed*dt;
  s.x+=dx;s.z+=dz;s.distance+=Math.hypot(dx,dz);
  s.x=clamp(s.x,-220,220);s.z=clamp(s.z,-180,180);
  const gy=groundHeight(s.x,s.z),ramp=rampAt(s.x,s.z);
  const hill=baseHeight(s.x+Math.sin(s.yaw),s.z+Math.cos(s.yaw))-baseHeight(s.x,s.z);
  if(s.speed>0&&!s.airborne)s.speed=clamp(s.speed-hill*2*dt,0,max);
  if(!s.airborne&&ramp){s.lastRamp=ramp.id;s.y=gy;s.vy=0;}
  else if(!s.airborne&&s.lastRamp!==null){
    const last=RAMPS[s.lastRamp],q=featureCoords(last,s.x,s.z),forward=Math.cos(s.yaw-last.heading);
    if(q.along>last.length/2&&forward>.4&&s.speed>5){s.airborne=true;s.vy=s.speed*last.height/last.length*forward+2.0;}
    s.lastRamp=null;
  }
  if(s.airborne){s.vy-=9.81*dt;s.y+=s.vy*dt;if(s.y<=gy){s.y=gy;s.vy=0;s.airborne=false;}}
  else {s.y=gy;s.vy=0;}
  if(s.hitCooldown<=0&&!s.airborne) {
    const enemies=orcs||ORCS.map(o=>orcPosition(o,time));
    const obstacle=OBSTACLES.find(o=>Math.hypot(o.x-s.x,o.z-s.z)<o.radius+.5),enemy=enemies.find(o=>Math.hypot(o.x-s.x,o.z-s.z)<1.4);
    if(enemy||obstacle&&s.speed>1){damageRider(s,enemy?'melee':obstacle.type,s.speed);s.speed*=.5;if(s.health>0){s.vy=1.3;s.airborne=true;}}
  }
  if(s.health===0)return null;
  const gate=GATES[s.nextGate%CHECKPOINTS];
  if(Math.hypot(s.x-gate.x,s.z-gate.z)<10) {
    s.nextGate++;
    if(s.nextGate>CHECKPOINTS) {
      s.last=s.lapTime+s.penalty;s.best=s.best?Math.min(s.best,s.last):s.last;
      s.completed++;s.lap++;s.lapTime=0;s.penalty=0;s.nextGate=1;
      if(s.lapLimit&&s.completed>=s.lapLimit){s.finished=true;s.speed=0;}
      return {lap:s.last,bike:s.bike};
    }
  }
  return null;
}
export function formatTime(seconds) {if(!seconds||!Number.isFinite(seconds))return '—';const ms=Math.floor(seconds*1000);return `${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}.${String(ms%1000).padStart(3,'0')}`;}
