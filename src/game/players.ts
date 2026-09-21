import type { Point } from './config.ts';

export type PlayerId = string;
export type ControllerKind = 'local' | 'bot' | 'remote';

export type PlayerState = {
  id: PlayerId;
  name: string;
  position: Point;
  alive: boolean;
  bombCapacity: number;
  fireRange: number;
  activeBombs: number;
  controller: ControllerKind;
  color: number;
};

export const canPlaceBomb = (player: PlayerState): boolean =>
  player.alive && player.activeBombs < player.bombCapacity;

export function claimBomb(player: PlayerState): void {
  if (!canPlaceBomb(player)) throw new Error(`Player ${player.id} cannot place another bomb`);
  player.activeBombs++;
}

export function releaseBomb(player: PlayerState): void {
  player.activeBombs = Math.max(0, player.activeBombs - 1);
}
