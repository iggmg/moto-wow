import {test,expect} from '@playwright/test';

test('safe training preserves collisions without health loss or penalty and records no ranking',async({page})=>{
 await page.goto('/');await page.locator('#practice-mode').selectOption('training');await page.locator('#practice-start').click();await expect(page.locator('#hud')).toBeVisible();
 const result=await page.evaluate(async()=>{const r=window.__motoRace,{damageRider}=await import('/shared/health.js');r.countdownDone=true;r.startAt=0;damageRider(r.state,'rock',20);r.reset();return {health:r.state.health,penalty:r.state.penalty,laps:r.state.lapLimit,recorder:!!r.recorder};});expect(result).toEqual({health:100,penalty:0,laps:0,recorder:false});await expect(page.locator('#race-mode')).toContainText('БЕЗ УРОНА');
});

test('completed time attack records sectors, renders a ghost and replays without creating a second record',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/401 \(Unauthorized\)/.test(m.text()))errors.push(m.text());});
 await page.goto('/');await page.locator('#practice-mode').selectOption('timeattack');await page.locator('#practice-start').click();await expect(page.locator('#hud')).toBeVisible();
 const saved=await page.evaluate(async()=>{
  const r=window.__motoRace,{approachGate}=await import('/tests/helpers/cross-gate.js'),{stepRider}=await import('/shared/game.js');r.paused=true;r.countdownDone=true;r.startAt=0;
  for(let gate=1;gate<=16;gate++){approachGate(r.state,gate);for(let n=0;n<8;n++){const event=stepRider(r.state,{throttle:1},1/60,0,[],'clear');if(event)r.lapMessage(event.lap,false);else r.recorder?.update(r.state);if(event||r.state.nextGate!==gate)break;}}
  r.updateHUD();return JSON.parse(localStorage.getItem('moto-replays')||'[]');
 });expect(saved).toHaveLength(1);expect(saved[0].sectors).toHaveLength(16);await expect(page.locator('#race-panel-title')).toHaveText('Финиш!');
 await page.locator('#race-panel-exit').click();await page.locator('#practice-start').click();await expect.poll(()=>page.evaluate(()=>!!window.__motoRace.ghostView)).toBe(true);await page.evaluate(async()=>{const r=window.__motoRace;r.paused=true;await r.ghostView.ready;r.ghostView.update(.1);r.cameraMode='sport';r.applyCamera(true);r.contactEffects.update({...r.state,speed:12,surface:'water',finished:false,airborne:false},.2);r.renderer.render(r.scene,r.camera);});await page.screenshot({path:'artifacts/expansion-2026-10-12/ghost-and-contact-effects.png'});
 await page.locator('#race-exit').click();await page.locator('#replay-open').click();await page.getByRole('button',{name:'Смотреть',exact:true}).click();await expect.poll(()=>page.evaluate(()=>!!window.__motoRace.playback)).toBe(true);await expect(page.locator('#race-mode')).toContainText('ПОВТОР');await expect(page.locator('#race-panel-title')).toHaveText('Повтор завершён');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('moto-replays')).length)).toBe(1);expect(errors).toEqual([]);
});

test('daily challenge uses one fixed bike/course/weather and a separate context',async({page})=>{
 await page.goto('/');await page.locator('#daily-challenge').click();await page.getByRole('button',{name:'Тренировать локально',exact:true}).click();await expect(page.locator('#hud')).toBeVisible();const result=await page.evaluate(async()=>{const {dailyChallenge}=await import('/shared/practice.js'),r=window.__motoRace,c=dailyChallenge();return {bike:r.state.bike,track:r.trackId,weather:r.weather,laps:r.state.lapLimit,id:r.replayContext.challengeId,expected:c};});expect(result.bike).toBe(result.expected.bike);expect(result.track).toBe(result.expected.trackId);expect(result.weather).toBe(result.expected.weather);expect(result.laps).toBe(1);expect(result.id).toBe(result.expected.id);
});
