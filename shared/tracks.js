export const DEFAULT_TRACK='rift',PHYSICS_VERSION=6,CHECKPOINTS=16;
export const TRACKS=[
 {id:'rift',name:'Сумеречный Разлом',difficulty:'Средняя',description:'Знакомая лесная трасса: грязь, два брода и прыжки.',revision:1,width:12,shape:[116,85,11,10,3,2],relief:1,weather:'clear',biome:'forest',ramps:[.115,.505],rivers:[.285,.755],mud:[[.19,.27],[.61,.70]],sand:[[.375,.46]],obstacles:[.135,.175,.31,.36,.48,.54,.72,.79,.83,.9],orcs:[.09,.30,.43,.57,.73,.86]},
 {id:'meadow',name:'Изумрудная Долина',difficulty:'Лёгкая',description:'Широкие дуги, пологие холмы и один небольшой трамплин.',revision:1,width:18,shape:[104,76,3,2,3,2],relief:.35,weather:'clear',biome:'meadow',ramps:[.51],rivers:[],mud:[[.64,.68]],sand:[],obstacles:[.18,.43,.78],orcs:[.27,.58,.84]},
 {id:'canyon',name:'Речные Петли',difficulty:'Средняя',description:'Извилистая дорога, три брода и длинная песчаная дуга.',revision:1,width:12,shape:[126,88,21,14,3,2],relief:1.45,weather:'rain',biome:'canyon',ramps:[.15,.58],rivers:[.29,.53,.79],mud:[[.12,.19],[.65,.74]],sand:[[.34,.49]],obstacles:[.22,.32,.40,.48,.61,.70,.85,.92],orcs:[.10,.27,.45,.62,.78,.90]},
 {id:'summit',name:'Перевал Ледяного Клыка',difficulty:'Сложная',description:'Узкий горный серпантин, три прыжка, снег и камни.',revision:1,width:9,shape:[112,92,14,12,5,3],relief:3.2,weather:'snow',biome:'summit',ramps:[.12,.49,.81],rivers:[.68],mud:[[.24,.30]],sand:[[.55,.61]],obstacles:[.17,.22,.28,.34,.40,.45,.54,.59,.64,.73,.77,.86,.92],orcs:[.08,.24,.39,.55,.72,.88]}
];
export const trackById=id=>TRACKS.find(t=>t.id===id)||TRACKS[0];
export function trackPoint(t,id=DEFAULT_TRACK){const a=t*Math.PI*2,[rx,rz,dx,dz,nx,nz]=trackById(id).shape;return {x:Math.sin(a)*rx+Math.sin(a*nx)*dx,z:Math.cos(a)*rz+Math.sin(a*nz)*dz};}
export function trackHeading(t,id=DEFAULT_TRACK){const a=trackPoint(t,id),b=trackPoint(t+.0001,id);return Math.atan2(b.x-a.x,b.z-a.z);}
const cache=new Map();
export function trackData(id=DEFAULT_TRACK){
 const config=trackById(id);if(cache.has(config.id))return cache.get(config.id);
 const feature=(t,index)=>({...trackPoint(t,config.id),id:index,t,heading:trackHeading(t,config.id)});
 const data={...config,TRACK:Array.from({length:256},(_,i)=>trackPoint(i/256,config.id)),GATES:Array.from({length:CHECKPOINTS},(_,i)=>({...trackPoint(i/CHECKPOINTS,config.id),t:i/CHECKPOINTS})),
 RAMPS:config.ramps.map((t,i)=>({...feature(t,i),width:config.width-4,length:config.id==='meadow'?10:9,height:config.id==='meadow'?1.3:2.2})),
 RIVERS:config.rivers.map((t,i)=>({...feature(t,i),width:7,length:82})),
 OBSTACLES:config.obstacles.map((t,i)=>{const p=feature(t,i),offset=(i%2?1:-1)*config.width*.24;return {...p,x:p.x+Math.cos(p.heading)*offset,z:p.z-Math.sin(p.heading)*offset,radius:i%2?1.6:1.2,type:i%2?'log':'rock'};}),
 ORCS:config.orcs.map((t,i)=>({...feature(t,i),trackId:config.id}))};cache.set(config.id,data);return data;
}
export function nearestTrack(x,z,id=DEFAULT_TRACK){const points=trackData(id).TRACK;let d=Infinity,index=0,tx=0,tz=0;
 for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],dx=b.x-a.x,dz=b.z-a.z,f=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz))),px=a.x+f*dx,pz=a.z+f*dz,ds=(px-x)**2+(pz-z)**2;if(ds<d){d=ds;index=i;tx=px;tz=pz;}}
 return {distance:Math.sqrt(d),t:index/256,x:tx,z:tz};
}
export function featureCoords(feature,x,z){const dx=x-feature.x,dz=z-feature.z;return {cross:dx*Math.cos(feature.heading)-dz*Math.sin(feature.heading),along:dx*Math.sin(feature.heading)+dz*Math.cos(feature.heading)};}
export function rampAt(x,z,id=DEFAULT_TRACK){for(const ramp of trackData(id).RAMPS){const q=featureCoords(ramp,x,z);if(Math.abs(q.cross)<ramp.width/2&&q.along>=-ramp.length/2&&q.along<=ramp.length/2)return {...ramp,...q};}return null;}
export function riverAt(x,z,id=DEFAULT_TRACK){return trackData(id).RIVERS.find(r=>{const q=featureCoords(r,x,z);return Math.abs(q.along)<r.width/2&&Math.abs(q.cross)<r.length/2;});}
export function naturalHeight(x,z,id=DEFAULT_TRACK){return trackById(id).relief*(1.3*Math.sin(x*.026)+2.3*Math.cos(z*.032)+1.1*Math.sin((x+z)*.043));}
export function baseHeight(x,z,id=DEFAULT_TRACK){const river=riverAt(x,z,id);if(!river)return naturalHeight(x,z,id);const q=featureCoords(river,x,z),bank=Math.min(1,Math.abs(q.along)/(river.width/2));return naturalHeight(x,z,id)-.38*(1-bank**6);}
export function groundHeight(x,z,id=DEFAULT_TRACK){const ramp=rampAt(x,z,id);return baseHeight(x,z,id)+(ramp?(ramp.along+ramp.length/2)/ramp.length*ramp.height:0);}
export function surfaceAt(x,z,weather='clear',id=DEFAULT_TRACK){const n=nearestTrack(x,z,id),track=trackById(id),inside=segments=>segments.some(([a,b])=>n.t>a&&n.t<b),name=rampAt(x,z,id)?'ramp':riverAt(x,z,id)?'water':n.distance>track.width/2?(weather==='snow'?'snow':'grass'):inside(track.sand)?'sand':inside(track.mud)?'mud':weather==='snow'?'snow':'dirt';return {...n,name};}
// Legacy exports preserve the original track for existing tools and old replays.
export const {TRACK,GATES,RAMPS,RIVERS,OBSTACLES,ORCS}=trackData();
export const TRACK_WIDTH=trackById(DEFAULT_TRACK).width;
