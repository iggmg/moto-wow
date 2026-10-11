import * as T from 'three';
import {add} from './model-geometry.js';
const cache=new Map(),textures=new Map();
const noise=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
// Small original, tileable micro-normal maps. No photographs or remote requests.
function microNormal(kind){
 if(textures.has(kind))return textures.get(kind);
 const n=128,h=new Float32Array(n*n),data=new Uint8Array(n*n*4);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const weave=Math.floor(x/8)+Math.floor(y/8);
  h[y*n+x]=kind==='carbon'?.5+.19*Math.sin((weave%2?x:y)*Math.PI/4):kind==='seat'?.5+.12*noise(x,y)+.08*Math.sin(x*Math.PI/2)*Math.sin(y*Math.PI/2):.5+.05*noise(x,y);
 }
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const dx=(h[y*n+(x+1)%n]-h[y*n+(x+n-1)%n])*1.4,dy=(h[((y+1)%n)*n+x]-h[((y+n-1)%n)*n+x])*1.4,l=Math.hypot(dx,dy,1),i=(y*n+x)*4;
  data.set([Math.round((.5-dx/l*.5)*255),Math.round((.5-dy/l*.5)*255),Math.round((.5+.5/l)*255),255],i);
 }
 const t=new T.DataTexture(data,n,n);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(kind==='carbon'?9:18,kind==='carbon'?9:18);t.needsUpdate=true;textures.set(kind,t);return t;
}
export function finish(name,color,metalness=0,roughness=.5,kind){
 const key=`${name}/${color}`;if(!cache.has(key)){const m=new T.MeshPhysicalMaterial({name,color,metalness,roughness,clearcoat:name.includes('paint')?.9:0,clearcoatRoughness:.17});if(kind){m.normalMap=microNormal(kind);m.normalScale.setScalar(kind==='carbon'?.055:.065);}cache.set(key,m);}return cache.get(key);
}
export function bevel(g,points,width,m,x=0,bevelSize=.002){
 const s=new T.Shape();s.moveTo(...points[0]);for(const p of points.slice(1))s.lineTo(...p);s.closePath();
 const geo=new T.ExtrudeGeometry(s,{depth:width,bevelEnabled:bevelSize>0,bevelSize,bevelThickness:Math.min(bevelSize,width*.15),bevelSegments:2,curveSegments:8,steps:1});geo.rotateY(-Math.PI/2);geo.translate(x+width/2,0,0);return add(g,geo,m);
}
const spline=(points)=>new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),false,'centripetal');
// Skinning longitudinal sections, with capped ends and separate upper/lower radii.
export function loft(g,sections,m,steps=40,sides=24){
 const curve=spline(sections.map(s=>[s[0],s[1],0])),dims=spline(sections.map(s=>[s[2],s[3],s[4]??s[3]])),v=[],uv=[],ind=[];
 for(let i=0;i<=steps;i++){const c=curve.getPoint(i/steps),d=dims.getPoint(i/steps);for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2,cos=Math.cos(a),x=Math.sin(a)*Math.max(.001,d.x),y=c.y+cos*Math.max(.001,cos>=0?d.y:d.z);v.push(x,y,c.x);uv.push(j/sides,i/steps);if(i<steps&&j<sides){const k=i*(sides+1)+j;ind.push(k,k+sides+1,k+1,k+1,k+sides+1,k+sides+2);}}}
 for(const i of [0,steps]){const c=curve.getPoint(i/steps),center=v.length/3;v.push(0,c.y,c.x);uv.push(.5,i/steps);for(let j=0;j<sides;j++){const k=i*(sides+1)+j;i===0?ind.push(center,k,k+1):ind.push(center,k+1,k);}}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(v,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(ind);geo.computeVertexNormals();return add(g,geo,m);
}
// A curved fairing skin: rows of [x,y,z] control points, mirrored about the centreline.
export function skin(g,rows,side,m,steps=16,cross=8){
 const curves=rows.map(spline),v=[],uv=[],ind=[];
 for(let i=0;i<=steps;i++){
  const across=spline(curves.map(c=>c.getPoint(i/steps).toArray()));
  for(let j=0;j<=cross;j++){const p=across.getPoint(j/cross);v.push(side*p.x,p.y,p.z);uv.push(i/steps,j/cross);if(i<steps&&j<cross){const k=i*(cross+1)+j;side>0?ind.push(k,k+cross+1,k+1,k+1,k+cross+1,k+cross+2):ind.push(k,k+1,k+cross+1,k+1,k+cross+2,k+cross+1);}}
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(v,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(ind);geo.computeVertexNormals();const o=add(g,geo,m);m.side=T.DoubleSide;return o;
}
export function pipe(g,points,r,m,steps=20,sides=8){return add(g,new T.TubeGeometry(spline(points),steps,r,sides,false),m);}
export function arcFender(g,z,y,r,width,m,start=-1.05,end=1.10){
 const v=[],uv=[],ind=[],N=40,M=10;
 for(let i=0;i<=N;i++){const a=start+(end-start)*i/N;for(let j=0;j<=M;j++){const u=j/M*2-1,rr=r+.040+.022*(1-u*u);v.push(u*width*.58,y+Math.cos(a)*rr,z+Math.sin(a)*rr);uv.push(j/M,i/N);if(i<N&&j<M){const k=i*(M+1)+j;ind.push(k,k+1,k+M+1,k+1,k+M+2,k+M+1);}}}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(v,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(ind);geo.computeVertexNormals();m.side=T.DoubleSide;return add(g,geo,m);
}
