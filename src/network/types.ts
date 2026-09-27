import type { Arena } from '../game/arena.ts';
import type { Direction, Point } from '../game/config.ts';

export type PublicRoomState = {
  code: string;
  status: 'lobby' | 'playing' | 'finished';
  hostPlayerId: string;
  players: Array<{ id: string; nickname: string; ready: boolean; host: boolean }>;
};
export type ServerError = { code: string; message: string };
export type MembershipAck = { ok: true; state: PublicRoomState; selfPlayerId: string } | { ok: false; error: ServerError };
export type RoomAck = { ok: true; state: PublicRoomState } | { ok: false; error: ServerError };
export type ActionAck = { ok: true } | { ok: false; error: ServerError };
export type MatchPlayer = { id: string; name: string; position: Point; alive: boolean; bombCapacity: number; fireRange: number; activeBombs: number };
export type MatchBomb = { id: string; ownerId: string; position: Point; range: number; explodeAt: number };
export type MatchPowerUp = { position: Point; kind: 'bomb' | 'fire' };
export type MatchState = { roomCode: string; status: 'playing' | 'finished'; revision: number; players: MatchPlayer[]; bombs: MatchBomb[]; powerUps: MatchPowerUp[] };
export type InitialMatchState = MatchState & { arena: { cols: number; rows: number; tiles: Arena } };
export type MatchExplosion = { roomCode: string; revision: number; tiles: Point[]; changes: Array<Point & { tile: 'floor' | 'wall' | 'crate' }>; durationMs: number };
export type MatchResult = { roomCode: string; revision: number; kind: 'winner' | 'draw'; winnerId?: string; winnerName?: string; statuses: Array<{ id: string; name: string; alive: boolean }> };
export type StartMatchAck = { ok: true; state: InitialMatchState } | { ok: false; error: ServerError };
export type InputAck = { ok: true; moved: true; revision: number } | { ok: true; moved: false; reason: 'blocked' | 'cooldown' } | { ok: false; error: ServerError };
export type BombAck = { ok: true; placed: true; revision: number } | { ok: true; placed: false; reason: 'dead' | 'capacity' | 'occupied' | 'finished' } | { ok: false; error: ServerError };

export interface ServerToClientEvents {
  'server:hello': (payload: { service: 'bomb-it-server' }) => void;
  'room:state': (state: PublicRoomState) => void;
  'room:error': (error: ServerError) => void;
  'room:left': (payload: { code: string }) => void;
  'match:started': (state: InitialMatchState) => void;
  'match:state': (state: MatchState) => void;
  'match:explosion': (event: MatchExplosion) => void;
  'match:result': (result: MatchResult) => void;
}
export interface ClientToServerEvents {
  'room:create': (payload: { nickname: string }, acknowledge: (result: MembershipAck) => void) => void;
  'room:join': (payload: { code: string; nickname: string }, acknowledge: (result: MembershipAck) => void) => void;
  'room:leave': (acknowledge: (result: ActionAck) => void) => void;
  'player:set-ready': (payload: { ready: boolean }, acknowledge: (result: RoomAck) => void) => void;
  'room:start-match': (acknowledge: (result: StartMatchAck) => void) => void;
  'player:input': (payload: { direction: Direction }, acknowledge: (result: InputAck) => void) => void;
  'player:place-bomb': (payload: Record<string, never>, acknowledge: (result: BombAck) => void) => void;
}
