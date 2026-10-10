import test from 'node:test';
import assert from 'node:assert/strict';
import { getPuzzleBriefingClip, getPuzzleBriefingEventId, getTravelClips } from '../../js/core/dialogue-flow.js';

const clips = [
  { id: 'audio-bridge-1', triggerEventId: 'intro-completed' },
  { id: 'audio-main-1', triggerEventId: 'intro-completed' },
  { id: 'audio-main-2', triggerEventId: 'q1-solved' },
  { id: 'audio-main-3', triggerEventId: 'q2-solved' },
  { id: 'audio-ketsu-final-signal', triggerEventId: 'q3-solved' }
];

test('each field puzzle resolves its arrival briefing', () => {
  assert.equal(getPuzzleBriefingClip(clips, 1)?.id, 'audio-main-1');
  assert.equal(getPuzzleBriefingClip(clips, 2)?.id, 'audio-main-2');
  assert.equal(getPuzzleBriefingClip(clips, 3)?.id, 'audio-main-3');
  assert.equal(getPuzzleBriefingClip(clips, 4), null);
});

test('travel clips exclude puzzle arrival briefings', () => {
  assert.deepEqual(getTravelClips(clips, 'intro-completed').map(clip => clip.id), ['audio-bridge-1']);
  assert.deepEqual(getTravelClips(clips, 'q1-solved'), []);
  assert.deepEqual(getTravelClips(clips, 'q3-solved').map(clip => clip.id), ['audio-ketsu-final-signal']);
});

test('arrival briefing completion is independent from the audio listened flag', () => {
  assert.equal(getPuzzleBriefingEventId('q1'), 'q1-briefing-completed');
  assert.equal(getPuzzleBriefingEventId('q2'), 'q2-briefing-completed');
  assert.equal(getPuzzleBriefingEventId('q3'), 'q3-briefing-completed');
});
