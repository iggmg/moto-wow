import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {BIKES,angleDiff,clamp,TRACKS,trackData,trackPoint,groundHeight,nearestTrack,surfaceAt,createRider,createOrcs,resetRider,stepRider,STEP,VERSION} from '../shared/game.js';
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
 try{const old=new DatabaseSync(file);old.exec("CREATE TABLE laps(id INTEGER PRIMARY KEY,user_id INTEGER,bike TEXT,seconds REAL,created_at TEXT DEFAULT CURRENT_TIMESTAMP); INSERT INTO laps(user_id,bike,seconds) VALUES(1,'cub',12)");old.close();store=createStore(file);const {user}=await store.register('MigrationRider','separate-game-password');assert.equal(user.id,1);const legacy={physicsVersion:5,mode:'legacy'};assert.equal(store.leaderboard('cub',legacy)[0].seconds,12);assert.equal(store.leaderboard().length,0);
 for(const [c,time]of [[{},70],[{trackId:'meadow'},80],[{weather:'snow'},90],[{mode:'race'},100]])store.record(user.id,'cub',time,c);
 assert.equal(store.leaderboard()[0].seconds,70);assert.equal(store.leaderboard(null,{trackId:'meadow'})[0].seconds,80);assert.equal(store.leaderboard(null,{weather:'snow'})[0].seconds,90);assert.equal(store.leaderboard(null,{mode:'race'})[0].seconds,100);assert.equal(store.leaderboard(null,legacy)[0].seconds,12);
 }finally{store?.close();rmSync(dir,{recursive:true,force:true});}
});
test('every motorcycle can drive a complete lap of every course using ordinary throttle, brake and steering',()=>{
 // Isolate route geometry from enemy/impact damage, covered by combat tests.
 for(const track of TRACKS)for(const bike of BIKES){const s=createRider(bike.id,0,track.id);s.hitCooldown=9999;let widest=0;for(let i=0;i<18000&&!s.completed;i++){const n=nearestTrack(s.x,s.z,track.id),p=trackPoint(n.t+.024,track.id),angle=angleDiff(Math.atan2(p.x-s.x,p.z-s.z),s.yaw),target=track.id==='summit'?4:8;widest=Math.max(widest,n.distance);stepRider(s,{throttle:s.speed<target?1:0,brake:s.speed>target+.3?.3:0,steer:clamp(-angle*4,-1,1)},STEP,i*STEP,[],track.weather);}assert.equal(s.completed,1,`${track.id}/${bike.id} reaches finish`);assert(widest<=track.width/2,`${track.id}/${bike.id} stays inside the road`);}
});
