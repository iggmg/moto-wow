import { MusicPlayer, MUSIC_TRACKS } from './music.js';
// All sounds are synthesized locally. Starting/resuming happens in a user gesture.
export class RaceAudio {
  constructor(){
    let saved={};try{saved=JSON.parse(localStorage.getItem('moto-audio')||'{}')||{};}catch{}
    this.settings={effects:saved.effects??localStorage.getItem('moto-sound')!=='off',music:saved.music!==false,track:MUSIC_TRACKS[saved.track]?saved.track:'arcade',effectsVolume:Number.isFinite(saved.effectsVolume)?Math.max(0,Math.min(1,saved.effectsVolume)):.65,musicVolume:Number.isFinite(saved.musicVolume)?Math.max(0,Math.min(1,saved.musicVolume)):.35};
    this.enabled=this.settings.effects;this.active=false;
    document.addEventListener('visibilitychange',()=>{if(document.hidden){this.music?.stop();this.silence();this.context?.suspend();}else this.context?.resume().catch(()=>{});});
  }
  configure(changes){Object.assign(this.settings,changes);this.enabled=this.settings.effects;localStorage.setItem('moto-audio',JSON.stringify(this.settings));localStorage.setItem('moto-sound',this.enabled?'on':'off');if(this.master)this.master.gain.setTargetAtTime(this.enabled?this.settings.effectsVolume:0,this.context.currentTime,.08);this.music?.set({enabled:this.settings.music,track:this.settings.track,volume:this.settings.musicVolume,active:this.active&&!document.hidden});}

  unlock(){

    if(this.context){this.context.resume();return;}
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
    const c=this.context=new Audio();this.master=c.createGain();this.master.gain.value=this.enabled?this.settings.effectsVolume:0;this.music=new MusicPlayer(c,c.destination);
    this.analyser=c.createAnalyser();this.analyser.fftSize=512;this.master.connect(this.analyser);this.analyser.connect(c.destination);
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
    this.windGain=c.createGain();this.windGain.gain.value=0;this.noise.connect(this.windFilter);this.windFilter.connect(this.windGain);this.windGain.connect(this.master);this.noise.start();
    this.lastHits=0;c.resume();
  }
  toggle(){this.unlock();this.configure({effects:!this.enabled});if(!this.enabled)this.silence();return this.enabled;}
  silence(){if(!this.context)return;for(const g of [this.motorGain,this.mechanicsGain,this.roadGain,this.windGain])g.gain.setTargetAtTime(0,this.context.currentTime,.08);}
  update(state,input,time,running,weather='clear'){
    this.active=running&&!state.finished;if(!this.context)return;const visible=!document.hidden;this.music.set({enabled:this.settings.music,track:this.settings.track,volume:this.settings.musicVolume,active:this.active&&visible});if(!visible||!running||!this.enabled){this.silence();return;}
    const c=this.context,t=c.currentTime,speed=state.speed,load=input.throttle||0;
    const scooter=state.bike==='pcx',adventure=state.bike==='himalayan';
    const gear=Math.min(5,1+Math.floor(speed/(scooter?40:6.3)));
    const rpm=scooter?1500+speed*140+load*1300:1250+(speed%(6.3))*620+load*900+gear*200;
    const firing=rpm/120*(state.bike==='mt07'?1.7:adventure?.83:1);
    this.motor.frequency.setTargetAtTime(firing+Math.sin(time*19)*.6,t,.07);
    this.motorFilter.frequency.setTargetAtTime(380+rpm*.14+load*550,t,.09);
    this.motorGain.gain.setTargetAtTime(.17+load*.08,t,.1);
    this.mechanics.frequency.setTargetAtTime(rpm/60*2,t,.08);this.mechanicsGain.gain.setTargetAtTime(.013+load*.012,t,.1);
    this.roadFilter.frequency.setTargetAtTime(state.surface==='mud'?180:state.surface==='grass'||state.surface==='snow'?650:state.surface==='sand'?450:state.surface==='water'?1100:1800,t,.15);
    this.roadGain.gain.setTargetAtTime((state.airborne?0:Math.min(.17,speed*.004))*(state.surface==='water'?1.6:state.surface==='mud'?1.2:1),t,.1);
    this.windGain.gain.setTargetAtTime(Math.min(.18,speed*speed*.0001+(weather==='rain'?.10:weather==='snow'?.025:0)),t,.2);
    if(state.hits>this.lastHits)this.impact();this.lastHits=state.hits;
  }
  impact(){const c=this.context,source=c.createBufferSource();source.buffer=this.noise.buffer;const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=900;const g=c.createGain();g.gain.setValueAtTime(.8,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.35);source.connect(f);f.connect(g);g.connect(this.master);source.start();source.stop(c.currentTime+.4);source.onended=()=>{source.disconnect();f.disconnect();g.disconnect();};}
}
