import type { ControllerKind } from '../game/players.ts';

export const MAX_PLAYERS_PER_ROOM = 6;
export const FUTURE_MAX_ROOMS = 5;
export type AppScreen = 'profile' | 'home' | 'lobby' | 'playing' | 'results';
export type Participant = { id: string; name: string; controller: ControllerKind; ready: boolean; host: boolean };
export type RoomState = { code: string; participants: Participant[] };
export type RoundResult = { kind: 'winner' | 'draw'; winnerId?: string; winnerName?: string; statuses: Array<{ id: string; name: string; alive: boolean }> };

export const normalizeNickname = (value: string): string => value.trim().replace(/\s+/g, ' ').slice(0, 18);
export const makeRoomCode = (): string => Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');

export function createLocalRoom(nickname: string): RoomState {
  return { code: makeRoomCode(), participants: [{ id: 'local', name: nickname, controller: 'local', ready: true, host: true }] };
}

export function addBot(room: RoomState): RoomState {
  if (room.participants.length >= MAX_PLAYERS_PER_ROOM) return room;
  const used = new Set(room.participants.map(participant => participant.id));
  let number = 1; while (used.has(`bot-${number}`)) number++;
  return { ...room, participants: [...room.participants, { id: `bot-${number}`, name: `Bot ${number}`, controller: 'bot', ready: true, host: false }] };
}

export const removeBot = (room: RoomState, id: string): RoomState => ({ ...room, participants: room.participants.filter(participant => participant.id !== id || participant.controller !== 'bot') });
