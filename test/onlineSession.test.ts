import assert from 'node:assert/strict';
import test from 'node:test';
import { OnlineSession } from '../src/network/session.ts';
import type { InitialMatchState, PublicRoomState } from '../src/network/types.ts';

const room: PublicRoomState = {
  code: 'ABCD', status: 'lobby', hostPlayerId: 'server-a',
  players: [
    { id: 'server-a', nickname: 'Same', ready: false, host: true },
    { id: 'server-b', nickname: 'Same', ready: false, host: false }
  ]
};
const initial: InitialMatchState = {
  roomCode: 'ABCD', status: 'playing', revision: 1, bombs: [], powerUps: [],
  arena: { cols: 2, rows: 2, tiles: [['wall', 'wall'], ['floor', 'crate']] },
  players: [
    { id: 'server-a', name: 'Same', position: { x: 0, y: 0 }, alive: true, bombCapacity: 1, fireRange: 2, activeBombs: 0 },
    { id: 'server-b', name: 'Same', position: { x: 1, y: 1 }, alive: true, bombCapacity: 1, fireRange: 2, activeBombs: 0 }
  ]
};

test('ACK identity is retained independently of duplicate nicknames', () => {
  const a = new OnlineSession(); const b = new OnlineSession();
  a.join(room, 'server-a'); b.join(room, 'server-b');
  assert.equal(a.selfPlayerId, 'server-a'); assert.equal(b.selfPlayerId, 'server-b');
  assert.notEqual(a.selfPlayerId, b.selfPlayerId);
  assert.equal(a.room?.players[0]?.nickname, b.room?.players[1]?.nickname);
});

test('host readiness and start eligibility follow authoritative room state', () => {
  const a = new OnlineSession(); const b = new OnlineSession();
  a.join(room, 'server-a'); b.join(room, 'server-b');
  assert.equal(a.canStart(), false);
  const ready = { ...room, players: room.players.map(player => ({ ...player, ready: true })) };
  a.room = ready; b.room = ready;
  assert.equal(a.canStart(), true); assert.equal(b.canStart(), false);
  a.room = { ...ready, status: 'playing' };
  assert.equal(a.canStart(), false);
});

test('server arena survives compact updates and stale revisions are ignored', () => {
  const session = new OnlineSession(); session.join(room, 'server-a'); session.start(initial);
  const arena = session.match?.arena;
  assert.equal(session.apply({ ...initial, revision: 2, players: [{ ...initial.players[0]!, position: { x: 0, y: 1 } }, initial.players[1]!] }), true);
  assert.strictEqual(session.match?.arena, arena);
  assert.deepEqual(session.match?.players[0]?.position, { x: 0, y: 1 });
  assert.equal(session.apply({ ...initial, revision: 2 }), false);
  assert.equal(session.apply({ ...initial, revision: 1 }), false);
  assert.deepEqual(session.match?.players[0]?.position, { x: 0, y: 1 });
});

test('bomb intent is empty and only a connected living player can send it', () => {
  const session = new OnlineSession(); session.join(room, 'server-a'); session.start(initial);
  const payloads: unknown[] = [];
  session.sendBomb(payload => payloads.push(payload));
  assert.deepEqual(payloads, [{}]);
  session.apply({ ...initial, revision: 2, players: initial.players.map(player => player.id === 'server-a' ? { ...player, alive: false } : player) });
  session.sendBomb(payload => payloads.push(payload));
  assert.equal(payloads.length, 1);
  session.apply({ ...initial, revision: 3, status: 'finished' });
  session.sendDirection('left', payload => payloads.push(payload));
  assert.equal(payloads.length, 1);
  session.disconnect(); session.sendBomb(payload => payloads.push(payload));
  assert.equal(payloads.length, 1);
});

test('authoritative explosion mutates only supplied tiles once and stale events are ignored', () => {
  const session = new OnlineSession(); session.join(room, 'server-a'); session.start(structuredClone(initial));
  const event = { roomCode: 'ABCD', revision: 2, tiles: [{ x: 1, y: 1 }], changes: [{ x: 1, y: 1, tile: 'floor' as const }], durationMs: 450 };
  assert.equal(session.applyExplosion(event), true);
  assert.equal(session.match?.arena.tiles[1]?.[1], 'floor');
  assert.equal(session.applyExplosion(event), false);
  assert.equal(session.applyExplosion({ ...event, revision: 1 }), false);
  assert.equal(session.applyExplosion({ ...event, roomCode: 'WRONG', revision: 3 }), false);
});

test('only a matching new server result is accepted', () => {
  const session = new OnlineSession(); session.join(room, 'server-a'); session.start(initial);
  const result = { roomCode: 'ABCD', revision: 2, kind: 'winner' as const, winnerId: 'server-a', winnerName: 'Same', statuses: [] };
  assert.equal(session.acceptResult(result), true);
  assert.equal(session.acceptResult(result), false);
  assert.equal(session.acceptResult({ ...result, roomCode: 'WRONG', revision: 3 }), false);
});

test('only the owned player can cause direction-only input and disconnect stops it', () => {
  const session = new OnlineSession(); session.join(room, 'server-a'); session.start(initial);
  const payloads: unknown[] = [];
  session.sendDirection('left', payload => payloads.push(payload));
  assert.deepEqual(payloads, [{ direction: 'left' }]);
  session.selfPlayerId = 'other-id';
  session.sendDirection('right', payload => payloads.push(payload));
  assert.equal(payloads.length, 1);
  session.selfPlayerId = 'server-a'; session.disconnect();
  session.sendDirection('up', payload => payloads.push(payload));
  assert.equal(payloads.length, 1);
});
