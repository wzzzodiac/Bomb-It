import test from 'node:test';
import assert from 'node:assert/strict';
import { allocateSpawns, blastTiles, createArena, safeSpawnTiles, tileAt } from '../src/game/arena.ts';

const COLS = 17, ROWS = 13;

for (let count = 1; count <= 6; count++) test(`allocates ${count} valid safe spawn${count > 1 ? 's' : ''}`, () => {
  const spawns = allocateSpawns(count, COLS, ROWS);
  const arena = createArena({ cols: COLS, rows: ROWS, playerCount: count, random: () => 0 });
  assert.equal(spawns.length, count);
  assert.equal(new Set(spawns.map(({ x, y }) => `${x},${y}`)).size, count);
  for (const spawn of spawns) {
    assert.ok(spawn.x > 0 && spawn.x < COLS - 1 && spawn.y > 0 && spawn.y < ROWS - 1);
    assert.equal(tileAt(arena, spawn), 'floor');
    const safe = safeSpawnTiles(spawn, COLS, ROWS);
    assert.ok(safe.length >= 3, 'spawn has at least two escape tiles');
    for (const point of safe) assert.equal(tileAt(arena, point), 'floor');
  }
});

test('arena dimensions are configurable and classic pillars remain solid', () => {
  const arena = createArena({ cols: 19, rows: 15, playerCount: 6, random: () => 1 });
  assert.equal(arena.length, 15); assert.equal(arena[0].length, 19);
  assert.equal(arena[2][2], 'wall'); assert.equal(arena[0][1], 'wall');
});

test('four blast rays stop at stone and include then stop at crates', () => {
  const arena = createArena({ cols: COLS, rows: ROWS, playerCount: 2, random: () => 1 });
  arena[3][5] = 'crate'; arena[5][3] = 'crate';
  const cells = blastTiles(arena, { x: 5, y: 5 }, 3).map(point => `${point.x},${point.y}`);
  assert.deepEqual(cells, ['5,5','5,4','5,3','5,6','5,7','5,8','4,5','3,5','6,5','7,5','8,5']);
  assert.ok(!cells.includes('5,2')); assert.ok(!cells.includes('2,5'));
});
