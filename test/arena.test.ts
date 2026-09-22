import test from 'node:test';
import assert from 'node:assert/strict';
import { allocateSpawns, blastTiles, createArena, safeSpawnTiles, tileAt } from '../src/game/arena.ts';
import { canEscapeBomb, dangerTiles, findEscapeDirection } from '../src/game/botLogic.ts';
import { getArenaSizeForPlayerCount, key } from '../src/game/config.ts';

const expectedSizes = [
  { count: 1, cols: 17, rows: 13 }, { count: 2, cols: 17, rows: 13 },
  { count: 3, cols: 21, rows: 17 }, { count: 4, cols: 21, rows: 17 },
  { count: 5, cols: 25, rows: 19 }, { count: 6, cols: 25, rows: 19 }
];

for (const { count, cols, rows } of expectedSizes) test(`selects the preset and allocates ${count} valid safe spawn${count > 1 ? 's' : ''}`, () => {
  assert.deepEqual(getArenaSizeForPlayerCount(count), { cols, rows });
  const spawns = allocateSpawns(count, cols, rows);
  const arena = createArena({ cols, rows, playerCount: count, random: () => 0 });
  assert.equal(arena.length, rows); assert.equal(arena[0].length, cols);
  assert.equal(spawns.length, count);
  assert.equal(new Set(spawns.map(({ x, y }) => `${x},${y}`)).size, count);
  for (const spawn of spawns) {
    assert.ok(spawn.x > 0 && spawn.x < cols - 1 && spawn.y > 0 && spawn.y < rows - 1);
    assert.equal(tileAt(arena, spawn), 'floor');
    const safe = safeSpawnTiles(spawn, cols, rows);
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
  const arena = createArena({ cols: 17, rows: 13, playerCount: 2, random: () => 1 });
  arena[3][5] = 'crate'; arena[5][3] = 'crate';
  const cells = blastTiles(arena, { x: 5, y: 5 }, 3).map(point => `${point.x},${point.y}`);
  assert.deepEqual(cells, ['5,5','5,4','5,3','5,6','5,7','5,8','4,5','3,5','6,5','7,5','8,5']);
  assert.ok(!cells.includes('5,2')); assert.ok(!cells.includes('2,5'));
});

test('bot danger and escape use the shared wall and crate blast rules', () => {
  const arena = createArena({ cols: 17, rows: 13, playerCount: 1, random: () => 1 });
  arena[3][5] = 'crate';
  const bombs = [{ position: { x: 5, y: 5 }, range: 3 }];
  const danger = dangerTiles(arena, bombs);
  assert.ok(danger.has('5,5'), 'own bomb tile is dangerous');
  assert.ok(danger.has('5,3'), 'crate tile is included');
  assert.ok(!danger.has('5,2'), 'crate blocks tiles behind it');
  assert.equal(findEscapeDirection(arena, { x: 5, y: 5 }, bombs), 'down');
});

test('bot refuses a bomb when every escape route is blocked', () => {
  const arena = createArena({ cols: 17, rows: 13, playerCount: 1, random: () => 1 });
  const start = { x: 5, y: 5 };
  const blocked = new Set([{ x: 5, y: 4 }, { x: 5, y: 6 }, { x: 4, y: 5 }, { x: 6, y: 5 }].map(key));
  assert.equal(canEscapeBomb(arena, start, [{ position: start, range: 2 }], blocked), false);
});
