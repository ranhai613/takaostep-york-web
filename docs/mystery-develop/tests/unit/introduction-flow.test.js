import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, reducePlayerState } from '../../js/core/game-state.js';
import { transition } from '../../js/core/state-machine.js';

test('introduction requires safety acknowledgement and supports subtitle-only completion', () => {
  const initial = createInitialState('r1');
  assert.throws(() => transition(initial, { type: 'complete-intro', audioMode: 'subtitles' }), /safety/i);
  const acknowledged = transition(initial, { type: 'acknowledge-safety' });
  const pickedUp = reducePlayerState(acknowledged, { type: 'complete-event', id: 'terminal-picked-up' });
  assert.ok(pickedUp.completedEventIds.includes('terminal-picked-up'));
  const ready = transition(acknowledged, { type: 'complete-intro', audioMode: 'subtitles' });
  assert.equal(ready.currentSceneId, 's04');
  assert.ok(ready.completedEventIds.includes('intro-completed'));
});
