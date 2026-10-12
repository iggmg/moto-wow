import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SnapshotBuffer} from '../src/snapshot-buffer.js';
test('remote presentation interpolates server timestamps and the shortest yaw arc without changing snapshots',()=>{
 const b=new SnapshotBuffer(),a={x:0,y:0,z:0,yaw:3.1,speed:10},c={...a,x:1,yaw:-3.1};b.push(1,a,1000);b.push(1.1,c,1100);const s=b.sample(1150);assert.ok(s.x>0&&s.x<1);assert.ok(Math.abs(s.yaw)>3);assert.equal(a.x,0);assert.equal(c.yaw,-3.1);
});
test('jitter expands a bounded delay, duplicate snapshots are ignored and teleports never interpolate across the map',()=>{
 const b=new SnapshotBuffer();for(let i=0;i<100;i++)b.push(i*.05,{x:i*.1,y:0,z:0,yaw:0,speed:2},i*50+(i%2?90:0));assert.ok(b.samples.length<=32);assert.ok(b.delay>=.08&&b.delay<=.2);const length=b.samples.length;b.push(4.95,{x:100,z:0,yaw:0},6000);assert.equal(b.samples.length,length);assert.equal(b.push(5,{x:100,y:0,z:0,yaw:1},6100),true);assert.equal(b.sample(6100).x,100);assert.equal(b.samples.length,1);
});
