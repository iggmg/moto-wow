import {test,expect} from '@playwright/test';
test('snow drifts with keyboard steering, HUD warns, and countersteering recovers',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
 await page.locator('[data-track="meadow"]').click();await page.locator('#practice-weather').selectOption('snow');await page.locator('#practice-start').click();await page.waitForTimeout(3300);
 await page.evaluate(async()=>{const {trackPoint,trackHeading,groundHeight}=await import('/shared/game.js');const r=window.__motoRace,p=trackPoint(.06,r.trackId),yaw=trackHeading(.06,r.trackId);Object.assign(r.state,p,{yaw,travelYaw:yaw,speed:18,steer:0,health:100,hitCooldown:100,y:groundHeight(p.x,p.z,r.trackId)});r.orcs=[];r.combat.projectiles=[];r.applyCamera(true);});
 await page.keyboard.down('ArrowRight');await expect.poll(()=>page.evaluate(()=>Math.abs(window.__motoRace.state.slipAngle))).toBeGreaterThan(.12);await page.keyboard.up('ArrowRight');await expect(page.locator('#surface')).toContainText('ЗАНОС');await page.screenshot({path:'artifacts/drift-snow.png'});
 await page.keyboard.down('ArrowLeft');await page.keyboard.down('ArrowDown');await expect.poll(()=>page.evaluate(()=>Math.abs(window.__motoRace.state.slipAngle)),{timeout:4000}).toBeLessThan(.06);await page.keyboard.up('ArrowLeft');await page.keyboard.up('ArrowDown');expect(errors).toEqual([]);
});
test('obstacle impact reduces visible health once and displays the obstacle name',async({page})=>{
 await page.goto('/');await page.locator('#practice-start').click();await page.waitForTimeout(3300);
 const result=await page.evaluate(async()=>{const {trackData,groundHeight,stepRider,STEP}=await import('/shared/game.js'),r=window.__motoRace,o=trackData(r.trackId).OBSTACLES.find(o=>o.type==='rock'),z=o.z-o.radius-.55;r.paused=true;Object.assign(r.state,{x:o.x,z,y:groundHeight(o.x,z,r.trackId),yaw:0,travelYaw:0,speed:22,health:100,hits:0,hitCooldown:0,obstacleContact:null,airborne:false});r.damageHits=0;stepRider(r.state,{},STEP,r.gameTime,[]);r.updateHUD();const health=r.state.health;for(let i=0;i<180;i++)stepRider(r.state,{throttle:1},STEP,r.gameTime+i*STEP,[]);r.updateHUD();r.applyCamera(true);return {health,after:r.state.health,hits:r.state.hits};});
 expect(result.health).toBeLessThan(100);expect(result.after).toBe(result.health);expect(result.hits).toBe(1);await expect(page.locator('#health-value')).toHaveText(String(result.health));await expect(page.locator('#damage-feedback')).toContainText('Камень: −');await page.screenshot({path:'artifacts/impact-health.png'});
});
