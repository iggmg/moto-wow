import * as T from 'three';
import {bikeById,groundHeight} from '../shared/game.js';
// A fixed pool: long sessions reuse the same geometry and one draw call.
export function createTyreMarks(scene,trackId){
  const capacity=96,geometry=new T.PlaneGeometry(1,1);geometry.rotateX(-Math.PI/2);
  const material=new T.MeshBasicMaterial({transparent:true,opacity:.5,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,side:T.DoubleSide});
  const mesh=new T.InstancedMesh(geometry,material,capacity),dummy=new T.Object3D(),color=new T.Color(),segments=new Array(capacity);
  mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;mesh.count=0;scene.add(mesh);
  let index=0,count=0,last=null,stamp=0;
  return {mesh,update(s,time){
    const offset=bikeById(s.bike).wheelbase/2,point={x:s.x-Math.sin(s.yaw)*offset,z:s.z-Math.cos(s.yaw)*offset};
    const sliding=!s.airborne&&s.speed>2&&(Math.abs(s.slipAngle||0)>.12||s.rearBrake>.2)&&!['water','ramp'].includes(s.surface);
    if(sliding&&last&&time-stamp>.035){
      const dx=point.x-last.x,dz=point.z-last.z,length=Math.hypot(dx,dz);
      // A checkpoint reset must start a new trail, never bridge a teleport.
      if(length>=3){last=point;stamp=time;}
      if(length>.15&&length<3){
        const x=(point.x+last.x)/2,z=(point.z+last.z)/2,y=groundHeight(x,z,trackId)+.035;
        segments[index]={x,y,z,length,yaw:Math.atan2(dx,dz),time};mesh.setColorAt(index,color.set(s.surface==='snow'?0x536e80:s.surface==='sand'?0x60492f:0x1d2820));
        index=(index+1)%capacity;count=Math.min(capacity,count+1);mesh.count=count;stamp=time;last=point;
      }
    }else last=point;
    for(let i=0;i<count;i++){const mark=segments[i],fade=Math.max(0,1-(time-mark.time)/8);dummy.position.set(mark.x,mark.y,mark.z);dummy.rotation.set(0,mark.yaw,0);dummy.scale.set(.18*fade,1,mark.length+.04);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}
    if(count){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
  },dispose(){scene.remove(mesh);geometry.dispose();material.dispose();}};
}
