import type Phaser from 'phaser';
import type { Point } from './config.ts';
export const ART = 'bolt-club', BLAST = 'bolt-blast';
export const ROBOT_COLORS = [0x5fe2c4,0xff819b,0x72bfff,0xffce58,0xdbaaef,0xf7f1d4];
export function tileFrame(tile:string,x:number,y:number):string{return tile==='floor'?`floor${(x+y)%2}`:tile;}
// Visual connectivity only: cells still come from blastTiles/the authoritative server.
export function blastMasks(points:Point[]):number[]{
 const cells=new Set(points.map(p=>`${p.x},${p.y}`));
 return points.map(p=>[[0,-1,1],[1,0,2],[0,1,4],[-1,0,8]].reduce((mask,[x,y,bit])=>mask|(cells.has(`${p.x+x},${p.y+y}`)?bit:0),0));
}
export function prepareArt(scene:Phaser.Scene):void{
 for(let i=0;i<6;i++)for(const direction of ['up','right','down','left']){
  const key=`walk-${i}-${direction}`;
  if(!scene.anims.exists(key))scene.anims.create({key,frames:[0,1].map(n=>({key:ART,frame:`bot-${i}-${direction}-${n}`})),duration:110});
 }
 for(let mask=0;mask<16;mask++){const key=`blast-${mask}`;if(!scene.anims.exists(key))scene.anims.create({key,frames:[0,1,2,3].map(n=>({key:BLAST,frame:`blast-${mask}-${n}`})),frameRate:12,repeat:-1});}
}
