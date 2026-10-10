import {createStunt,stepStunt,retryStunt,stuntLevel} from '../shared/stunt.js';
import {createStuntView} from './stunt-view.js';
import {createArcade,initArcade,stepArcade,feedOrc} from '../shared/arcade.js';
import {createArcadeView} from './arcade-view.js';
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { BIKES,bikeById,trackData,trackById,DEFAULT_TRACK,STEP,VERSION,WEATHER_LABELS,createRider,createOrcs,stepOrcs,stepRider,resetRider,groundHeight,trackPoint,trackHeading,routeGuidance,formatTime,angleDiff,clamp } from '../shared/game.js';
import { createCombat,stepCombat } from '../shared/combat.js';
import { createWeather } from './weather.js';
import { createProjectileView } from './projectiles.js';
import { bindTouchControls } from './touch-controls.js';
import { RaceAudio } from './audio.js';
import { buildBike } from './models.js';
import { setupLighting,buildWorld } from './world.js';
const $=id=>document.getElementById(id);
const surfaceLabels={dirt:'ГРУНТ',grass:'БЕЗДОРОЖЬЕ',mud:'ГРЯЗЬ · СЦЕПЛЕНИЕ ПАДАЕТ',water:'БРОД · ВОДА',sand:'ПЕСОК',snow:'СНЕГ · СКОЛЬЗКО',ramp:'ТРАМПЛИН'};
const inputKeys=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight','Space']);
export class Race {
  constructor({onExit,onLap,onNotice}){
    this.onExit=onExit;this.onLap=onLap;this.onNotice=onNotice;this.running=false;this.paused=false;this.keys=new Set();this.touch=new Set();this.remote=new Map();this.cameraMode=localStorage.getItem('moto-camera')||'chase';this.trackId=DEFAULT_TRACK;this.state=createRider();this.gameTime=0;this.renderTime=0;this.pending=[];this.seq=0;this.audioSystem=new RaceAudio();this.sound=this.audioSystem.enabled;
    this.renderer=new T.WebGLRenderer({canvas:$('game-canvas'),antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFShadowMap;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.88;
    this.scene=new T.Scene();this.sun=setupLighting(this.scene,this.renderer);this.world=buildWorld(this.scene);this.weatherView=createWeather(this.scene,this.sun);this.projectileView=createProjectileView(this.scene);this.camera=new T.PerspectiveCamera(65,1,.1,700);this.camera.position.set(-27,19,118);this.camera.lookAt(2,3,84);this.clock=new T.Clock();this.accumulator=0;this.hudTime=0;this.frameCount=0;this.frameTime=0;this.lowFrames=0;this.lastRender=0;
    this.player=buildBike('cub',{rider:true});this.scene.add(this.player);this.cockpit=buildBike('cub');this.cockpit.visible=false;this.scene.add(this.cockpit);
    this.loadManifest();
    window.addEventListener('resize',()=>this.resize());this.resize();
    window.addEventListener('keydown',e=>{if(!this.running||e.target instanceof HTMLInputElement||e.target.closest?.('dialog'))return;if(inputKeys.has(e.code)){e.preventDefault();this.keys.add(e.code);}if(e.repeat)return;if(e.code==='KeyF')this.feed();if(e.code==='KeyC')this.toggleCamera();if(e.code==='KeyR')this.reset();if(e.code==='Escape')this.exit();});
    window.addEventListener('keyup',e=>this.keys.delete(e.code));window.addEventListener('blur',()=>{this.keys.clear();this.touchControls?.clear();});document.addEventListener('visibilitychange',()=>{this.keys.clear();this.touchControls?.clear();});
    this.touchControls=bindTouchControls(this.touch,()=>this.running&&!this.paused&&!this.stunt?.failed&&!this.state.finished);
    $('race-host-start').onclick=()=>this.sendAction('start');$('race-retry').onclick=()=>this.retry();$('race-panel-exit').onclick=()=>this.exit();
    $('race-pause').onclick=()=>this.togglePause();$('feed-orc').onclick=()=>this.feed();$('camera-toggle').onclick=()=>this.toggleCamera();$('reset-rider').onclick=()=>this.reset();$('race-exit').onclick=()=>this.exit();
    this.renderer.setAnimationLoop(()=>this.frame());
    if(import.meta.env.DEV){window.__motoDebug={get state(){return {...window.__motoRace.state};},get weather(){return window.__motoRace.weather;},get projectiles(){return window.__motoRace.combat?.projectiles.map(p=>({...p}))||[];},get orcs(){return window.__motoRace.orcs?.map(o=>({...o}))||[];},get running(){return window.__motoRace.running;},get camera(){return window.__motoRace.cameraMode;},get remoteCount(){return window.__motoRace.remote.size;},get renderInfo(){return {calls:window.__motoRace.renderer.info.render.calls,triangles:window.__motoRace.renderer.info.render.triangles};}};window.__motoRace=this;}
  }
  async loadManifest(){try{const response=await fetch(`${import.meta.env.BASE_URL}models/manifest.json`);if(response.ok)this.manifest=await response.json();}catch{/* Built-in meshes remain playable when optional assets are unavailable. */}}
  async createModel(bike,rider=true){
    const entry=this.manifest?.[bike];if(entry?.file){try{const gltf=await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/${entry.file}`);const root=gltf.scene;root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});root.userData={wheels:[root.getObjectByName('WheelRear'),root.getObjectByName('WheelFront')].filter(Boolean),body:root.getObjectByName('BikeBody')||root};return root;}catch{this.onNotice?.('Модель загружается из встроенного набора.');}}
    return buildBike(bike,{rider});
  }
  resize(){const w=innerWidth,h=innerHeight;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  async setTrack(id){id=trackById(id).id;if(id===this.trackId)return;await this.world.ready;this.world.dispose();this.trackId=id;this.world=buildWorld(this.scene,id);this.weatherView.invalidate();await this.world.ready;}
  async start(bike,connection=null){
    if(!connection&&this.practiceMode==='stunt')return this.startStunt(bike);
    this.audioSystem.unlock();this.exit(false);this.connection=connection;this.online=!!connection;this.seq=0;this.pending=[];this.lowFrames=0;this.gameTime=connection?.message.time||0;
    this.roomRace=connection?.message.race||null;await this.setTrack(this.roomRace?.trackId||this.practiceTrack||DEFAULT_TRACK);this.soloBike=bike;this.id=connection?.message.id??0;this.state=connection?{...connection.message.players.find(p=>p.id===this.id)}:createRider(bike,0,this.trackId);if(!connection)this.state.lapLimit=this.practiceLaps||3;this.state.id=this.id;this.damageHits=this.state.hits;this.damageUntil=0;this.gameMode=this.roomRace?.mode||this.practiceMode||'solo';if(!connection&&this.gameMode==='arcade')initArcade(this.state);this.arcade=connection?.message.arcade|| (this.gameMode==='arcade'?createArcade(this.trackId):null);this.arcadeView?.dispose();this.arcadeView=this.arcade?createArcadeView(this.scene,this.trackId):null;this.orcs=connection?.message.orcs?.map(o=>({...o}))||createOrcs(0,this.trackId);
    this.combat=connection?.message.combat?structuredClone(connection.message.combat):createCombat();this.weather=connection?.message.weather||this.practiceWeather||'clear';await this.world.ready;this.scene.remove(this.player);this.scene.remove(this.cockpit);this.player=await this.createModel(bike);this.cockpit=buildBike(bike);this.scene.add(this.player,this.cockpit);this.keys.clear();this.touchControls?.clear();this.accumulator=0;this.startAt=performance.now()+(connection?0:3000);this.countdownDone=!!connection;
    for(const selector of ['.lap-block','.health-block','.hud-left','.minimap-wrap'])document.querySelector(selector).hidden=false;
    this.running=true;document.body.classList.add('racing');$('garage').hidden=true;$('hud').hidden=false;$('race-mode').textContent=this.online?`ОНЛАЙН · ${connection.message.room}`:`${trackById(this.trackId).name.toUpperCase()} · ТРЕНИРОВКА`;$('riding-bike').textContent=BIKES.find(b=>b.id===bike).name;
    if(connection)this.receive(connection.message);this.applyCamera(true);this.updateHUD();
  }
  receive(msg){
    if(msg.type==='award'){this.onNotice?.(`Чемпионат: +${msg.points} очков за событие. Повторы сохраняют только лучшую медаль.`);return;}
    if(msg.type==='lap'){this.lapMessage(msg.seconds,true);return;}
    if(!msg.players||!this.running)return;
    if(msg.race)this.roomRace=msg.race;
    if(msg.arcade)this.arcade=structuredClone(msg.arcade);if(msg.orcs)this.orcs=msg.orcs.map(o=>({...o}));if(msg.combat)this.combat=structuredClone(msg.combat);if(msg.weather)this.weather=msg.weather;
    const own=msg.players.find(p=>p.id===this.id);
    if(own){
      this.pending=this.pending.filter(p=>p.seq>own.ack);const predicted={...own};
      for(const p of this.pending)if(!this.roomRace||this.roomRace.phase==='racing')stepRider(predicted,p.input,STEP,msg.time+(p.seq-own.ack)*STEP,this.orcs,this.weather);
      this.state=predicted;this.gameTime=msg.time+(this.roomRace?.phase==='racing'?this.pending.length*STEP:0);
    }
    const ids=new Set();
    for(const p of msg.players){if(p.id===this.id)continue;ids.add(p.id);let remote=this.remote.get(p.id);if(!remote){const model=buildBike(p.bike,{rider:true});this.scene.add(model);model.position.set(p.x,p.y,p.z);model.rotation.y=p.yaw;remote={model,target:p};this.remote.set(p.id,remote);}remote.target=p;}
    for(const[id,p]of this.remote)if(!ids.has(id)){this.scene.remove(p.model);this.remote.delete(id);}
    $('player-list').replaceChildren();for(const p of msg.players){const div=document.createElement('div');div.className='player-name';const name=document.createElement('span');name.textContent=p.nickname+(p.id===this.id?' · ты':'');const time=document.createElement('span');time.textContent=formatTime(p.best);div.append(name,time);$('player-list').append(div);}
  }
  disconnected(){if(this.running&&this.online){this.exit();this.onNotice?.('Соединение прервано. Заезд остановлен; онлайн-рекорды уже сохранены сервером.');}}
  exit(notify=true){
    const wasRunning=this.running;this.damageUntil=0;$('damage-feedback').hidden=true;document.body.classList.remove('racing');this.running=false;this.paused=false;$('race-pause').textContent='Пауза';this.stunt=null;this.stuntView?.dispose();this.stuntView=null;this.world.root.visible=true;this.arcadeView?.dispose();this.arcadeView=null;this.keys.clear();this.touchControls?.clear();this.connection?.ws.close();this.connection=null;
    for(const p of this.remote.values())this.scene.remove(p.model);this.remote.clear();$('garage').hidden=false;$('hud').hidden=true;$('race-panel').hidden=true;$('countdown').hidden=true;this.setEngine(0);
    if(notify&&wasRunning)this.onExit?.();
  }
  sendAction(type){if(this.connection?.ws.readyState===1)this.connection.ws.send(JSON.stringify({type}));}
  retry(){if(this.stunt){if(this.stunt.finished)this.startStunt(this.soloBike);else retryStunt(this.stunt);return;}if(!this.online)this.start(this.soloBike);else if(this.roomRace?.mode==='race')this.sendAction('lobby');else this.sendAction('respawn');}
  reset(){if(this.stunt){if(!this.stunt.finished){if(!this.stunt.failed)this.stunt.falls++;retryStunt(this.stunt);}return;}if(!this.running||this.state.finished)return;if(this.online){if(this.connection.ws.readyState===1)this.connection.ws.send(JSON.stringify({type:'reset'}));}else resetRider(this.state);this.onNotice?.('Вернулись к последней контрольной точке. Штраф +5 с.');}
  togglePause(){if(this.online){this.keys.clear();this.touchControls.clear();this.onNotice?.('Онлайн-мир продолжает жить. Остановка не защищает от орков.');return;}this.paused=!this.paused;this.keys.clear();this.touchControls.clear();$('race-pause').textContent=this.paused?'Продолжить':'Пауза';this.onNotice?.(this.paused?'Заезд на паузе':'Заезд продолжается');}
  feed(){if(!this.running||!this.state.arcade)return;if(this.online)this.sendAction('feed');else {feedOrc(this.state,this.orcs,this.combat,this.gameTime);this.updateHUD();}}
  toggleCamera(){if(this.stunt){this.onNotice?.('В станте камера сбоку: A/D — наклон байка.');return;}this.cameraMode=this.cameraMode==='chase'?'first':'chase';localStorage.setItem('moto-camera',this.cameraMode);this.applyCamera(true);this.onNotice?.(this.cameraMode==='first'?'Камера от первого лица':'Камера за мотоциклом');}
  inputs(){const held=(key,touch)=>this.keys.has(key)||this.touch.has(touch);return {throttle:held('KeyW','throttle')||this.keys.has('ArrowUp')?1:0,brake:held('KeyS','brake')||this.keys.has('ArrowDown')||this.keys.has('Space')?1:0,steer:(held('KeyD','right')||this.keys.has('ArrowRight')?1:0)-(held('KeyA','left')||this.keys.has('ArrowLeft')?1:0)};}
  lapMessage(seconds,online){$('lap-toast').textContent=`Круг ${formatTime(seconds)} · ${this.gameMode==='arcade'?'аркада · отдельный зачёт':online?'сохранён на сервере':'локальный рекорд'}`;$('lap-toast').hidden=false;clearTimeout(this.lapToastTimer);this.lapToastTimer=setTimeout(()=>$('lap-toast').hidden=true,4500);this.onLap?.(this.state.bike,seconds,online,{trackId:this.trackId,trackRevision:trackById(this.trackId).revision,physicsVersion:VERSION,weather:this.weather,mode:this.gameMode,score:this.state.arcade?.score||0});}
  updateHUD(){const s=this.state;$('speed').textContent=Math.round(s.speed*3.6);$('lap').textContent=s.lapLimit?`${Math.min(s.lap,s.lapLimit)} / ${s.lapLimit}`:s.lap;$('health-value').textContent=s.health??100;$('health-bar').value=s.health??100;$('health-bar').classList.toggle('critical',s.health<=30);$('lap-time').textContent=formatTime(s.lapTime+.001);$('best-time').textContent=formatTime(s.best);$('last-time').textContent=formatTime(s.last);$('checkpoint').textContent=`${s.nextGate-1} / 16`;$('surface').textContent=s.airborne?'ПРЫЖОК':Math.abs(s.slipAngle||0)>.12&&s.speed>4?'ЗАНОС · СБРОСЬ ГАЗ, ВЫПРАВИ РУЛЬ':surfaceLabels[s.surface]||'ГРУНТ';if(s.hits>this.damageHits){this.damageHits=s.hits;this.damageUntil=this.renderTime+2;const names={log:'Бревно',rock:'Камень',melee:'Удар орка',arrow:'Стрела',spear:'Копьё',stone:'Брошенный камень',rider:'Столкновение'};$('damage-feedback').textContent=`${names[s.lastDamage?.type]||'Удар'}: −${s.lastDamage?.amount||0} здоровья`;}else if(s.hits<this.damageHits)this.damageHits=s.hits;$('damage-feedback').hidden=!(this.renderTime<this.damageUntil);$('weather-hud').textContent=WEATHER_LABELS[this.weather||'clear'];$('penalty-line').hidden=!s.penalty;$('penalty').textContent=`+${s.penalty} с`;const pursuing=s.finished?[]:this.orcs?.filter(o=>o.targetId===this.id&&(o.mode==='chase'||o.mode==='attack'))||[];const warning=$('pursuit-warning');warning.hidden=!pursuing.length;warning.textContent=pursuing.some(o=>o.windup>0)?'ОРК ЦЕЛИТСЯ · МЕНЯЙ ТРАЕКТОРИЮ':pursuing.some(o=>o.mode==='attack')?'ОРК АТАКУЕТ · ДАВИ НА ГАЗ!':`ПОГОНЯ · ОРКОВ: ${pursuing.length} · НЕ ОСТАНАВЛИВАЙСЯ`;const guidance=routeGuidance(s),guide=$('route-guidance');guide.hidden=!!s.finished;guide.classList.toggle('route-alert',guidance.offRoad||guidance.wrongWay);$('route-arrow').style.transform=`rotate(${guidance.angle}rad)`;$('route-label').textContent=guidance.offRoad?`Вернись на трассу · ${Math.max(1,Math.round(guidance.distance))} м`:guidance.wrongWay?'Развернись · против хода':`По трассе · точка ${s.nextGate} / 16`;const a=s.arcade;$('arcade-hud').hidden=!a;$('feed-orc').hidden=!a;if(a){$('arcade-status').textContent=`Бензин ${Math.ceil(a.fuel)}% · еда ${a.food}/4 · очки ${a.score}`;$('arcade-message').textContent=a.huntUntil>this.gameTime?`ОХОТА · ${Math.ceil(a.huntUntil-this.gameTime)} с`:a.slipUntil>this.gameTime?'МАСЛО · ЗАНОС':a.boostUntil>this.gameTime?'УСКОРЕНИЕ':a.message;$('feed-orc').disabled=a.food<1;}this.updateRacePanel();this.drawMap();}
  updateRacePanel(){
    const s=this.state,r=this.roomRace,panel=$('race-panel'),host=r?.hostId===this.id,lobby=r?.phase==='lobby',done=s.finished;
    panel.hidden=!(lobby||done);$('race-host-start').hidden=!(lobby&&host);$('race-retry').hidden=!(done&&(!r||r.mode!=='race'||r.phase==='finished'&&host));
    $('race-retry').disabled=!!(r?.mode&&r.mode!=='race'&&this.gameTime-(s.finishedAt??this.gameTime)<5);
    $('race-retry').textContent=r?.mode&&r.mode!=='race'?'Вернуться на трассу':r?'Собрать новый заезд':'Новый заезд';
    $('race-panel-title').textContent=lobby?'Ждём участников':s.health===0?'Здоровье закончилось':'Финиш!';
    $('race-panel-text').textContent=lobby?`Комната ${r.code} · ${r.players} из 8 · кругов: ${r.laps}. ${host?'Передай код друзьям и нажми «Общий старт».':'Создатель комнаты запустит общий отсчёт.'}`:s.health===0?`Заезд окончен. Ударов: ${s.hits}. ${r?.mode&&r.mode!=='race'?'Возвращение доступно через 5 секунд.':r?.phase!=='finished'&&r?'Дождись остальных участников.':'Можно начать новый заезд.'}`:`${s.arcade?'Аркада · очки: '+s.arcade.score+'. ':''}Кругов: ${s.completed}. Время: ${formatTime(s.resultSeconds||s.raceTime+s.totalPenalty)} · ударов: ${s.hits}.`;
    if(!r&&this.gameMode==='arcade')$('race-mode').textContent='АРКАДА · СОБИРАЙ И КОРМИ';if(r?.mode==='arcade')$('race-mode').textContent=`АРКАДА · ${r.code}`;else if(r)$('race-mode').textContent=r.mode!=='race'?`ОТКРЫТАЯ ТРАССА · ${r.code}`:`ГОНКА · ${r.code}`;
  }
  drawMap(){const {TRACK,GATES,bounds}=trackData(this.trackId);const c=$('minimap'),ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);const scale=Math.min((c.width-26)/(bounds.maxX-bounds.minX),(c.height-26)/(bounds.maxZ-bounds.minZ)),cx=(bounds.minX+bounds.maxX)/2,cz=(bounds.minZ+bounds.maxZ)/2,px=x=>c.width/2+(x-cx)*scale,pz=z=>c.height/2-(z-cz)*scale;ctx.beginPath();TRACK.forEach((p,i)=>i?ctx.lineTo(px(p.x),pz(p.z)):ctx.moveTo(px(p.x),pz(p.z)));ctx.closePath();ctx.strokeStyle='#9cad89';ctx.lineWidth=4;ctx.stroke();const g=GATES[this.state.nextGate%16];ctx.fillStyle='#baa1f4';ctx.beginPath();ctx.arc(px(g.x),pz(g.z),5,0,Math.PI*2);ctx.fill();for(const p of this.remote.values()){ctx.fillStyle='#a4c6ec';ctx.beginPath();ctx.arc(px(p.target.x),pz(p.target.z),4,0,Math.PI*2);ctx.fill();}for(const o of this.orcs||[]){ctx.fillStyle=o.targetId===this.id?'#ff785f':'#ad806d';ctx.beginPath();ctx.arc(px(o.x),pz(o.z),o.targetId===this.id?4:2.5,0,Math.PI*2);ctx.fill();}const s=this.state;ctx.save();ctx.translate(px(s.x),pz(s.z));ctx.rotate(s.yaw);ctx.fillStyle='#f3ce83';ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(-5,5);ctx.lineTo(5,5);ctx.closePath();ctx.fill();ctx.restore();}
  applyCamera(immediate=false,dt=STEP){
    const s=this.state,sin=Math.sin(s.yaw),cos=Math.cos(s.yaw),base=s.y+.3;
    let position,target;
    if(this.cameraMode==='first'){position=new T.Vector3(s.x-sin*.28,base+1.37,s.z-cos*.28);target=new T.Vector3(s.x+sin*24,base+.25,s.z+cos*24);this.player.visible=false;this.cockpit.visible=true;}else{position=new T.Vector3(s.x-sin*6.6,base+3.6,s.z-cos*6.6);target=new T.Vector3(s.x+sin*7,base+1,s.z+cos*7);this.player.visible=true;this.cockpit.visible=false;}
    const min=groundHeight(position.x,position.z,this.trackId)+1;position.y=Math.max(min,position.y);this.camera.position.lerp(position,immediate?1:1-Math.exp(-dt*8));this.camera.lookAt(target);this.camera.fov=(this.cameraMode==='first'?72:65)+Math.min(s.speed,35)*.12;this.camera.updateProjectionMatrix();
  }
  toggleSound(){this.sound=this.audioSystem.toggle();return this.sound;}
  setEngine(){this.audioSystem.update(this.state,this.inputs(),this.gameTime,this.running,this.weather);}
  async startStunt(bike){
    this.exit(false);this.audioSystem.unlock();this.soloBike=bike;this.online=false;this.gameMode='stunt';this.stunt=createStunt(bike,this.practiceStunt);this.world.root.visible=false;this.stuntView=createStuntView(this.scene,this.stunt.level);this.scene.remove(this.player);this.scene.remove(this.cockpit);this.player=await this.createModel(bike);this.scene.add(this.player);this.cockpit.visible=false;this.running=true;this.state=createRider(bike);this.weatherView.update(this.renderTime,this.state,'clear');this.accumulator=0;document.body.classList.add('racing');$('garage').hidden=true;$('hud').hidden=false;$('countdown').hidden=true;$('feed-orc').hidden=true;for(const selector of ['.lap-block','.health-block','.hud-left','.minimap-wrap'])document.querySelector(selector).hidden=true;$('riding-bike').textContent=BIKES.find(b=>b.id===bike).name;$('race-mode').textContent=`СТАНТ · ${stuntLevel(this.stunt.level).name}`;this.onNotice?.('W/↑ — газ, S/↓ — тормоз; A/← — наклон назад, D/→ — вперёд. R — повтор. Каждое падение +5 с.');
  }
  frameStunt(dt){
    const s=this.stunt;this.accumulator+=dt;while(this.accumulator>=STEP){this.accumulator-=STEP;const input=this.inputs();stepStunt(s,{...input,steer:-input.steer},STEP);}
    this.player.visible=true;this.player.position.set(s.x,s.y-bikeById(s.bike).wheel-.25,0);this.player.quaternion.setFromAxisAngle(new T.Vector3(0,0,1),s.angle).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI/2));for(const w of this.player.userData.wheels||[])w.rotation.x+=s.vx*dt/.31;
    const ahead=Math.min(3,Math.max(.6,this.camera.aspect*1.6));this.camera.position.lerp(new T.Vector3(s.x+ahead,s.y+2.7,10),1-Math.exp(-dt*6));this.camera.lookAt(s.x+ahead,s.y+1,0);this.camera.fov=50;this.camera.updateProjectionMatrix();this.sun.target.position.set(s.x,s.y,0);this.sun.position.set(s.x-25,s.y+40,-30);this.sun.target.updateMatrixWorld();
    $('speed').textContent=Math.round(Math.abs(s.vx)*3.6);$('race-panel').hidden=!(s.failed||s.finished);$('race-host-start').hidden=true;$('race-retry').hidden=!(s.failed||s.finished);$('race-retry').disabled=false;$('race-retry').textContent=s.finished?'Ещё раз':'Повтор с контрольной точки';$('race-panel-title').textContent=s.finished?`Финиш · ${s.medal}`:'Падение';$('race-panel-text').textContent=`Время ${formatTime(s.time)} · падений: ${s.falls} · зачёт ${formatTime(s.time+s.falls*5)}. Каждое падение +5 с.`;
    if(s.finished&&!s.saved){s.saved=true;let records={};try{records=JSON.parse(localStorage.getItem('moto-stunt')||'{}')||{};}catch{}const key=s.level+'-'+s.bike;if(!Number.isFinite(records[key])||s.result<records[key])records[key]=s.result;localStorage.setItem('moto-stunt',JSON.stringify(records));this.onNotice?.(`Стант: ${s.medal}. Лучшее время сохраняется отдельно на устройстве.`);}
    this.audioSystem.update({...this.state,speed:Math.abs(s.vx),airborne:!s.contacts.some(Boolean)},this.inputs(),s.time,this.running&&!s.failed&&!s.finished,'clear');if(!document.hidden)this.renderer.render(this.scene,this.camera);
  }
  frame(){const dt=Math.min(.25,this.clock.getDelta());this.renderTime+=dt;this.frameCount++;this.frameTime+=dt;if(this.frameTime>1){const fps=Math.round(this.frameCount/this.frameTime);$('fps').textContent=`${fps} FPS`;if(this.running){this.lowFrames=fps<28?this.lowFrames+1:0;if(this.lowFrames===3&&this.renderer.getPixelRatio()>1){this.renderer.setPixelRatio(1);this.resize();}}this.frameCount=0;this.frameTime=0;}
    if(this.running&&(this.paused||document.hidden&&!this.online)){this.audioSystem.update(this.state,{},this.gameTime,false);if(!document.hidden)this.renderer.render(this.scene,this.camera);return;}
    if(this.running&&this.stunt){this.frameStunt(dt);return;}
    if(this.running){
      const blocked=this.online&&this.roomRace?.phase!=='racing';const remaining=this.online&&this.roomRace?.phase==='countdown'?(this.roomRace.startAt-this.gameTime)*1000:this.online?0:this.startAt-performance.now();if(remaining>0){$('countdown').hidden=false;$('countdown').textContent=Math.ceil(remaining/1000);}else{
        if(this.online)$('countdown').hidden=true;
        if(!this.countdownDone){this.countdownDone=true;$('countdown').textContent='СТАРТ';setTimeout(()=>$('countdown').hidden=true,500);}this.accumulator+=dt;
        while(this.accumulator>=STEP){this.accumulator-=STEP;this.gameTime+=STEP;const input=this.inputs();if(!this.online&&!this.state.finished){if(this.arcade)stepArcade(this.arcade,[this.state],this.orcs,this.combat,STEP,this.gameTime);stepOrcs(this.orcs,[{id:this.id,...this.state}],STEP,this.gameTime);stepCombat(this.combat,this.orcs,[Object.assign(this.state,{id:this.id})],STEP,this.gameTime);}const result=blocked?null:stepRider(this.state,input,STEP,this.gameTime,this.orcs,this.weather);
          if(this.online&&this.connection?.ws.readyState===1){const seq=++this.seq;this.connection.ws.send(JSON.stringify({type:'input',seq,...input}));this.pending.push({seq,input});if(this.pending.length>120)this.pending.shift();}else if(result&&!this.online)this.lapMessage(result.lap,false);
        }
      }
      const s=this.state;this.player.position.set(s.x,s.y+.015,s.z);this.player.rotation.y=s.yaw;this.cockpit.position.copy(this.player.position);this.cockpit.rotation.y=s.yaw;this.cockpit.userData.body.rotation.z=s.steer*clamp(s.speed/35,0,.35);
      if(this.player.userData.body!==this.player)this.player.userData.body.rotation.z=s.steer*clamp(s.speed/35,0,.55);
      for(const wheel of this.player.userData.wheels||[])wheel.rotation.x+=s.speed*dt/.31;
      for(const p of this.remote.values()){const f=1-Math.exp(-dt*13);p.model.position.lerp(new T.Vector3(p.target.x,p.target.y+.015,p.target.z),f);p.model.rotation.y+=angleDiff(p.target.yaw,p.model.rotation.y)*f;for(const wheel of p.model.userData.wheels||[])wheel.rotation.x+=p.target.speed*dt/.31;}
      this.applyCamera(false,dt);
      this.sun.target.position.set(s.x,s.y,s.z);this.sun.position.set(s.x-62,s.y+55,s.z-91);this.sun.target.updateMatrixWorld();
      this.weatherView.update(this.gameTime,s,this.weather);this.projectileView.update(this.combat.projectiles);this.setEngine(s.speed);this.hudTime+=dt;if(this.hudTime>.07){this.hudTime=0;this.updateHUD();}this.world.update(this.gameTime,s.nextGate,this.orcs,dt,this.id);this.arcadeView?.update(this.arcade,this.gameTime);
    }else{
      const a=this.renderTime*.012;const start=trackPoint(0,this.trackId);this.camera.position.set(-35+Math.sin(a)*12,19,start.z+34+Math.cos(a)*4);this.camera.lookAt(7,3,start.z-5);this.world.update(this.renderTime,1);this.weatherView.update(this.renderTime,this.state,'clear');this.projectileView.clear();this.player.visible=false;this.cockpit.visible=false;
    }
    if(!document.hidden&&(this.running||this.renderTime-this.lastRender>.10)){this.renderer.render(this.scene,this.camera);this.lastRender=this.renderTime;}
  }
}
