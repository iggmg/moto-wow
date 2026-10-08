export const DEFAULT_TRACK='rift',PHYSICS_VERSION=8,CHECKPOINTS=16;
export const TRACKS=[
 {id:'rift',name:'Сумеречный Разлом',difficulty:'Средняя',description:'Лесные S-повороты, две тесные петли, грязь и прыжки.',revision:2,width:12,route:[[0,108],[55,108],[110,95],[132,60],[110,28],[60,12],[70,-18],[125,-32],[135,-78],[100,-112],[48,-100],[18,-62],[-20,-86],[-65,-112],[-119,-92],[-140,-48],[-111,-12],[-50,0],[-60,32],[-124,48],[-131,84],[-76,108],[-35,108]],relief:1,weather:'clear',biome:'forest',ramps:[.115,.505],rivers:[.285,.755],mud:[[.19,.27],[.61,.70]],sand:[[.375,.46]],obstacles:[.135,.175,.31,.36,.48,.54,.72,.79,.83,.9],orcs:[.045,.30,.43,.57,.73,.86]},
 {id:'meadow',name:'Изумрудная Долина',difficulty:'Лёгкая',description:'Плавные S-повороты и широкие дуги среди пологих холмов.',revision:2,width:18,route:[[0,95],[52,95],[100,78],[110,36],[98,8],[112,-34],[92,-82],[40,-100],[-10,-92],[-58,-104],[-110,-76],[-116,-30],[-101,0],[-110,38],[-90,80],[-45,95]],relief:.35,weather:'clear',biome:'meadow',ramps:[.46],rivers:[],mud:[[.64,.68]],sand:[],obstacles:[.18,.43,.78],orcs:[.07,.58,.84]},
 {id:'canyon',name:'Речные Петли',difficulty:'Средняя',description:'Длинные речные петли, смена быстрых и тесных поворотов, три брода.',revision:2,width:12,route:[[0,112],[60,112],[122,104],[152,76],[142,40],[96,25],[42,24],[38,-8],[98,-13],[147,-29],[151,-72],[111,-113],[56,-119],[11,-97],[-3,-53],[-34,-40],[-61,-79],[-107,-110],[-151,-90],[-160,-47],[-133,-11],[-81,5],[-73,38],[-116,56],[-144,86],[-120,115],[-59,112]],relief:1.45,weather:'rain',biome:'canyon',ramps:[.10,.58],rivers:[.29,.53,.79],mud:[[.12,.19],[.65,.74]],sand:[[.34,.49]],obstacles:[.22,.32,.40,.48,.61,.70,.85,.92],orcs:[.045,.27,.45,.62,.78,.90]},
 {id:'summit',name:'Перевал Ледяного Клыка',difficulty:'Сложная',description:'Горные шпильки, затяжной серпантин и три прыжка на снегу.',revision:2,width:9,route:[[0,118],[56,118],[113,114],[144,93],[138,67],[104,61],[42,61],[12,44],[22,18],[57,14],[114,14],[142,-5],[137,-31],[106,-38],[45,-38],[16,-59],[29,-88],[72,-94],[125,-95],[145,-111],[147,-127],[132,-139],[107,-141],[59,-139],[3,-126],[-39,-102],[-54,-63],[-37,-22],[-52,13],[-100,30],[-132,59],[-128,98],[-82,122],[-35,118]],relief:3.2,weather:'snow',biome:'summit',ramps:[.085,.49,.86],rivers:[.68],mud:[[.24,.30]],sand:[[.55,.61]],obstacles:[.17,.22,.28,.34,.40,.45,.54,.59,.64,.73,.77,.86,.92],orcs:[.035,.24,.39,.55,.72,.88]}
];
export const trackById=id=>TRACKS.find(t=>t.id===id)||TRACKS[0];
const routes=new Map();
// Closed Catmull-Rom curves, resampled by distance: gates and scenery stay
// evenly spaced even when a route mixes long straights and tight switchbacks.
function routeData(id){
 const track=trackById(id);if(routes.has(track.id))return routes.get(track.id);
 const knots=track.route,n=knots.length,points=[],distances=[0],samples=n*64;
 for(let i=0;i<=samples;i++){
  const u=i/samples*n,index=Math.floor(u)%n,f=u-Math.floor(u),p=[-1,0,1,2].map(j=>knots[(index+j+n)%n]);
  const coordinate=k=>.5*((2*p[1][k])+(-p[0][k]+p[2][k])*f+(2*p[0][k]-5*p[1][k]+4*p[2][k]-p[3][k])*f*f+(-p[0][k]+3*p[1][k]-3*p[2][k]+p[3][k])*f*f*f);
  const point={x:coordinate(0),z:coordinate(1)};if(i)distances.push(distances[i-1]+Math.hypot(point.x-points[i-1].x,point.z-points[i-1].z));points.push(point);
 }
 const data={points,distances,length:distances.at(-1)};routes.set(track.id,data);return data;
}
export function trackPoint(t,id=DEFAULT_TRACK){
 const {points,distances,length}=routeData(id),distance=((t%1+1)%1)*length;let lo=0,hi=distances.length-1;
 while(hi-lo>1){const mid=(lo+hi)>>1;if(distances[mid]<=distance)lo=mid;else hi=mid;}
 const f=(distance-distances[lo])/(distances[hi]-distances[lo]),a=points[lo],b=points[hi];return {x:a.x+(b.x-a.x)*f,z:a.z+(b.z-a.z)*f};
}
export function trackHeading(t,id=DEFAULT_TRACK){const a=trackPoint(t,id),b=trackPoint(t+.0001,id);return Math.atan2(b.x-a.x,b.z-a.z);}
const cache=new Map();
export function trackData(id=DEFAULT_TRACK){
 const config=trackById(id);if(cache.has(config.id))return cache.get(config.id);
 const feature=(t,index)=>({...trackPoint(t,config.id),id:index,t,heading:trackHeading(t,config.id)});
 const data={...config,TRACK:Array.from({length:256},(_,i)=>trackPoint(i/256,config.id)),GATES:Array.from({length:CHECKPOINTS},(_,i)=>({...trackPoint(i/CHECKPOINTS,config.id),t:i/CHECKPOINTS})),
 RAMPS:config.ramps.map((t,i)=>({...feature(t,i),width:config.width-4,length:config.id==='meadow'?10:9,height:config.id==='meadow'?1.3:2.2})),
 RIVERS:config.rivers.map((t,i)=>({...feature(t,i),width:7,length:82})),
 OBSTACLES:config.obstacles.map((t,i)=>{const p=feature(t,i),offset=(i%2?1:-1)*config.width*.24;return {...p,x:p.x+Math.cos(p.heading)*offset,z:p.z-Math.sin(p.heading)*offset,radius:i%2?1.6:1.2,type:i%2?'log':'rock'};}),
 ORCS:config.orcs.map((t,i)=>({...feature(t,i),trackId:config.id}))};
 data.length=routeData(config.id).length;data.bounds={minX:Math.min(...data.TRACK.map(p=>p.x)),maxX:Math.max(...data.TRACK.map(p=>p.x)),minZ:Math.min(...data.TRACK.map(p=>p.z)),maxZ:Math.max(...data.TRACK.map(p=>p.z))};cache.set(config.id,data);return data;
}
export function nearestTrack(x,z,id=DEFAULT_TRACK){const points=trackData(id).TRACK;let d=Infinity,index=0,tx=0,tz=0;
 let progress=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],dx=b.x-a.x,dz=b.z-a.z,f=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz))),px=a.x+f*dx,pz=a.z+f*dz,ds=(px-x)**2+(pz-z)**2;if(ds<d){d=ds;index=i;progress=f;tx=px;tz=pz;}}
 return {distance:Math.sqrt(d),t:(index+progress)/points.length,x:tx,z:tz};
}
export function routeGuidance(state){
 const id=state.trackId||DEFAULT_TRACK,track=trackData(id),nearest=nearestTrack(state.x,state.z,id),offRoad=nearest.distance>track.width/2+.6;
 const wrongWay=!offRoad&&Math.cos(state.yaw-trackHeading(nearest.t,id))<-.45;
 const ahead=offRoad?4:Math.max(8,Math.min(22,6+state.speed*.7)),target=trackPoint(nearest.t+ahead/track.length,id);
 const angle=Math.atan2(Math.sin(Math.atan2(target.x-state.x,target.z-state.z)-state.yaw),Math.cos(Math.atan2(target.x-state.x,target.z-state.z)-state.yaw));
 return {offRoad,wrongWay,angle,distance:Math.max(0,nearest.distance-track.width/2),target};
}
export function featureCoords(feature,x,z){const dx=x-feature.x,dz=z-feature.z;return {cross:dx*Math.cos(feature.heading)-dz*Math.sin(feature.heading),along:dx*Math.sin(feature.heading)+dz*Math.cos(feature.heading)};}
export function rampAt(x,z,id=DEFAULT_TRACK){for(const ramp of trackData(id).RAMPS){const q=featureCoords(ramp,x,z);if(Math.abs(q.cross)<ramp.width/2&&q.along>=-ramp.length/2&&q.along<=ramp.length/2)return {...ramp,...q};}return null;}
export function riverAt(x,z,id=DEFAULT_TRACK){return trackData(id).RIVERS.find(r=>{const q=featureCoords(r,x,z);return Math.abs(q.along)<r.width/2&&Math.abs(q.cross)<r.length/2;});}
export function naturalHeight(x,z,id=DEFAULT_TRACK){return trackById(id).relief*(1.3*Math.sin(x*.026)+2.3*Math.cos(z*.032)+1.1*Math.sin((x+z)*.043));}
export function baseHeight(x,z,id=DEFAULT_TRACK){const river=riverAt(x,z,id);if(!river)return naturalHeight(x,z,id);const q=featureCoords(river,x,z),bank=Math.min(1,Math.abs(q.along)/(river.width/2));return naturalHeight(x,z,id)-.38*(1-bank**6);}
export function groundHeight(x,z,id=DEFAULT_TRACK){const ramp=rampAt(x,z,id);return baseHeight(x,z,id)+(ramp?(ramp.along+ramp.length/2)/ramp.length*ramp.height:0);}
export function surfaceAt(x,z,weather='clear',id=DEFAULT_TRACK){const n=nearestTrack(x,z,id),track=trackById(id),inside=segments=>segments.some(([a,b])=>n.t>a&&n.t<b),name=rampAt(x,z,id)?'ramp':riverAt(x,z,id)?'water':n.distance>track.width/2?(weather==='snow'?'snow':'grass'):inside(track.sand)?'sand':inside(track.mud)?'mud':weather==='snow'?'snow':'dirt';return {...n,name};}
// Default course exports for tools; historical results are kept separately.
export const {TRACK,GATES,RAMPS,RIVERS,OBSTACLES,ORCS}=trackData();
export const TRACK_WIDTH=trackById(DEFAULT_TRACK).width;
