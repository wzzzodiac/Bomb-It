import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateMatch } from '../src/game/matchRules.ts';
import { canPlaceBomb, claimBomb, releaseBomb, type PlayerState } from '../src/game/players.ts';
import { addBot, createLocalRoom, MAX_PLAYERS_PER_ROOM, removeBot } from '../src/app/state.ts';

const player = (id: string, alive = true): PlayerState => ({ id, name: id, position: { x: 1, y: 1 }, alive, bombCapacity: 1, fireRange: 2, activeBombs: 0, controller: 'bot', color: 0 });

test('winner rules support many players and simultaneous draw', () => {
  assert.deepEqual(evaluateMatch([player('a'), player('b', false), player('c', false)]), { status: 'winner', winnerId: 'a' });
  assert.deepEqual(evaluateMatch([player('a', false), player('b', false)]), { status: 'draw' });
  assert.deepEqual(evaluateMatch([player('solo')]), { status: 'ongoing' });
  assert.deepEqual(evaluateMatch([player('solo', false)]), { status: 'draw' });
});

test('bomb capacity belongs to each generic player independently', () => {
  const owner = player('owner'); const other = player('other');
  assert.equal(canPlaceBomb(owner), true); claimBomb(owner);
  assert.equal(canPlaceBomb(owner), false); assert.equal(other.activeBombs, 0);
  owner.alive = false; releaseBomb(owner);
  assert.equal(owner.activeBombs, 0, 'dead owner can release a completed bomb safely');
});

test('local lobby caps six slots and preserves host while bots change', () => {
  let room = createLocalRoom('Walter');
  for (let index = 0; index < 10; index++) room = addBot(room);
  assert.equal(room.participants.length, MAX_PLAYERS_PER_ROOM);
  assert.equal(room.participants[0].host, true);
  room = removeBot(room, 'bot-3');
  assert.equal(room.participants.length, 5); assert.equal(room.participants[0].name, 'Walter');
});
