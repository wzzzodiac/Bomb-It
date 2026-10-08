import { createServer } from 'node:http';
import { readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const repo = resolve(process.argv[2] || process.cwd()), label = process.argv[3] || 'after';
const output = process.env.BOMB_IT_QA_OUT || fileURLToPath(new URL('../outputs/visual-qa/', import.meta.url));
mkdirSync(output, { recursive: true });
const server = createServer((req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/Bomb-It\//, '');
    const path = join(repo, pathname || 'index.html');
    if (!path.startsWith(repo) || !statSync(path).isFile()) throw Error();
    const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' }[extname(path)] || 'application/octet-stream';
    let body = readFileSync(path);
    res.setHeader('Content-Type', mime); res.setHeader('Cache-Control', 'no-store');
    if (/text|javascript|svg/.test(mime)) { body = gzipSync(body); res.setHeader('Content-Encoding', 'gzip'); }
    res.setHeader('Content-Length', body.length); res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(5188, '127.0.0.1', resolve));
const browser = await chromium.launch({ ...(process.env.EDGE_EXECUTABLE ? { executablePath:process.env.EDGE_EXECUTABLE } : { channel:'msedge' }), headless: true });
const report = { label, browser: browser.version(), conditions: 'cold context; cache disabled; gzip HTML/JS/CSS; 1.6 Mbps down / 750 Kbps up; 150 ms latency; no CPU throttle; Edge desktop emulation, not a real phone', viewports: [] };
try {
  for (const [width, height, mobile] of [[1366,768,false],[390,844,true],[844,390,true]]) {
    const context = await browser.newContext({ viewport: { width,height }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
    await context.addInitScript(() => { localStorage.setItem('bomb-it.nickname', 'Scrap Pilot'); Math.random=()=>0.5; });
    const page = await context.newPage(); const errors=[]; page.on('pageerror', error=>errors.push(error.message));
    const cdp = await context.newCDPSession(page); await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled:true });
    await cdp.send('Network.emulateNetworkConditions', { offline:false, latency:150, downloadThroughput:200000, uploadThroughput:93750, connectionType:'cellular4g' });
    let bytes=0, streamed=0; const requests=[];
    cdp.on('Network.requestWillBeSent', event=>requests.push({url:event.request.url,type:event.type}));
    cdp.on('Network.dataReceived', event=>{streamed+=event.encodedDataLength;});
    cdp.on('Network.loadingFinished', event => { bytes += event.encodedDataLength; });
    const start=Date.now(); await page.goto('http://127.0.0.1:5188/Bomb-It/'); await page.locator('#quick-play').waitFor();
    const homeMs=Date.now()-start, homeBytes=bytes;
    await page.screenshot({path:join(output,`${label}-${width}-home.png`)});
    const clickStart=Date.now(); await page.locator('#quick-play').click(); await page.locator('canvas').waitFor();
    const matchDelayMs=Date.now()-clickStart;
    const playMs=Date.now()-start;
    await page.screenshot({path:join(output,`${label}-${width}-match.png`)});
    const frame = await page.evaluate(async () => {
      const times=[]; await new Promise(resolve=>{ let previous=performance.now(),start=previous; const step=now=>{times.push(now-previous);previous=now; if(now-start<1000)requestAnimationFrame(step);else resolve();};requestAnimationFrame(step); });
      const canvas=document.querySelector('canvas'); const rect=canvas.getBoundingClientRect(); const controls=document.querySelector('.controls').getBoundingClientRect();
      return { fps:1000/(times.reduce((a,b)=>a+b,0)/times.length), slowFrames:times.filter(t=>t>33.4).length, frames:times.length, canvas:{width:canvas.width,height:canvas.height,visibleWidth:rect.width,visibleHeight:rect.height}, overlap:!(controls.right<=rect.left||controls.left>=rect.right||controls.bottom<=rect.top||controls.top>=rect.bottom), scroll:document.documentElement.scrollHeight>innerHeight, bomb:document.querySelector('#bomb-button').getBoundingClientRect().width };
    });
    report.viewports.push({width,height,homeMs,playMs,matchDelayMs,homeBytes,completedRequestsBytes:bytes,streamedBodyBytes:streamed,requests:requests.filter(r=>r.url.startsWith('http')),errors,...frame});
    await context.close();
  }
  writeFileSync(join(output,`${label}.json`),JSON.stringify(report,null,2)); console.log(JSON.stringify(report,null,2));
} finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
