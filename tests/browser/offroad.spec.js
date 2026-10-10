import {test,expect} from '@playwright/test';
async function start(page){await page.goto('/');await page.locator('[data-bike=mt07]').click();await page.locator('[data-track=meadow]').click();await page.locator('#practice-weather').selectOption('snow');await page.locator('#practice-start').click();await expect(page.locator('#hud')).toBeVisible();await expect(page.locator('#countdown')).toBeHidden({timeout:7000});await page.evaluate(()=>{const r=window.__motoRace;r.orcs=[];r.combat.projectiles=[];});}
test('snow verge shows loose surface and time penalty, returning keeps the charge; stunt clears warning',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await start(page);
 await page.evaluate(async()=>{const g=await import('/shared/game.js'),r=window.__motoRace,p=g.trackPoint(.04,r.trackId),yaw=g.trackHeading(.04,r.trackId),d=g.trackData(r.trackId).width/2+4,x=p.x+Math.cos(yaw)*d,z=p.z-Math.sin(yaw)*d;Object.assign(r.state,{x,z,y:g.groundHeight(x,z,r.trackId),yaw:yaw-Math.PI/2,travelYaw:yaw-Math.PI/2,speed:0,hitCooldown:99});r.applyCamera(true);});
 await expect(page.locator('#offroad-feedback')).toContainText('РЫХЛЫЙ СНЕГ');await expect(page.locator('#offroad-feedback')).toContainText('ШТРАФ +3 с',{timeout:3500});await expect(page.locator('#penalty')).toHaveText('+3 с');await expect(page.locator('#route-label')).toContainText('Вернись на трассу');
 await page.evaluate(()=>{window.__motoRace.paused=true;});await page.screenshot({path:'artifacts/offroad-snow-penalty.png'});
 await page.evaluate(async()=>{const g=await import('/shared/game.js'),r=window.__motoRace,p=g.trackPoint(.04,r.trackId);Object.assign(r.state,p,{speed:0,y:g.groundHeight(p.x,p.z,r.trackId)});r.paused=false;});await expect.poll(()=>page.evaluate(()=>window.__motoRace.state.offRoad)).toBe(false);expect(await page.evaluate(()=>window.__motoRace.state.penalty)).toBe(3);await expect(page.locator('#penalty-line')).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.locator('#offroad-feedback')).toBeHidden();await page.locator('#practice-mode').selectOption('stunt');await page.locator('#practice-start').click();await expect(page.locator('#race-mode')).toContainText('СТАНТ');await expect(page.locator('#offroad-feedback')).toBeHidden();expect(errors).toEqual([]);
});
test('rendered road rocks, logs and scenery boulders stop an impact and show health loss',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await start(page);
 const count=await page.evaluate(async()=>{const g=await import('/shared/game.js'),r=window.__motoRace,d=g.trackData(r.trackId);let linked=false;r.world.root.traverse(o=>{if(o.isInstancedMesh&&o.userData.obstacles){linked=o.count===d.SCENERY_ROCKS.length&&o.userData.obstacles.every((p,i)=>p.id===d.SCENERY_ROCKS[i].id&&p.x===d.SCENERY_ROCKS[i].x&&p.z===d.SCENERY_ROCKS[i].z);}});return {linked,n:d.SCENERY_ROCKS.length};});expect(count.linked).toBe(true);expect(count.n).toBeGreaterThan(80);
 for(const kind of ['rock','log','scenery']){
  await page.evaluate(async(kind)=>{const g=await import('/shared/game.js'),r=window.__motoRace,o=g.trackData(r.trackId).OBSTACLES.find(o=>kind==='scenery'?o.scenery&&o.radius>1:!o.scenery&&o.type===kind),z=o.z-o.radius-.7;Object.assign(r.state,{x:o.x,z,y:g.groundHeight(o.x,z,r.trackId),yaw:0,travelYaw:0,speed:18,steer:0,health:100,hitCooldown:0,obstacleContact:null,airborne:false,vy:0});r.paused=false;r.applyCamera(true);},kind);
  await expect.poll(()=>page.evaluate(()=>window.__motoRace.state.health)).toBeLessThan(100);await expect(page.locator('#damage-feedback')).toContainText(kind==='log'?'Бревно: −':'Камень: −');expect(await page.evaluate(()=>window.__motoRace.state.speed)).toBeLessThan(8);await page.evaluate(()=>{window.__motoRace.paused=true;});
 }
 await page.screenshot({path:'artifacts/offroad-scenery-impact.png'});expect(errors).toEqual([]);
});

test('mobile offroad warning stays readable and clear of pedals and settings in portrait and landscape',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage();try{await start(page);
  await page.evaluate(async()=>{const g=await import('/shared/game.js'),r=window.__motoRace,p=g.trackPoint(.04,r.trackId),yaw=g.trackHeading(.04,r.trackId),d=13,x=p.x+Math.cos(yaw)*d,z=p.z-Math.sin(yaw)*d;Object.assign(r.state,{x,z,y:g.groundHeight(x,z,r.trackId),yaw:yaw-Math.PI/2,travelYaw:yaw-Math.PI/2,speed:0});for(let i=0;i<65;i++)g.stepRider(r.state,{},g.STEP,i*g.STEP,[],'snow');r.paused=true;r.updateHUD();r.applyCamera(true);});
  await expect(page.locator('#offroad-feedback')).toContainText('ШТРАФ +3 с');
  for(const [width,height]of [[390,844],[320,640],[844,390]]){await page.setViewportSize({width,height});const alert=await page.locator('#offroad-feedback').boundingBox();expect(alert.x).toBeGreaterThanOrEqual(0);expect(alert.x+alert.width).toBeLessThanOrEqual(width);expect(alert.y+alert.height).toBeLessThan(height);for(const sel of ['[data-control=throttle]','[data-control=left]','#race-settings','#race-pause']){const b=await page.locator(sel).boundingBox();expect(alert.x>=b.x+b.width||alert.x+alert.width<=b.x||alert.y>=b.y+b.height||alert.y+alert.height<=b.y).toBe(true);}}
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/offroad-mobile-warning.png'});
 }finally{await context.close();}
});
