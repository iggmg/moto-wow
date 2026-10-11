import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {createServer} from 'vite';
import {chromium} from '@playwright/test';
import {BIKES} from '../shared/game.js';
// Export in a real browser so original DataTexture normal maps are embedded as PNG.
// The resulting GLB never needs the exporter, a CDN or remote image services at runtime.
const server=await createServer({configFile:false,base:'/',server:{host:'127.0.0.1',port:5190,strictPort:true},logLevel:'error'});
let browser;
try{
 await server.listen();browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--use-angle=metal']});
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5190/');mkdirSync('public/models',{recursive:true});const manifest={},sources=JSON.parse(readFileSync('assets/bike-bases/sources.json'));
 for(const bike of BIKES){
  const result=await page.evaluate(async ({id,licensed})=>{
   const {buildBike}=await import('/src/models.js'),{referenceDetails}=await import('/src/motorcycles.js'),{BIKE_VISUALS,BIKE_RIGS}=await import('/src/bike-specs.js'),{bikeById}=await import('/shared/game.js'),{disposeBike,riderModel,optimize}=await import('/src/model-geometry.js'),{GLTFExporter}=await import('/node_modules/three/examples/jsm/exporters/GLTFExporter.js'),{GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
   let root;
   if(licensed){root=(await new GLTFLoader().loadAsync(`/assets/bike-bases/${id}.glb`)).scene;const body=root.getObjectByName('BikeBody');for(const name of ['WheelRear','WheelFront']){const wheel=root.getObjectByName(name);if(!wheel)throw new Error(`${id}: missing ${name}`);wheel.userData.dynamic=true;optimize(wheel);}body.add(referenceDetails(id),riderModel({...bikeById(id),...BIKE_VISUALS[id],...BIKE_RIGS[id]}));optimize(body);}
   else root=buildBike(id,{rider:true});
   let triangles=0,drawCalls=0;root.traverse(o=>{o.userData={};if(o.isMesh){triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;drawCalls++;}});
   const bytes=new Uint8Array(await new GLTFExporter().parseAsync(root,{binary:true}));let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));disposeBike(root);return {base64:btoa(binary),triangles,drawCalls};
  },{id:bike.id,licensed:!!sources[bike.id]&&existsSync(`assets/bike-bases/${bike.id}.glb`)});
  const file=`${bike.id}.glb`,bytes=Buffer.from(result.base64,'base64');writeFileSync(`public/models/${file}`,bytes);
  manifest[bike.id]={file,revision:3,...(sources[bike.id]||{author:'Moto Rift project',license:'MIT'}),kind:sources[bike.id]?'licensed-reference-adaptation':'original-reference-model',units:'meters',forward:'+Z',triangles:result.triangles,drawCalls:result.drawCalls,bytes:bytes.length};console.log(`${bike.name}: ${result.triangles} triangles, ${result.drawCalls} meshes, ${Math.round(bytes.length/1024)} KB`);
 }
 writeFileSync('public/models/manifest.json',JSON.stringify(manifest,null,2)+'\n');
}finally{await browser?.close();await server.close();}
