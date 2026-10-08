import {createRequire} from 'node:module';
import {writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({...(process.env.EDGE_EXECUTABLE ? { executablePath:process.env.EDGE_EXECUTABLE } : { channel:'msedge' }),headless:true});
const output=process.env.BOMB_IT_QA_OUT || fileURLToPath(new URL('../outputs/visual-qa/',import.meta.url)),result={checks:[],errors:[]};
mkdirSync(output,{recursive:true});
const check=(value,label)=>{if(!value)throw Error(label);result.checks.push(label);};
try{
 const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>result.errors.push(e.message));
 await page.addInitScript(()=>{Math.random=()=>0;localStorage.setItem('bomb-it.nickname','Art Pilot');});
 await page.goto('http://127.0.0.1:5191/Bomb-It/app/');
 await page.evaluate(async()=>{const {GameScene}=await import('/Bomb-It/src/game/GameScene.ts');const original=GameScene.prototype.create;GameScene.prototype.create=function(){window.qaScene=this;original.call(this);this.controllers.forEach((c,id)=>{if(this.players.get(id).controller==='bot')this.controllers.delete(id);});};});
 await page.locator('#quick-play').click();await page.waitForFunction(()=>window.qaScene?.players.size===2);
 check(await page.evaluate(()=>{const s=window.qaScene,p=s.players.get('local');s.createPowerUpView({x:2,y:1},'bomb');s.movePlayer('local','right');return p.bombCapacity===2&&!s.powerUps.has('2,1');}),'bomb power-up rendered and collected');
 check(await page.evaluate(()=>{const s=window.qaScene,p=s.players.get('local');s.movePlayer('local','left');s.createPowerUpView({x:1,y:2},'fire');s.movePlayer('local','down');return p.fireRange===3&&!s.powerUps.has('1,2');}),'fire power-up rendered and collected');
 await page.locator('#bomb-button').dispatchEvent('pointerdown',{pointerId:3});await page.waitForFunction(()=>window.qaScene.bombs.size===1);
 check(await page.evaluate(()=>{const s=window.qaScene,b=[...s.bombs.values()][0];return s.tweens.getTweensOf(b.body).length===0;}),'reduced motion disables decorative bomb scale tween');
 await page.evaluate(()=>{window.qaScene.movePlayer('local','up');window.qaScene.movePlayer('local','right');});
 await page.waitForFunction(()=>window.qaScene.arena[3][1]==='floor');
 check(await page.evaluate(()=>{const s=window.qaScene;return s.tiles[3][1].frame.name.startsWith('floor')&&s.flames.has('1,3')&&s.powerUps.has('1,3')&&s.players.get('local').alive;}),'crate visual replaced by floor; active flames and authoritative drop; escape survives');
 await page.screenshot({path:`${output}/effects-landscape.png`});
 await page.waitForFunction(()=>window.qaScene.flames.size===0);
 check(await page.evaluate(()=>!window.qaScene.children.list.some(c=>c.texture?.key==='bolt-blast')),'flame sprites removed at damaging lifetime end');
 result.performance=await page.evaluate(async()=>{
  const s=window.qaScene,times=[];let last=performance.now(),start=last;
  const timer=setInterval(()=>{for(let n=0;n<48;n++)s.renderFlame({x:1+n%15,y:1+Math.floor(n/15)},450);},500);
  await new Promise(resolve=>{const frame=now=>{times.push(now-last);last=now;if(now-start<5000)requestAnimationFrame(frame);else resolve();};requestAnimationFrame(frame);});clearInterval(timer);
  times.sort((a,b)=>a-b);return{phaserFps:s.game.loop.actualFps,browserFps:1000/(times.reduce((a,b)=>a+b,0)/times.length),p95FrameMs:times[Math.floor(times.length*.95)],over33ms:times.filter(t=>t>33.4).length,frames:times.length,sceneObjects:s.children.list.length,atlas:{width:s.textures.get('bolt-club').source[0].width,height:s.textures.get('bolt-club').source[0].height},scenario:'48 visual flame cells every 500ms for 5s; desktop Edge mobile emulation; no CPU throttling; no physical phone'};
 });
 await context.close();
 const recovery=await browser.newContext({viewport:{width:390,height:844}}),p=await recovery.newPage();await p.addInitScript(()=>localStorage.setItem('bomb-it.nickname','Pilot'));
 await p.route('**/src/game/engine.ts',route=>route.abort());await p.goto('http://127.0.0.1:5191/Bomb-It/app/');await p.locator('#quick-play').click();await p.locator('#loading-notice').filter({hasText:'Download stopped'}).waitFor();check(await p.locator('#quick-play').isVisible(),'failed renderer download leaves usable menu');
 await p.unroute('**/src/game/engine.ts');await p.reload();await p.locator('#quick-play').click();await p.locator('canvas').waitFor();check(true,'reload recovers interrupted download');await recovery.close();
 check(result.errors.length===0,'no runtime errors in visual fixtures');
 writeFileSync(`${output}/fixtures.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
