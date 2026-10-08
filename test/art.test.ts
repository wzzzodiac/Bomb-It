import assert from 'node:assert/strict';
import test from 'node:test';
import type Phaser from 'phaser';
import { ART, prepareArt, ROBOT_COLORS, tileFrame } from '../src/game/art.ts';

test('tile art preserves semantic tiles and only alternates floor decoration', () => {
  assert.equal(tileFrame('wall', 2, 2), 'wall');
  assert.equal(tileFrame('crate', 3, 1), 'crate');
  assert.equal(tileFrame('floor', 2, 2), 'floor0');
  assert.equal(tileFrame('floor', 2, 3), 'floor1');
  assert.equal(new Set(ROBOT_COLORS).size, 6);
});

test('original atlas has fourteen bounded frames and is generated only once per texture manager', () => {
  const previous = globalThis.document;
  const frames: Array<{ name: string; x: number; y: number; width: number; height: number }> = [];
  const context = new Proxy({}, { get: () => () => undefined, set: () => true });
  const canvas = { width: 0, height: 0, getContext: () => context };
  let generated = false, calls = 0;
  const scene = { textures: {
    exists: (name: string) => name === ART && generated,
    addCanvas: (name: string, source: typeof canvas) => {
      assert.equal(name, ART); assert.equal(source.width, 512); assert.equal(source.height, 128);
      generated = true; calls++;
      return { add: (name: string, _source: number, x: number, y: number, width: number, height: number) => frames.push({ name, x, y, width, height }) };
    }
  } } as unknown as Phaser.Scene;
  try {
    globalThis.document = { createElement: () => canvas } as unknown as Document;
    prepareArt(scene); prepareArt(scene);
    assert.equal(calls, 1); assert.equal(frames.length, 14);
    assert.equal(new Set(frames.map(frame => frame.name)).size, 14);
    for (const frame of frames) { assert.ok(frame.x + frame.width <= 512); assert.ok(frame.y + frame.height <= 128); }
    assert.ok(['wall', 'crate', 'bomb', 'flame', 'up-bomb', 'up-fire', 'robot5'].every(name => frames.some(frame => frame.name === name)));
  } finally { globalThis.document = previous; }
});
