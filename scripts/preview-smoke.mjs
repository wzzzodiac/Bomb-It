import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base='https://wzzzodiac.github.io/Bomb-It-Preview/bolt-club/';
const browser=await chromium.launch({channel:'msedge',headless:true}),checks=[],errors=[];
const check=(v,label)=>{if(!v)throw Error(label);checks.push(label);};
async function open(width,height,mobile){
 const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
 await page.locator('#nickname').fill('Twin');await page.locator('#profile-form button').click();return {context,page};
}
try{
 const a=await open(1366,768,false),b=await open(844,390,true);
 const logo=a.page.locator('#bolt-logo');await logo.focus();await a.page.keyboard.press('Space');await a.page.waitForFunction(()=>document.querySelector('#bolt-logo').dataset.running);await a.page.waitForFunction(()=>!document.querySelector('#bolt-logo').dataset.running);check(true,'native Space replays finite logo');
 await b.page.locator('#bolt-logo').tap();await b.page.waitForFunction(()=>document.querySelector('#bolt-logo').dataset.running);await b.page.waitForFunction(()=>!document.querySelector('#bolt-logo').dataset.running);check(true,'mobile tap replays logo');
 await b.page.locator('#quick-play').click();await b.page.waitForFunction(()=>document.querySelectorAll('#match-roster li').length===2&&document.querySelector('#loading-notice').hidden);
 check(await b.page.locator('.player-label.self').textContent()==='Twin','live Quick Play loads original nickname');
 await b.page.screenshot({path:'outputs/visual-qa/preview-match.png'});
 await b.page.locator('[data-direction=right]').dispatchEvent('pointerdown',{pointerId:1});await b.page.waitForTimeout(180);await b.page.evaluate(()=>dispatchEvent(new PointerEvent('pointerup',{pointerId:1})));
 await b.page.locator('#bomb-button').dispatchEvent('pointerdown',{pointerId:2});await b.page.evaluate(()=>dispatchEvent(new PointerEvent('pointerup',{pointerId:2})));
 await b.page.waitForFunction(()=>document.body.dataset.screen==='results',null,{timeout:12000});check(true,'live touch bomb and local results');await b.page.reload();await b.page.locator('#online-home').waitFor();
 await a.page.locator('#online-home').click();await a.page.locator('#online-create').click();await a.page.locator('#online-room-code').waitFor();const code=await a.page.locator('#online-room-code').textContent();
 await b.page.locator('#online-home').click();await b.page.locator('#online-code').fill(code);await b.page.locator('#online-join').click();await b.page.locator('#online-room-code').waitFor();
 await a.page.locator('#online-ready').click();await b.page.locator('#online-ready').click();await a.page.locator('#online-start').click();
 for(const p of[a.page,b.page])await p.waitForFunction(()=>document.querySelectorAll('#match-roster li').length===2&&document.querySelector('#loading-notice').hidden);
 check(true,'public preview two-client online match with duplicate nicknames');await a.page.bringToFront();await a.page.keyboard.down('Space');await a.page.waitForTimeout(250);await a.page.keyboard.up('Space');
 for(const p of[a.page,b.page])await p.waitForFunction(()=>document.body.dataset.screen==='results',null,{timeout:10000});check(true,'public backend bomb death and results on both clients');
 await a.page.locator('#play-again').click();await b.page.locator('#online-ready').waitFor();check(await b.page.locator('#online-room-code').textContent()===code,'live same-room replay');
 await a.page.locator('#online-leave').click();await b.page.locator('#online-leave').click();
 const gallery=await a.page.goto(base+'comparison/');check(gallery.status()===200,'comparison accessible');await a.page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));check(true,'all comparison images load');
 check(errors.length===0,'no browser runtime errors');
 const report={url:base,browser:browser.version(),checks,errors,physicalPhone:false};writeFileSync('docs/bolt-club/evidence/preview-smoke.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
