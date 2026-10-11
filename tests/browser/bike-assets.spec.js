import {test,expect} from '@playwright/test';

test('all six published models load in chase and cockpit without disappearing material groups',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
 for(const id of ['cub','exciter','himalayan','winner','pcx','mt07']){
  await page.locator(`[data-bike="${id}"]`).click();await page.locator('#practice-start').click();await expect(page.locator('#hud')).toBeVisible();
  const info=await page.evaluate(async()=>{
   const r=window.__motoRace,T=await import('/node_modules/three/build/three.module.js');r.paused=true;r.player.rotation.y=0;r.player.updateMatrixWorld(true);
   const models=[r.player,r.cockpit].map(root=>{const size=new T.Box3().setFromObject(root,true).getSize(new T.Vector3());let bodyTriangles=0;root.userData.body.traverse(o=>{if(o.isMesh&&o.parent?.name!=='Rider')bodyTriangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});return {loaded:root.userData.ownedMaterials,bodyTriangles,size:size.toArray(),rider:root.getObjectByName('Rider').visible,wheels:root.userData.wheels.map(w=>w.children.length)};});
   r.cameraMode='chase';r.applyCamera(true);r.renderer.render(r.scene,r.camera);return models;
  });
  expect(info.every(m=>m.loaded&&m.bodyTriangles>30000&&m.wheels.every(n=>n>0))).toBe(true);expect(info[0].rider).toBe(true);expect(info[1].rider).toBe(false);expect(info[0].size[2]).toBeGreaterThan(1.65);expect(info[0].size[2]).toBeLessThan(2.85);
  await page.screenshot({path:`artifacts/bike-game-${id}.png`});await page.locator('#camera-toggle').click();await expect.poll(()=>page.evaluate(()=>window.__motoRace.cockpit.visible)).toBe(true);await page.locator('#race-exit').click();
 }
 expect(errors).toEqual([]);
});

test('exit during model loading does not resurrect a race or leave stale models attached',async({page})=>{
 await page.goto('/');const result=await page.evaluate(async()=>{
  const r=window.__motoRace,original=r.createModel.bind(r);let release;const barrier=new Promise(resolve=>release=resolve);r.createModel=async(...args)=>{await barrier;return original(...args);};
  const pending=r.start('pcx');await new Promise(resolve=>setTimeout(resolve,40));r.exit();release();await pending;r.createModel=original;
  return {running:r.running,racing:document.body.classList.contains('racing'),garage:!document.querySelector('#garage').hidden};
 });expect(result).toEqual({running:false,racing:false,garage:true});
 await page.locator('[data-bike="mt07"]').click();await page.locator('#practice-mode').selectOption('stunt');await page.locator('#practice-start').click();await expect(page.locator('#hud')).toBeVisible();expect(await page.evaluate(()=>window.__motoRace.player.userData.ownedMaterials)).toBe(true);
});
