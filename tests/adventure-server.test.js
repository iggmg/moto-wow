import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {WebSocket} from 'ws';
import {createGameServer} from '../server/index.js';
import {VERSION} from '../shared/game.js';
const origin='http://127.0.0.1:5173',pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('courier room shares one cargo, rejects duplicate/distant actions and rematches through host-only start',async()=>{
 const game=createGameServer({database:':memory:',origins:[origin]});game.server.listen(0,'127.0.0.1');await once(game.server,'listening');const base=`http://127.0.0.1:${game.server.address().port}`;
 const api=async(path,body,token)=>{const r=await fetch(base+'/api'+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});return r.json();};
 const clients=[];
 try{
  for(const nickname of ['CargoHost','CargoFriend']){const auth=await api('/auth/register',{nickname,password:'only-test-separate-password'}),ticket=await api('/ws-ticket',{},auth.token),ws=new WebSocket(base.replace('http:','ws:')+'/ws?ticket='+ticket.ticket,{origin});await once(ws,'open');const messages=[];ws.on('message',raw=>messages.push(JSON.parse(raw)));const joined=once(ws,'message');ws.send(JSON.stringify({type:'join',mode:'courier',room:'COURIER',bike:'winner',version:VERSION}));await joined;clients.push({ws,id:auth.user.id,messages});}
  const [host,friend]=clients,room=game.rooms.get('COURIER');friend.ws.send(JSON.stringify({type:'start'}));await pause(35);assert.equal(room.phase,'lobby');host.ws.send(JSON.stringify({type:'start'}));await pause(35);assert.equal(room.phase,'countdown');room.startAt=room.time;await pause(40);assert.equal(room.phase,'racing');
  const carrier=room.players.get(host.id).state,receiver=room.players.get(friend.id).state;room.orcs=[];room.time=2;Object.assign(carrier,{x:room.adventure.cargo.x,z:room.adventure.cargo.z});await pause(50);assert.equal(room.adventure.cargo.ownerId,host.id);
  room.time=4;receiver.x=200;receiver.z=150;host.ws.send(JSON.stringify({type:'adventure',action:'pass',seq:1}));await pause(35);assert.equal(room.adventure.cargo.ownerId,host.id);
  receiver.x=carrier.x;receiver.z=carrier.z;room.adventure.cargo.pickReady=0;host.ws.send(JSON.stringify({type:'adventure',action:'pass',seq:2}));await pause(35);assert.equal(room.adventure.cargo.ownerId,friend.id);
  host.ws.send(JSON.stringify({type:'adventure',action:'pass',seq:2,ownerId:host.id,score:99999}));await pause(35);assert.equal(room.adventure.cargo.ownerId,friend.id);assert.equal(room.adventure.score,0);
  Object.assign(receiver,{x:room.adventure.bank.x,z:room.adventure.bank.z});room.adventure.cargo.pickReady=0;receiver.adventure.actionReady=0;friend.ws.send(JSON.stringify({type:'adventure',action:'bank',seq:1}));await pause(50);assert.equal(room.phase,'finished');assert.equal(room.adventure.score,100);assert(room.adventure.winners.includes(host.id));friend.ws.send(JSON.stringify({type:'adventure',action:'bank',seq:1}));await pause(35);assert.equal(room.adventure.score,100);
  const snapshot=host.messages.findLast(m=>m.adventure?.finished);assert(snapshot);assert.equal(snapshot.adventure.score,100);host.ws.send(JSON.stringify({type:'lobby'}));await pause(35);assert.equal(room.phase,'lobby');host.ws.send(JSON.stringify({type:'start'}));await pause(35);assert.equal(room.phase,'countdown');assert.equal(room.adventure.score,0);assert.equal(room.players.get(host.id).state.id,host.id);
 }finally{for(const c of clients)c.ws.close();await game.close();}
});
