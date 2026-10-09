import test from 'node:test';
import assert from 'node:assert/strict';
import { getBgmTrack } from '../../js/core/bgm-flow.js';
import { DEBUG_STAGES, buildDebugState } from '../../js/core/debug-progress.js';

test('BGM covers every screen and keeps the current part through its reward',()=>{
  const expected={
    preparation:null,device:null,incoming:'ki',intro:'ki',
    'travel-1':'ki','briefing-1':'ki','puzzle-1':'ki','part-1':'ki',
    'travel-2':'shou','briefing-2':'shou','puzzle-2':'shou','part-2':'shou',
    'travel-3':'ten','briefing-3':'ten','puzzle-3':'ten','part-3':'ten',
    'travel-4':'ketsu',final:'ketsu',repair:'ketsu',ending:'ed',completed:'ed'
  };
  for(const stage of DEBUG_STAGES){
    assert.equal(getBgmTrack(buildDebugState('bgm-test',stage.id)),expected[stage.id],stage.id);
  }
  assert.equal(getBgmTrack(null),null);
});

test('ending music starts at the return call, not the repair animation',()=>{
  assert.equal(getBgmTrack({currentSceneId:'s08'}),'ketsu');
  assert.equal(getBgmTrack({currentSceneId:'s09'}),'ketsu');
  assert.equal(getBgmTrack({currentSceneId:'s10'}),'ed');
});
