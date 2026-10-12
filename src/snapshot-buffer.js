const angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
// Render delayed snapshots rather than chasing the newest packet with an FPS-dependent lerp.
export class SnapshotBuffer {
 constructor(){this.samples=[];this.arrival=0;this.jitter=0;this.delay=.1;}
 push(time,state,arrival=performance.now()){
  if(!Number.isFinite(time)||this.samples.length&&time<=this.samples.at(-1).time)return false;
  const previous=this.samples.at(-1),teleport=!!previous&&Math.hypot(state.x-previous.state.x,state.z-previous.state.z)>12;
  if(previous&&!teleport){const variation=Math.abs((arrival-this.arrival)/1000-(time-previous.time));this.jitter=this.jitter*.85+variation*.15;this.delay=Math.max(.08,Math.min(.2,.08+this.jitter*2));}
  if(teleport)this.samples=[];this.samples.push({time,state:{...state}});if(this.samples.length>32)this.samples.shift();this.arrival=arrival;return teleport;
 }
 sample(now=performance.now()){
  const latest=this.samples.at(-1);if(!latest)return null;const time=latest.time+Math.max(0,now-this.arrival)/1000-this.delay;
  if(time<=this.samples[0].time)return this.samples[0].state;
  if(time>=latest.time)return latest.state;
  let i=this.samples.length-2;while(i>0&&this.samples[i].time>time)i--;const a=this.samples[i],b=this.samples[i+1],f=(time-a.time)/(b.time-a.time),s={...b.state};
  for(const key of ['x','y','z','speed','steer','lean','pitch'])if(Number.isFinite(a.state[key])&&Number.isFinite(b.state[key]))s[key]=a.state[key]+(b.state[key]-a.state[key])*f;
  s.yaw=a.state.yaw+angle(b.state.yaw,a.state.yaw)*f;return s;
 }
}
