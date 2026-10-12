import {campSprintSafe} from './camp-sprint.js';
import {trackPoint,groundHeight,nearestTrack,trackData,routeHeading} from './tracks.js';
import {initArcade} from './arcade.js';
export const ADVENTURE_MODES=['courier','elimination','totem'];
export const ADVENTURE_NAMES={courier:'Проклятый курьер',elimination:'Гонка на выбывание',totem:'Король тотема'};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function landmark(t,trackId){const p=trackPoint(t,trackId);return {...p,y:groundHeight(p.x,p.z,trackId),t};}
export function createAdventure(mode,trackId){
 if(!ADVENTURE_MODES.includes(mode))return null;
 return {mode,trackId,elapsed:0,duration:mode==='courier'?360:mode==='totem'?180:300,finished:false,winners:[],score:0,nextEvent:0,events:[],readyAt:0,nextElimination:45,eliminations:0,
  cargo:{...landmark(.08,trackId),ownerId:null,value:1,pickReady:0,serial:1},bank:landmark(.88,trackId),trophy:{...landmark(.46,trackId),taken:false},camp:landmark(0,trackId),message:mode==='courier'?'Подбери тотем, довези до лагеря. F — передать или сдать.':mode==='totem'?'Захвати тотем и довези до лагеря. F — перехватить или сдать.':'Последний выбывает у ворот. До первого отсечения — 45 с.'};
}
export function initAdventure(s,mode){
 s.lapLimit=0;s.adventure={mode,points:0,passes:0,rescues:0,fuelGiven:0,distractions:0,eliminated:false,actionReady:0,lastHits:s.hits||0};
 if(mode==='courier'){initArcade(s);s.arcade.message='Реликвия привлекает орков. Прикрой носителя!';}
 return s;
}
function event(world,type,actor,time,extra={}){const e={id:++world.nextEvent,type,actorId:actor,time,...extra};world.events.push(e);if(world.events.length>32)world.events.shift();return e;}
function setCarrier(world,riders,id,time){
 world.cargo.ownerId=id;world.cargo.pickReady=time+1.5;
 for(const s of riders)s.cargoCarrier=s.id===id;
}
function drop(world,riders,time){setCarrier(world,riders,null,time);event(world,'drop',null,time);}
function finish(world,riders,winners,time,message){world.finished=true;world.winners=winners;world.message=message;for(const s of riders){s.finished=true;s.speed=0;s.resultSeconds=world.elapsed;s.finishedAt??=time;}event(world,'finish',null,time,{winners});}

export function adventureIntent(world,riders,actorId){
 const s=riders.find(r=>r.id===actorId);if(!world||!s)return {action:'interact',targetId:null,label:'Действие'};
 const near=riders.filter(r=>r.id!==actorId&&distance(r,s)<=10).sort((a,b)=>distance(a,s)-distance(b,s)),owner=riders.find(r=>r.id===world.cargo.ownerId);
 let action=null,target=null;
 if(world.cargo.ownerId===actorId&&distance(s,world.bank)<8)action='bank';
 else if(world.cargo.ownerId===actorId&&world.mode==='courier'&&!world.trophy.taken&&distance(s,world.trophy)<5)action='extra';
 else if(world.mode==='courier'&&s.arcade?.fuel>=15&&(target=near.find(r=>r.health===0||r.offRoad&&Math.abs(r.speed)<2)))action='rescue';
 else if(world.mode==='courier'&&world.cargo.ownerId===actorId&&(target=near.find(r=>!r.finished&&r.health>0)))action='pass';
 else if(world.mode==='totem'&&owner&&owner.id!==actorId&&distance(s,owner)<2.5)action='steal';
 else if(world.cargo.ownerId===null&&distance(s,world.cargo)<3)action='pickup';
 else if(world.mode==='courier'&&s.arcade?.fuel>=25&&(target=near.find(r=>r.arcade&&r.arcade.fuel<=80&&!r.finished)))action='fuel';
 return {action:action||'interact',targetId:target?.id??null,label:({bank:'Сдать тотем',extra:'Взять трофей',rescue:'Спасти · 15% топлива',pass:'Передать тотем',steal:'Перехватить',pickup:'Взять тотем',fuel:'Поделиться бензином'}[action])||'Подъедь к цели'};
}

// The caller supplies authoritative states; client messages never supply cargo position,
// health, points, fuel or completion. A mode interaction is bounded and changes one state.
export function adventureAction(world,riders,actorId,action,time,orcs=[],targetId=null){
 if(!world||world.finished||world.mode==='elimination')return false;const s=riders.find(r=>r.id===actorId);
 if(!s?.adventure||s.finished||s.health===0||time<s.adventure.actionReady)return false;
 const cargo=world.cargo,owner=riders.find(r=>r.id===cargo.ownerId),near=riders.filter(r=>r.id!==actorId&&distance(r,s)<=10).sort((a,b)=>distance(a,s)-distance(b,s)),target=targetId===null?near[0]:near.find(r=>r.id===targetId);
 if(action==='interact'){const intent=adventureIntent(world,riders,actorId);return intent.action==='interact'?false:adventureAction(world,riders,actorId,intent.action,time,orcs,intent.targetId);}
 let changed=false;
 if(action==='pickup'&&cargo.ownerId===null&&time>=cargo.pickReady&&distance(s,cargo)<3){setCarrier(world,riders,actorId,time);changed=true;world.message='Тотем у тебя. Доставь его в лагерь.';}
 if(action==='pass'&&world.mode==='courier'&&cargo.ownerId===actorId&&target&&!target.finished&&target.health>0&&time>=cargo.pickReady){setCarrier(world,riders,target.id,time);s.adventure.passes++;changed=true;world.message='Тотем передан товарищу!';}
 if(action==='steal'&&world.mode==='totem'&&owner&&owner.id!==actorId&&!owner.finished&&distance(s,owner)<2.5&&time>=cargo.pickReady&&owner.contactShield<=0){setCarrier(world,riders,actorId,time);changed=true;world.message='Тотем перехвачен!';}
 if(action==='bank'&&cargo.ownerId===actorId&&distance(s,world.bank)<8&&time>=cargo.pickReady){
  const value=cargo.value;s.adventure.points+=value*100;world.score+=value*100;setCarrier(world,riders,null,time);changed=true;
  if(world.mode==='courier'){for(const r of riders)if(r.id!==actorId)r.adventure.points+=value*100;finish(world,riders,riders.map(r=>r.id),time,`Груз доставлен! Команда: ${world.score} очков.`);}
  else {cargo.serial++;cargo.value=1;Object.assign(cargo,landmark([.24,.53,.08][(cargo.serial-1)%3],world.trackId));Object.assign(world.bank,landmark([.72,.05,.88][(cargo.serial-1)%3],world.trackId));world.message='Очки сданы. Новый тотем отмечен на карте.';}
 }
 if(action==='rescue'&&world.mode==='courier'&&target&&s.arcade?.fuel>=15&&(target.health===0||target.offRoad&&Math.abs(target.speed)<2)){
  const road=nearestTrack(target.x,target.z,world.trackId);target.x=road.x;target.z=road.z;target.y=groundHeight(road.x,road.z,world.trackId);target.yaw=routeHeading(road.t,world.trackId,road.branchId);target.travelYaw=target.yaw;target.slipAngle=0;target.branchId=road.branchId;target.offRoad=false;target.speed=0;target.vy=0;target.airborne=false;target.contactVX=target.contactVZ=0;target.contactShield=3;
  if(target.health===0){target.health=35;target.finished=false;delete target.finishedAt;}target.hitCooldown=3;if(target.arcade)target.arcade.fuel=Math.max(15,target.arcade.fuel);s.arcade.fuel-=15;s.adventure.rescues++;s.adventure.points+=25;changed=true;world.message='Товарищ снова на трассе. Спасение +25.';
 }
 if(action==='fuel'&&world.mode==='courier'&&target?.arcade&&!target.finished&&s.arcade?.fuel>=25&&target.arcade.fuel<=80){s.arcade.fuel-=20;target.arcade.fuel+=20;s.adventure.fuelGiven+=20;changed=true;world.message='Товарищу передано 20% бензина.';}
 if(action==='distract'&&world.mode==='courier'&&orcs.some(o=>distance(o,s)<40)){
  for(const o of orcs)if(distance(o,s)<40){o.targetId=actorId;o.distractedBy=actorId;o.distractedUntil=time+6;}s.adventure.distractions++;changed=true;world.message='Орки отвлечены на тебя. Прикрой носителя!';
 }
 if(action==='extra'&&world.mode==='courier'&&cargo.ownerId===actorId&&!world.trophy.taken&&distance(s,world.trophy)<5){world.trophy.taken=true;cargo.value=2;changed=true;world.message='Дополнительный трофей взят. Погоня усиливается!';}
 if(changed){s.adventure.actionReady=time+(action==='rescue'?8:action==='distract'?10:.75);event(world,action,actorId,time,{targetId:target?.id??null,serial:cargo.serial});}
 return changed;
}
export function raceProgress(s){const n=nearestTrack(s.x,s.z,s.trackId);return s.completed*16+s.nextGate-1+clamp(n.t*16-(s.nextGate-1),0,.99);}
export function stepAdventure(world,riders,orcs,dt,time){
 if(!world||world.finished)return;world.elapsed+=dt;
 const alive=riders.filter(s=>!s.finished&&s.health>0),cargo=world.cargo,owner=riders.find(s=>s.id===cargo.ownerId);
 if(owner){cargo.x=owner.x-Math.sin(owner.yaw)*.7;cargo.z=owner.z-Math.cos(owner.yaw)*.7;cargo.y=owner.y+.85;}
 if(cargo.ownerId!==null&&(!owner||owner.finished||owner.health===0))drop(world,riders,time);
 if(world.mode!=='elimination'){
  if(cargo.ownerId===null&&time>=cargo.pickReady){const taker=alive.find(s=>distance(s,cargo)<2.1);if(taker)adventureAction(world,riders,taker.id,'pickup',time,orcs);}
  const carrier=riders.find(s=>s.id===cargo.ownerId);
  if(world.mode==='courier'&&carrier){carrier.arcade.huntUntil=Math.max(carrier.arcade.huntUntil,time+2);for(const o of orcs)if(distance(o,carrier)<(cargo.value===2?85:55)&&!(o.distractedUntil>time)){o.targetId=carrier.id;o.cargoAlertUntil=time+2;}}
  if(world.mode==='totem'&&carrier&&carrier.hits>carrier.adventure.lastHits){drop(world,riders,time);world.message='Удар выбил тотем! Подбери его с дороги.';}
 }
 for(const s of riders)if(s.adventure)s.adventure.lastHits=s.hits;
 if(world.mode==='elimination'&&alive.length>1&&world.elapsed>=world.nextElimination){
  const last=[...alive].sort((a,b)=>raceProgress(a)-raceProgress(b)||a.id-b.id)[0];last.adventure.eliminated=true;last.finished=true;last.speed=0;last.finishedAt=time;world.eliminations++;world.nextElimination+=30;world.message='Последний выбыл. До следующих ворот — 30 с.';event(world,'eliminate',last.id,time);
 }
 const remaining=riders.filter(s=>!s.finished&&s.health>0);
 if(world.mode==='elimination'&&riders.length>1&&remaining.length<=1)finish(world,riders,remaining.map(s=>s.id),time,remaining.length?'Победитель определён!':'Все гонщики выбыли.');
 if(world.mode==='courier'&&!remaining.length&&riders.length)finish(world,riders,[],time,'Команда потеряла груз. Попробуйте другую тактику.');
 if(world.elapsed>=world.duration){
  if(world.mode==='courier')finish(world,riders,[],time,'Время доставки вышло. Груз не сдан.');
  else if(world.mode==='totem'){const best=Math.max(0,...riders.map(s=>s.adventure.points));finish(world,riders,riders.filter(s=>best>0&&s.adventure.points===best).map(s=>s.id),time,'Время вышло. Побеждают сданные очки.');}
  else {const best=[...remaining].sort((a,b)=>raceProgress(b)-raceProgress(a))[0];finish(world,riders,best?[best.id]:[],time,'Заезд завершён по времени.');}
 }
}
export function inSafeCamp(s,world){return !!world&&distance(s,world.camp)<12&&!s.cargoCarrier;}

export function updateCampSafety(riders,mode,world=null){for(const s of riders){s.safeCamp=['open','courier'].includes(mode)&&(inSafeCamp(s,world||{camp:trackPoint(0,s.trackId)})||mode==='open'&&campSprintSafe(s));if(s.safeCamp)s.contactShield=Math.max(.25,s.contactShield||0);}}
