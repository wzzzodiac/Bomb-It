import type { Direction } from '../game/config.ts';
import type { InitialMatchState, MatchExplosion, MatchResult, MatchState, PublicRoomState } from './types.ts';

export class OnlineSession {
  selfPlayerId: string | null = null;
  room: PublicRoomState | null = null;
  match: InitialMatchState | null = null;
  connected = false;
  private lastExplosionRevision = 0;
  private lastResultRevision = 0;

  join(state: PublicRoomState, selfPlayerId: string): void {
    this.room = state;
    this.selfPlayerId = selfPlayerId;
    this.match = null;
    this.lastExplosionRevision = 0; this.lastResultRevision = 0;
    this.connected = true;
  }
  start(state: InitialMatchState): void { if (this.room?.code === state.roomCode) this.match = state; }
  apply(state: MatchState): boolean {
    if (!this.match || this.match.roomCode !== state.roomCode || state.revision <= this.match.revision) return false;
    this.match = { ...state, arena: this.match.arena };
    return true;
  }
  applyExplosion(event: MatchExplosion): boolean {
    if (!this.match || event.roomCode !== this.match.roomCode || event.revision < this.match.revision || event.revision <= this.lastExplosionRevision) return false;
    for (const change of event.changes) {
      if (this.match.arena.tiles[change.y]?.[change.x] === undefined) continue;
      this.match.arena.tiles[change.y][change.x] = change.tile;
    }
    this.lastExplosionRevision = event.revision;
    return true;
  }
  acceptResult(result: MatchResult): boolean {
    if (!this.match || result.roomCode !== this.match.roomCode || result.revision < this.match.revision || result.revision <= this.lastResultRevision) return false;
    this.lastResultRevision = result.revision;
    return true;
  }
  canStart(): boolean {
    return !!this.room && this.room.status === 'lobby' && this.room.hostPlayerId === this.selfPlayerId &&
      this.room.players.length >= 2 && this.room.players.every(player => player.ready);
  }
  sendDirection(direction: Direction, send: (payload: { direction: Direction }) => void): void {
    if (this.canPlay()) send({ direction });
  }
  sendBomb(send: (payload: Record<string, never>) => void): void { if (this.canPlay()) send({}); }
  private canPlay(): boolean { return !!(this.connected && this.match?.status === 'playing' && this.match.players.some(player => player.id === this.selfPlayerId && player.alive)); }
  disconnect(): void { this.connected = false; }
  clear(): void { this.connected = false; this.selfPlayerId = null; this.room = null; this.match = null; this.lastExplosionRevision = 0; this.lastResultRevision = 0; }
}
