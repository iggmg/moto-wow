import * as T from 'three';
import {clearSight} from '../shared/perception.js';
import {groundHeight} from '../shared/tracks.js';
const names={archer:'Лучник',spearman:'Копейщик',thrower:'Камнемёт',shaman:'Шаман',chief:'Вождь'};
// One reusable canvas/sprite keeps contextual dialogue bounded on phones.
export function createOrcDialogue(scene,trackId){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=160;const ctx=canvas.getContext('2d'),texture=new T.CanvasTexture(canvas),material=new T.SpriteMaterial({map:texture,depthWrite:false}),sprite=new T.Sprite(material);sprite.scale.set(6.5,1.02,1);sprite.visible=false;scene.add(sprite);let last='';
 return {sprite,update(orcs,rider,time){const orc=orcs.filter(o=>o.bark&&o.barkUntil>time&&Math.hypot(o.x-rider.x,o.z-rider.z)<24&&clearSight(o,rider,trackId)).sort((a,b)=>Math.hypot(a.x-rider.x,a.z-rider.z)-Math.hypot(b.x-rider.x,b.z-rider.z))[0];sprite.visible=!!orc;if(!orc)return;const text=`${names[orc.role]||'Орк'}: ${orc.bark}`;if(text!==last){last=text;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='rgba(15,27,23,.92)';ctx.beginPath();ctx.roundRect(6,8,1012,142,24);ctx.fill();ctx.strokeStyle='#bad39c';ctx.lineWidth=3;ctx.stroke();ctx.font='600 32px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#f0ead9';ctx.fillText(text,512,80,960);texture.needsUpdate=true;}sprite.userData.message=text;sprite.position.set(orc.x,groundHeight(orc.x,orc.z,trackId)+(orc.role==='chief'?3.9:3.4),orc.z);},dispose(){sprite.removeFromParent();texture.dispose();material.dispose();}};
}
