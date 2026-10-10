import test from 'node:test';
import assert from 'node:assert/strict';
import { Renderer } from '../../js/ui/renderer.js';

test('part-acquisition explanation is collapsed until the player opens it', () => {
  let markup='';
  let next;
  globalThis.document={querySelector(selector){assert.equal(selector,'#next-section');return {addEventListener(type,callback){assert.equal(type,'click');next=callback}}}};
  try {
    const renderer={render(value){markup=value},announce(){}};
    let advanced=false;
    Renderer.prototype.showPartAcquired.call(renderer,{image:'part.png',altText:'パーツ'},{explanation:'答えは <SUN> です'},'<div>回収済み</div>',()=>{advanced=true});
    assert.match(markup,/<details class="puzzle-explanation"><summary>謎の解説を見る<\/summary>/u);
    assert.doesNotMatch(markup,/<details[^>]*\sopen(?:\s|>)/u);
    assert.match(markup,/答えは &lt;SUN&gt; です/u);
    next();
    assert.equal(advanced,true);
  } finally {
    delete globalThis.document;
  }
});
