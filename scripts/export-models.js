import { writeFileSync,mkdirSync } from 'node:fs';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { BIKES } from '../shared/game.js';
import { buildBike } from '../src/models.js';
// Three.js exporter uses the browser FileReader; Node Blob supplies equivalent bytes.
globalThis.FileReader=class {async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}async readAsDataURL(blob){this.result=`data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`;this.onloadend?.();}};
mkdirSync('public/models',{recursive:true});
const manifest={};for(const bike of BIKES){const model=buildBike(bike.id,{rider:true});model.userData={};model.traverse(o=>o.userData={});const result=await new GLTFExporter().parseAsync(model,{binary:true});const file=`${bike.id}.glb`;writeFileSync(`public/models/${file}`,Buffer.from(result));manifest[bike.id]={file,author:'Moto Rift project',license:'MIT',kind:'original-approximation',units:'meters',forward:'+Z'};console.log(`${bike.name}: ${Math.round(result.byteLength/1024)} KB`);}
writeFileSync('public/models/manifest.json',JSON.stringify(manifest,null,2)+'\n');
