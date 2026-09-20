import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioQueue } from '../../js/services/audio-queue.js';

class FakeAudio { constructor(){this.currentTime=0;this.paused=true;this.volume=1;this.listeners={}} addEventListener(n,f){this.listeners[n]=f} play(){this.paused=false;return Promise.resolve()} pause(){this.paused=true} }
const clips=[{id:'main',kind:'main',src:'main.mp3',priority:10},{id:'bridge',kind:'bridge',src:'bridge.mp3',priority:1}];
test('queue never interrupts and prioritizes bridge while idle', async () => {
  const queue=new AudioQueue({audioFactory:()=>new FakeAudio()}); queue.enqueue(clips[0]); await queue.playNext(); queue.enqueue(clips[1]);
  assert.equal(queue.activeClip.id,'main'); queue.finishActive(); await queue.playNext(); assert.equal(queue.activeClip.id,'bridge');
});
test('supports pause, resume, ten-second rewind and restart', async () => {
  const queue=new AudioQueue({audioFactory:()=>new FakeAudio()}); queue.enqueue(clips[0]); await queue.playNext(); queue.audio.currentTime=17; queue.rewind(10); assert.equal(queue.audio.currentTime,7); queue.restore(13); assert.equal(queue.audio.currentTime,13); queue.restart(); assert.equal(queue.audio.currentTime,0); queue.pause(); assert.equal(queue.audio.paused,true); await queue.resume(); assert.equal(queue.audio.paused,false);
});
test('ducks and restores background music around foreground clips', async () => {
  const queue=new AudioQueue({audioFactory:()=>new FakeAudio()});const bgm=new FakeAudio();queue.setBgm(bgm,.4);queue.enqueue(clips[0]);await queue.playNext();assert.equal(bgm.volume,.12);queue.finishActive();assert.equal(bgm.volume,.4);
});
