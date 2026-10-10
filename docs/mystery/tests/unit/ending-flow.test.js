import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../../js/core/game-state.js';
import { transition } from '../../js/core/state-machine.js';

test('ending completion is one-time and replay is state-neutral', () => {
  const s=createInitialState('r'); s.completedEventIds=['q4-solved']; s.currentSceneId='s10';
  const ended=transition(s,{type:'complete-ending'}); const replay=transition(ended,{type:'replay-ending'});
  assert.equal(ended.endingSeen,true); assert.deepEqual(replay,ended);
});
test('ending source includes the required story facts', async () => {
  const content=JSON.parse(await (await import('node:fs/promises')).readFile(new URL('../../data/content.json',import.meta.url),'utf8'));
  const q4=content.puzzles.find(puzzle=>puzzle.id==='q4');
  const text=[...content.audioClips.map(clip=>clip.subtitle),q4.prompt,...q4.acceptedAnswers].join('\n');
  for (const fact of ['1817','200年','八王子隕石','MIRA','相棒','1オークエン']) assert.ok(text.includes(fact));
});
