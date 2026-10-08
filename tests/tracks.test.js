import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {BIKES,angleDiff,clamp,TRACKS,trackData,trackPoint,trackHeading,routeGuidance,groundHeight,nearestTrack,surfaceAt,createRider,createOrcs,resetRider,stepRider,STEP,VERSION} from '../shared/game.js';
import {createRoom,startRoom} from '../server/rooms.js';
import {createStore} from '../server/store.js';
test('four distinct closed courses have ordered reachable gates, ramps and local terrain',()=>{
 assert.equal(new Set(TRACKS.map(t=>t.id)).size,4);
 for(const track of TRACKS){const data=trackData(track.id);assert.equal(data.GATES.length,16);for(const [i,g]of data.GATES.entries()){assert.equal(nearestTrack(g.x,g.z,track.id).distance,0);assert(Number.isFinite(groundHeight(g.x,g.z,track.id)));const next=data.GATES[(i+1)%16];assert(Math.hypot(next.x-g.x,next.z-g.z)>15);}
 const rider=createRider('cub',0,track.id);assert.equal(rider.trackId,track.id);assert.equal(rider.physicsVersion,VERSION);rider.nextGate=7;resetRider(rider);assert.equal(rider.x,data.GATES[6].x);assert.equal(rider.z,data.GATES[6].z);
 for(const ramp of data.RAMPS)assert.equal(surfaceAt(ramp.x,ramp.z,'clear',track.id).name,'ramp');for(const river of data.RIVERS)assert.equal(surfaceAt(river.x,river.z,'clear',track.id).name,'water');
 // All ordered checkpoints produce one lap under the same server physics rules.
 const s=createRider('himalayan',0,track.id);for(let i=1;i<=16;i++){const g=data.GATES[i%16];s.x=g.x;s.z=g.z;s.y=groundHeight(g.x,g.z,track.id);s.hitCooldown=100;stepRider(s,{},STEP,i,[],track.weather);}assert.equal(s.completed,1);assert.equal(s.last>0,true);
 }
 assert.equal(trackData('meadow').RIVERS.length,0);assert.equal(trackData('canyon').RIVERS.length,3);assert(trackData('summit').width<trackData('rift').width);
});
test('simultaneous rooms keep their own terrain and course through a shared start',()=>{
 const a=createRoom('EASY',{mode:'race',trackId:'meadow'},1),b=createRoom('SNOW',{mode:'race',trackId:'summit'},2);
 for(const [r,id]of [[a,1],[b,2]]){r.players.set(id,{state:createRider('cub',0,r.trackId),input:{}});assert(startRoom(r,id));assert(r.orcs.every(o=>o.trackId===r.trackId));assert.equal(r.players.get(id).state.trackId,r.trackId);}assert.equal(b.weather,'snow');assert.notDeepEqual(trackPoint(0,a.trackId),trackPoint(0,b.trackId));assert(createOrcs(0,'meadow').length<createOrcs(0,'summit').length);
});
test('database migration retains old laps and partitions course, weather, mode and physics',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'moto-migration-')),file=join(dir,'store.sqlite');let store;
 try{const old=new DatabaseSync(file);old.exec("CREATE TABLE laps(id INTEGER PRIMARY KEY,user_id INTEGER,bike TEXT,seconds REAL,created_at TEXT DEFAULT CURRENT_TIMESTAMP); INSERT INTO laps(user_id,bike,seconds) VALUES(1,'cub',12)");old.close();store=createStore(file);const {user}=await store.register('MigrationRider','separate-game-password');assert.equal(user.id,1);const legacy={physicsVersion:5,trackRevision:1,mode:'legacy'};assert.equal(store.leaderboard('cub',legacy)[0].seconds,12);assert.equal(store.leaderboard().length,0);
 for(const [c,time]of [[{},70],[{trackId:'meadow'},80],[{weather:'snow'},90],[{mode:'race'},100]])store.record(user.id,'cub',time,c);
 assert.equal(store.leaderboard()[0].seconds,70);assert.equal(store.leaderboard(null,{trackId:'meadow'})[0].seconds,80);assert.equal(store.leaderboard(null,{weather:'snow'})[0].seconds,90);assert.equal(store.leaderboard(null,{mode:'race'})[0].seconds,100);assert.equal(store.leaderboard(null,legacy)[0].seconds,12);
 }finally{store?.close();rmSync(dir,{recursive:true,force:true});}
});
test('every motorcycle can drive a complete lap of every course using ordinary throttle, brake and steering',()=>{
 // Isolate route geometry from enemy/impact damage, covered by combat tests.
 for(const track of TRACKS)for(const bike of BIKES){const data=trackData(track.id),s=createRider(bike.id,0,track.id);s.hitCooldown=9999;let widest=0;
  for(let i=0;i<36000&&!s.completed;i++){
   const n=nearestTrack(s.x,s.z,track.id),p=trackPoint(n.t+5/data.length,track.id),angle=angleDiff(Math.atan2(p.x-s.x,p.z-s.z),s.yaw);let bend=0;
   for(const distance of [5,10,15,20])bend=Math.max(bend,Math.abs(angleDiff(trackHeading(n.t+(distance+3)/data.length,track.id),trackHeading(n.t+(distance-3)/data.length,track.id)))/6);
   const grip=track.weather==='snow'?.45:track.weather==='rain'?.55:.85,target=clamp((bike.handling*.35*grip)/(Math.max(.008,bend)*1.25),1.1,track.id==='summit'?7:10);
   widest=Math.max(widest,n.distance);stepRider(s,{throttle:s.speed<target?1:0,brake:s.speed>target+.15?.5:0,steer:clamp(-angle*5,-1,1)},STEP,i*STEP,[],track.weather);
  }assert.equal(s.completed,1,`${track.id}/${bike.id} reaches finish`);assert(widest<=track.width/2,`${track.id}/${bike.id} stays inside the road`);
 }
});
test('winding routes change turn direction, leave clearance between arms and never cross road edges',()=>{
 const cross=(a,b,c)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x),intersects=(a,b,c,d)=>cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0;
 for(const track of TRACKS){const data=trackData(track.id),points=data.TRACK;assert.equal(track.revision,2);assert.deepEqual(trackPoint(0,track.id),trackPoint(1,track.id));assert(Math.abs(angleDiff(trackHeading(.99999,track.id),trackHeading(.00001,track.id)))<.01);
  let turns=0,last=0;for(let i=0;i<1024;i++){const curve=angleDiff(trackHeading((i+1)/1024,track.id),trackHeading((i-1)/1024,track.id))/(data.length*2/1024);if(Math.abs(curve)>.004){const sign=Math.sign(curve);if(last&&sign!==last)turns++;last=sign;}}assert(turns>=6,`${track.id} has alternating bends`);
  for(let a=0;a<256;a++)for(let b=a+1;b<256;b++){const separation=Math.min(b-a,256-b+a)*data.length/256;if(separation<Math.max(30,track.width*3))continue;assert(Math.hypot(points[a].x-points[b].x,points[a].z-points[b].z)>track.width+6,`${track.id} separate road arms`);}
  for(const side of [-1,1]){const edge=Array.from({length:512},(_,i)=>{const p=trackPoint(i/512,track.id),yaw=trackHeading(i/512,track.id),offset=side*(track.width/2+.9);return {x:p.x+Math.cos(yaw)*offset,z:p.z-Math.sin(yaw)*offset};});for(let a=0;a<512;a++)for(let b=a+2;b<512;b++){if(a===0&&b===511)continue;assert(!intersects(edge[a],edge[(a+1)%512],edge[b],edge[(b+1)%512]),`${track.id} road edge does not fold or cross`);}}
  for(const ramp of data.RAMPS)assert(Math.abs(angleDiff(trackHeading(ramp.t+5/data.length,track.id),trackHeading(ramp.t-5/data.length,track.id)))<.25,`${track.id} jump has a straight approach`);
 }
});
test('guidance follows the road, detects reverse travel and guides an off-road rider back',()=>{
 for(const track of TRACKS){for(const t of [.03,.28,.62,.9]){const p=trackPoint(t,track.id),yaw=trackHeading(t,track.id),s={...p,yaw,speed:5,trackId:track.id};let guide=routeGuidance(s);assert(!guide.offRoad&&!guide.wrongWay);assert(Number.isFinite(guide.angle));guide=routeGuidance({...s,yaw:yaw+Math.PI});assert(guide.wrongWay);assert(Math.abs(guide.angle)>2);
 const off={...s,x:p.x+Math.cos(yaw)*(track.width/2+8),z:p.z-Math.sin(yaw)*(track.width/2+8)};guide=routeGuidance(off);assert(guide.offRoad);assert(!guide.wrongWay);assert(nearestTrack(guide.target.x,guide.target.z,track.id).distance<.1);
 }}
});
