import {createRequire}from'node:module';
import{mkdirSync,writeFileSync}from'node:fs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),checks=[],errors=[],output='outputs/visual-qa';mkdirSync(output,{recursive:true});
const check=(v,label)=>{if(!v)throw Error(label);checks.push(label);};
try{for(const [width,height,mobile,motion]of[[1366,768,false,'no-preference'],[390,844,true,'no-preference'],[844,390,true,'reduce']]){
 const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,reducedMotion:motion});await context.addInitScript(()=>localStorage.setItem('bomb-it.nickname','Long Player Name!!'));
 const page=await context.newPage(),requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));await page.goto('http://127.0.0.1:5191/Bomb-It/app/');
 const logo=page.locator('#bolt-logo'),box=await logo.boundingBox();
 if(mobile)await logo.tap();else await logo.hover();await page.waitForFunction(()=>document.querySelector('#bolt-logo').dataset.running==='true');
 check(await page.evaluate(()=>document.querySelector('#bolt-logo').getAnimations({subtree:true}).length===3),'one three-robot sequence '+width);
 await logo.dispatchEvent('click');check(await page.evaluate(()=>document.querySelector('#bolt-logo').getAnimations({subtree:true}).length===3),'rapid click does not stack animations');
 await page.waitForFunction(()=>!document.querySelector('#bolt-logo').dataset.running);check(JSON.stringify(box)===JSON.stringify(await logo.boundingBox()),'logo does not move layout');
 await logo.focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('#bolt-logo').dataset.running);await page.waitForFunction(()=>!document.querySelector('#bolt-logo').dataset.running);check(true,'keyboard replay '+width);
 check(!requests.some(u=>/engine\.ts|phaser|\/atlas\.|\/blast\./.test(u)),'menu does not load game resources '+width);
 await page.screenshot({path:`${output}/bolt-${width}-home.png`});
 await page.evaluate(async()=>{const {GameScene}=await import('/Bomb-It/src/game/GameScene.ts'),create=GameScene.prototype.create;GameScene.prototype.create=function(){window.qaScene=this;create.call(this);};});
 await page.locator('#quick-play').click();await page.waitForFunction(()=>window.qaScene?.players.size===2);
 check(await page.locator('#match-roster li').count()===2,'full-name roster');check(await page.locator('.player-label.self').textContent()==='Long Player Name!!','nickname is not translated');check(await page.locator('.player-label:not(.self)').textContent()==='P2','compact opponent identity');
 await page.evaluate(()=>{const s=window.qaScene;s.controllers.clear();s.renderFlame({x:3,y:3},900,2);});
 check(await page.evaluate(()=>{const flame=window.qaScene.children.list.find(c=>c.texture?.key==='bolt-blast');return flame.alpha===1&&flame.displayWidth===40&&flame.displayHeight===40&&flame.frame.name.startsWith('blast-2-');}),'bounded fully visible comic danger');
 if(motion==='reduce')check(await page.evaluate(()=>!window.qaScene.children.list.find(c=>c.texture?.key==='bolt-blast').anims.isPlaying),'reduced motion keeps static danger');
 await page.screenshot({path:`${output}/bolt-${width}-danger.png`});await page.waitForFunction(()=>!window.qaScene.children.list.some(c=>c.texture?.key==='bolt-blast'));check(true,'no misleading residual danger');
 await context.close();
 }
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await context.addInitScript(()=>localStorage.setItem('bomb-it.nickname','VeryLongNickname18'));const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5191/Bomb-It/app/');
 await page.evaluate(async()=>{const {GameScene}=await import('/Bomb-It/src/game/GameScene.ts'),create=GameScene.prototype.create;GameScene.prototype.create=function(){window.qaScene=this;create.call(this);};});await page.locator('#create-room').click();for(let i=0;i<5;i++)await page.locator('#add-bot').click();await page.locator('#start-match').click();await page.waitForFunction(()=>window.qaScene?.players.size===6);await page.evaluate(()=>window.qaScene.controllers.clear());
 check(await page.locator('.player-label.self').isVisible(),'own nickname visible on the smallest six-player arena');check(await page.locator('#match-roster li').count()===6,'six stable full-name entries');
 await page.evaluate(()=>{const s=window.qaScene;[...s.views.values()].slice(0,3).forEach((v,i)=>{v.x=60+40*i;v.y=60;});});await page.waitForTimeout(150);
 check(await page.evaluate(()=>{const r=[...document.querySelectorAll('.player-label')].filter(l=>getComputedStyle(l).visibility==='visible').map(l=>l.getBoundingClientRect());return r.every((a,i)=>r.slice(i+1).every(b=>a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top));}),'nearby labels do not overlap on light walls and dark floor');await page.screenshot({path:`${output}/bolt-names-six.png`});await context.close();
 const recovery=await browser.newContext({viewport:{width:390,height:844}}),p=await recovery.newPage();await p.addInitScript(()=>localStorage.setItem('bomb-it.nickname','Pilot'));await p.route('**/src/assets/bolt/atlas.png*',r=>r.request().resourceType()==='xhr'?r.abort():r.continue());await p.goto('http://127.0.0.1:5191/Bomb-It/app/');await p.locator('#quick-play').click();await p.locator('#home-notice').filter({hasText:'Game images did not load'}).waitFor();check(await p.locator('#quick-play').isVisible(),'failed atlas download returns to usable menu');await p.unroute('**/src/assets/bolt/atlas.png*');await p.locator('#quick-play').click();await p.waitForFunction(()=>document.body.dataset.screen==='playing'&&document.querySelector('.player-label.self'));check(true,'atlas retry starts a playable scene');await recovery.close();
 check(errors.length===0,'no runtime errors');writeFileSync(`${output}/bolt-ui.json`,JSON.stringify({browser:browser.version(),checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
}finally{await browser.close();}
