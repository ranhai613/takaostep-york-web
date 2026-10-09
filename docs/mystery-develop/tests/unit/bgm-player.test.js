import test from 'node:test';
import assert from 'node:assert/strict';
import { BgmPlayer } from '../../js/services/bgm-player.js';
import { BGM_SOURCES } from '../../js/core/bgm-flow.js';
import { AudioQueue } from '../../js/services/audio-queue.js';

const flush=()=>new Promise(resolve=>setImmediate(resolve));
class FakeClock {
  time=0;serial=0;timers=new Map();
  now=()=>this.time;
  setTimer=(callback,delay)=>{const id=++this.serial;this.timers.set(id,{at:this.time+delay,callback});return id};
  clearTimer=id=>this.timers.delete(id);
  async advance(ms){
    const target=this.time+ms;
    await flush();
    while(true){
      const next=[...this.timers].sort((a,b)=>a[1].at-b[1].at)[0];
      if(!next||next[1].at>target)break;
      this.time=next[1].at;this.timers.delete(next[0]);next[1].callback();await flush();
    }
    this.time=target;await flush();
  }
}
class FakeAudio {
  currentTime=0;paused=true;volume=1;playCalls=[];listeners={};
  play(){this.playCalls.push({src:this.src,volume:this.volume});this.paused=false;return Promise.resolve()}
  pause(){this.paused=true}
  addEventListener(name,callback){this.listeners[name]=callback}
}
function setup(options={}){
  const clock=new FakeClock(),audio=new FakeAudio();
  const player=new BgmPlayer({audioFactory:()=>audio,contextFactory:()=>null,fadeMs:320,now:clock.now,setTimer:clock.setTimer,clearTimer:clock.clearTimer,...options});
  return {player,audio,clock};
}

test('default browser timers are called on the global object, not the player',async()=>{
  const originalSet=globalThis.setTimeout,originalClear=globalThis.clearTimeout;
  const timers=new Map(),errors=[];
  let serial=0;
  try{
    globalThis.setTimeout=function(callback){assert.equal(this,globalThis);const id=++serial;timers.set(id,callback);return id};
    globalThis.clearTimeout=function(id){assert.equal(this,globalThis);timers.delete(id)};
    const audio=new FakeAudio();
    const param={value:1,cancelScheduledValues(){},setValueAtTime(){},linearRampToValueAtTime(){}};
    const node=()=>({gain:{...param},connect(next){return next}});
    const context={currentTime:0,destination:{},createMediaElementSource:node,createGain:node,resume:()=>Promise.resolve()};
    const player=new BgmPlayer({audioFactory:()=>audio,contextFactory:()=>context,onError:error=>errors.push(error)});
    await player.unlock();
    const first=player.switchTo('ki');await flush();
    assert.equal(timers.size,1);
    const stop=player.switchTo(null);await flush();
    for(const [id,callback] of [...timers]){timers.delete(id);callback()}
    await Promise.all([first,stop]);
    assert.deepEqual(errors,[]);assert.equal(audio.paused,true);
  }finally{globalThis.setTimeout=originalSet;globalThis.clearTimeout=originalClear}
});

test('loops BGM and preserves playback across screens assigned to the same track',async()=>{
  const {player,audio,clock}=setup();
  const first=player.switchTo('ki');await clock.advance(320);await first;
  assert.equal(audio.loop,true);assert.equal(audio.paused,false);assert.equal(audio.volume,.35);
  audio.currentTime=42;
  await player.switchTo('ki');
  assert.equal(audio.currentTime,42);assert.equal(audio.playCalls.length,1);
});

test('fades the old track to zero before starting and fading in the next one',async()=>{
  const {player,audio,clock}=setup();
  const first=player.switchTo('ki');await clock.advance(320);await first;
  const next=player.switchTo('shou');
  await clock.advance(160);
  assert.equal(audio.src,BGM_SOURCES.ki);assert.equal(audio.volume,.35/2);
  await clock.advance(160);
  assert.equal(audio.src,BGM_SOURCES.shou);assert.equal(audio.volume,0);
  assert.equal(audio.playCalls.at(-1).volume,0);
  await clock.advance(160);assert.equal(audio.volume,.35/2);
  await clock.advance(160);await next;assert.equal(audio.volume,.35);
});

test('rapid navigation cancels stale transitions and only starts the latest track',async()=>{
  const {player,audio,clock}=setup();
  const first=player.switchTo('ki');await clock.advance(320);await first;
  const skipped=player.switchTo('shou');await clock.advance(160);
  const latest=player.switchTo('ten');await clock.advance(640);
  await Promise.all([skipped,latest]);
  assert.deepEqual(audio.playCalls.map(call=>call.src),[BGM_SOURCES.ki,BGM_SOURCES.ten]);
  assert.equal(audio.volume,.35);assert.equal(clock.timers.size,0);
});

test('returning to preparation cancels a pending switch and stops music after fading',async()=>{
  const {player,audio,clock}=setup();
  const first=player.switchTo('ki');await clock.advance(320);await first;
  const pending=player.switchTo('shou');await clock.advance(160);
  const stopped=player.switchTo(null);await clock.advance(320);
  await Promise.all([pending,stopped]);
  assert.equal(audio.paused,true);assert.equal(audio.volume,0);assert.equal(player.currentTrack,null);
  assert.equal(audio.playCalls.length,1);assert.equal(clock.timers.size,0);
});

test('a user gesture silently primes the reused BGM element before the incoming screen',async()=>{
  const {player,audio}=setup({fadeMs:0});
  await player.unlock();
  assert.equal(audio.playCalls[0].volume,0);assert.equal(audio.paused,true);
  await player.switchTo('ki');await player.switchTo('shou');
  assert.equal(audio.loop,true);assert.equal(audio.src,BGM_SOURCES.shou);assert.equal(audio.paused,false);
});

test('blocked autoplay retries the selected track on the next user gesture',async()=>{
  const {player,audio}=setup({fadeMs:0});
  const play=audio.play.bind(audio);
  audio.play=()=>Promise.reject(Object.assign(new Error('gesture required'),{name:'NotAllowedError'}));
  await player.switchTo('ten');assert.equal(audio.volume,0);
  audio.play=play;await player.unlock();
  assert.equal(audio.src,BGM_SOURCES.ten);assert.equal(audio.paused,false);assert.equal(audio.volume,.35);
});

test('Web Audio fades and foreground volume use separate gains on mobile browsers',async()=>{
  const events=[];
  const node=name=>({
    connect(next){events.push([name,'connect',next.name]);return next},name,
    gain:{value:1,cancelScheduledValues:time=>events.push([name,'cancel',time]),setValueAtTime:(value,time)=>events.push([name,'set',value,time]),linearRampToValueAtTime:(value,time)=>events.push([name,'ramp',value,time]),setTargetAtTime:(value,time,constant)=>events.push([name,'target',value,time,constant])}
  });
  let gainCount=0;
  const context={currentTime:0,destination:{name:'output'},createMediaElementSource:()=>node('source'),createGain:()=>node(`gain-${++gainCount}`),resume:()=>Promise.resolve()};
  const {player,audio,clock}=setup({contextFactory:()=>context});
  await player.unlock();
  const queue=new AudioQueue({audioFactory:()=>new FakeAudio()});queue.setBgm(player,.4);
  const first=player.switchTo('ki');await clock.advance(320);await first;
  const next=player.switchTo('shou');
  queue.enqueue({id:'voice',kind:'main',src:'voice.mp3'});await queue.playNext();
  assert.equal(player.volume,.12);assert.equal(audio.volume,1);
  await clock.advance(640);await next;assert.equal(player.volume,.12);
  queue.finishActive();assert.equal(player.volume,.4);
  assert.ok(events.some(event=>event[0]==='gain-1'&&event[1]==='ramp'&&event[2]===0));
  assert.ok(events.some(event=>event[0]==='gain-1'&&event[1]==='ramp'&&event[2]===1));
  assert.ok(events.some(event=>event[0]==='gain-2'&&event[1]==='target'&&event[2]===.12));
  assert.deepEqual(events.filter(event=>event[1]==='connect'),[['source','connect','gain-1'],['gain-1','connect','gain-2'],['gain-2','connect','output']]);
});
