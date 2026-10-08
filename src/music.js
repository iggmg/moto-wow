// Original looping arrangements, synthesized on the device; no remote audio.
export const MUSIC_TRACKS={arcade:'8-битный Разлом',race:'На полном газу',fantasy:'Тропа приключений'};
const arrangements={
 arcade:{bpm:144,wave:'square',notes:[64,67,71,76,74,71,67,62,64,67,69,72,71,67,64,62],bass:[40,40,43,43,45,45,47,47]},
 race:{bpm:156,wave:'sawtooth',notes:[52,59,64,59,55,62,67,62,57,64,69,64,55,62,67,71],bass:[40,40,43,43,45,45,43,47]},
 fantasy:{bpm:88,wave:'triangle',notes:[64,0,67,71,69,0,67,62,64,67,0,72,71,69,67,0],bass:[40,47,43,50,45,52,43,47]}
};
export class MusicPlayer {
 constructor(context,destination){this.context=context;this.destination=destination;this.output=context.createGain();this.output.gain.value=0;this.output.connect(destination);this.voices=new Set();this.track='arcade';this.volume=.35;this.playing=false;this.step=0;this.timer=null;}
 tone(note,start,length,wave,gain){if(!note)return;const c=this.context,o=c.createOscillator(),g=c.createGain();o.type=wave;o.frequency.value=440*2**((note-69)/12);g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(gain,start+.012);g.gain.exponentialRampToValueAtTime(.0001,start+length);o.connect(g);g.connect(this.output);o.start(start);o.stop(start+length+.025);this.voices.add(o);o.onended=()=>{this.voices.delete(o);o.disconnect();g.disconnect();};}
 schedule(){if(!this.playing||this.context.state!=='running')return;const a=arrangements[this.track],beat=60/a.bpm/2;this.next=Math.max(this.next,this.context.currentTime);while(this.next<this.context.currentTime+.12){const n=this.step++;this.tone(a.notes[n%a.notes.length],this.next,beat*.82,a.wave,a.wave==='triangle'?.22:.065);if(n%2===0)this.tone(a.bass[(n/2)%a.bass.length],this.next,beat*1.7,'triangle',.2);if(this.track==='race'&&n%2===0)this.tone(28,this.next,.08,'sine',.4);this.next+=beat;}}
 set({enabled,track,volume,active}){const changed=track!==this.track;this.volume=volume;this.track=track;const wanted=enabled&&active;if(changed){const old=this.output;this.stop();this.output=this.context.createGain();this.output.gain.value=0;this.output.connect(this.destination);setTimeout(()=>old.disconnect(),160);}else if(!wanted&&this.playing)this.stop();if(wanted&&!this.playing){this.playing=true;this.step=0;this.next=this.context.currentTime+.05;this.schedule();this.timer=setInterval(()=>this.schedule(),50);}this.output.gain.cancelScheduledValues(this.context.currentTime);this.output.gain.setTargetAtTime(wanted?volume:0,this.context.currentTime,.12);}
 stop(){this.playing=false;clearInterval(this.timer);this.timer=null;const t=this.context.currentTime;this.output.gain.setTargetAtTime(0,t,.055);for(const o of this.voices){try{o.stop(t+.14);}catch{/* Voice already ended. */}}}
}
