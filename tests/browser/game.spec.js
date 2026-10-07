import { test,expect } from '@playwright/test';
const stamp=Date.now().toString(36);
async function register(page,nickname){await page.getByRole('button',{name:'Войти',exact:false}).first().click();await page.getByRole('button',{name:'Первый заезд? Создать аккаунт'}).click();await page.getByLabel('Ник гонщика').fill(nickname);await page.getByLabel('Пароль',{exact:true}).fill('browser-rider-strong-pass');await page.getByRole('button',{name:'Создать аккаунт →',exact:true}).click();await expect(page.locator('#auth-dialog')).not.toBeVisible();}
test('garage displays six distinct 3D bikes, riding, both cameras, reset and local ranking',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await expect(page.locator('#bike-selection button')).toHaveCount(6);await expect(page.locator('#backend-status')).toContainText('доступен');await expect(page.locator('#fatal')).toBeHidden();
  for(const name of ['Yamaha MT-07','Yamaha Exciter','Royal Enfield Himalayan','Honda Winner','Honda PCX','Honda CUB']){await page.getByRole('button',{name:new RegExp(name)}).click();await expect(page.locator('#bike-name')).toHaveText(name);}
  await page.waitForTimeout(3200);expect(await page.evaluate(()=>window.__motoRace.renderer.shadowMap.enabled)).toBe(true);await page.screenshot({path:'artifacts/garage-desktop.png'});
  await page.locator('#practice-start').click();await expect(page.locator('#hud')).toBeVisible();await page.waitForTimeout(3400);const before=await page.evaluate(()=>window.__motoDebug.state);await page.keyboard.down('w');await expect.poll(()=>page.evaluate(()=>window.__motoDebug.state.speed),{timeout:10000}).toBeGreaterThan(5);await page.keyboard.up('w');const after=await page.evaluate(()=>window.__motoDebug.state);expect(after.speed).toBeGreaterThan(5);expect(Math.hypot(after.x-before.x,after.z-before.z)).toBeGreaterThan(4);
  await expect.poll(()=>page.evaluate(()=>{const a=window.__motoRace.audioSystem;if(!a.context||a.context.state!=='running')return 0;const data=new Float32Array(a.analyser.fftSize);a.analyser.getFloatTimeDomainData(data);return Math.sqrt(data.reduce((sum,v)=>sum+v*v,0)/data.length);})).toBeGreaterThan(.01);
  let heading=(await page.evaluate(()=>window.__motoDebug.state)).yaw;await page.keyboard.down('ArrowRight');await page.waitForTimeout(350);await page.keyboard.up('ArrowRight');let turned=(await page.evaluate(()=>window.__motoDebug.state)).yaw;expect(Math.atan2(Math.sin(turned-heading),Math.cos(turned-heading))).toBeLessThan(0);
  heading=turned;await page.keyboard.down('ArrowLeft');await page.waitForTimeout(700);await page.keyboard.up('ArrowLeft');turned=(await page.evaluate(()=>window.__motoDebug.state)).yaw;expect(Math.atan2(Math.sin(turned-heading),Math.cos(turned-heading))).toBeGreaterThan(0);
  await page.locator('#race-sound').click();expect(await page.evaluate(()=>window.__motoRace.sound)).toBe(false);await page.locator('#race-sound').click();expect(await page.evaluate(()=>window.__motoRace.sound)).toBe(true);
  await page.screenshot({path:'artifacts/race-chase.png'});await page.keyboard.press('c');expect(await page.evaluate(()=>window.__motoDebug.camera)).toBe('first');await page.screenshot({path:'artifacts/race-first-person.png'});await page.keyboard.press('r');expect((await page.evaluate(()=>window.__motoDebug.state)).penalty).toBeGreaterThanOrEqual(5);await page.keyboard.press('Escape');await expect(page.locator('#garage')).toBeVisible();await page.locator('#leaderboard-open').click();await page.locator('#local-tab').click();await expect(page.locator('#ranking-content')).toContainText('Пока нет');expect(errors).toEqual([]);
});
test('two independent browser accounts join a room and receive each other moving',async({browser})=>{
  const a=await browser.newContext(),b=await browser.newContext(),p1=await a.newPage(),p2=await b.newPage();try{
    await p1.goto('/');await p2.goto('/');await register(p1,`TestA_${stamp}`);await register(p2,`TestB_${stamp}`);
    for(const p of [p1,p2]){await p.locator('#online-open').click();await p.locator('#room-mode').selectOption('open');await p.locator('#room-code').fill(`E2E-${stamp}`);await p.locator('#online-submit').click();await expect(p.locator('#hud')).toBeVisible();}
    await expect.poll(()=>p1.evaluate(()=>window.__motoDebug.remoteCount)).toBe(1);await expect.poll(()=>p2.evaluate(()=>window.__motoDebug.remoteCount)).toBe(1);
    await p1.keyboard.down('w');await expect.poll(()=>p1.evaluate(()=>window.__motoDebug.state.speed),{timeout:10000}).toBeGreaterThan(4);await p1.keyboard.up('w');expect((await p1.evaluate(()=>window.__motoDebug.state)).speed).toBeGreaterThan(4);await expect(p2.locator('#player-list')).toContainText(`TestA_${stamp}`);await p2.screenshot({path:'artifacts/multiplayer.png'});await p1.keyboard.press('Escape');await expect.poll(()=>p2.evaluate(()=>window.__motoDebug.remoteCount)).toBe(0);
  }finally{await a.close();await b.close();}
});
test('mobile garage fits viewport and touch throttle works',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();try{await page.goto('/');expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);await page.screenshot({path:'artifacts/garage-mobile.png',fullPage:true});await page.locator('#practice-start').click();await page.waitForTimeout(3400);const button=page.locator('[data-control="throttle"]');await expect(button).toBeVisible();const box=await button.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await expect.poll(()=>page.evaluate(()=>window.__motoDebug.state.speed),{timeout:10000}).toBeGreaterThan(3);await page.mouse.up();
    for(const [control,duration,sign]of [['right',350,-1],['left',700,1]]){const heading=await page.evaluate(()=>window.__motoDebug.state.yaw),target=await page.locator(`[data-control="${control}"]`).boundingBox();await page.mouse.move(target.x+target.width/2,target.y+target.height/2);await page.mouse.down();await page.waitForTimeout(duration);await page.mouse.up();const yaw=await page.evaluate(()=>window.__motoDebug.state.yaw);expect(Math.atan2(Math.sin(yaw-heading),Math.cos(yaw-heading))*sign).toBeGreaterThan(0);}
  }finally{await context.close();}
});

test('orcs pursue and attack a stopped motorcycle, with visible warning and animated limbs',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.locator('#practice-start').click();await page.waitForTimeout(3400);
 // Stage the racer beside a patrol so this regression does not depend on a long lap.
 await page.evaluate(()=>{const r=window.__motoRace,o=r.orcs[0];r.state.x=o.x+8;r.state.z=o.z;r.state.speed=0;r.state.y=0;r.state.yaw=-Math.PI/2;r.cameraMode='chase';r.applyCamera(true);});
 await expect(page.locator('#pursuit-warning')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>window.__motoDebug.state.hits),{timeout:10000}).toBeGreaterThan(0);
 const state=await page.evaluate(()=>{const r=window.__motoRace,o=r.orcs[0],model=r.world.orcs[0].model;return {speed:r.state.speed,penalty:r.state.penalty,target:o.targetId,id:r.id,distance:Math.hypot(o.x-r.state.x,o.z-r.state.z),visualDistance:Math.hypot(o.x-model.position.x,o.z-model.position.z),loaded:model.userData.loaded,actions:[...model.userData.actions.keys()]};});
 expect(state.speed).toBe(0);expect(state.penalty).toBeGreaterThanOrEqual(2);expect(state.target).toBe(state.id);expect(state.distance).toBeLessThan(1.4);expect(state.visualDistance).toBeLessThan(.4);expect(state.loaded).toBe(true);expect(state.actions).toContain('walk');expect(state.actions).toContain('attack');
 await expect(page.locator('#pursuit-warning')).toContainText('АТАКУЕТ');await page.screenshot({path:'artifacts/orc-pursuit.png'});
 await page.keyboard.down('w');await expect.poll(()=>page.evaluate(()=>window.__motoDebug.state.speed),{timeout:10000}).toBeGreaterThan(7);await page.keyboard.up('w');expect(errors).toEqual([]);
});

test('weather, river and real airborne ramp jumps work with the sixth motorcycle',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('401'))errors.push(m.text());});await page.goto('/');await page.locator('[data-bike="mt07"]').click();await page.locator('#practice-weather').selectOption('snow');await page.locator('#practice-start').click();await page.waitForTimeout(3300);
 await expect(page.locator('#weather-hud')).toHaveText('Снег');expect(await page.evaluate(()=>window.__motoRace.weatherView.snow.visible)).toBe(true);
 await page.screenshot({path:'artifacts/weather-snow.png'});
 await page.evaluate(async()=>{const {RIVERS,groundHeight}=await import('/shared/game.js');const r=window.__motoRace,p=RIVERS[0];Object.assign(r.state,{x:p.x,z:p.z,y:groundHeight(p.x,p.z),speed:0,airborne:false,hitCooldown:3});r.applyCamera(true);});
 await expect(page.locator('#surface')).toContainText('БРОД');await page.screenshot({path:'artifacts/river-crossing.png'});
 await page.evaluate(async()=>{const {RAMPS,groundHeight}=await import('/shared/game.js');const r=window.__motoRace,p=RAMPS[0],along=-p.length/2+.3,x=p.x+Math.sin(p.heading)*along,z=p.z+Math.cos(p.heading)*along;Object.assign(r.state,{x,z,y:groundHeight(x,z),yaw:p.heading,speed:18,steer:0,airborne:false,lastRamp:null,hitCooldown:5});r.applyCamera(true);});
 await expect.poll(()=>page.evaluate(()=>window.__motoDebug.state.airborne),{timeout:5000}).toBe(true);await expect(page.locator('#surface')).toHaveText('ПРЫЖОК');await page.screenshot({path:'artifacts/ramp-jump.png'});
 await expect.poll(()=>page.evaluate(()=>window.__motoDebug.state.airborne),{timeout:10000}).toBe(false);
 await page.keyboard.press('Escape');await page.locator('#practice-weather').selectOption('rain');await page.locator('#practice-start').click();await page.waitForTimeout(3300);await expect(page.locator('#weather-hud')).toHaveText('Дождь');expect(await page.evaluate(()=>window.__motoRace.weatherView.rain.visible&&!window.__motoRace.weatherView.snow.visible)).toBe(true);await page.screenshot({path:'artifacts/weather-rain.png'});expect(errors).toEqual([]);
});
test('textured orcs fire visible projectiles that can hit a parked racer',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.locator('#practice-start').click();await page.waitForTimeout(3300);
 await page.evaluate(async()=>{const {groundHeight}=await import('/shared/game.js');const r=window.__motoRace,o=r.orcs[0];Object.assign(r.state,{x:o.x+14,z:o.z,y:groundHeight(o.x+14,o.z),yaw:-Math.PI/2,speed:0,hits:0,penalty:0,hitCooldown:0});r.applyCamera(true);});
 await expect.poll(()=>page.evaluate(()=>window.__motoDebug.projectiles.length),{timeout:8000}).toBeGreaterThan(0);
 expect(await page.evaluate(()=>window.__motoRace.world.orcs.every(o=>o.model.userData.loaded))).toBe(true);await page.screenshot({path:'artifacts/orc-ranged-attack.png'});
 await expect.poll(()=>page.evaluate(()=>window.__motoDebug.state.hits),{timeout:8000}).toBeGreaterThan(0);expect(errors).toEqual([]);
});
test('registration asks only for game nickname/password and warns against personal data and reused passwords',async({page})=>{
 await page.goto('/');await page.locator('#account-open').click();await page.locator('#auth-switch').click();await expect(page.locator('#auth-title')).toHaveText('Создать аккаунт');await expect(page.locator('#auth-privacy')).toBeVisible();await expect(page.locator('#auth-privacy')).toContainText('Не указывай настоящее имя, почту, телефон');await expect(page.locator('#auth-privacy')).toContainText('не используешь на других сайтах');await expect(page.locator('#auth-form input')).toHaveCount(2);await page.screenshot({path:'artifacts/registration-privacy.png'});
});

test('health appears in HUD, lethal orc hits stop riding and solo race can restart',async({page})=>{
 await page.goto('/');await page.locator('#practice-laps').selectOption('1');await page.locator('#practice-start').click();await page.waitForTimeout(3300);await expect(page.locator('#health-value')).toHaveText('100');await expect(page.locator('#lap')).toHaveText('1 / 1');
 await page.evaluate(async()=>{const {damageRider}=await import('/shared/health.js');const r=window.__motoRace;for(let i=0;i<5;i++){r.state.hitCooldown=0;damageRider(r.state,'melee');}});
 await expect(page.locator('#health-value')).toHaveText('0');await expect(page.locator('#race-panel-title')).toHaveText('Здоровье закончилось');await page.keyboard.down('w');await page.waitForTimeout(200);await page.keyboard.up('w');expect(await page.evaluate(()=>window.__motoRace.state.speed)).toBe(0);await page.screenshot({path:'artifacts/health-defeat.png'});
 await page.locator('#race-retry').click();await expect(page.locator('#health-value')).toHaveText('100');await expect(page.locator('#race-panel')).toBeHidden();
});
test('two friends wait in lobby and start together after a shared countdown',async({browser})=>{
 const a=await browser.newContext(),b=await browser.newContext(),p1=await a.newPage(),p2=await b.newPage();try{
  await p1.goto('/');await p2.goto('/');await register(p1,`Host_${stamp}`);await register(p2,`Guest_${stamp}`);
  for(const p of [p1,p2]){await p.locator('#online-open').click();await p.locator('#room-code').fill(`RACE-${stamp}`);await p.locator('#room-laps').selectOption('1');await p.locator('#online-submit').click();await expect(p.locator('#race-panel-title')).toHaveText('Ждём участников');}
  await expect(p1.locator('#race-panel-text')).toContainText('2 из 8');await expect(p2.locator('#race-host-start')).toBeHidden();await p1.screenshot({path:'artifacts/friends-lobby.png'});await p1.locator('#race-host-start').click();await expect(p2.locator('#countdown')).toBeVisible();
  await p1.keyboard.down('w');await p1.waitForTimeout(600);expect(await p1.evaluate(()=>window.__motoRace.state.speed)).toBe(0);await expect.poll(()=>p1.evaluate(()=>window.__motoRace.state.speed),{timeout:10000}).toBeGreaterThan(2);await p1.keyboard.up('w');
  const state1=await p1.evaluate(()=>window.__motoRace.roomRace),state2=await p2.evaluate(()=>window.__motoRace.roomRace);expect(state1.startAt).toBe(state2.startAt);expect(state1.phase).toBe('racing');await expect(p2.locator('#lap')).toHaveText('1 / 1');
 }finally{await a.close();await b.close();}
});
