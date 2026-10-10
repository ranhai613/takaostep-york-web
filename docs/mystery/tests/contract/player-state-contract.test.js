import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../../js/core/game-state.js';
import { validatePlayerState } from '../../js/core/content-validator.js';

test('initial state follows privacy-safe PlayerState contract', () => {
  const state = createInitialState('release', '2026-09-13T00:00:00.000Z');
  assert.deepEqual(validatePlayerState(state), []);
  assert.equal('coordinates' in state, false);
  assert.equal('answerHistory' in state, false);
  assert.equal('analytics' in state, false);
});

test('duplicate IDs and invalid Q4 orders are rejected', () => {
  const state = createInitialState('release');
  state.reachedSpotIds = ['spot-1', 'spot-1'];
  state.q4Order = ['M', 'I', 'R', 'R'];
  const errors = validatePlayerState(state);
  assert.ok(errors.some(error => error.includes('reachedSpotIds')));
  assert.ok(errors.some(error => error.includes('q4Order')));
});
