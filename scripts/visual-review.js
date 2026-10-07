import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { BIKES,trackPoint,trackHeading,groundHeight } from '../shared/game.js';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--use-angle=metal']});
const results={bikes:[],scenes:[],errors:[],consoleErrors:[],missing:[]};
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>results.errors.push(e.message));page.on('console',msg=>{if(msg.type()==='error'&&!msg.text().includes('401 (Unauthorized)'))results.consoleErrors.push(msg.text());});page.on('response',r=>{if(r.status()>=400&&!r.url().includes('/api/'))results.missing.push(r.url());});
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle'});
 for(const b of BIKES){await page.locator(`[data-bike="${b.id}"]`).click();await page.waitForTimeout(150);await page.locator('.showcase').screenshot({path:`artifacts/model-${b.id}.png`});results.bikes.push(b.id);}
 await page.locator('[data-bike="himalayan"]').click();await page.locator('#practice-start').click();await page.waitForTimeout(3400);
 for(const [name,t]of [['forest',.065],['mud',.225],['orc',.423],['fallen-tree',.348]]){
  const p=trackPoint(t);await page.evaluate(({p,y,yaw,nextGate})=>{const race=window.__motoRace;Object.assign(race.state,{x:p.x,z:p.z,y,yaw,nextGate,speed:0,steer:0,hitCooldown:3});race.cameraMode='chase';race.applyCamera(true);},{p,y:groundHeight(p.x,p.z),yaw:trackHeading(t),nextGate:Math.floor(t*16)+1});await page.waitForTimeout(250);await page.screenshot({path:`artifacts/scene-${name}.png`});
  results.scenes.push({name,...await page.evaluate(()=>({render:window.__motoDebug.renderInfo,shadows:window.__motoRace.renderer.shadowMap.enabled,surface:window.__motoDebug.state.surface,pixelRatio:window.__motoRace.renderer.getPixelRatio()}))});
 }
 await page.locator('#camera-toggle').click();await page.waitForTimeout(250);await page.screenshot({path:'artifacts/cockpit-review.png'});
 await page.waitForTimeout(2500);results.audio=await page.evaluate(()=>{const a=window.__motoRace.audioSystem,data=new Float32Array(a.analyser.fftSize);a.analyser.getFloatTimeDomainData(data);return {state:a.context.state,rms:Math.sqrt(data.reduce((s,v)=>s+v*v,0)/data.length)};});
 writeFileSync('artifacts/visual-review.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
 if(results.errors.length||results.consoleErrors.length||results.missing.length)process.exitCode=1;
}finally{await browser.close();}
