import express from 'express';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const app=express();app.use('/moto-wow',express.static('dist'));app.use((_req,res)=>res.status(404).json({error:'Static site: no online backend'}));
const server=createServer(app);server.listen(0,'127.0.0.1');await once(server,'listening');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--use-angle=metal']});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().includes('/api/'))missing.push(r.url());});
  await page.goto(`http://127.0.0.1:${server.address().port}/moto-wow/`,{waitUntil:'networkidle'});
  await page.locator('#bike-selection button').first().waitFor();assert.equal(await page.evaluate(()=>!!window.__motoDebug||!!window.__motoRace),false);
  assert((await page.locator('#backend-status').textContent()).includes('не подключён'));
  await page.locator('#practice-start').click();await page.waitForTimeout(3200);await page.keyboard.down('w');await page.waitForFunction(()=>Number(document.getElementById('speed').textContent)>18);await page.keyboard.up('w');await page.screenshot({path:'artifacts/static-github-pages.png'});
  const loaded=await page.evaluate(()=>({loadedGLB:performance.getEntriesByType('resource').some(r=>r.name.includes('/models/cub.glb')),speed:Number(document.getElementById('speed').textContent)}));assert(loaded.loadedGLB);assert.equal(missing.length,0);assert.equal(errors.length,0);console.log(JSON.stringify({staticSubpath:'/moto-wow/',backend:false,...loaded,errors,missing}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
