import assert from 'node:assert/strict';
import test from 'node:test';
import { OnlinePrediction } from '../src/network/prediction.ts';
import type { MatchState } from '../src/network/types.ts';

const arena = Array.from({ length: 5 }, (_, y) => Array.from({ length: 20 }, (_, x) => x === 0 || x === 19 || y === 0 || y === 4 ? 'wall' as const : 'floor' as const));
const initial: MatchState = {
  roomCode: 'ABCD', status: 'playing', revision: 1, bombs: [], powerUps: [],
  players: [
    { id: 'self', name: 'Self', position: { x: 1, y: 1 }, alive: true, bombCapacity: 1, fireRange: 2, activeBombs: 0 },
    { id: 'other', name: 'Other', position: { x: 17, y: 3 }, alive: true, bombCapacity: 1, fireRange: 2, activeBombs: 0 }
  ]
};

test('prediction starts before a delayed accepted state and does not double-move', () => {
  const model = new OnlinePrediction(initial, arena, 'self');
  const request = model.predict('right');
  assert.deepEqual(request?.target, { x: 2, y: 1 });
  assert.deepEqual(initial.players[0]?.position, { x: 1, y: 1 });
  assert.deepEqual(model.visualPosition, { x: 2, y: 1 });
  assert.equal(model.apply({ ...initial, revision: 2, players: [{ ...initial.players[0]!, position: { x: 2, y: 1 } }, initial.players[1]!] })?.x, 2);
  assert.equal(model.pendingCount, 0);
  if (request) assert.deepEqual(model.acknowledge(request.id, { ok: true, moved: true, revision: 2 }), { x: 2, y: 1 });
});

test('rejected prediction corrects smoothly to authority and stale state does not rewind', () => {
  const model = new OnlinePrediction(initial, arena, 'self');
  const request = model.predict('right');
  assert.deepEqual(model.visualPosition, { x: 2, y: 1 });
  assert.deepEqual(model.apply({ ...initial, revision: 1, players: [{ ...initial.players[0]!, position: { x: 9, y: 1 } }, initial.players[1]!] }), { x: 2, y: 1 });
  if (request) assert.deepEqual(model.acknowledge(request.id, { ok: true, moved: false, reason: 'blocked' }), { x: 1, y: 1 });
  assert.equal(model.pendingCount, 0);
});

test('remote movement and repeated local inputs cannot mutate authority or grow prediction without bound', () => {
  const model = new OnlinePrediction(initial, arena, 'self');
  const changed = { ...initial, revision: 2, players: [initial.players[0]!, { ...initial.players[1]!, position: { x: 16, y: 3 } }] };
  assert.deepEqual(model.apply(changed), { x: 1, y: 1 });
  for (let i = 0; i < 20; i++) model.predict('right');
  assert.equal(model.pendingCount, 8);
  assert.deepEqual(initial.players[0]?.position, { x: 1, y: 1 });
  assert.deepEqual(changed.players[1]?.position, { x: 16, y: 3 });
});

test('known walls, bombs and occupied tiles suppress visual prediction', () => {
  const state: MatchState = { ...initial, bombs: [{ id: 'server-bomb', ownerId: 'other', position: { x: 2, y: 1 }, range: 2, explodeAt: 2000 }] };
  const model = new OnlinePrediction(state, arena, 'self');
  assert.equal(model.predict('right'), null);
  assert.equal(model.predict('left'), null);
});
