export const TILE = 40;
export const DEFAULT_ARENA = { cols: 17, rows: 13 } as const;
export const FUSE_MS = 2000;
export const FLAME_MS = 450;
export type Point = { x: number; y: number };
export type Direction = 'up' | 'down' | 'left' | 'right';
export const VECTORS: Record<Direction, Point> = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 }
};
export const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];
export const key = ({ x, y }: Point): string => `${x},${y}`;
