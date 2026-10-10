import {test,expect} from '@playwright/test';
test('repeated races release old motorcycle GPU geometry rather than growing memory each restart',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.locator('[data-track=meadow]').click();await page.locator('#practice-start').click();await expect(page.locator('#hud')).toBeVisible();await page.waitForTimeout(250);
 const counts=await page.evaluate(async()=>{const r=window.__motoRace,counts=[];for(let n=0;n<5;n++){await r.start('cub');await new Promise(resolve=>setTimeout(resolve,150));counts.push(r.renderer.info.memory.geometries);}return counts;});
 expect(Math.max(...counts)-Math.min(...counts)).toBeLessThanOrEqual(5);expect(errors).toEqual([]);
});

test('finish HUD waits for forward finish-line crossing; parking and reverse travel cannot submit a local lap',async({page})=>{
 await page.goto('/');await page.locator('[data-track=meadow]').click();await page.locator('#practice-laps').selectOption('1');await page.locator('#practice-start').click();await expect(page.locator('#hud')).toBeVisible();await expect.poll(()=>page.evaluate(()=>window.__motoRace.running&&window.__motoRace.state.raceTime>0),{timeout:7000}).toBe(true);
 await page.evaluate(async()=>{const {trackData,trackHeading,groundHeight}=await import('/shared/game.js'),r=window.__motoRace,g=trackData('meadow').GATES[0],yaw=trackHeading(0,'meadow');r.orcs=[];Object.assign(r.state,{x:g.x,z:g.z,y:groundHeight(g.x,g.z,'meadow'),yaw,travelYaw:yaw,speed:0,steer:0,airborne:false,hitCooldown:99,nextGate:16,lapTime:40,raceTime:40});r.applyCamera(true);});
 await page.waitForTimeout(250);await expect(page.locator('#race-panel')).toBeHidden();expect(await page.evaluate(()=>window.__motoRace.state.completed)).toBe(0);
 await page.evaluate(async()=>{const {trackData,trackHeading}=await import('/shared/game.js'),s=window.__motoRace.state,g=trackData('meadow').GATES[0],yaw=trackHeading(0,'meadow');Object.assign(s,{x:g.x+Math.sin(yaw)*.04,z:g.z+Math.cos(yaw)*.04,yaw:yaw+Math.PI,travelYaw:yaw+Math.PI,speed:6});});
 await expect(page.locator('#route-label')).toContainText('против хода');expect(await page.evaluate(()=>window.__motoRace.state.completed)).toBe(0);
 await page.evaluate(async()=>{const {trackData,trackHeading,groundHeight}=await import('/shared/game.js'),s=window.__motoRace.state,g=trackData('meadow').GATES[0],yaw=trackHeading(0,'meadow'),x=g.x-Math.sin(yaw)*.08,z=g.z-Math.cos(yaw)*.08;Object.assign(s,{x,z,y:groundHeight(x,z,'meadow'),yaw,travelYaw:yaw,speed:6,steer:0});window.__motoRace.applyCamera(true);});
 await expect(page.locator('#race-panel')).toBeVisible();await expect(page.locator('#race-panel-title')).toHaveText('Финиш!');expect(await page.evaluate(()=>window.__motoRace.state.completed)).toBe(1);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('moto-laps')).length)).toBe(1);await page.screenshot({path:'artifacts/mechanics-finish.png'});
});

test('garage releases previous display-bike geometry while repeated selections remain renderable',async({page})=>{
 await page.goto('/');const counts=await page.evaluate(async()=>{const {Showcase}=await import('/src/showcase.js'),canvas=document.createElement('canvas');canvas.style.cssText='width:200px;height:200px';document.body.append(canvas);const view=new Showcase(canvas),counts=[];try{for(let n=0;n<5;n++){view.select('cub');view.renderer.render(view.scene,view.camera);counts.push(view.renderer.info.memory.geometries);}return counts;}finally{view.renderer.setAnimationLoop(null);view.resizeObserver.disconnect();view.renderer.dispose();canvas.remove();}});expect(Math.max(...counts)-Math.min(...counts)).toBeLessThanOrEqual(1);
});
