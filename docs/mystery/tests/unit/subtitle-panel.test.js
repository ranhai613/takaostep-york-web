import test from 'node:test';
import assert from 'node:assert/strict';
import { Renderer, subtitlePanel } from '../../js/ui/renderer.js';
import { showFinal } from '../../js/ui/screens.js';

test('subtitles are escaped and initially collapsed', () => {
  const markup=subtitlePanel('ミラ：<通信>\n次の行');
  assert.match(markup,/<details class="subtitle-panel"><summary>字幕を確認する<\/summary>/u);
  assert.match(markup,/ミラ：&lt;通信&gt;/u);
  assert.doesNotMatch(markup,/<details[^>]*\sopen(?:\s|>)/u);
  assert.equal(subtitlePanel(''),'');
});

test('ending keeps its transcript behind the same disclosure', () => {
  let markup='';
  globalThis.document={querySelector(){return {addEventListener(){}}}};
  try {
    Renderer.prototype.showEnding.call({render(value){markup=value}},'ミラ：またね',()=>{});
    assert.match(markup,/<details class="subtitle-panel">/u);
    assert.match(markup,/ミラ：またね/u);
    assert.match(markup,/id="ending-complete"/u);
  } finally {
    delete globalThis.document;
  }
});

test('final authentication keeps the connection transcript collapsed', () => {
  let markup='';
  globalThis.document={querySelectorAll(){return []},querySelector(){return {addEventListener(){}}}};
  try {
    const parts=['R','A','M','I'].map(letter=>({displayText:letter,image:`${letter}.png`,altText:'船体パーツ'}));
    showFinal({render(value){markup=value}},{puzzle:{prompt:'並べ替える',hints:['一','二','三']},parts,subtitle:'ミラ：接続を確認するよ',order:['R','A','M','I'],selected:null,inventory:'',hintCount:3,onSelect(){},onSubmit(){},onHint(){}});
    assert.match(markup,/<details class="subtitle-panel">/u);
    assert.match(markup,/ミラ：接続を確認するよ/u);
    assert.doesNotMatch(markup,/<details[^>]*\sopen(?:\s|>)/u);
  } finally {
    delete globalThis.document;
  }
});
