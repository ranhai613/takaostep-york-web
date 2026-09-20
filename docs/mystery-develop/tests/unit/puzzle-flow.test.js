import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../../js/core/game-state.js';
import { transition } from '../../js/core/state-machine.js';

function atQ1(){ let s=createInitialState('r'); s=transition(s,{type:'acknowledge-safety'}); s=transition(s,{type:'complete-intro'}); return transition(s,{type:'arrive',spotId:'spot-1'}); }
test('wrong answer does not lock and hints remain ordered and persisted', () => {
  const s=atQ1(); assert.throws(()=>transition(s,{type:'solve',puzzleId:'q1',correct:false}),/incorrect/i);
  const h1=transition(s,{type:'view-hint',puzzleId:'q1',hintIndex:0});
  assert.throws(()=>transition(h1,{type:'view-hint',puzzleId:'q1',hintIndex:2}),/ordered/i);
  const h2=transition(h1,{type:'view-hint',puzzleId:'q1',hintIndex:1}); const h3=transition(h2,{type:'view-hint',puzzleId:'q1',hintIndex:2});
  assert.equal(h3.viewedHintIds.length,3);
});
test('solving grants a part once and opens only the next route', () => {
  const solved=transition(atQ1(),{type:'solve',puzzleId:'q1',correct:true,partId:'part-r'});
  const again=transition(solved,{type:'solve',puzzleId:'q1',correct:true,partId:'part-r'});
  assert.deepEqual(again.collectedPartIds,['part-r']); assert.equal(again.currentSceneId,'s07');
  assert.equal(transition(again,{type:'advance-after-part'}).currentSceneId,'s04');
});
