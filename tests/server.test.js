import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { createGameServer } from '../server/index.js';
const origin='http://127.0.0.1:5173';
async function setup(options={}){const game=createGameServer({database:':memory:',origins:[origin],...options});game.server.listen(0,'127.0.0.1');await once(game.server,'listening');const base=`http://127.0.0.1:${game.server.address().port}`;return {game,base,async api(path,body,token){const r=await fetch(`${base}/api${path}`,{method:body?'POST':'GET',headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),headers:r.headers};}};}
test('accounts, hashing, login, sessions and leaderboard persist correctly',async()=>{const s=await setup();try{let r=await s.api('/auth/register',{nickname:'RiderOne',password:'correct-horse-987'});assert.equal(r.status,200);const token=r.data.token,user=r.data.user;assert(r.headers.get('set-cookie').includes('HttpOnly'));assert.notEqual(s.game.store.db.prepare('SELECT password FROM users').get().password,'correct-horse-987');assert.equal((await s.api('/auth/login',{nickname:'RiderOne',password:'bad'})).status,400);assert.equal((await s.api('/auth/login',{nickname:'riderone',password:'correct-horse-987'})).status,200);assert.equal((await s.api('/auth/register',{nickname:'RiderOne',password:'another-password'})).status,400);assert.equal((await s.api('/auth/me',null,token)).data.user.id,user.id);assert.equal((await s.api('/auth/me')).status,401);s.game.store.record(user.id,'cub',70);s.game.store.record(user.id,'cub',61);const rank=(await s.api('/leaderboard')).data.entries;assert.equal(rank[0].seconds,61);assert.equal(rank[0].laps,2);assert.equal((await s.api('/laps',{seconds:1},token)).status,404);await s.api('/auth/logout',{},token);assert.equal((await s.api('/auth/me',null,token)).status,401);}finally{await s.game.close();}});
async function join(s,nickname,weather='clear'){const reg=await s.api('/auth/register',{nickname,password:'strong-password-987'});const ticket=(await s.api('/ws-ticket',{},reg.data.token)).data.ticket;const ws=new WebSocket(s.base.replace('http:','ws:')+`/ws?ticket=${ticket}`,{origin});await once(ws,'open');const received=[];ws.on('message',d=>received.push(JSON.parse(d)));const joined=once(ws,'message');ws.send(JSON.stringify({type:'join',room:'TEST-ROOM',bike:'cub',weather}));await joined;return {ws,received,id:reg.data.user.id};}
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
