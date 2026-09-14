import { COLS, DIRECTIONS, ROWS, VECTORS, type Point } from './config.ts';

export type Tile = 'floor' | 'wall' | 'crate';
export type Arena = Tile[][];
export const inside = ({ x, y }: Point): boolean => x >= 0 && x < COLS && y >= 0 && y < ROWS;
export const tileAt = (arena: Arena, p: Point): Tile => inside(p) ? arena[p.y][p.x] : 'wall';

export function createArena(random: () => number = Math.random): Arena {
  const arena: Arena = Array.from({ length: ROWS }, (_, y) =>
    Array.from({ length: COLS }, (_, x): Tile =>
      x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1 || (x % 2 === 0 && y % 2 === 0)
        ? 'wall' : 'floor'));
  const safe = new Set(['1,1', '2,1', '1,2', '11,9', '10,9', '11,8']);
  for (let y = 1; y < ROWS - 1; y++) for (let x = 1; x < COLS - 1; x++) {
    if (arena[y][x] === 'floor' && !safe.has(`${x},${y}`) && random() < 0.58) arena[y][x] = 'crate';
  }
  return arena;
}

// The first crate is included, then blocks the ray. Stone walls are never included.
export function blastTiles(arena: Arena, origin: Point, range: number): Point[] {
  const result = [origin];
  for (const direction of DIRECTIONS) {
    const step = VECTORS[direction];
    for (let distance = 1; distance <= range; distance++) {
      const point = { x: origin.x + step.x * distance, y: origin.y + step.y * distance };
      const tile = tileAt(arena, point);
      if (tile === 'wall') break;
      result.push(point);
      if (tile === 'crate') break;
    }
  }
  return result;
}
