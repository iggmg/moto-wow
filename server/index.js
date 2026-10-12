import {startCampSprint,stepCampSprint} from '../shared/camp-sprint.js';
import {addPing} from '../shared/pings.js';
import {resultSummary} from '../shared/progression.js';
import {ReplayRecorder,replayContext} from '../shared/replay.js';
import {applyPracticeRules,dailyChallenge} from '../shared/practice.js';
import {worldObstacles} from '../shared/world-events.js';
import {rememberDisconnect,resumable,restoreDisconnected,expireDisconnected} from './reconnect.js';
import {ADVENTURE_MODES,initAdventure,adventureAction,stepAdventure,inSafeCamp,updateCampSafety} from '../shared/adventure.js';
import {SEASON,CHAMPIONSHIP_EVENTS} from '../shared/championship.js';
import {createArcade,initArcade,stepArcade,feedOrc} from '../shared/arcade.js';
import { stepContacts } from '../shared/contacts.js';
import express from 'express';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { isIP } from 'node:net';
import { createRoom,roomInfo,startRoom,returnToLobby,synchronizedMode } from './rooms.js';
import { createStore } from './store.js';
import { stepCombat } from '../shared/combat.js';
import { BIKES,WEATHER,TRACKS,trackById,revisionForRules,VERSION,STEP,createRider,createOrcs,stepOrcs,normalizeInput,stepRider,resetRider } from '../shared/game.js';

export function createGameServer({database=process.env.DATABASE_PATH||'./data/moto-wow.sqlite',origins=(process.env.PUBLIC_ORIGIN||'http://127.0.0.1:5173,http://localhost:5173').split(','),secure=process.env.COOKIE_SECURE==='1',trustRailway=process.env.TRUST_RAILWAY_PROXY==='1'}={}) {
  const store=createStore(database),app=express(),server=createServer(app),wss=new WebSocketServer({noServer:true,maxPayload:2048}),rooms=new Map(),tickets=new Map(),limits=new Map();
  let activeAuth=0;
  const allowed=o=>origins.includes(o);
  const tokenOf=req=>req.headers.authorization?.replace(/^Bearer /,'')||req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('moto_session='))?.slice(13);
  const cookie=(res,token,maxAge=604800)=>res.setHeader('Set-Cookie',`moto_session=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=${secure?'None; Secure':'Lax'}`);
  app.disable('x-powered-by');
  if(secure)app.use((_req,res,next)=>{res.setHeader('Strict-Transport-Security','max-age=86400');next();});
  app.use((req,res,next)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');res.setHeader('Cache-Control','no-store');
    if(req.headers.origin){if(!allowed(req.headers.origin))return res.status(403).json({error:'Недопустимый источник запроса.'});res.setHeader('Access-Control-Allow-Origin',req.headers.origin);res.setHeader('Access-Control-Allow-Credentials','true');res.setHeader('Vary','Origin');}
    if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');return res.sendStatus(204);}next();
  });
  app.use('/api',(req,res,next)=>{if(req.method==='POST'&&(!allowed(req.headers.origin)||!req.is('application/json')))return res.status(403).json({error:'Недопустимый запрос.'});next();});
  app.use(express.json({limit:'4kb',strict:true}));
  app.use('/api',(req,res,next)=>{
    // Enable only behind Railway's HTTPS edge, which supplies X-Real-IP.
    const forwarded=req.headers['x-real-ip'];
    const key=trustRailway&&typeof forwarded==='string'&&isIP(forwarded)?forwarded:req.socket.remoteAddress,now=Date.now();let l=limits.get(key);
    if(!l&&limits.size>=10000)return res.status(503).json({error:'Сервер занят.'});
    if(!l||now-l.start>60000){l={start:now,count:0,auth:0};limits.set(key,l);}l.count++;
    if(l.count>240)return res.status(429).json({error:'Слишком много запросов. Подожди минуту.'});
    if(['/auth/register','/auth/login','/auth/guest'].includes(req.path)&&++l.auth>12)return res.status(429).json({error:'Слишком много попыток входа. Подожди минуту.'});next();
  });
  const requireUser=(req,res,next)=>{req.user=store.session(tokenOf(req));if(!req.user)return res.status(401).json({error:'Для этого нужен вход в аккаунт.'});next();};
  app.get('/api/profile',requireUser,(req,res)=>res.json(store.profile(req.user.id)));
  app.post('/api/profile',requireUser,(req,res)=>{try{if(typeof req.body?.badge!=='string')throw new Error('Некорректный знак.');const profile=store.setCosmetic(req.user.id,req.body.badge);for(const room of rooms.values()){const p=room.players.get(req.user.id);if(p){p.cosmetic=req.body.badge;p.state.cosmetic=req.body.badge;}}res.json(profile);}catch(e){res.status(400).json({error:e.message});}});
  app.get('/api/results',(req,res)=>{const mode=['race','arcade','courier','elimination','totem','timeattack'].includes(req.query.mode)?req.query.mode:'courier',track=trackById(req.query.track),weather=WEATHER.includes(req.query.weather)?req.query.weather:track.weather;res.json({entries:store.modeRanking(mode,track.id,weather,'',[1,2,3,4,5,6,7,8].includes(Number(req.query.players))?Number(req.query.players):1)});});
  app.get('/api/result/:id',(req,res)=>{const id=req.params.id;if(!/^[a-f0-9-]{36}$/.test(id))return res.status(404).json({error:'Результат не найден.'});const result=store.result(id);if(!result)return res.status(404).json({error:'Результат не найден.'});res.json(result);});
  app.get('/api/daily',(_req,res)=>{const challenge=dailyChallenge();res.json({challenge,entries:store.modeRanking('timeattack',challenge.trackId,challenge.weather,challenge.id)});});
  app.get('/api/health',(_req,res)=>res.json({ok:true,version:VERSION,rooms:rooms.size}));
  for(const action of ['register','login','guest'])app.post(`/api/auth/${action}`,async(req,res)=>{
    if(activeAuth>=4)return res.status(503).json({error:'Сервер занят. Попробуй чуть позже.'});activeAuth++;
    try{const result=await store[action](req.body?.nickname,req.body?.password);cookie(res,result.token);res.json(result);}catch(e){res.status(400).json({error:e.message});}finally{activeAuth--;}
  });
  app.get('/api/rooms',requireUser,(_req,res)=>res.json({rooms:[...rooms.values()].filter(r=>r.mode==='open'&&r.code.startsWith('OPEN-')).map(roomInfo)}));
  app.get('/api/auth/me',requireUser,(req,res)=>res.json({user:req.user,stats:store.stats(req.user.id)}));
  app.post('/api/auth/logout',requireUser,(req,res)=>{store.logout(tokenOf(req));cookie(res,'',0);for(const room of rooms.values())for(const p of room.players.values())if(p.user.id===req.user.id)p.ws.close(1000,'Logged out');res.json({ok:true});});
  app.get('/api/championship',(req,res)=>res.json({season:SEASON,events:CHAMPIONSHIP_EVENTS,...store.championship(store.session(tokenOf(req))?.id,CHAMPIONSHIP_EVENTS.some(e=>e.id===req.query.event)?req.query.event:null)}));
  app.get('/api/leaderboard',(req,res)=>{const bike=typeof req.query.bike==='string'&&BIKES.some(b=>b.id===req.query.bike)?req.query.bike:null;const track=trackById(req.query.track),physics=['5','6','7','8','9','10','11','12','13','14'].includes(req.query.physics)?Number(req.query.physics):VERSION,mode=physics===5?'legacy':['race','arcade'].includes(req.query.mode)?req.query.mode:'open',weather=WEATHER.includes(req.query.weather)?req.query.weather:track.weather,context={trackId:track.id,trackRevision:revisionForRules(track.id,physics),physicsVersion:physics,mode,weather};res.json({context,entries:store.leaderboard(bike,context)});});
  app.post('/api/ws-ticket',requireUser,(req,res)=>{if(tickets.size>=1000)return res.status(503).json({error:'Сервер занят.'});for(const[k,t]of tickets)if(t.user.id===req.user.id)tickets.delete(k);const ticket=randomBytes(24).toString('hex');tickets.set(ticket,{user:req.user,token:tokenOf(req),expires:Date.now()+15000});res.json({ticket});});
  app.use('/api',(_req,res)=>res.status(404).json({error:'Неизвестный API маршрут.'}));
  app.use(express.static(resolve('dist'),{setHeaders:res=>{res.setHeader('Cache-Control','public, max-age=300');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' blob:; font-src 'self'; object-src 'none'; form-action 'self'; frame-src 'none'; frame-ancestors 'none'; base-uri 'self'");}}));
  app.use((err,_req,res,_next)=>{res.status(400).json({error:'Некорректный запрос.'});});
  function snapshot(room){return {type:'state',time:room.time,race:roomInfo(room),weather:room.weather,pings:(room.pings||[]).filter(p=>p.expires>room.time),adventure:room.adventure,arcade:room.arcade,combat:room.combat,orcs:room.orcs,players:[...room.players.values()].map(p=>({id:p.user.id,nickname:p.user.nickname,ack:p.seq,actionAck:p.actionSeq||0,...p.state}))};}
  function savePlayerResult(room,p,matchId,seconds=null,won=false,level='',recorder=p.recorder){const summary=resultSummary(p.state,room.mode,room.weather,{won,challengeId:room.challengeId,seconds,level,variant:(room.mode!=='timeattack'&&!room.enemies||room.mode==='race'&&!room.contactDamage)?'casual':'standard'});if(seconds!==null&&!level&&['open','arcade'].includes(room.mode)){summary.laps=1;summary.hits=Math.max(0,p.state.hits-(recorder?.initialHits||0));summary.points=room.mode==='arcade'?Math.max(0,(p.state.arcade?.score||0)-(recorder?.initialScore||0)):0;summary.style=Math.max(0,(p.state.arcade?.style?.points||0)-(recorder?.initialStyle||0));}let replay=null;try{replay=recorder?.finish(summary.seconds,p.state);}catch{}let id;try{id=store.saveResult(matchId,p.user.id,summary,replay);}catch{p.resultSaved='pending';p.state.resultPending=true;send(p.ws,{type:'notice',message:'Сервер пока не смог сохранить результат. Заезд завершён; запись в рейтинге не подтверждена.'});return;}if(seconds===null)p.resultSaved=id;p.state.resultId=id;send(p.ws,{type:'result',id,summary,profile:store.profile(p.user.id)});}
  function send(ws,value){if(ws.readyState===WebSocket.OPEN){if(ws.bufferedAmount>256*1024){ws.close(1013,'Slow connection');return;}ws.send(JSON.stringify(value));}}
  server.on('upgrade',(req,socket,head)=>{
    if(!allowed(req.headers.origin)){socket.destroy();return;}
    if(wss.clients.size>=256){socket.destroy();return;}
    let url;try{url=new URL(req.url,'http://local');}catch{socket.destroy();return;}if(url.pathname!='/ws'){socket.destroy();return;}
    const key=url.searchParams.get('ticket'),ticket=tickets.get(key);tickets.delete(key);
    if(!ticket||ticket.expires<Date.now()||!store.session(ticket.token)){socket.destroy();return;}
    wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req,ticket));
  });
  wss.on('connection',(ws,_req,ticket)=>{
    let room=null,player=null,count=0,windowStart=Date.now();ws.alive=true;
    const joinTimer=setTimeout(()=>{if(!room)ws.close(1008,'Join timeout');},5000);
    ws.on('pong',()=>ws.alive=true);
    ws.on('message',(data,isBinary)=>{
      if(isBinary){ws.close(1008,'Text messages required');return;}
      if(Date.now()-windowStart>1000){windowStart=Date.now();count=0;}if(++count>100){ws.close(1008,'Rate limit');return;}
      let msg;try{msg=JSON.parse(data.toString());}catch{ws.close(1008,'Malformed message');return;}
      if(!msg||typeof msg!=='object'||Array.isArray(msg)||typeof msg.type!=='string'){ws.close(1008,'Invalid message');return;}
      if(msg.type==='join'&&!room){
        if(msg.version!==undefined&&msg.version!==VERSION){send(ws,{type:'error',error:'Версия игры устарела. Обнови страницу.'});ws.close(1008);return;}
        if(msg.trackId!==undefined&&!TRACKS.some(t=>t.id===msg.trackId)){send(ws,{type:'error',error:'Неизвестная трасса.'});ws.close(1008);return;}
        if(msg.mode==='timeattack'&&msg.challengeId){const challenge=dailyChallenge();msg.trackId=challenge.trackId;msg.bike=challenge.bike;msg.weather=challenge.weather;msg.challengeId=challenge.id;}
        const requestedTrack=trackById(msg.trackId),requestedWeather=WEATHER.includes(msg.weather)?msg.weather:requestedTrack.weather;
        let code=typeof msg.room==='string'?msg.room.toUpperCase():'';
        if(msg.mode==='open'&&!code){let n=1;while(rooms.has(`OPEN-${n}`)&&(rooms.get(`OPEN-${n}`).mode!=='open'||rooms.get(`OPEN-${n}`).trackId!==requestedTrack.id||rooms.get(`OPEN-${n}`).weather!==requestedWeather||rooms.get(`OPEN-${n}`).players.size>=8))n++;code=`OPEN-${n}`;}
        if(!/^[A-Z0-9-]{3,16}$/.test(code)||!BIKES.some(b=>b.id===msg.bike)){send(ws,{type:'error',error:'Комната: 3–16 латинских букв или цифр.'});ws.close(1008);return;}
        if(msg.reconnecting===true&&!rooms.has(code)){send(ws,{type:'error',error:'Срок восстановления комнаты истёк.'});ws.close(1008);return;}
        if(!rooms.has(code)){if(rooms.size>=200){ws.close(1013,'Server full');return;}rooms.set(code,createRoom(code,msg,ticket.user.id));}
        const r=rooms.get(code),old=r.players.get(ticket.user.id);if(msg.reconnecting===true&&!resumable(r,ticket.user.id)){send(ws,{type:'error',error:'Заезд больше нельзя восстановить.'});ws.close(1008);return;}
        if(msg.mode&&msg.mode!==r.mode){send(ws,{type:'error',error:'Заезд уже идёт или выбран другой режим. Дождись нового старта.'});ws.close(1008);return;}
        for(const active of wss.clients)if(active!==ws&&active.userId===ticket.user.id)active.close(1000,'Joined from another tab');ws.userId=ticket.user.id;
        if(r.mode==='timeattack'&&r.players.size&&!old){send(ws,{type:'error',error:'Заезд на время индивидуальный. Создай новый код.'});ws.close(1008);return;}
        if(r.players.size>=8&&!old){send(ws,{type:'error',error:'В комнате уже 8 гонщиков.'});ws.close(1008);return;}
        if(old)old.ws.close(1000,'Joined from another tab');
        const restored=restoreDisconnected(r,ticket.user.id);room=r;player={ws,user:ticket.user,token:ticket.token,state:createRider(msg.bike,r.players.size,r.trackId),input:normalizeInput(),lastInput:Date.now(),seq:0,actionSeq:0};if(restored){player.state=restored.state;player.seq=restored.seq;player.actionSeq=restored.actionSeq||0;}player.state.id=ticket.user.id;if(!restored&&r.mode==='arcade')initArcade(player.state);if(!restored&&ADVENTURE_MODES.includes(r.mode))initAdventure(player.state,r.mode);if(r.mode==='race')player.state.lapLimit=r.laps;if(r.mode==='timeattack')applyPracticeRules(player.state,'timeattack');player.cosmetic=store.profile(ticket.user.id).cosmetic;player.state.cosmetic=player.cosmetic;if(!restored&&synchronizedMode(r.mode)&&r.phase!=='lobby'){player.state.spectator=true;player.state.finished=true;}player.runSerial=restored?.runSerial||0;player.state.fieldSize=r.fieldSize||1;player.state.variant=(r.mode!=='timeattack'&&!r.enemies||r.mode==='race'&&!r.contactDamage)?'casual':'standard';player.recorder=restored?.recorder||new ReplayRecorder(replayContext(player.state,r.mode,r.weather,r.challengeId),player.state);player.activityRecorder=restored?.activityRecorder;player.recordHits=restored?.recordHits||0;player.lastEvent=restored?.lastEvent||0;player.resultSaved=restored?.resultSaved||null;player.state.best=store.stats(ticket.user.id,r).find(s=>s.bike===msg.bike)?.best||0;r.players.set(ticket.user.id,player);if(r.hostId===null)r.hostId=ticket.user.id;clearTimeout(joinTimer);
        send(ws,{type:'joined',id:ticket.user.id,room:code,version:VERSION,resumed:!!restored,...snapshot(r),type:'joined'});return;
      }
      if(!player)return;
      if(msg.type==='input'&&Number.isSafeInteger(msg.seq)&&msg.seq>player.seq&&msg.seq-player.seq<=600&&['throttle','brake','rearBrake','reverse','steer'].every(k=>msg[k]===undefined||typeof msg[k]==='number'&&Number.isFinite(msg[k])&&Math.abs(msg[k])<=1)){player.input=normalizeInput(msg);player.lastInput=Date.now();player.seq=msg.seq;}
      if(msg.type==='adventure'&&room.phase==='racing'&&Number.isSafeInteger(msg.seq)&&msg.seq>player.actionSeq&&msg.seq-player.actionSeq<=600&&typeof msg.action==='string'&&(msg.target===undefined||Number.isSafeInteger(msg.target))){player.actionSeq=msg.seq;adventureAction(room.adventure,[...room.players.values()].filter(p=>!p.state.spectator).map(p=>p.state),player.user.id,msg.action,room.time,room.orcs,msg.target??null);}
      if(msg.type==='activity'&&room.mode==='open'&&Number.isSafeInteger(msg.seq)&&msg.seq>player.actionSeq&&msg.seq-player.actionSeq<=600){player.actionSeq=msg.seq;if(startCampSprint(player.state))player.activityRecorder=new ReplayRecorder(replayContext(player.state,'open',room.weather),player.state);}
      if(msg.type==='ping'&&Number.isSafeInteger(msg.seq)&&msg.seq>player.actionSeq&&msg.seq-player.actionSeq<=600){player.actionSeq=msg.seq;addPing(room,player.state,msg.ping,room.time);}
      if(msg.type==='feed'&&['arcade','courier'].includes(room.mode))feedOrc(player.state,room.orcs,room.combat,room.time);
      if(msg.type==='start')startRoom(room,player.user.id);
      if(msg.type==='lobby')returnToLobby(room,player.user.id);
      if(msg.type==='respawn'&&room.mode!=='timeattack'&&!synchronizedMode(room.mode)&&player.state.health===0&&room.time-(player.state.finishedAt??room.time)>=5){player.runSerial=(player.runSerial||0)+1;const best=player.state.best;player.state=createRider(player.state.bike,0,room.trackId);player.state.id=player.user.id;if(room.mode==='arcade')initArcade(player.state);player.state.best=best;player.recorder=new ReplayRecorder(replayContext(player.state,room.mode,room.weather),player.state);player.recordHits=0;player.input={};}
      if(msg.type==='reset'&&(player.lastReset===undefined||Date.now()-player.lastReset>2000)){resetRider(player.state);player.lastReset=Date.now();}
    });
    ws.on('close',code=>{clearTimeout(joinTimer);if(room&&room.players.get(ticket.user.id)===player){rememberDisconnect(room,player,code);room.players.delete(ticket.user.id);if(room.hostId===ticket.user.id)room.hostId=room.players.keys().next().value??null;if(!room.players.size&&!room.detached?.size)rooms.delete(room.code);}});
    ws.on('error',()=>ws.close());
  });
  let ticks=0,last=performance.now(),accumulator=0;
  server.headersTimeout=10000;server.requestTimeout=15000;server.keepAliveTimeout=5000;
  const loop=setInterval(()=>{
    const now=performance.now();accumulator=Math.min(.25,accumulator+(now-last)/1000);last=now;
    while(accumulator>=STEP){accumulator-=STEP;ticks++;
      for(const room of rooms.values()){
        expireDisconnected(room);if(!room.players.size&&!room.detached?.size){rooms.delete(room.code);continue;}room.time+=STEP;
        if(room.phase==='countdown'&&room.time>=room.startAt)room.phase='racing';
        if(room.phase==='racing'){
        updateCampSafety([...room.players.values()].map(p=>p.state),room.mode,room.adventure);
        if(room.arcade)stepArcade(room.arcade,[...room.players.values()].map(p=>p.state),room.orcs,room.combat,STEP,room.time);
        stepOrcs(room.orcs,[...room.players.values()].map(p=>({id:p.user.id,...p.state})),STEP,room.time);
        stepCombat(room.combat,room.orcs,[...room.players.values()].map(p=>Object.assign(p.state,{id:p.user.id})),STEP,room.time,worldObstacles(room.arcade?.worldEvents,room.time));
        for(const p of room.players.values()){
          const event=stepRider(p.state,Date.now()-p.lastInput>350?{}:p.input,STEP,room.time,room.orcs,room.weather,worldObstacles(room.arcade?.worldEvents,room.time));
          const activitySeconds=stepCampSprint(p.state,STEP);p.activityRecorder?.update(p.state);if(activitySeconds)savePlayerResult(room,p,room.matchId+'-camp-'+p.state.activity.serial,activitySeconds,false,'camp-sprint',p.activityRecorder);
          if(p.state.finished&&p.state.finishedAt===undefined){p.state.finishedAt=room.time;p.state.resultSeconds=p.state.raceTime+p.state.totalPenalty;}
          if(event&&!room.adventure){if(room.championship&&p.state.finished&&p.state.health>0){const award=store.award(p.user.id,room.trackId,p.state.bike,p.state.resultSeconds);send(p.ws,{type:'award',...award});}if((room.mode==='timeattack'||room.enemies)&&(room.mode!=='race'||room.contactDamage))store.record(p.user.id,event.bike,event.lap,{...event,mode:room.mode,score:Math.max(0,(p.state.arcade?.score||0)-(p.recorder?.initialScore||0))});send(p.ws,{type:'lap',seconds:event.lap,best:p.state.best});if(['open','arcade'].includes(room.mode)){savePlayerResult(room,p,room.matchId+'-run-'+(p.runSerial||0)+'-lap-'+p.state.completed,event.lap);p.recorder=new ReplayRecorder(replayContext(p.state,room.mode,room.weather),p.state);}}
          if(p.recorder){if(p.state.hits>(p.recordHits||0)){p.recorder.event('hit',p.state);p.recordHits=p.state.hits;}for(const e of room.adventure?.events||[])if(e.id>p.lastEvent){if(e.actorId===p.user.id||e.type==='finish')p.recorder.event(e.type,p.state);p.lastEvent=e.id;}p.recorder.update(p.state);}
        }
        stepContacts([...room.players.values()].map(p=>p.state),room.time,{damage:room.contactDamage});
        if(room.adventure){stepAdventure(room.adventure,[...room.players.values()].filter(p=>!p.state.spectator).map(p=>p.state),room.orcs,STEP,room.time);if(room.adventure.finished)room.phase='finished';}else if(room.mode==='race'&&[...room.players.values()].every(p=>p.state.finished)&&![...room.detached?.values()||[]].some(p=>!p.state.finished))room.phase='finished';
        if(room.phase==='finished'||room.mode==='timeattack'&&[...room.players.values()].every(p=>p.state.finished)){room.phase='finished';const finished=[...room.players.values()].filter(p=>p.state.health>0).sort((a,b)=>(a.state.resultSeconds||Infinity)-(b.state.resultSeconds||Infinity));for(const p of room.players.values())if(!p.resultSaved&&!p.state.spectator)savePlayerResult(room,p,room.matchId,null,room.adventure?.winners.includes(p.user.id)??(p===finished[0]));}
        }
        if(ticks%3===0){const msg=snapshot(room);for(const p of room.players.values())send(p.ws,msg);}
      }
    }
  },8);
  const housekeeping=setInterval(()=>{
    store.cleanup();for(const [k,t]of tickets)if(t.expires<Date.now())tickets.delete(k);for(const[k,l]of limits)if(Date.now()-l.start>120000)limits.delete(k);
    for(const room of rooms.values())for(const p of room.players.values()){
      if(!p.ws.alive||!store.session(p.token)){p.ws.terminate();continue;}p.ws.alive=false;p.ws.ping();
    }
  },30000);
  return {app,server,wss,store,rooms,async close(){clearInterval(loop);clearInterval(housekeeping);for(const ws of wss.clients)ws.terminate();await new Promise(r=>server.close(r));store.close();}};
}
export async function startGameServer(){
  const {backupBeforeMigration}=await import('./backup.js');
  await backupBeforeMigration(process.env.DATABASE_PATH||'./data/moto-wow.sqlite',process.env.BACKUP_DIRECTORY);
  const game=createGameServer(),port=Number(process.env.PORT||8787),host=process.env.HOST||'127.0.0.1';
  let backupTimer;
  if(process.env.BACKUP_DIRECTORY){
    const {backupStore}=await import('./backup.js');
    await backupStore(game.store.db,process.env.BACKUP_DIRECTORY);
    backupTimer=setInterval(()=>backupStore(game.store.db,process.env.BACKUP_DIRECTORY).catch(()=>console.error('Database backup failed')),86400000);
    backupTimer.unref();
  }
  game.server.listen(port,host,()=>console.log(`Moto WOW game server: http://${host}:${port}`));
  for(const signal of ['SIGTERM','SIGINT'])process.once(signal,async()=>{clearInterval(backupTimer);await game.close();process.exit(0);});
  return game;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await startGameServer();
