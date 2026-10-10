import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, reducePlayerState } from '../../js/core/game-state.js';
import { transition } from '../../js/core/state-machine.js';

test('creates immutable-shape initial state and applies duplicate events idempotently', () => {
  const initial = createInitialState('r1', '2026-09-13T00:00:00.000Z');
  const once = reducePlayerState(initial, { type: 'complete-event', id: 'game-started' });
  const twice = reducePlayerState(once, { type: 'complete-event', id: 'game-started' });
  assert.equal(twice.completedEventIds.length, 1);
  assert.deepEqual(initial.completedEventIds, []);
});

test('forbids reaching a later spot before prior puzzles', () => {
  const state = createInitialState('r1');
  assert.throws(() => transition(state, { type: 'arrive', spotId: 'spot-2' }), /prerequisite/i);
});
