import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { BIKES } from '../shared/game.js';
import { buildBike } from '../src/models.js';
import {BIKE_VISUALS} from '../src/bike-specs.js';
import {optimize} from '../src/model-geometry.js';
import {readFileSync} from 'node:fs';
test('all exported bike sources preserve painted shells, rider and two independently moving wheels',()=>{
 for(const bike of BIKES){const root=buildBike(bike.id,{rider:true});assert(root.getObjectByName('Rider'));assert.equal(root.userData.wheels.length,2);let paintVertices=0;
  root.traverse(o=>{if(!o.isMesh)return;assert(o.geometry.attributes.position.count>0);assert(o.geometry.attributes.normal);if(o.material.color.getHex()===BIKE_VISUALS[bike.id].color)paintVertices+=o.geometry.attributes.position.count;});
  assert(paintVertices>1000,`${bike.name}: bodywork vanished during merging`);
  const box=new T.Box3().setFromObject(root),size=box.getSize(new T.Vector3());assert(size.y>1.5&&size.y<2.3);assert(size.z>1.7&&size.z<2.7);assert(box.min.y>-.08&&box.min.y<.08);
 }
});

test('merging imported material groups retains every triangle and the right material',()=>{
 const root=new T.Group(),a=new T.MeshStandardMaterial({color:'red'}),b=new T.MeshStandardMaterial({color:'blue'}),geometry=new T.BoxGeometry(1,1,1);
 geometry.groups.forEach((group,i)=>group.materialIndex=i%2);root.add(new T.Mesh(geometry,[a,b]));optimize(root);
 assert.equal(root.children.length,2);assert.equal(root.children.reduce((n,m)=>n+m.geometry.index.count/3,0),12);
 assert.deepEqual(new Set(root.children.map(m=>m.material)),new Set([a,b]));
});
test('published GLBs have complete animation nodes, embedded resources, credits and an exact manifest',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../public/models/manifest.json',import.meta.url)));
 for(const bike of BIKES){
  const entry=manifest[bike.id],bytes=readFileSync(new URL('../public/models/'+entry.file,import.meta.url));
  assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(8),bytes.length);assert.equal(bytes.length,entry.bytes);
  const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  for(const name of ['BikeBody','WheelRear','WheelFront','Rider'])assert(gltf.nodes.some(n=>n.name===name),bike.id+': '+name);
  assert(gltf.buffers.every(b=>!b.uri));assert((gltf.images||[]).every(i=>i.bufferView!==undefined&&!i.uri));
  let triangles=0;for(const mesh of gltf.meshes)for(const p of mesh.primitives)triangles+=gltf.accessors[p.indices].count/3;
  assert.equal(triangles,entry.triangles);assert(triangles<150000);assert(bytes.length<9000000);
  if(entry.kind==='licensed-reference-adaptation'){assert.equal(entry.license,'CC-BY-4.0');assert(entry.author);assert(entry.source.startsWith('https://sketchfab.com/'));assert(entry.changes);}
 }
});
