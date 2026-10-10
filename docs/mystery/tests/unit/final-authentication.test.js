import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, reducePlayerState } from '../../js/core/game-state.js';
import { transition } from '../../js/core/state-machine.js';

test('tap swap retains four unique letters and MIRA succeeds', () => {
  let s=createInitialState('r'); s.q4Order=['R','A','M','I'];
  s=reducePlayerState(s,{type:'q4-swap',from:0,to:2}); s=reducePlayerState(s,{type:'q4-swap',from:1,to:3});
  assert.deepEqual(s.q4Order,['M','I','R','A']);
  s.reachedSpotIds=['spot-1','spot-2','spot-3','spot-4']; s.solvedPuzzleIds=['q1','q2','q3']; s.collectedPartIds=['part-r','part-a','part-m','part-i'];
  const repairing=transition(s,{type:'authenticate-final'});
  assert.equal(repairing.currentSceneId,'s09');
  assert.equal(repairing.completedEventIds.includes('q4-solved'),true);
  assert.throws(()=>transition(repairing,{type:'complete-ending'}),/return communication is required/u);
  assert.equal(transition(repairing,{type:'complete-repair'}).currentSceneId,'s10');
});

test('repair sequence cannot be completed before final authentication', () => {
  const s=createInitialState('r');
  assert.throws(()=>transition(s,{type:'complete-repair'}),/final repair sequence is required/u);
});

test('Q4 selection updates are persisted without requiring a screen transition', () => {
  let s=createInitialState('r');
  const beforeScene=s.currentSceneId;
  s=reducePlayerState(s,{type:'q4-swap',from:0,to:2});
  assert.deepEqual(s.q4Order,['M','A','R','I']);
  assert.equal(s.currentSceneId,beforeScene);
});
