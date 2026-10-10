import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getConversationLog, miraSpeech } from '../../js/core/conversation-log.js';
import { Renderer } from '../../js/ui/renderer.js';

const clips=[
  {id:'audio-intro',kind:'main',triggerEventId:'game-started',subtitle:'［着信音］\n\nミラ：こんにちは。\n\nシステム：接続完了\n\nミラ：よろしく！'},
  {id:'audio-bridge-1',kind:'bridge',triggerEventId:'intro-completed',subtitle:'ミラ：高尾の話だよ。'},
  {id:'audio-main-1',kind:'main',triggerEventId:'intro-completed',subtitle:'ミラ：第一地点だよ。'},
  {id:'audio-sho-solar-wind',kind:'bridge',triggerEventId:'q1-solved',subtitle:'ミラ：太陽の話だよ。'},
  {id:'audio-ending',kind:'main',triggerEventId:'q4-solved',subtitle:'システム：完了\n\nミラ：ありがとう！'},
  {id:'audio-effect',kind:'effect',triggerEventId:'intro-completed',subtitle:'ミラ：表示しない。'}
];
const state=(events,scene='s04')=>({completedEventIds:events,currentSceneId:scene,listenedAudioIds:[]});

test('conversation log includes all available main and bridge speech regardless of playback', () => {
  assert.equal(miraSpeech(clips[0].subtitle),'こんにちは。\n\nよろしく！');
  assert.deepEqual(getConversationLog(clips,state([], 's02')),[]);
  assert.deepEqual(getConversationLog(clips,state([], 's03')).map(entry=>entry.id),['audio-intro']);
  assert.deepEqual(getConversationLog(clips,state(['game-started','intro-completed'])).map(entry=>entry.id),['audio-intro','audio-bridge-1']);
  assert.deepEqual(getConversationLog(clips,state(['game-started','intro-completed','spot-1-arrived'])).map(entry=>entry.id),['audio-intro','audio-bridge-1','audio-main-1']);
  assert.deepEqual(getConversationLog(clips,state(['game-started','intro-completed','spot-1-arrived','q1-solved'])).map(entry=>entry.id),['audio-intro','audio-bridge-1','audio-main-1']);
  assert.deepEqual(getConversationLog(clips,state(['game-started','intro-completed','spot-1-arrived','q1-solved','q1-continued'])).map(entry=>entry.id),['audio-intro','audio-bridge-1','audio-main-1','audio-sho-solar-wind']);
});

test('final speech unlocks after authentication and log output escapes content', () => {
  const entries=getConversationLog(clips,state(['q4-solved'],'s10'));
  assert.deepEqual(entries.map(entry=>entry.id),['audio-ending']);
  let options;
  const heading={focus(){}};
  const panel={scrollTop:40};
  const dialog={classList:{add(){}},querySelector(selector){return selector==='h2'?heading:panel},setAttribute(){}};
  Renderer.prototype.showConversationLog.call({showDialog(value){options=value;return dialog}},[{label:'地点',kind:'main',text:'<危険> & ミラ'}]);
  assert.match(options.body,/&lt;危険&gt; &amp; ミラ/u);
  assert.doesNotMatch(options.body,/<危険>/u);
  assert.equal(panel.scrollTop,0);
});

test('the completed route includes every scripted main and bridge clip, even without audio playback', async () => {
  const content=JSON.parse(await readFile(new URL('../../data/content.json',import.meta.url),'utf8'));
  const events=['game-started','intro-completed','spot-1-arrived','q1-continued','spot-2-arrived','q2-continued','spot-3-arrived','q3-continued','spot-4-arrived','q4-solved'];
  const log=getConversationLog(content.audioClips,state(events,'completed'));
  const expected=content.audioClips.filter(clip=>['main','bridge'].includes(clip.kind));
  assert.equal(log.length,expected.length);
  assert.deepEqual(log.map(entry=>entry.id),expected.map(clip=>clip.id));
});
