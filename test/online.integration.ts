import assert from 'node:assert/strict';
import { setTimeout as pause } from 'node:timers/promises';
import { OnlineClient } from '../src/network/client.ts';
import { OnlineSession } from '../src/network/session.ts';
import type { InitialMatchState, MatchExplosion, MatchResult, MatchState, PublicRoomState, ServerError } from '../src/network/types.ts';

const url = process.env.VITE_SERVER_URL || 'http://localhost:8080';
const failures: ServerError[] = [];
const statesA: MatchState[] = [];
const statesB: MatchState[] = [];
const explosionsA: MatchExplosion[] = [];
const explosionsB: MatchExplosion[] = [];
const resultsA: MatchResult[] = [];
const resultsB: MatchResult[] = [];
const a = new OnlineSession(); const b = new OnlineSession();
const makeHandlers = (session: OnlineSession, states: MatchState[], explosions: MatchExplosion[], results: MatchResult[]) => ({
  room: (state: PublicRoomState) => { if (session.room?.code === state.code) session.room = state; },
  left: () => session.clear(),
  error: (error: ServerError) => failures.push(error),
  started: (state: InitialMatchState) => session.start(state),
  match: (state: MatchState) => { states.push(state); session.apply(state); },
  explosion: (event: MatchExplosion) => { explosions.push(event); session.applyExplosion(event); },
  result: (result: MatchResult) => { results.push(result); session.acceptResult(result); },
  disconnect: () => session.disconnect()
});
const clientA = new OnlineClient(url, makeHandlers(a, statesA, explosionsA, resultsA));
const clientB = new OnlineClient(url, makeHandlers(b, statesB, explosionsB, resultsB));
async function until(predicate: () => boolean): Promise<void> {
  for (let i = 0; i < 250 && !predicate(); i++) await pause(20);
  assert.ok(predicate(), 'Timed out waiting for server event');
}

try {
  await Promise.all([clientA.connect(), clientB.connect()]);
  const created = await clientA.create('Same');
  if (!created.ok) throw new Error(created.error.code);
  a.join(created.state, created.selfPlayerId);
  const joined = await clientB.join(created.state.code, 'Same');
  if (!joined.ok) throw new Error(joined.error.code);
  b.join(joined.state, joined.selfPlayerId);
  assert.notEqual(a.selfPlayerId, b.selfPlayerId);
  assert.equal(created.state.players[0]?.nickname, joined.state.players[1]?.nickname);
  await until(() => a.room?.players.length === 2);
  const readyA = await clientA.ready(true); const readyB = await clientB.ready(true);
  assert.ok(readyA.ok && readyB.ok);
  await until(() => a.canStart());
  const start = await clientA.start();
  if (!start.ok) throw new Error(start.error.code);
  await until(() => !!a.match && !!b.match);
  assert.deepEqual(a.match?.arena, b.match?.arena);
  assert.deepEqual(a.match?.players, b.match?.players);
  const arenaA = a.match?.arena; const arenaB = b.match?.arena;
  a.sendDirection('right', payload => clientA.sendDirection(payload.direction));
  await until(() => a.match?.revision === 2 && b.match?.revision === 2);
  assert.deepEqual(a.match?.players, b.match?.players);
  assert.deepEqual(a.match?.players.find(player => player.id === a.selfPlayerId)?.position, { x: 2, y: 1 });
  assert.deepEqual(a.match?.players.find(player => player.id === b.selfPlayerId)?.position, { x: 15, y: 11 });
  b.sendDirection('left', payload => clientB.sendDirection(payload.direction));
  await until(() => a.match?.revision === 3 && b.match?.revision === 3);
  assert.deepEqual(a.match?.players, b.match?.players);
  assert.deepEqual(a.match?.players.find(player => player.id === b.selfPlayerId)?.position, { x: 14, y: 11 });
  assert.strictEqual(a.match?.arena, arenaA); assert.strictEqual(b.match?.arena, arenaB);
  assert.ok(statesA.every(state => !('arena' in state)) && statesB.every(state => !('arena' in state)));
  a.sendBomb(() => clientA.placeBomb());
  await until(() => a.match?.revision === 4 && b.match?.revision === 4);
  assert.deepEqual(a.match?.bombs, b.match?.bombs);
  assert.equal(a.match?.bombs[0]?.ownerId, a.selfPlayerId);
  assert.deepEqual(a.match?.bombs[0]?.position, { x: 2, y: 1 });
  await until(() => resultsA.length === 1 && resultsB.length === 1);
  assert.equal(explosionsA.length, 1); assert.deepEqual(explosionsA, explosionsB);
  assert.deepEqual(a.match?.arena, b.match?.arena);
  assert.equal(a.match?.bombs.length, 0);
  assert.deepEqual(resultsA, resultsB);
  assert.equal(resultsA[0]?.winnerId, b.selfPlayerId);
  assert.deepEqual(failures, []);
  process.stdout.write('Two-client online integration passed: duplicate names, shared arena, movement, bomb, explosion, death and result.\n');
} finally {
  clientA.close(); clientB.close();
}
