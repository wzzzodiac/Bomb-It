import { io, type Socket } from 'socket.io-client';
import type { Direction } from '../game/config.ts';
import type { ActionAck, BombAck, ClientToServerEvents, InitialMatchState, InputAck, MembershipAck, MatchExplosion, MatchResult, MatchState, PublicRoomState, RoomAck, ServerError, ServerToClientEvents, StartMatchAck } from './types.ts';

type Handlers = {
  room: (state: PublicRoomState) => void;
  left: (code: string) => void;
  reset: (state: PublicRoomState) => void;
  error: (error: ServerError) => void;
  started: (state: InitialMatchState) => void;
  match: (state: MatchState) => void;
  explosion: (event: MatchExplosion) => void;
  result: (result: MatchResult) => void;
  disconnect: () => void;
};

export class OnlineClient {
  private readonly socket: Socket<ServerToClientEvents, ClientToServerEvents>;

  constructor(url: string, handlers: Handlers) {
    this.socket = io(url, { autoConnect: false, reconnection: false, timeout: 3000 });
    this.socket.on('room:state', handlers.room);
    this.socket.on('room:left', payload => handlers.left(payload.code));
    this.socket.on('room:reset', handlers.reset);
    this.socket.on('room:error', handlers.error);
    this.socket.on('match:started', handlers.started);
    this.socket.on('match:state', handlers.match);
    this.socket.on('match:explosion', handlers.explosion);
    this.socket.on('match:result', handlers.result);
    this.socket.on('disconnect', handlers.disconnect);
    this.socket.on('connect_error', () => handlers.error({ code: 'CONNECTION_ERROR', message: 'Server unavailable. Try again shortly.' }));
  }

  async connect(): Promise<void> {
    if (this.socket.connected) return;
    await new Promise<void>((resolve, reject) => {
      const done = () => { this.socket.off('connect', connected); this.socket.off('connect_error', failed); };
      const connected = () => { done(); resolve(); };
      const failed = () => { done(); reject(new Error('Server unavailable. Try again shortly.')); };
      this.socket.once('connect', connected);
      this.socket.once('connect_error', failed);
      this.socket.connect();
    });
  }
  async create(nickname: string): Promise<MembershipAck> { return this.socket.timeout(3500).emitWithAck('room:create', { nickname }); }
  async join(code: string, nickname: string): Promise<MembershipAck> { return this.socket.timeout(3500).emitWithAck('room:join', { code, nickname }); }
  async leave(): Promise<ActionAck> { return this.socket.timeout(3500).emitWithAck('room:leave'); }
  async returnToLobby(): Promise<RoomAck> { return this.socket.timeout(3500).emitWithAck('room:return-to-lobby'); }
  async addBot(): Promise<RoomAck> { return this.socket.timeout(3500).emitWithAck('room:add-bot', {}); }
  async removeBot(botId: string): Promise<RoomAck> { return this.socket.timeout(3500).emitWithAck('room:remove-bot', { botId }); }
  async ready(ready: boolean): Promise<RoomAck> { return this.socket.timeout(3500).emitWithAck('player:set-ready', { ready }); }
  async start(): Promise<StartMatchAck> { return this.socket.timeout(3500).emitWithAck('room:start-match'); }
  sendDirection(direction: Direction, onAck?: (result: InputAck) => void): void {
    if (this.socket.connected) this.socket.timeout(3500).emit('player:input', { direction }, (error: Error | null, result: InputAck) => {
      onAck?.(error ? { ok: false, error: { code: 'CONNECTION_ERROR', message: 'Movement acknowledgement timed out.' } } : result);
    });
  }
  placeBomb(onAck?: (result: BombAck) => void): void {
    if (this.socket.connected) this.socket.timeout(3500).emit('player:place-bomb', {}, (error: Error | null, result: BombAck) => {
      onAck?.(error ? { ok: false, error: { code: 'CONNECTION_ERROR', message: 'Bomb acknowledgement timed out.' } } : result);
    });
  }
  close(): void { this.socket.disconnect(); }
}
