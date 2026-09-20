import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioQueue } from '../../js/services/audio-queue.js';

class FakeAudio { constructor(){this.currentTime=0;this.paused=true;this.volume=1;this.listeners={}} addEventListener(n,f){this.listeners[n]=f} play(){this.paused=false;return Promise.resolve()} pause(){this.paused=true} }
const clips=[{id:'main',kind:'main',src:'main.mp3',priority:10},{id:'bridge',kind:'bridge',src:'bridge.mp3',priority:1}];
test('queue prioritizes main over bridge while idle', async () => {
  const queue=new AudioQueue({audioFactory:()=>new FakeAudio()}); queue.enqueue(clips[1]); queue.enqueue(clips[0]); await queue.playNext();
  assert.equal(queue.activeClip.id,'main'); queue.finishActive(); await queue.playNext(); assert.equal(queue.activeClip.id,'bridge');
});
test('supports pause, resume, ten-second rewind and restart', async () => {
  const queue=new AudioQueue({audioFactory:()=>new FakeAudio()}); queue.enqueue(clips[0]); await queue.playNext(); queue.audio.currentTime=17; assert.equal(queue.rewind(10),7); assert.equal(queue.audio.currentTime,7); queue.restore(13); assert.equal(queue.audio.currentTime,13); queue.restart(); assert.equal(queue.audio.currentTime,0); queue.pause(); assert.equal(queue.audio.paused,true); await queue.resume(); assert.equal(queue.audio.paused,false);
});
test('rewind falls back to the last reported progress when live time is temporarily zero', async () => {
  const queue=new AudioQueue({audioFactory:()=>new FakeAudio()}); queue.enqueue(clips[0]); await queue.playNext(); queue.audio.currentTime=0; assert.equal(queue.rewind(10,27),17); assert.equal(queue.audio.currentTime,17);
});
test('ducks and restores background music around foreground clips', async () => {
  const queue=new AudioQueue({audioFactory:()=>new FakeAudio()});const bgm=new FakeAudio();queue.setBgm(bgm,.4);queue.enqueue(clips[0]);await queue.playNext();assert.equal(bgm.volume,.12);queue.finishActive();assert.equal(bgm.volume,.4);
});
test('reuses one media element when advancing to the next queued clip', async () => {
  let factoryCalls=0;const queue=new AudioQueue({audioFactory:()=>{factoryCalls+=1;return new FakeAudio()}});queue.enqueue(clips[0]);queue.enqueue(clips[1]);await queue.playNext();const audio=queue.audio;assert.equal(queue.activeClip.id,'main');audio.listeners.ended();assert.equal(queue.activeClip.id,'bridge');assert.equal(queue.audio,audio);assert.equal(factoryCalls,1);
});
test('preserves an explicit sequence of silence and bridge clips', async () => {
  const queue=new AudioQueue({audioFactory:()=>new FakeAudio()});const sequence=[{id:'delay-1',kind:'system',src:'silence.mp3'},{id:'bridge-1',kind:'bridge',src:'one.mp3'},{id:'delay-2',kind:'system',src:'silence.mp3'},{id:'bridge-2',kind:'bridge',src:'two.mp3'}];queue.enqueueSequence(sequence);await queue.playNext();assert.equal(queue.activeClip.id,'delay-1');for(const expected of ['bridge-1','delay-2','bridge-2']){queue.audio.listeners.ended();assert.equal(queue.activeClip.id,expected)}
});
