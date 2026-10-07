import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { BIKES } from '../shared/game.js';
import { buildBike } from '../src/models.js';
test('all exported bike sources preserve painted shells, rider and two independently moving wheels',()=>{
 for(const bike of BIKES){const root=buildBike(bike.id,{rider:true});assert(root.getObjectByName('Rider'));assert.equal(root.userData.wheels.length,2);let paintVertices=0;
  root.traverse(o=>{if(!o.isMesh)return;assert(o.geometry.attributes.position.count>0);assert(o.geometry.attributes.normal);if(o.material.color.getHex()===bike.color)paintVertices+=o.geometry.attributes.position.count;});
  assert(paintVertices>1000,`${bike.name}: bodywork vanished during merging`);
  const box=new T.Box3().setFromObject(root),size=box.getSize(new T.Vector3());assert(size.y>1.5&&size.y<2.3);assert(size.z>1.7&&size.z<2.7);assert(box.min.y>-.08&&box.min.y<.08);
 }
});
