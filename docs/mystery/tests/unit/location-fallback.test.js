import test from 'node:test';
import assert from 'node:assert/strict';
import { showTravel } from '../../js/ui/screens.js';

test('manual arrival is a secondary action inside a closed location fallback', () => {
  let markup='';
  const handlers=new Map();
  globalThis.document={querySelector(selector){return {addEventListener(type,callback){handlers.set(`${selector}:${type}`,callback)}}}};
  try {
    let arrived=false;
    let retried=false;
    showTravel({render(value){markup=value}},{spot:{title:'第一観測点',directionText:'進む',safeStopText:'安全な場所'},index:1,inventory:'',onArrive(){arrived=true},onLocation(){retried=true}});
    assert.match(markup,/<details class="location-fallback"><summary>位置情報が上手く動かない場合<\/summary>[\s\S]*?id="manual-arrival"[\s\S]*?<\/details>/u);
    assert.doesNotMatch(markup,/<details class="location-fallback"[^>]*\sopen(?:\s|>)/u);
    assert.match(markup,/<button id="manual-arrival" class="secondary">この地点に到着した<\/button>/u);
    assert.doesNotMatch(markup,/class="arrival-button"/u);
    handlers.get('#location-start:click')();
    handlers.get('#manual-arrival:click')();
    assert.equal(retried,true);
    assert.equal(arrived,true);
  } finally {
    delete globalThis.document;
  }
});
