import type Phaser from 'phaser';

// Original Scrapyard artwork, baked once into one 512 × 128 atlas.
// No sprite downloads, per-tile vector objects, shaders or particle systems.
export const ART = 'scrapyard';
export const ROBOT_COLORS = [0x56dcb4, 0xf17a88, 0x7ca8ff, 0xffca67, 0xc987f2, 0x75d9f0];
export function tileFrame(tile: string, x: number, y: number): string {
  return tile === 'floor' ? `floor${(x + y) % 2}` : tile;
}

export function prepareArt(scene: Phaser.Scene): void {
  if (scene.textures.exists(ART)) return;
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas artwork requires a 2D context.');
  const frames: string[] = [];
  const box = (x: number, y: number, w: number, h: number, fill: string, radius = 0, stroke?: string) => {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
  };
  const line = (points: number[], color: string, width = 2) => {
    ctx.beginPath(); ctx.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.stroke();
  };
  const disc = (x: number, y: number, r: number, color: string) => {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
  };
  const frame = (name: string, draw: () => void) => {
    const index = frames.length; frames.push(name); ctx.save();
    ctx.translate((index % 8) * 64, Math.floor(index / 8) * 64); ctx.scale(1.6, 1.6); draw(); ctx.restore();
  };
  for (let index = 0; index < 2; index++) frame(`floor${index}`, () => {
    box(0, 0, 40, 40, index ? '#253a42' : '#293e46');
    line([1,39,39,39,39,1], '#172b32', 1); line([3,3,10,3], '#39505a', 1);
    disc(4, 35, .8, '#50666a'); disc(35, 4, .8, '#50666a');
  });
  frame('wall', () => {
    box(0,0,40,40,'#182c34'); box(2,6,36,32,'#10252c',4);
    box(2,2,36,31,'#718d91',4,'#192f37'); box(5,5,30,5,'#a2b5af',2);
    box(6,13,28,16,'#526c73',2); line([9,17,30,17], '#658188',1);
    for (const x of [7,33]) for (const y of [7,27]) disc(x,y,1.4,'#223b45');
    box(14,21,12,3,'#c3c8a4',1);
  });
  frame('crate', () => {
    box(0,0,40,40,'#253a42'); box(3,7,34,31,'#14282d',3);
    box(3,3,34,31,'#b97742',3,'#553a30'); box(6,6,28,7,'#e5b26a',1);
    box(7,15,26,15,'#935a36',1); line([10,17,30,28,30,17,10,28], '#d99953',3);
    line([5,34,35,34], '#6b4835',2);
    for (const x of [7,33]) disc(x,9,1.3,'#543c32');
  });
  ROBOT_COLORS.forEach((color,index) => frame(`robot${index}`, () => {
    const paint = `#${color.toString(16).padStart(6,'0')}`;
    ctx.fillStyle='#10232b99'; ctx.beginPath(); ctx.ellipse(20,34,15,4,0,0,Math.PI*2); ctx.fill();
    box(10,29,7,6,'#132d39',2); box(23,29,7,6,'#132d39',2);
    box(7,19,26,12,paint,3,'#112c39'); box(4,19,5,9,'#c4d5ca',2); box(31,19,5,9,'#c4d5ca',2);
    if(index===0) { line([20,7,20,2],paint,2); disc(20,2,2,'#e0e9c0'); }
    if(index===1 || index===4) { line([10,9,8,3,15,7],paint,3); line([30,9,32,3,25,7],paint,3); }
    if(index===2) { box(4,9,4,9,paint,1); box(32,9,4,9,paint,1); }
    box(8,7,24,17,paint,index===5?8:4,'#112c39');
    box(11,11,18,10,'#122d3e',3);
    if(index===3) { box(7,5,26,6,'#ffe097',3,'#684d28'); box(18,4,4,5,'#fff2c6',1); }
    if(index===1) { line([13,14,16,16,13,18], '#f0f4da',1.5); line([24,14,27,16,24,18], '#f0f4da',1.5); }
    else { box(13,14,4,4,'#e5f8d7',1); box(23,14,4,4,'#e5f8d7',1); }
    box(12,8,9,2,'#ffffff66',1);
    box(16,24,8,7,'#173443',1); ctx.fillStyle='#f2f4db'; ctx.font='bold 6px sans-serif'; ctx.textAlign='center'; ctx.fillText(String(index+1),20,29);
  }));
  frame('bomb', () => {
    ctx.fillStyle='#10232b99'; ctx.beginPath(); ctx.ellipse(20,34,14,4,0,0,Math.PI*2);ctx.fill();
    disc(20,23,13,'#e6c578'); disc(20,22,11,'#172e3d'); disc(16,17,4,'#3d5360');
    box(17,8,6,5,'#e7ad57',1); line([21,9,25,5,29,7], '#ffd884',2);
    disc(30,6,3,'#ff6d47'); disc(30,6,1.5,'#fff5c0');
    box(15,23,10,6,'#d97542',2); line([20,24,20,26], '#fff3be',1.5); disc(20,28,.7,'#fff3be');
  });
  frame('flame', () => {
    box(1,13,38,14,'#ef653d',4); box(13,1,14,38,'#ef653d',4);
    box(3,16,34,8,'#ffc35a',3); box(16,3,8,34,'#ffc35a',3);
    disc(20,20,9,'#fff0ab'); box(17,17,6,6,'#fff9d9',2);
  });
  for (const kind of ['bomb','fire']) frame(`up-${kind}`, () => {
    box(6,7,28,28,'#112936',5); box(6,4,28,28,kind==='bomb'?'#a59aef':'#ffd06a',5,'#ecf0cf');
    if(kind==='bomb') { disc(17,17,6,'#203747');line([17,11,20,8], '#203747',2); }
    else { line([18,8,13,19,19,18,16,25,24,14,18,15,18,8], '#65452d',3); }
    line([26,20,26,26], '#213442',2);line([23,23,29,23], '#213442',2);
  });
  const atlas = scene.textures.addCanvas(ART, canvas);
  if (!atlas) throw new Error('Unable to create artwork atlas.');
  frames.forEach((name,index) => atlas.add(name,0,(index%8)*64,Math.floor(index/8)*64,64,64));
}
