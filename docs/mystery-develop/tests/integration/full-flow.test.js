import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, reducePlayerState } from '../../js/core/game-state.js';
import { transition } from '../../js/core/state-machine.js';

test('subtitle and manual-arrival path completes the entire game without privileged operations', () => {
  let state=createInitialState('release');
  state=transition(state,{type:'acknowledge-safety'});
  state=transition(state,{type:'complete-intro',audioMode:'subtitles'});
  for(let index=1;index<=3;index++){
    state=transition(state,{type:'arrive',spotId:`spot-${index}`,source:'player-confirmation'});
    state=transition(state,{type:'solve',puzzleId:`q${index}`,correct:true,partId:['part-r','part-a','part-m'][index-1]});
    state=transition(state,{type:'advance-after-part'});
  }
  state=transition(state,{type:'arrive',spotId:'spot-4',source:'player-confirmation'});
  state=reducePlayerState(state,{type:'q4-swap',from:0,to:2});
  state=reducePlayerState(state,{type:'q4-swap',from:1,to:3});
  state=transition(state,{type:'authenticate-final'});
  state=transition(state,{type:'complete-ending'});
  assert.equal(state.endingSeen,true);
  assert.equal(state.currentSceneId,'completed');
  assert.deepEqual(state.collectedPartIds,['part-r','part-a','part-m','part-i']);
  assert.equal(Object.keys(state).some(key=>/coord|answer|analytics/i.test(key)),false);
});
