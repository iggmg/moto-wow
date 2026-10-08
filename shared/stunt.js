import {bikeById} from './game.js';
// Fixed-step planar rigid frame with two circular wheel contacts and suspension travel.
export const STUNT_LEVELS=[
 {id:'training',name:'Школа баланса',description:'Брёвна, ступени и первый прыжок.',finish:135,checkpoints:[0,38,82],ground:[[0,0],[18,0],[23,1.2],[28,0],[38,0],[43,1],[49,1],[50,0],[61,0],[68,2.2],[72,2.2],[78,0],[92,0],[99,1.2],[108,1.2],[115,0],[140,0]],gaps:[]},
 {id:'ravine',name:'Через ущелье',description:'Разгон, трамплины и два разрыва.',finish:165,checkpoints:[0,58,113],ground:[[0,0],[24,0],[32,3],[40,3],[50,0],[62,0],[77,1.6],[83,3.6],[96,1],[113,1],[125,4],[131,4],[145,1],[170,1]],gaps:[[40,48],[83,94],[131,143]]},
 {id:'citadel',name:'Стены цитадели',description:'Высокие ступени и точные приземления.',finish:190,checkpoints:[0,65,128],ground:[[0,0],[18,0],[22,1.5],[30,1.5],[36,3],[44,3],[55,1],[65,1],[75,4],[82,4],[98,2],[113,2],[120,4.5],[128,4.5],[136,6],[143,6],[154,2],[173,2],[181,0],[200,0]],gaps:[[82,95],[143,153]]}
];
export const stuntLevel=id=>STUNT_LEVELS.find(l=>l.id===id)||STUNT_LEVELS[0];
export function stuntGround(x,id){const l=stuntLevel(id);if(x<0)return {height:0,slope:0};if(l.gaps.some(([a,b])=>x>a&&x<b))return null;for(let i=1;i<l.ground.length;i++){const [a,ay]=l.ground[i-1],[b,by]=l.ground[i];if(x<=b)return {height:ay+(by-ay)*(x-a)/(b-a),slope:(by-ay)/(b-a)};}return {height:l.ground.at(-1)[1],slope:0};}
export function createStunt(bike='cub',level='training'){return {bike,level:stuntLevel(level).id,x:3,y:bikeById(bike).wheel+.26,vx:0,vy:0,angle:0,omega:0,time:0,falls:0,checkpoint:0,finished:false,failed:false,contacts:[false,false],compression:[0,0],travel:0};}
export function retryStunt(s){const p=stuntLevel(s.level).checkpoints[s.checkpoint],g=stuntGround(p,s.level);Object.assign(s,{x:p+3,y:(g?.height||0)+bikeById(s.bike).wheel+.26,vx:0,vy:0,angle:0,omega:0,failed:false,contacts:[false,false],compression:[0,0]});}
const limit=(x,a,b)=>Math.max(a,Math.min(b,x));
export function stuntWheels(s){const b=bikeById(s.bike);return [-b.wheelbase/2,b.wheelbase/2].map((x,i)=>({radius:i?b.frontWheel||b.wheel:b.wheel,x:s.x+x*Math.cos(s.angle)+.25*Math.sin(s.angle),y:s.y+x*Math.sin(s.angle)-.25*Math.cos(s.angle),rx:x*Math.cos(s.angle)+.25*Math.sin(s.angle),ry:x*Math.sin(s.angle)-.25*Math.cos(s.angle)}));}
export function stepStunt(s,input,dt=1/60){if(s.failed||s.finished)return;const throttle=limit(Number(input.throttle)||0,0,1),brake=limit(Number(input.brake)||0,0,1),tilt=limit(Number(input.steer)||0,-1,1),sub=dt/4;
 for(let n=0;n<4;n++){
  if(s.y<-7){s.failed=true;s.falls++;break;}
  s.time+=sub;s.omega+=(tilt*7-s.omega*.65)*sub;s.omega=limit(s.omega,-5,5);s.vy-=9.81*sub;
  if(s.contacts.some(Boolean)){s.vx+=(throttle*9-brake*14*Math.sign(s.vx)-s.vx*.35)*sub;s.vx=limit(s.vx,-3,22);}else s.vx*=Math.exp(-sub*.02);
  s.x=Math.max(.8,s.x+s.vx*sub);s.y+=s.vy*sub;s.angle+=s.omega*sub;s.contacts=[false,false];s.compression=[0,0];
  for(let iteration=0;iteration<3;iteration++)for(const [i,w]of stuntWheels(s).entries()){
   const g=stuntGround(w.x,s.level);if(!g)continue;const normal=Math.hypot(1,g.slope),nx=-g.slope/normal,ny=1/normal,penetration=(g.height+w.radius-w.y)/normal;if(penetration<-.012)continue;if(penetration>.8){s.failed=true;break;}s.contacts[i]=true;s.compression[i]=Math.max(s.compression[i],Math.min(.15,Math.max(0,penetration)));
   if(penetration>0){s.x+=nx*penetration*.65;s.y+=ny*penetration*.65;}
   const velocity=(s.vx-s.omega*w.ry)*nx+(s.vy+s.omega*w.rx)*ny,lever=w.rx*ny-w.ry*nx;if(velocity<0){const impulse=-velocity/(1+lever*lever/.43);s.vx+=impulse*nx;s.vy+=impulse*ny;s.omega+=impulse*lever/.43;}
  }
  if(s.failed){s.falls++;break;}
  s.travel+=Math.abs(s.vx)*sub;const headX=s.x-Math.sin(s.angle)*1.05,headY=s.y+Math.cos(s.angle)*1.05,headGround=stuntGround(headX,s.level),up=Math.cos(s.angle);
  if(s.y<-7||headGround&&headY<headGround.height+.15||s.contacts.some(Boolean)&&up<-.1){s.failed=true;s.falls++;break;}
  const level=stuntLevel(s.level);for(let i=s.checkpoint+1;i<level.checkpoints.length;i++)if(s.x>=level.checkpoints[i]&&s.contacts.some(Boolean)&&up>.7)s.checkpoint=i;
  if(s.x>=level.finish&&s.contacts.some(Boolean)&&up>.6){s.finished=true;s.result=s.time+s.falls*5;s.medal=s.falls===0?'Золото':s.falls<=2?'Серебро':'Бронза';}
 }
}
