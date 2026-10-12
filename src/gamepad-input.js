const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:0));
const neutral=()=>({throttle:0,reverse:0,rearBrake:0,steer:0,look:0,actions:[]});
export class GamepadInput {
 constructor(){this.reset();}
 reset(){this.requireNeutral=true;this.buttons=[];}
 sample(pads,active=true){
  const pad=Array.from(pads||[]).find(p=>p?.connected&&p.mapping==='standard');if(!pad||!active){this.reset();return neutral();}
  const value=i=>clamp(pad.buttons[i]?.value??(pad.buttons[i]?.pressed?1:0),0,1),axis=i=>{const n=clamp(pad.axes[i],-1,1);return Math.abs(n)<.15?0:Math.sign(n)*(Math.abs(n)-.15)/.85;};
  const released=[0,1,3,6,7,8,9].every(i=>value(i)<.1)&&axis(0)===0&&axis(2)===0;
  if(this.requireNeutral){if(released)this.requireNeutral=false;this.buttons=pad.buttons.map(b=>b.pressed);return neutral();}
  const actions=[];for(const [index,name]of [[1,'interact'],[3,'camera'],[8,'reset'],[9,'pause']])if(pad.buttons[index]?.pressed&&!this.buttons[index])actions.push(name);this.buttons=pad.buttons.map(b=>b.pressed);
  return {throttle:value(7),reverse:value(6),rearBrake:value(0),steer:axis(0),look:-axis(2),actions};
 }
}
