import { tileAt, type Arena } from '../game/arena.ts';
import { VECTORS, key, type Direction, type Point } from '../game/config.ts';
import type { InputAck, MatchState } from './types.ts';

type PendingMove = { id: number; direction: Direction; acceptedRevision?: number };

// Visual-only prediction. MatchState and the arena remain the authoritative source.
export class OnlinePrediction {
  private state: MatchState;
  private pending: PendingMove[] = [];
  private nextId = 1;
  private readonly maxPending = 8;
  private readonly arena: Arena;
  private readonly selfPlayerId: string;

  constructor(initial: MatchState, arena: Arena, selfPlayerId: string) {
    this.state = initial;
    this.arena = arena;
    this.selfPlayerId = selfPlayerId;
  }

  get pendingCount(): number { return this.pending.length; }
  get visualPosition(): Point | null {
    const self = this.state.players.find(player => player.id === this.selfPlayerId);
    if (!self) return null;
    let point = self.position;
    for (const move of this.pending) {
      const step = VECTORS[move.direction];
      const next = { x: point.x + step.x, y: point.y + step.y };
      if (this.canPredict(next)) point = next;
    }
    return point;
  }

  predict(direction: Direction): { id: number; target: Point } | null {
    if (this.pending.length >= this.maxPending) return null;
    const self = this.state.players.find(player => player.id === this.selfPlayerId);
    const from = this.visualPosition;
    if (!self?.alive || !from || this.state.status !== 'playing') return null;
    const step = VECTORS[direction];
    const target = { x: from.x + step.x, y: from.y + step.y };
    if (!this.canPredict(target)) return null;
    const id = this.nextId++;
    this.pending.push({ id, direction });
    return { id, target };
  }

  acknowledge(id: number, result: InputAck): Point | null {
    const index = this.pending.findIndex(move => move.id === id);
    if (index < 0) return this.visualPosition;
    const move = this.pending[index];
    if (!result.ok || !result.moved) this.pending.splice(index, 1);
    else if (this.state.revision >= result.revision) this.pending.splice(index, 1);
    else move.acceptedRevision = result.revision;
    return this.visualPosition;
  }

  cancel(id: number): Point | null {
    this.pending = this.pending.filter(move => move.id !== id);
    return this.visualPosition;
  }

  apply(state: MatchState): Point | null {
    if (state.roomCode !== this.state.roomCode || state.revision <= this.state.revision) return this.visualPosition;
    const previous = this.state.players.find(player => player.id === this.selfPlayerId)?.position;
    this.state = state;
    const self = state.players.find(player => player.id === this.selfPlayerId);
    if (!self?.alive || state.status !== 'playing') { this.pending = []; return self?.position ?? null; }
    // Socket.IO emits match:state before its ACK. A matching prefix has already reached authority.
    if (previous && this.pending.length) {
      const first = this.pending[0];
      if (first) {
        const step = VECTORS[first.direction];
        if (previous.x + step.x === self.position.x && previous.y + step.y === self.position.y) this.pending.shift();
      }
    }
    this.pending = this.pending.filter(move => move.acceptedRevision === undefined || move.acceptedRevision > state.revision);
    return this.visualPosition;
  }

  private canPredict(point: Point): boolean {
    return tileAt(this.arena, point) === 'floor' &&
      !this.state.bombs.some(bomb => key(bomb.position) === key(point)) &&
      !this.state.players.some(player => player.id !== this.selfPlayerId && player.alive && key(player.position) === key(point));
  }
}
