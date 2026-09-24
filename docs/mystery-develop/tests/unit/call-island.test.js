import test from 'node:test';
import assert from 'node:assert/strict';
import { createCallIsland, formatCallDuration } from '../../js/ui/call-island.js';

test('call duration is elapsed wall time, including hours', () => {
  assert.equal(formatCallDuration(0), '00:00');
  assert.equal(formatCallDuration(65), '01:05');
  assert.equal(formatCallDuration(3661), '01:01:01');
});

test('call island stays visible while its playback controls follow the active clip', () => {
  const elements = new Map();
  for (const id of ['#call-duration','#call-toggle','#call-rewind','#call-restart']) {
    elements.set(id,{disabled:true,textContent:'',attributes:{},listeners:{},addEventListener(type,callback){this.listeners[type]=callback},setAttribute(name,value){this.attributes[name]=value}});
  }
  const root={hidden:true,dataset:{},querySelector(selector){return elements.get(selector)}};
  const actions=[];
  const island=createCallIsland(root,{onToggle:()=>actions.push('toggle'),onRewind:()=>actions.push('rewind'),onRestart:()=>actions.push('restart')});
  try {
    island.show(Date.now()-65000);
    assert.equal(root.hidden,false);
    assert.equal(elements.get('#call-duration').textContent,'01:05');
    island.updatePlayback({canToggle:true,canSeek:true,playing:true});
    assert.equal(elements.get('#call-toggle').disabled,false);
    assert.equal(elements.get('#call-toggle').attributes['aria-label'],'再生を一時停止');
    elements.get('#call-toggle').listeners.click();
    elements.get('#call-rewind').listeners.click();
    elements.get('#call-restart').listeners.click();
    assert.deepEqual(actions,['toggle','rewind','restart']);
    island.updatePlayback({canToggle:true});
    assert.equal(root.hidden,false);
    assert.equal(elements.get('#call-toggle').disabled,false);
    assert.equal(elements.get('#call-toggle').attributes['aria-label'],'通信を再生');
    assert.equal(elements.get('#call-rewind').disabled,true);
  } finally {
    island.hide();
  }
  assert.equal(root.hidden,true);
});
