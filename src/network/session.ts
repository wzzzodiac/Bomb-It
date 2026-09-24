import type { Direction } from '../game/config.ts';
import type { InitialMatchState, MatchState, PublicRoomState } from './types.ts';

export class OnlineSession {
  selfPlayerId: string | null = null;
  room: PublicRoomState | null = null;
  match: InitialMatchState | null = null;
  connected = false;

  join(state: PublicRoomState, selfPlayerId: string): void {
    this.room = state;
    this.selfPlayerId = selfPlayerId;
    this.match = null;
    this.connected = true;
  }
  start(state: InitialMatchState): void { if (this.room?.code === state.roomCode) this.match = state; }
  apply(state: MatchState): boolean {
    if (!this.match || this.match.roomCode !== state.roomCode || state.revision <= this.match.revision) return false;
    this.match = { ...state, arena: this.match.arena };
    return true;
  }
  canStart(): boolean {
    return !!this.room && this.room.status === 'lobby' && this.room.hostPlayerId === this.selfPlayerId &&
      this.room.players.length >= 2 && this.room.players.every(player => player.ready);
  }
  sendDirection(direction: Direction, send: (payload: { direction: Direction }) => void): void {
    if (this.connected && this.match && this.selfPlayerId && this.match.players.some(player => player.id === this.selfPlayerId)) send({ direction });
  }
  disconnect(): void { this.connected = false; }
  clear(): void { this.connected = false; this.selfPlayerId = null; this.room = null; this.match = null; }
}
