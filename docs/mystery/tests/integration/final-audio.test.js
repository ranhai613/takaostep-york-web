import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { AudioQueue } from '../../js/services/audio-queue.js';
import { buildDebugState } from '../../js/core/debug-progress.js';

test('Q4 starts its connection audio once and keeps replay available after completion',async()=>{
  const source=await readFile(new URL('../../js/main.js',import.meta.url),'utf8');
  const content=JSON.parse(await readFile(new URL('../../data/content.json',import.meta.url),'utf8'));
  const state=buildDebugState(content.releaseId,'final');
  const clip=content.audioClips.find(item=>item.id==='audio-final-connection');
  let plays=0;
  const media={paused:true,currentTime:0,addEventListener(){},pause(){this.paused=true},play(){this.paused=false;plays++;return Promise.resolve()}};
  const audioQueue=new AudioQueue({audioFactory:()=>media});
  const requests=[];
  const handleAudio=(action,clips)=>{
    requests.push(action);
    if(action==='priority-play')audioQueue.clear();
    clips.forEach(item=>audioQueue.enqueue(item));
    return audioQueue.playNext();
  };
  const extract=name=>{
    const start=source.indexOf(`function ${name}(`);
    assert.ok(start>=0,`${name} must exist`);
    return source.slice(start,source.indexOf('\n}',start)+2);
  };
  const {renderFinal,availableCallClips}=new Function('context',`
    const {state,content,audioQueue,handleAudio}=context;
    const showFinal=()=>{},inventory=()=>'',hintCount=()=>0,renderer={};
    const clipById=id=>content.audioClips.find(clip=>clip.id===id);
    let selectedLetter=null;
    ${extract('renderFinal')}
    ${extract('availableCallClips')}
    return {renderFinal,availableCallClips};
  `)({state,content,audioQueue,handleAudio});

  renderFinal();await Promise.resolve();
  assert.equal(media.src,clip.src);assert.equal(media.paused,false);assert.equal(plays,1);
  media.currentTime=20;
  renderFinal();assert.equal(media.currentTime,20);assert.equal(plays,1);
  audioQueue.finishActive();state.listenedAudioIds.push(clip.id);
  renderFinal();assert.equal(plays,1);
  const replay=availableCallClips();assert.equal(replay[0],clip);
  await handleAudio('play',replay);assert.equal(plays,2);
  assert.deepEqual(requests,['priority-play','play']);
});
