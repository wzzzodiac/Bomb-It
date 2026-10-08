import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({...(process.env.EDGE_EXECUTABLE ? { executablePath:process.env.EDGE_EXECUTABLE } : { channel:'msedge' }),headless:true});
const evidence=[],errors=[];
const base=process.env.BOMB_IT_TEST_URL || 'http://127.0.0.1:5191/Bomb-It/app/';
const output=process.env.BOMB_IT_QA_OUT || fileURLToPath(new URL('../outputs/visual-qa/',import.meta.url));
mkdirSync(output,{recursive:true});
function check(value,label){if(!value)throw Error(label);evidence.push(label);}
async function instrument(page){await page.evaluate(async root=>{const {GameScene}=await import(`${root}src/game/GameScene.ts`);const original=GameScene.prototype.create;GameScene.prototype.create=function(){window.qaScene=this;return original.call(this);};},new URL('../',base).pathname);}
async function open(width,height,mobile=false,name='Pilot'){
 const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1}); const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.locator('#nickname').fill(name);await page.locator('#profile-form button').click();await instrument(page);return{page,context};
}
async function layout(page,cols,rows){const result=await page.evaluate(()=>{const c=document.querySelector('canvas'),r=c.getBoundingClientRect(),t=document.querySelector('.controls').getBoundingClientRect();return{width:c.width,height:c.height,ratio:r.width/r.height,visible:r.top>=0&&r.left>=0&&r.bottom<=innerHeight+1&&r.right<=innerWidth+1,scroll:document.documentElement.scrollHeight>innerHeight,overlap:t.width>0&&!(t.right<=r.left||t.left>=r.right||t.bottom<=r.top||t.top>=r.bottom)};});check(result.width===cols*40&&result.height===rows*40,'logical arena '+cols+'x'+rows);check(Math.abs(result.ratio-cols/rows)<.006,'preserved aspect ratio');check(result.visible&&!result.scroll&&!result.overlap,'full arena; no scroll or control overlap');}
try{
 for(const [width,height,mobile,count] of (process.argv[2]==='online'?[]:[[1920,1080,false,2],[1366,768,false,4],[390,844,true,6],[844,390,true,2],[667,375,true,6],[320,568,true,4]])){
  const {page,context}=await open(width,height,mobile,'Long Mobile Pilot');
  await page.locator('#create-room').click();for(let i=1;i<count;i++)await page.locator('#add-bot').click();check(await page.locator('#slots .occupied').count()===count,'lobby bots '+count);
  await page.locator('#start-match').click();await page.waitForFunction(()=>window.qaScene?.players?.size>0);
  const initial=await page.evaluate(()=>[...window.qaScene.players.values()].filter(p=>p.controller==='bot').map(p=>({...p.position})));
  await page.waitForFunction(initial=>[...window.qaScene.players.values()].filter(p=>p.controller==='bot').some((p,i)=>p.position.x!==initial[i].x||p.position.y!==initial[i].y),initial);
  check(true,'bots moving at '+width+'x'+height);
  const dimensions=count<=2?[17,13]:count<=4?[21,17]:[25,19];console.log('layout',width,height,dimensions);await layout(page,...dimensions);
  await page.screenshot({path:join(output,`smoke-${width}-match.png`)});
  await page.evaluate(()=>{window.qaScene.controllers.forEach((c,id)=>{if(window.qaScene.players.get(id).controller==='bot')window.qaScene.controllers.delete(id);});});
  const start=await page.evaluate(()=>({...window.qaScene.players.get('local').position}));
  if(mobile){await page.locator('[data-direction=right]').dispatchEvent('pointerdown',{pointerId:1});await page.waitForFunction(start=>window.qaScene.players.get('local').position.x!==start.x,start);await page.evaluate(()=>dispatchEvent(new PointerEvent('pointerup',{pointerId:1})));}
  else{await page.keyboard.down('ArrowRight');await page.waitForFunction(start=>window.qaScene.players.get('local').position.x!==start.x,start);await page.keyboard.up('ArrowRight');}
  check(true,mobile?'touch movement':'keyboard movement');
  if(mobile)await page.locator('#bomb-button').dispatchEvent('pointerdown',{pointerId:2});else await page.keyboard.down('Space');
  await page.waitForFunction(()=>window.qaScene.bombs.size>0);if(!mobile)await page.keyboard.up('Space');check(true,mobile?'touch bomb':'keyboard bomb');
  await page.waitForFunction(()=>!window.qaScene.players.get('local').alive,null,{timeout:5000});check(true,'bomb / flame death');
  if(count>2){await context.close();continue;}
  await page.waitForFunction(()=>document.body.dataset.screen==='results',null,{timeout:5000});check(true,'results reachable');
  await page.screenshot({path:join(output,`smoke-${width}-results.png`)});
  await page.locator('#play-again').click();await page.waitForFunction(()=>document.body.dataset.screen==='playing'&&window.qaScene.players.get('local').alive);check(true,'local replay');
  await context.close();
 }
 // Two actual browser clients against unchanged local authoritative backend.
 const a=await open(1366,768,false,'Twin'),b=await open(844,390,true,'Twin');
 await a.page.locator('#online-home').click();await a.page.locator('#online-create').click();await a.page.locator('#online-room-code').waitFor();const code=await a.page.locator('#online-room-code').textContent();
 await b.page.locator('#online-home').click();await b.page.locator('#online-code').fill(code);await b.page.locator('#online-join').click();await b.page.locator('#online-room-code').waitFor();
 await a.page.locator('#online-ready').click();await b.page.locator('#online-ready').click();await a.page.locator('#online-start').click();
 await a.page.bringToFront();await a.page.waitForFunction(()=>window.qaScene?.onlineReady);await b.page.bringToFront();await b.page.waitForFunction(()=>window.qaScene?.onlineReady);
 const selfA=await a.page.evaluate(()=>window.qaScene.options.online.selfPlayerId),selfB=await b.page.evaluate(()=>window.qaScene.options.online.selfPlayerId);check(selfA!==selfB,'duplicate nickname membership identity');
 await a.page.keyboard.down('ArrowRight');await a.page.waitForFunction(id=>window.qaScene.players.get(id).position.x>1,selfA);await a.page.keyboard.up('ArrowRight');
 const point=await a.page.evaluate(id=>({...window.qaScene.players.get(id).position}),selfA);await b.page.waitForFunction(({id,point})=>{const p=window.qaScene.players.get(id);return p.position.x===point.x&&p.position.y===point.y;},{id:selfA,point});check(true,'two clients authoritative movement');
 await a.page.keyboard.down('Space');await a.page.waitForFunction(()=>window.qaScene.onlineBombs.size>0);await a.page.keyboard.up('Space');await b.page.waitForFunction(()=>window.qaScene.onlineBombs.size>0);check(true,'online bomb replicated');
 await a.page.waitForFunction(()=>document.body.dataset.screen==='results',null,{timeout:6000});await b.page.waitForFunction(()=>document.body.dataset.screen==='results',null,{timeout:6000});check(true,'online explosion/death/results both clients');
 await a.page.locator('#play-again').click();await b.page.locator('#online-ready').waitFor();check(await b.page.locator('#online-room-code').textContent()===code,'same-room replay reset');
 await a.page.locator('#online-leave').click();await b.page.locator('#online-leave').click();await a.context.close();await b.context.close();
 check(errors.length===0,'no browser runtime errors');
 console.log(JSON.stringify({browser:browser.version(),evidence,errors},null,2));writeFileSync(join(output,'smoke.json'),JSON.stringify({browser:browser.version(),evidence,errors},null,2));
}finally{await browser.close();}
