import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const loadContent = async () => JSON.parse(await readFile(new URL('../../data/content.json', import.meta.url), 'utf8'));

test('integrated dialogue covers every scripted story section', async () => {
  const content = await loadContent();
  const byId = new Map(content.audioClips.map(clip => [clip.id, clip]));
  const requiredIds = [
    'audio-intro', 'audio-bridge-1', 'audio-ki-air', 'audio-ki-tengu', 'audio-main-1',
    'audio-sho-solar-wind', 'audio-sho-light-years', 'audio-sho-constellations', 'audio-main-2',
    'audio-ten-communications', 'audio-ten-morse', 'audio-main-3', 'audio-ten-q3-result',
    'audio-ten-1817', 'audio-ketsu-cablecar', 'audio-ketsu-plants', 'audio-ketsu-profile',
    'audio-ketsu-final-signal', 'audio-final-connection', 'audio-ending'
  ];
  assert.deepEqual(requiredIds.filter(id => !byId.has(id)), []);

  const dialogue = content.audioClips.map(clip => clip.subtitle).join('\n');
  for (const phrase of [
    'その端末、絶対に捨てないで', '1オークエン', '高尾山', '天狗', '太陽風',
    '100光年', '北極星', '1234', 'モールス信号', 'HELLO', 'HOLES', '1817年',
    '31度', 'ミドリノヤツ', '登録操縦士情報', '少々お調子者', 'ありがとう、相棒'
  ]) assert.ok(dialogue.includes(phrase), `missing scripted phrase: ${phrase}`);
});

test('dialogue triggers follow the four route sections and final authentication', async () => {
  const content = await loadContent();
  const triggers = new Set(content.audioClips.map(clip => clip.triggerEventId));
  for (const trigger of ['game-started', 'intro-completed', 'q1-solved', 'q2-solved', 'q3-solved', 'spot-4-arrived', 'q4-solved']) {
    assert.equal(triggers.has(trigger), true, `missing trigger: ${trigger}`);
  }
  assert.equal(content.audioClips.find(clip => clip.id === 'audio-final-connection').triggerEventId, 'spot-4-arrived');
});

test('incoming ringtone has a separate BGM slot that can be assigned later', async () => {
  const content = await loadContent();
  const ring = content.audioClips.find(clip => clip.id === 'audio-incoming-ring');
  assert.ok(ring);
  assert.equal(ring.kind, 'bgm');
  assert.equal(ring.triggerEventId, 'terminal-picked-up');
  assert.equal(typeof ring.src, 'string');
});
