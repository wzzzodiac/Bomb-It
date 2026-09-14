import test from 'node:test';
import assert from 'node:assert/strict';
import { blastTiles, createArena } from '../src/game/arena.ts';

test('spawns and classic stone pillars stay clear', () => {
  const map = createArena(() => 0);
  for (const [x, y] of [[1,1],[2,1],[1,2],[11,9],[10,9],[11,8]]) assert.equal(map[y][x], 'floor');
  assert.equal(map[2][2], 'wall'); assert.equal(map[0][1], 'wall');
});
test('four rays stop at stone and include then stop at crates', () => {
  const map = createArena(() => 1);
  map[3][5] = 'crate'; map[5][3] = 'crate';
  const cells = blastTiles(map, { x: 5, y: 5 }, 3).map(p => `${p.x},${p.y}`);
  assert.deepEqual(cells, ['5,5','5,4','5,3','5,6','5,7','5,8','4,5','3,5','6,5','7,5','8,5']);
  assert.ok(!cells.includes('5,2')); assert.ok(!cells.includes('2,5'));
});
