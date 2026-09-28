import test from 'node:test';
import assert from 'node:assert/strict';
import { DEBUG_STAGES, buildDebugState, debugStageForState, showDebugControls } from '../../js/core/debug-progress.js';
import { validatePlayerState } from '../../js/core/content-validator.js';
import { transition } from '../../js/core/state-machine.js';
import { createInitialState } from '../../js/core/game-state.js';
import { createStateStore, PLAYER_STATE_KEY } from '../../js/services/storage.js';

const releaseId='debug-test';
const at=id=>buildDebugState(releaseId,id,'2026-01-01T00:00:00.000Z');

test('every development destination is a valid, selectable player state',()=>{
  for(const stage of DEBUG_STAGES){
    const state=at(stage.id);
    assert.deepEqual(validatePlayerState(state),[],stage.id);
    assert.equal(debugStageForState(state),stage.id,stage.id);
  }
  assert.throws(()=>at('unknown'),RangeError);
});

test('field destinations have the expected prerequisite and reward flags',()=>{
  for(let index=1;index<=3;index++){
    const priorParts=['part-r','part-a','part-m'].slice(0,index-1);
    const briefing=at(`briefing-${index}`);
    assert.deepEqual(briefing.reachedSpotIds,Array.from({length:index},(_,n)=>`spot-${n+1}`));
    assert.deepEqual(briefing.solvedPuzzleIds,Array.from({length:index-1},(_,n)=>`q${n+1}`));
    assert.deepEqual(briefing.collectedPartIds,priorParts);
    assert.ok(!briefing.completedEventIds.includes(`q${index}-briefing-completed`));
    const puzzle=at(`puzzle-${index}`);
    assert.ok(puzzle.completedEventIds.includes(`q${index}-briefing-completed`));
    assert.ok(puzzle.listenedAudioIds.includes(`audio-main-${index}`));
    const part=at(`part-${index}`);
    assert.ok(part.solvedPuzzleIds.includes(`q${index}`));
    assert.deepEqual(part.collectedPartIds,[...priorParts,['part-r','part-a','part-m'][index-1]]);
    assert.ok(!part.completedEventIds.includes(`q${index}-continued`));
    assert.equal(transition(part,{type:'advance-after-part'}).currentSceneId,'s04');
    assert.ok(at(`travel-${index+1}`).completedEventIds.includes(`q${index}-continued`));
  }
});

test('final destinations preserve authentication, repair and completion order',()=>{
  const final=at('final'),repair=at('repair'),ending=at('ending'),completed=at('completed');
  assert.deepEqual(final.reachedSpotIds,['spot-1','spot-2','spot-3','spot-4']);
  assert.deepEqual(final.collectedPartIds,['part-r','part-a','part-m','part-i']);
  assert.equal(final.q4Order.join(''),'RAMI');
  assert.ok(!final.solvedPuzzleIds.includes('q4'));
  assert.equal(repair.q4Order.join(''),'MIRA');
  assert.ok(repair.solvedPuzzleIds.includes('q4'));
  assert.equal(transition(repair,{type:'complete-repair'}).currentSceneId,'s10');
  assert.equal(ending.endingSeen,false);
  assert.equal(completed.endingSeen,true);
});

test('developer UI requires both local runtime and explicit flag',()=>{
  assert.equal(showDebugControls({isLocal:true},{debugMode:true}),true);
  assert.equal(showDebugControls({isLocal:true},{debugMode:false}),false);
  assert.equal(showDebugControls({isLocal:false},{debugMode:true}),false);
});

test('debug progress uses an independent storage key',()=>{
  const data=new Map();
  const storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
  const normal=createStateStore(storage);
  const debug=createStateStore(storage,`${PLAYER_STATE_KEY}:debug`);
  normal.save(createInitialState(releaseId));
  debug.save(at('part-2'));
  assert.equal(normal.load({releaseId}).state.currentSceneId,'s00');
  assert.equal(debug.load({releaseId}).state.currentSceneId,'s07');
});
