import type { PlayerState } from './players.ts';

export type MatchResult =
  | { status: 'ongoing' }
  | { status: 'winner'; winnerId: string }
  | { status: 'draw' };

export function evaluateMatch(players: Iterable<PlayerState>): MatchResult {
  const all = [...players];
  const alive = all.filter(player => player.alive);
  if (all.length <= 1) return alive.length ? { status: 'ongoing' } : { status: 'draw' };
  if (alive.length === 1) return { status: 'winner', winnerId: alive[0].id };
  if (alive.length === 0) return { status: 'draw' };
  return { status: 'ongoing' };
}
