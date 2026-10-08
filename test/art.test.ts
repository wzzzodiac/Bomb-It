import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import type Phaser from 'phaser';
import { ART, BLAST, blastMasks, prepareArt, ROBOT_COLORS, tileFrame } from '../src/game/art.ts';
test('tile art preserves blockers, destructibles and floor semantics',()=>{
 assert.equal(tileFrame('wall',2,2),'wall');assert.equal(tileFrame('crate',3,1),'crate');
 assert.equal(tileFrame('floor',2,2),'floor0');assert.equal(tileFrame('floor',2,3),'floor1');assert.equal(new Set(ROBOT_COLORS).size,6);
});
test('baked original atlases have bounded frames and complete six-player orientations',()=>{
 for(const [file,size,count]of [['atlas',768,63],['blast',512,64]] as const){
  const atlas=JSON.parse(readFileSync(new URL(`../src/assets/bolt/${file}.json`,import.meta.url),'utf8'));
  assert.equal(Object.keys(atlas.frames).length,count);
  for(const {frame}of Object.values(atlas.frames) as {frame:{x:number;y:number;w:number;h:number}}[])assert.ok(frame.x>=0&&frame.y>=0&&frame.x+frame.w<=size&&frame.y+frame.h<=size);
  if(file==='atlas')for(let i=0;i<6;i++){for(const d of ['up','right','down','left'])for(let step=0;step<2;step++)assert.ok(atlas.frames[`bot-${i}-${d}-${step}`]);assert.ok(atlas.frames[`react-${i}`]);}
 }
});
test('animations are cached; blast remains looping until its authoritative removal',()=>{
 const definitions=new Map<string,{repeat?:number;frames:{key:string}[]}>();const scene={anims:{exists:(key:string)=>definitions.has(key),create:(data:{key:string;frames:{key:string}[]})=>definitions.set(data.key,data)}} as unknown as Phaser.Scene;
 prepareArt(scene);prepareArt(scene);assert.equal(definitions.size,40);
 assert.equal(definitions.get('blast-15')?.repeat,-1);assert.equal(definitions.get('blast-15')?.frames[0].key,BLAST);
 assert.equal(definitions.get('walk-5-left')?.frames[0].key,ART);
});
test('comic connectivity uses supplied hazard cells only, never extends a blast',()=>{
 const points=[{x:3,y:3},{x:3,y:2},{x:4,y:3},{x:3,y:4},{x:2,y:3}];
 assert.deepEqual(blastMasks(points),[15,4,8,1,2]);assert.deepEqual(blastMasks([{x:1,y:1}]),[0]);
 assert.deepEqual(blastMasks([{x:1,y:1},{x:3,y:1}]),[0,0]);
});
