const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export const RIDING_CAMERAS={chase:'За байком · по центру',first:'От первого лица',sport:'Спортивная · низкий ракурс',orbit:'Обзор байка · сбоку',map:'Высокий обзор'};
export const QUALITY_PROFILES={auto:{ratio:1.5,shadows:true},high:{ratio:2,shadows:true},balanced:{ratio:1.25,shadows:true},low:{ratio:1,shadows:false}};
export function loadVisualSettings(storage,reduceMotion=false){
 let saved={};try{saved=JSON.parse(storage.getItem('moto-visual')||'{}')||{};}catch{}
 return {camera:RIDING_CAMERAS[saved.camera]?saved.camera:RIDING_CAMERAS[storage.getItem('moto-camera')]?storage.getItem('moto-camera'):'chase',motion:reduceMotion?0:Number.isFinite(saved.motion)?clamp(saved.motion,0,1):.6,quality:QUALITY_PROFILES[saved.quality]?saved.quality:'auto'};
}

// Presentation only: camera angles never change the rider's heading or inputs.
export class RidingCamera {
 constructor(){this.reset();}
 reset(yaw=0){this.followYaw=yaw;this.look=0;this.elevation=0;this.dragging=false;this.releaseAge=0;this.orbit=0;this.lastSpeed=0;this.lastAirborne=false;this.landing=0;}
 drag(dx,dy,moving){this.look=clamp(this.look-dx*.006,moving?-1.25:-Math.PI,moving?1.25:Math.PI);this.elevation=clamp(this.elevation+dy*.006,-.45,.8);this.releaseAge=0;}
 clearLook(){this.look=0;this.elevation=0;this.dragging=false;this.releaseAge=0;}
 pose(s,{mode='chase',dt=1/60,aspect=1,motion=.6,roadYaw=s.yaw,peek=0,intro=false,immediate=false}={}){
  if(!RIDING_CAMERAS[mode])mode='chase';dt=clamp(dt,0,.25);motion=clamp(motion,0,1);
  const speed=Math.abs(s.speed||0),moving=speed>1,reverse=s.speed<-.2,first=mode==='first',centered=mode==='chase'||mode==='sport',inspect=mode==='orbit'&&!moving;
  this.releaseAge+=dt;
  if(moving&&!this.dragging&&this.releaseAge>.55){const f=1-Math.exp(-dt*3);this.look*=1-f;this.elevation*=1-f;}
  // Riding views follow travel, without an automatic sideways orbit or road yaw.
  // A sliding bike can lean/turn inside the frame while the route stays readable.
  const heading=centered&&moving&&Number.isFinite(s.travelYaw)?s.travelYaw:s.yaw;
  const anticipation=centered?0:clamp(angle(roadYaw,s.yaw),-.35,.35)*motion;
  const wantedYaw=heading+(first?0:anticipation)+(!first&&reverse?Math.PI:0);
  this.followYaw+=angle(wantedYaw,this.followYaw)*(immediate?1:1-Math.exp(-dt*(first?18:centered?10:5)));
  if(inspect||intro||s.finished)this.orbit+=dt*.32*motion;else this.orbit=0;
  if(this.lastAirborne&&!s.airborne)this.landing=clamp(Math.abs(s.landingSpeed||0)/18,.1,.55)*motion;
  this.lastAirborne=!!s.airborne;this.landing*=Math.exp(-dt*9);
  const portrait=clamp(1/Math.max(.35,aspect),1,1.7),manual=this.look+peek*(moving?1.05:1.6);
  let viewYaw=this.followYaw+manual,back=(centered?5.8:5.2)*portrait,height=centered?2.75:2.35,side=centered?0:2.7*Math.sqrt(portrait);
  let ahead=clamp(2.8+speed*.09,2.8,5.4),targetHeight=.9;
  if(mode==='sport'){back=4.7*portrait;height=1.7;ahead=2.3+speed*.1;}
  if(mode==='map'){back=9;height=17;side=0;ahead=7;}
  if(mode==='orbit'){back=4.6*portrait;height=1.65;side=1.8;ahead=moving?2:.1;targetHeight=.8;if(inspect)viewYaw=s.yaw+this.orbit+manual+.95;}
  if(intro&&!centered&&!first&&mode!=='map'&&!this.dragging&&motion>0){viewYaw=s.yaw+.75+this.orbit*.4;side=1.6;ahead=.8;}
  if(s.finished&&!centered&&!first&&mode!=='map'&&motion>0){viewYaw=s.yaw+this.orbit;side=2;ahead=0;}
  side+=!centered&&!first&&mode!=='map'?clamp((s.slipAngle||0)*2.2,-.9,.9)*motion:0;
  if(s.airborne&&!first&&mode!=='map'){if(!centered)side+=.7*motion;height+=.45*motion;ahead=Math.min(ahead,4);}
  height+=this.elevation*3-this.landing;
  const sin=Math.sin(viewYaw),cos=Math.cos(viewYaw),base=s.y+.3;
  const position=first?[s.x-sin*.28,base+1.37,s.z-cos*.28]:[s.x-sin*back+cos*side,base+height,s.z-cos*back-sin*side];
  const target=first?[s.x+sin*24,base+.25+this.elevation*8,s.z+cos*24]:[s.x+Math.sin(this.followYaw+manual*.5)*ahead,base+targetHeight,s.z+Math.cos(this.followYaw+manual*.5)*ahead];
  this.lastSpeed=speed;
  return {position,target,first,fov:(first?72:mode==='sport'?68:mode==='map'?55:62)+Math.min(speed,35)*.16*motion,smoothing:first?16:centered?10:7};
 }
}

export function bindCameraLook(canvas,rig,canLook,isMoving){
 let pointer=null,lastX=0,lastY=0;
 function release(e){if(pointer===null||e?.pointerId!==undefined&&e.pointerId!==pointer)return;const id=pointer;pointer=null;rig.dragging=false;if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);}
 canvas.addEventListener('pointerdown',e=>{if(pointer!==null||!canLook()||e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();pointer=e.pointerId;lastX=e.clientX;lastY=e.clientY;rig.dragging=true;canvas.setPointerCapture(pointer);});
 canvas.addEventListener('pointermove',e=>{if(pointer!==e.pointerId)return;if(!canLook()||e.buttons===0){release(e);return;}e.preventDefault();rig.drag(e.clientX-lastX,e.clientY-lastY,isMoving());lastX=e.clientX;lastY=e.clientY;});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,release);
 for(const event of ['blur','pagehide'])window.addEventListener(event,()=>{release();rig.clearLook();});
 document.addEventListener('visibilitychange',()=>{release();rig.clearLook();});
 return {clear:()=>{release();rig.clearLook();}};
}
