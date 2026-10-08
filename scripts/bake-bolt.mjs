import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();await page.setContent('<html><body></body></html>');
 await page.addScriptTag({content:readFileSync(root+'scripts/art/bolt-source.mjs','utf8').replace(/export /g,'')+'\n'+readFileSync(root+'scripts/art/blast-source.mjs','utf8').replace(/export /g,'')+'\nwindow.baked={atlas:bake(concepts[2]),blast:bakeBlast(),frames};'});
 const data=await page.evaluate(()=>({atlas:window.baked.atlas.toDataURL(),blast:window.baked.blast.toDataURL(),frames:window.baked.frames}));mkdirSync(root+'src/assets/bolt',{recursive:true});
 for(const kind of ['atlas','blast']){writeFileSync(root+`src/assets/bolt/${kind}.png`,Buffer.from(data[kind].split(',')[1],'base64'));const names=kind==='atlas'?data.frames:Array.from({length:64},(_,n)=>`blast-${Math.floor(n/4)}-${n%4}`),size=kind==='atlas'?96:64;
  writeFileSync(root+`src/assets/bolt/${kind}.json`,JSON.stringify({frames:Object.fromEntries(names.map((name,n)=>[name,{frame:{x:n%8*size,y:Math.floor(n/8)*size,w:size,h:size},rotated:false,trimmed:false,spriteSourceSize:{x:0,y:0,w:size,h:size},sourceSize:{w:size,h:size}}])),meta:{image:kind+'.png',size:{w:size*8,h:size*8},scale:'1'}}));
 }
 // The menu has its own tiny strip; no game atlas or Phaser is needed on entry.
 const hero=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=384;c.height=128;const ctx=c.getContext('2d');[0,1,3].forEach((i,n)=>{const frame=window.baked.frames.indexOf(`bot-${i}-down-0`);ctx.drawImage(window.baked.atlas,frame%8*96,Math.floor(frame/8)*96,96,96,n*128,0,128,128);});return c.toDataURL();});writeFileSync(root+'src/assets/bolt/menu-crew.png',Buffer.from(hero.split(',')[1],'base64'));
 console.log('Exported original atlas, comic blast and independent menu strip.');
}finally{await browser.close();}
