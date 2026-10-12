import {test,expect} from '@playwright/test';

test('riding views reveal the accepted Winner, bend preview, reverse sightline and manual look',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/401 \(Unauthorized\)/.test(m.text()))errors.push(m.text());});await page.goto('/');await page.locator('[data-bike=winner]').click();await page.locator('#practice-start').click();await expect(page.locator('#hud')).toBeVisible();
 const views=await page.evaluate(async()=>{
  const r=window.__motoRace,T=await import('/node_modules/three/build/three.module.js');r.paused=true;r.countdownDone=true;r.state.speed=12;
  const results=[];for(const mode of ['chase','sport','orbit','map']){r.cameraMode=mode;r.cameraRig.reset(r.state.yaw);r.applyCamera(true);r.scene.updateMatrixWorld(true);r.camera.updateMatrixWorld(true);const center=r.player.position.clone().add(new T.Vector3(0,.7,0)).project(r.camera);results.push({mode,visible:r.player.visible,center:center.toArray(),offset:r.camera.position.distanceTo(r.player.position)});}
  r.cameraMode='chase';r.cameraRig.reset(r.state.yaw);r.applyCamera(true);r.renderer.render(r.scene,r.camera);return results;
 });for(const v of views){expect(v.visible).toBe(true);expect(Math.abs(v.center[0]),v.mode).toBeLessThan(.85);expect(Math.abs(v.center[1]),v.mode).toBeLessThan(.95);expect(v.center[2]).toBeLessThan(1);}
 await page.screenshot({path:'artifacts/expansion-2026-10-12/camera-winner-chase.png'});
 await page.locator('#camera-toggle').click();expect(await page.evaluate(()=>window.__motoRace.cockpit.visible)).toBe(true);
 await page.locator('#race-settings').click();await page.locator('#riding-camera').selectOption('orbit');await page.locator('#camera-motion').fill('0');await page.locator('[data-close=settings-dialog]').click();
 await page.evaluate(()=>{const r=window.__motoRace;r.paused=false;r.state.speed=0;r.countdownDone=true;r.startAt=0;});
 const before=await page.evaluate(()=>window.__motoRace.camera.position.toArray());await page.mouse.move(700,520);await page.mouse.down();await page.mouse.move(940,510,{steps:12});await page.mouse.up();
 await expect.poll(()=>page.evaluate(()=>Math.abs(window.__motoRace.cameraRig.look))).toBeGreaterThan(.7);await expect.poll(()=>page.evaluate(before=>Math.hypot(...window.__motoRace.camera.position.toArray().map((n,i)=>n-before[i])),before)).toBeGreaterThan(.5);
 await page.screenshot({path:'artifacts/expansion-2026-10-12/camera-winner-side.png'});await page.evaluate(()=>window.dispatchEvent(new Event('blur')));expect(await page.evaluate(()=>window.__motoRace.cameraRig.look)).toBe(0);expect(errors).toEqual([]);
});

test('portrait camera keeps full bike framing and touch look does not latch throttle or steering',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage();try{
  await page.goto('/');await page.locator('[data-bike=winner]').click();await page.locator('#practice-start').click();await expect(page.locator('#hud')).toBeVisible();
  const framing=await page.evaluate(async()=>{
   const r=window.__motoRace,T=await import('/node_modules/three/build/three.module.js');r.paused=true;r.countdownDone=true;r.cameraMode='chase';r.cameraRig.reset(r.state.yaw);r.applyCamera(true);r.player.position.set(r.state.x,r.state.y,r.state.z);r.player.rotation.y=r.state.yaw;r.player.updateMatrixWorld(true);r.camera.updateMatrixWorld(true);
   const corners=[new T.Vector3(-.6,0,-1.2),new T.Vector3(.6,1.9,1.2)].map(v=>r.player.localToWorld(v).project(r.camera));r.renderer.render(r.scene,r.camera);return corners.map(v=>v.toArray());
  });for(const corner of framing){expect(Math.abs(corner[0])).toBeLessThan(.96);expect(Math.abs(corner[1])).toBeLessThan(.96);}
  await page.screenshot({path:'artifacts/expansion-2026-10-12/camera-winner-mobile.png'});
  await page.evaluate(()=>{const r=window.__motoRace;r.paused=false;r.countdownDone=true;r.startAt=0;});const session=await context.newCDPSession(page);
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:160,y:390,id:0}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:270,y:390,id:0}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  expect(await page.evaluate(()=>window.__motoRace.touch.size)).toBe(0);expect(await page.evaluate(()=>window.__motoRace.cameraRig.dragging)).toBe(false);await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));expect(await page.evaluate(()=>window.__motoRace.cameraRig.look)).toBe(0);
 }finally{await context.close();}
});
