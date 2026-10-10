import {trackData,CHECKPOINTS,VERSION,trackPoint,trackHeading,groundHeight} from '../shared/game.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { createGameServer } from '../server/index.js';
const origin='http://127.0.0.1:5173';
async function setup(options={}){const game=createGameServer({database:':memory:',origins:[origin],...options});game.server.listen(0,'127.0.0.1');await once(game.server,'listening');const base=`http://127.0.0.1:${game.server.address().port}`;return {game,base,async api(path,body,token){const r=await fetch(`${base}/api${path}`,{method:body?'POST':'GET',headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),headers:r.headers};}};}
test('accounts, hashing, login, sessions and leaderboard persist correctly',async()=>{const s=await setup();try{let r=await s.api('/auth/register',{nickname:'RiderOne',password:'correct-horse-987'});assert.equal(r.status,200);const token=r.data.token,user=r.data.user;assert(r.headers.get('set-cookie').includes('HttpOnly'));assert.notEqual(s.game.store.db.prepare('SELECT password FROM users').get().password,'correct-horse-987');assert.equal((await s.api('/auth/login',{nickname:'RiderOne',password:'bad'})).status,400);assert.equal((await s.api('/auth/login',{nickname:'riderone',password:'correct-horse-987'})).status,200);assert.equal((await s.api('/auth/register',{nickname:'RiderOne',password:'another-password'})).status,400);assert.equal((await s.api('/auth/me',null,token)).data.user.id,user.id);assert.equal((await s.api('/auth/me')).status,401);s.game.store.record(user.id,'cub',70);s.game.store.record(user.id,'cub',61);const rank=(await s.api('/leaderboard')).data.entries;assert.equal(rank[0].seconds,61);assert.equal(rank[0].laps,2);assert.equal((await s.api('/laps',{seconds:1},token)).status,404);await s.api('/auth/logout',{},token);assert.equal((await s.api('/auth/me',null,token)).status,401);}finally{await s.game.close();}});
async function join(s,nickname,weather='clear',options={}){const reg=await s.api('/auth/register',{nickname,password:'strong-password-987'});const ticket=(await s.api('/ws-ticket',{},reg.data.token)).data.ticket;const ws=new WebSocket(s.base.replace('http:','ws:')+`/ws?ticket=${ticket}`,{origin});await once(ws,'open');const received=[];ws.on('message',d=>received.push(JSON.parse(d)));const joined=once(ws,'message');ws.send(JSON.stringify({type:'join',room:'TEST-ROOM',bike:'cub',weather,...options}));await joined;return {ws,received,id:reg.data.user.id};}
test('two authenticated riders share authoritative state and input moves only the sender',async()=>{const s=await setup();try{const a=await join(s,'AliceRider'),b=await join(s,'BobRider');const before=s.game.rooms.get('TEST-ROOM').players.get(a.id).state.x;for(let seq=1;seq<=40;seq++){a.ws.send(JSON.stringify({type:'input',seq,throttle:1,steer:0}));await new Promise(r=>setTimeout(r,17));}const last=b.received.filter(m=>m.type==='state').at(-1);assert.equal(last.players.length,2);assert(last.players.find(p=>p.id===a.id).speed>2);assert(last.players.find(p=>p.id===b.id).speed<.1);assert(s.game.rooms.get('TEST-ROOM').players.get(a.id).state.x>before);a.ws.send(JSON.stringify({type:'lap',seconds:.1}));await new Promise(r=>setTimeout(r,60));assert.equal(s.game.store.leaderboard().length,0);a.ws.close();b.ws.close();}finally{await s.game.close();}});
test('unapproved cross-origin requests are blocked',async()=>{const s=await setup();try{const r=await fetch(`${s.base}/api/health`,{headers:{Origin:'https://malicious.example'}});assert.equal(r.status,403);}finally{await s.game.close();}});

test('one authoritative pursuit is shared by both clients and attacks a parked rider',async()=>{
 const s=await setup();try{
  const a=await join(s,'ParkedRider'),b=await join(s,'WitnessRider'),room=s.game.rooms.get('TEST-ROOM'),orc=room.orcs[0];
  const parked=room.players.get(a.id).state,witness=room.players.get(b.id).state;
  parked.x=orc.x+5;parked.z=orc.z;parked.speed=0;witness.x=0;witness.z=0;
  const start=Math.hypot(orc.x-parked.x,orc.z-parked.z);
  a.ws.send(JSON.stringify({type:'orcs',orcs:[]}));
  await new Promise(r=>setTimeout(r,300));
  assert.equal(orc.targetId,a.id);assert(Math.hypot(orc.x-parked.x,orc.z-parked.z)<start-1);
  const common=a.received.filter(m=>m.type==='state').findLast(m=>b.received.some(n=>n.type==='state'&&n.time===m.time));
  assert(common);assert.deepEqual(common.orcs,b.received.find(m=>m.type==='state'&&m.time===common.time).orcs);
  await new Promise(r=>setTimeout(r,1200));
  assert(parked.hits>0);assert(parked.penalty>=2);assert.equal(parked.speed,0);
  assert.equal(witness.hits,0);assert.equal(room.orcs.length,6);
  a.ws.close();b.ws.close();
 }finally{await s.game.close();}
});

test('room weather is chosen by its first rider and ranged shots are authoritative shared state',async()=>{
 const s=await setup();try{
  const a=await join(s,'RainHost','rain'),b=await join(s,'SnowGuest','snow'),room=s.game.rooms.get('TEST-ROOM'),orc=room.orcs[0],parked=room.players.get(a.id).state;
  const witness=room.players.get(b.id).state;witness.x=0;witness.z=0;
  parked.x=orc.x+14;parked.z=orc.z;parked.speed=0;
  a.ws.send(JSON.stringify({type:'projectiles',combat:{nextId:99,projectiles:[]},weather:'snow'}));
  await new Promise(r=>setTimeout(r,1700));
  assert.equal(room.weather,'rain');assert(room.combat.nextId>0&&room.combat.nextId<99);assert(parked.hits>0);assert.equal(witness.hits,0);
  const shot=a.received.find(m=>m.type==='state'&&m.combat?.projectiles.length&&b.received.some(n=>n.type==='state'&&n.time===m.time));assert(shot);
  const peer=b.received.find(m=>m.type==='state'&&m.time===shot.time);assert.deepEqual(shot.combat,peer.combat);assert.equal(shot.weather,peer.weather);assert.equal(shot.weather,'rain');
  a.ws.close();b.ws.close();
 }finally{await s.game.close();}
});

test('malformed packets cannot crash server, forge health, change weather or submit lap times',async()=>{
 const s=await setup();try{
  const a=await join(s,'ArmorRider'),r=s.game.rooms.get('TEST-ROOM'),p=r.players.get(a.id);
  a.ws.send(JSON.stringify({type:'input',seq:1,throttle:1,steer:0,brake:0,health:999,x:99999,weather:'snow'}));
  a.ws.send(JSON.stringify({type:'lap',seconds:.01}));await new Promise(resolve=>setTimeout(resolve,90));
  assert.equal(p.state.health,100);assert.equal(r.weather,'clear');assert(p.state.x<220);assert.equal(s.game.store.leaderboard().length,0);
  const closed=once(a.ws,'close');a.ws.send('null');await closed;assert.equal((await s.api('/health')).status,200);
 }finally{await s.game.close();}
});
test('cookie API mutations require approved Origin and JSON; auth bodies and session counts are bounded',async()=>{
 const s=await setup();try{
  const noOrigin=await fetch(`${s.base}/api/auth/register`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nickname:'NoOrigin',password:'strong-password'})});assert.equal(noOrigin.status,403);
  const oversized=await s.api('/auth/register',{nickname:'Oversized',password:'x'.repeat(5000)});assert.equal(oversized.status,400);
  const xss=await s.api('/auth/register',{nickname:'<img/onerror=alert(1)>',password:'strong-password'});assert.equal(xss.status,400);
  const u=await s.game.store.register('Sessions','strong-password');for(let i=0;i<7;i++)await s.game.store.login('Sessions','strong-password');assert.equal(s.game.store.db.prepare('SELECT COUNT(*) count FROM sessions WHERE user_id=?').get(u.user.id).count,5);
 }finally{await s.game.close();}
});
test('open matchmaking and host-only synchronized countdown run on the authoritative server',async()=>{
 const s=await setup();try{
  async function enter(nick,msg){const reg=await s.api('/auth/register',{nickname:nick,password:'strong-password-987'}),t=await s.api('/ws-ticket',{},reg.data.token);const ws=new WebSocket(s.base.replace('http:','ws:')+`/ws?ticket=${t.data.ticket}`,{origin});await once(ws,'open');const joined=once(ws,'message');ws.send(JSON.stringify({type:'join',bike:'cub',...msg}));const first=JSON.parse((await joined)[0]);return {ws,id:reg.data.user.id,token:reg.data.token,msg:first};}
  const a=await enter('TrackOne',{mode:'open'}),b=await enter('TrackTwo',{mode:'open'});assert.equal(a.msg.room,b.msg.room);assert.equal((await s.api('/rooms',null,a.token)).data.rooms[0].players,2);
  const host=await enter('HostRace',{room:'RACE-TEST',mode:'race',laps:1}),guest=await enter('GuestRace',{room:'RACE-TEST',mode:'race'}),room=s.game.rooms.get('RACE-TEST');
  guest.ws.send(JSON.stringify({type:'start'}));host.ws.send(JSON.stringify({type:'input',seq:1,throttle:1,brake:0,steer:0}));await new Promise(resolve=>setTimeout(resolve,80));assert.equal(room.phase,'lobby');assert.equal(room.players.get(host.id).state.speed,0);
  host.ws.send(JSON.stringify({type:'start'}));await new Promise(resolve=>setTimeout(resolve,80));assert.equal(room.phase,'countdown');assert(room.startAt>room.time);assert.equal(room.players.get(host.id).state.lapLimit,1);assert.equal(room.players.get(guest.id).state.lapLimit,1);
  room.startAt=room.time+.05;await new Promise(resolve=>setTimeout(resolve,100));assert.equal(room.phase,'racing');
  const rider=room.players.get(guest.id).state;rider.health=0;rider.finished=true;guest.ws.send(JSON.stringify({type:'reset'}));guest.ws.send(JSON.stringify({type:'respawn'}));await new Promise(resolve=>setTimeout(resolve,60));assert.equal(rider.health,0);
  for(const p of room.players.values())p.state.finished=true;await new Promise(resolve=>setTimeout(resolve,60));assert.equal(room.phase,'finished');
  guest.ws.send(JSON.stringify({type:'lobby'}));await new Promise(resolve=>setTimeout(resolve,40));assert.equal(room.phase,'finished');host.ws.send(JSON.stringify({type:'lobby'}));await new Promise(resolve=>setTimeout(resolve,60));assert.equal(room.phase,'lobby');
  for(const p of [a,b,host,guest])p.ws.close();
 }finally{await s.game.close();}
});

test('Railway client IP quotas are separate only when edge trust is explicitly enabled',async()=>{
 for(const trustRailway of [false,true]){
  const s=await setup({trustRailway});try{
   const attempt=ip=>fetch(`${s.base}/api/auth/register`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Real-IP':ip},body:'{}'});
   for(let i=0;i<12;i++)assert.equal((await attempt('192.0.2.1')).status,400);
   assert.equal((await attempt('192.0.2.1')).status,429);
   assert.equal((await attempt('192.0.2.2')).status,trustRailway?400:429);
   assert.equal((await attempt('2001:db8::1')).status,trustRailway?400:429);
  }finally{await s.game.close();}
 }
});

test('open matchmaking respects course/weather and friends inherit the host course by code',async()=>{
 const s=await setup();try{
 const a=await join(s,'MeadowHost','clear',{mode:'open',room:'',trackId:'meadow'}),b=await join(s,'SnowHost','snow',{mode:'open',room:'',trackId:'summit'}),c=await join(s,'MeadowGuest','clear',{mode:'open',room:'',trackId:'meadow'});
 const ar=a.received[0],br=b.received[0],cr=c.received[0];assert.equal(ar.room,cr.room);assert.notEqual(ar.room,br.room);assert.equal(ar.race.trackId,'meadow');assert.equal(br.race.trackId,'summit');assert.equal(br.orcs.length,6);assert.equal(ar.orcs.length,3);
 const d=await join(s,'FriendByCode','rain',{mode:'open',room:ar.room,trackId:'canyon'});assert.equal(d.received[0].race.trackId,'meadow');assert.equal(d.received[0].weather,'clear');assert.equal(d.received[0].players.find(p=>p.id===d.id).trackId,'meadow');
 a.ws.send(JSON.stringify({type:'track',trackId:'summit',physicsVersion:5}));await new Promise(r=>setTimeout(r,70));assert.equal(s.game.rooms.get(ar.room).trackId,'meadow');
 const e=await join(s,'OldProtocol','clear',{version:6});assert.equal(e.received[0].type,'error');for(const p of [a,b,c,d,e])p.ws.close();
 }finally{await s.game.close();}
});

test('archived revision-one records remain visible without entering the revised course ranking',async()=>{
 const s=await setup();try{const r=await s.api('/auth/register',{nickname:'ArchiveRider',password:'only-this-game-987'});s.game.store.record(r.data.user.id,'mt07',72.95,{trackId:'meadow',trackRevision:1,physicsVersion:6});
 const old=(await s.api('/leaderboard?track=meadow&physics=6')).data;assert.equal(old.context.trackRevision,1);assert.equal(old.entries[0].seconds,72.95);const current=(await s.api('/leaderboard?track=meadow')).data;assert.equal(current.context.trackRevision,2);assert.equal(current.context.physicsVersion,VERSION);assert.equal(current.entries.length,0);
 }finally{await s.game.close();}
});
test('arcade room owns contested pickups, feeding and score; forged inventories and results are ignored',async()=>{const s=await setup();try{const a=await join(s,'ArcadeOne','clear',{mode:'arcade'}),b=await join(s,'ArcadeTwo','clear',{mode:'arcade'}),room=s.game.rooms.get('TEST-ROOM');const p=room.arcade.items.find(p=>p.type==='food');for(const player of room.players.values()){Object.assign(player.state,{x:p.x,z:p.z,y:0,hitCooldown:999});}await new Promise(r=>setTimeout(r,80));const sa=room.players.get(a.id).state,sb=room.players.get(b.id).state;assert.equal(sa.arcade.food+sb.arcade.food,1);const own=sa.arcade.food?sa:sb,ws=sa.arcade.food?a.ws:b.ws;own.x=room.orcs[0].x+2;own.z=room.orcs[0].z;ws.send(JSON.stringify({type:'feed'}));await new Promise(r=>setTimeout(r,70));assert.equal(own.arcade.food,0);assert(room.orcs[0].friends[own.id]);ws.send(JSON.stringify({type:'pickup',id:12,food:999,score:999999}));ws.send(JSON.stringify({type:'award',points:999999}));await new Promise(r=>setTimeout(r,70));assert(own.arcade.score<999);assert.equal(s.game.store.championship(own.id).entries.length,0);assert(a.received.some(m=>m.arcade?.items.length===32));a.ws.close();b.ws.close();}finally{await s.game.close();}});
test('eight riders with delayed inputs share bounded contacts; host leave and malformed collision cannot grant health',async()=>{const s=await setup();try{const riders=[];for(let i=0;i<8;i++)riders.push(await join(s,`ContactRider${i}`,'clear',{mode:'open',contactDamage:true}));const room=s.game.rooms.get('TEST-ROOM');room.orcs=[];for(const [i,p]of [...room.players.values()].entries())Object.assign(p.state,{x:i*.15,z:0,y:0,speed:4,contactShield:0,hitCooldown:999});for(const delay of [50,150,300]){for(const r of riders)r.ws.send(JSON.stringify({type:'input',seq:delay,throttle:1,steer:.2}));await new Promise(r=>setTimeout(r,delay));}for(const p of room.players.values()){assert(Number.isFinite(p.state.x));assert(Math.hypot(p.state.contactVX,p.state.contactVZ)<=10.01);assert(p.state.health<=100);}riders[1].ws.send(JSON.stringify({type:'collision',target:riders[0].id,health:9999}));riders[0].ws.close();await new Promise(r=>setTimeout(r,70));assert.equal(room.hostId,riders[1].id);assert(room.players.get(riders[1].id).state.health<=100);for(const r of riders)r.ws.close();}finally{await s.game.close();}});

test('championship awards only a server-finished event with fixed rules; replay cannot farm points',async()=>{const s=await setup();try{const a=await join(s,'ChampionRider','snow',{mode:'race',trackId:'meadow',championship:true,laps:5}),room=s.game.rooms.get('TEST-ROOM');assert.equal(room.laps,1);assert.equal(room.weather,'clear');a.ws.send(JSON.stringify({type:'award',points:999999}));a.ws.send(JSON.stringify({type:'lap',seconds:.001}));await new Promise(r=>setTimeout(r,60));assert.equal((await s.api('/championship')).data.entries.length,0);a.ws.send(JSON.stringify({type:'start'}));await new Promise(r=>setTimeout(r,50));room.startAt=room.time;room.orcs=[];const p=room.players.get(a.id).state,gate=trackData('meadow').GATES[0];Object.assign(p,{x:gate.x,z:gate.z,nextGate:CHECKPOINTS,lapTime:100,raceTime:100,hitCooldown:99});await new Promise(r=>setTimeout(r,100));assert.equal(room.phase,'finished');const rank=(await s.api('/championship')).data;assert.equal(rank.entries[0].points,300);assert.equal(rank.entries[0].events,1);assert(a.received.some(m=>m.type==='award'&&m.points===300));s.game.store.award(a.id,'meadow','cub',110);assert.equal((await s.api('/championship')).data.entries[0].points,300);a.ws.close();}finally{await s.game.close();}});

test('server computes drift and obstacle damage, shares momentum, ignores client health claims',async()=>{
 const s=await setup();try{
  const a=await join(s,'DriftOne','snow',{trackId:'meadow'}),b=await join(s,'DriftTwo','snow',{trackId:'meadow'}),room=s.game.rooms.get('TEST-ROOM'),own=room.players.get(a.id).state,p=trackPoint(.06,'meadow'),yaw=trackHeading(.06,'meadow');
  Object.assign(own,p,{yaw,travelYaw:yaw,speed:18,health:100,hitCooldown:100,y:groundHeight(p.x,p.z,'meadow')});
  a.ws.send(JSON.stringify({type:'input',seq:1,throttle:1,steer:1}));await new Promise(r=>setTimeout(r,450));
  assert(Math.abs(own.slipAngle)>.1);assert(b.received.some(m=>m.players?.some(p=>p.id===a.id&&Math.abs(p.slipAngle)>.05&&Number.isFinite(p.travelYaw))));
  a.ws.send(JSON.stringify({type:'input',seq:2,throttle:0,steer:0}));const o=trackData('meadow').OBSTACLES.find(o=>o.type==='rock'),z=o.z-o.radius-.55;Object.assign(own,{x:o.x,z,y:groundHeight(o.x,z,'meadow'),yaw:0,travelYaw:0,speed:22,steer:0,health:100,hits:0,hitCooldown:0,obstacleContact:null,airborne:false});
  await new Promise(r=>setTimeout(r,90));assert(own.health<100);assert.equal(own.lastDamage.type,'rock');const health=own.health;
  a.ws.send(JSON.stringify({type:'damage',health:100,travelYaw:NaN}));await new Promise(r=>setTimeout(r,90));assert.equal(own.health,health);assert(b.received.some(m=>m.players?.some(p=>p.id===a.id&&p.lastDamage?.type==='rock'&&p.health===health)));a.ws.close();b.ws.close();
 }finally{await s.game.close();}
});
