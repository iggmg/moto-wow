import {safeStorage} from './storage.js';
import { MusicPlayer, MUSIC_TRACKS } from './music.js';
// All sounds are synthesized locally. Starting/resuming happens in a user gesture.
export class RaceAudio {
  constructor(){
    let saved={};try{saved=JSON.parse(safeStorage.getItem('moto-audio')||'{}')||{};}catch{}
    this.settings={effects:saved.effects??safeStorage.getItem('moto-sound')!=='off',music:saved.music!==false,track:MUSIC_TRACKS[saved.track]?saved.track:'arcade',effectsVolume:Number.isFinite(saved.effectsVolume)?Math.max(0,Math.min(1,saved.effectsVolume)):.65,musicVolume:Number.isFinite(saved.musicVolume)?Math.max(0,Math.min(1,saved.musicVolume)):.35};
    this.enabled=this.settings.effects;this.active=false;
    document.addEventListener('visibilitychange',()=>{if(document.hidden){this.music?.stop();this.silence();this.context?.suspend();}else this.context?.resume().catch(()=>{});});
  }
  configure(changes){Object.assign(this.settings,changes);this.enabled=this.settings.effects;safeStorage.setItem('moto-audio',JSON.stringify(this.settings));safeStorage.setItem('moto-sound',this.enabled?'on':'off');if(this.master)this.master.gain.setTargetAtTime(this.enabled?this.settings.effectsVolume:0,this.context.currentTime,.08);this.music?.set({enabled:this.settings.music,track:this.settings.track,volume:this.settings.musicVolume,active:this.active&&!document.hidden});}

  unlock(){

    if(this.context){this.context.resume();return;}
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
    const c=this.context=new Audio();this.master=c.createGain();this.master.gain.value=this.enabled?this.settings.effectsVolume:0;this.music=new MusicPlayer(c,c.destination);
    this.analyser=c.createAnalyser();this.analyser.fftSize=512;this.compressor=c.createDynamicsCompressor();this.compressor.threshold.value=-18;this.compressor.ratio.value=3;this.compressor.attack.value=.003;this.compressor.release.value=.12;this.master.connect(this.compressor);this.compressor.connect(this.analyser);this.analyser.connect(c.destination);
    const real=new Float32Array(24),imag=new Float32Array(24);
    for(let i=1;i<24;i++)imag[i]=(i%2?.9:.36)/Math.pow(i,.9);
    this.motor=c.createOscillator();this.motor.setPeriodicWave(c.createPeriodicWave(real,imag));
    this.motorFilter=c.createBiquadFilter();this.motorFilter.type='lowpass';this.motorFilter.Q.value=.7;
    this.motorGain=c.createGain();this.motorGain.gain.value=0;this.motor.connect(this.motorFilter);this.motorFilter.connect(this.motorGain);this.motorGain.connect(this.master);this.motor.start();
    this.mechanics=c.createOscillator();this.mechanics.type='triangle';this.mechanicsGain=c.createGain();this.mechanicsGain.gain.value=0;this.mechanics.connect(this.mechanicsGain);this.mechanicsGain.connect(this.master);this.mechanics.start();
    const buffer=c.createBuffer(1,c.sampleRate*2,c.sampleRate),samples=buffer.getChannelData(0);let last=0;
    for(let i=0;i<samples.length;i++){last=(last+Math.random()*.12-.06)/1.03;samples[i]=last*5;}
    this.noise=c.createBufferSource();this.noise.buffer=buffer;this.noise.loop=true;
    this.roadFilter=c.createBiquadFilter();this.roadFilter.type='bandpass';this.roadFilter.Q.value=.6;
    this.roadGain=c.createGain();this.roadGain.gain.value=0;this.noise.connect(this.roadFilter);this.roadFilter.connect(this.roadGain);this.roadGain.connect(this.master);
    this.windFilter=c.createBiquadFilter();this.windFilter.type='lowpass';this.windFilter.frequency.value=600;
    this.windGain=c.createGain();this.windGain.gain.value=0;this.noise.connect(this.windFilter);this.windFilter.connect(this.windGain);this.windGain.connect(this.master);this.skidFilter=c.createBiquadFilter();this.skidFilter.type='bandpass';this.skidFilter.frequency.value=2000;this.skidFilter.Q.value=1.8;this.skidGain=c.createGain();this.skidGain.gain.value=0;this.noise.connect(this.skidFilter);this.skidFilter.connect(this.skidGain);this.skidGain.connect(this.master);this.noise.start();
    this.lastHits=0;this.lastGear=1;this.lastAirborne=false;this.seenShots=new Map();this.seenWindup=new Map();c.resume();
  }
  toggle(){this.unlock();this.configure({effects:!this.enabled});if(!this.enabled)this.silence();return this.enabled;}
  silence(){if(!this.context)return;for(const g of [this.motorGain,this.mechanicsGain,this.roadGain,this.windGain,this.skidGain])g.gain.setTargetAtTime(0,this.context.currentTime,.08);}
  update(state,input,time,running,weather='clear',ambience={}){
    this.active=running&&!state.finished;if(!this.context)return;const visible=!document.hidden;this.music.set({enabled:this.settings.music,track:this.settings.track,volume:this.settings.musicVolume,active:this.active&&visible,tension:Math.min(1,(ambience.orcs||[]).filter(o=>o.targetId===state.id).length*.35+(state.cargoCarrier?.2:0)+(ambience.finale?.3:0))});if(!visible||!running||!this.enabled){this.silence();return;}
    const c=this.context,t=c.currentTime,speed=Math.abs(state.speed),load=Math.max(input.throttle||0,input.reverse||0);
    const scooter=state.bike==='pcx',adventure=state.bike==='himalayan';
    const gear=Math.min(5,1+Math.floor(speed/(scooter?40:6.3)));
    const rpm=scooter?1500+speed*140+load*1300:1250+(speed%(6.3))*620+load*900+gear*200;
    const firing=rpm/120*(state.bike==='mt07'?1.7:adventure?.83:1);
    if(gear!==this.lastGear&&!scooter&&speed>3){this.cue('shift',state,state,.07);this.lastGear=gear;}if(this.lastAirborne&&!state.airborne)this.cue('landing',state,state,.28);this.lastAirborne=!!state.airborne;for(const o of ambience.orcs||[]){if(o.windup>0&&!this.seenWindup.get(o.id)&&Math.hypot(o.x-state.x,o.z-state.z)<45)this.cue('aim',o,state,.18,ambience.listenerYaw);this.seenWindup.set(o.id,o.windup>0);if(o.lastShot!==undefined&&this.seenShots.get(o.id)!==o.lastShot){this.seenShots.set(o.id,o.lastShot);if(Math.hypot(o.x-state.x,o.z-state.z)<55)this.cue(o.weapon==='orb'?'magic':'shot',o,state,.2,ambience.listenerYaw);}}
    this.motor.frequency.setTargetAtTime(firing+Math.sin(time*19)*.6,t,.07);
    this.motorFilter.frequency.setTargetAtTime(380+rpm*.14+load*550,t,.09);
    this.motorGain.gain.setTargetAtTime(.17+load*.08,t,.1);
    this.mechanics.frequency.setTargetAtTime(rpm/60*2,t,.08);this.mechanicsGain.gain.setTargetAtTime(.013+load*.012,t,.1);
    this.roadFilter.frequency.setTargetAtTime(state.surface==='mud'?180:state.surface==='grass'||state.surface==='snow'?650:state.surface==='sand'?450:state.surface==='water'?1100:1800,t,.15);
    this.roadGain.gain.setTargetAtTime((state.airborne?0:Math.min(.17,speed*.004))*(state.surface==='water'?1.6:state.surface==='mud'?1.2:1),t,.1);
    this.windGain.gain.setTargetAtTime(Math.min(.18,speed*speed*.0001+(weather==='rain'?.10:weather==='snow'?.025:0)),t,.2);
    const skid=state.airborne?0:Math.min(.14,Math.abs(state.slipAngle||0)*speed*.015+(state.rearBrake||0)*Math.min(.06,speed*.003));this.skidFilter.frequency.setTargetAtTime(state.surface==='snow'?800:state.surface==='mud'?450:1900,t,.08);this.skidGain.gain.setTargetAtTime(skid,t,.06);
    if(state.hits>this.lastHits)this.impact();this.lastHits=state.hits;
  }
  cue(kind,position,listener,length,listenerYaw=listener.yaw){
    if(!this.context||!this.enabled||document.hidden)return;const c=this.context,t=c.currentTime,distance=Math.hypot(position.x-listener.x,position.z-listener.z),relative=Math.atan2(position.x-listener.x,position.z-listener.z)-listenerYaw;
    const source=c.createOscillator(),gain=c.createGain(),pan=c.createStereoPanner();pan.pan.value=distance<.01?0:-Math.sin(relative);source.type=kind==='magic'?'sine':kind==='aim'?'triangle':kind==='landing'?'sawtooth':'triangle';
    const frequency={shift:110,landing:65,aim:450,shot:260,magic:620}[kind]||120;source.frequency.setValueAtTime(frequency,t);source.frequency.exponentialRampToValueAtTime(Math.max(30,frequency*.35),t+length);gain.gain.setValueAtTime(.08/(1+distance*.025),t);gain.gain.exponentialRampToValueAtTime(.001,t+length);source.connect(gain);gain.connect(pan);pan.connect(this.master);source.start(t);source.stop(t+length+.01);source.onended=()=>{source.disconnect();gain.disconnect();pan.disconnect();};
  }
  impact(){const c=this.context,source=c.createBufferSource();source.buffer=this.noise.buffer;const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=900;const g=c.createGain();g.gain.setValueAtTime(.8,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.35);source.connect(f);f.connect(g);g.connect(this.master);source.start();source.stop(c.currentTime+.4);source.onended=()=>{source.disconnect();f.disconnect();g.disconnect();};}
}
