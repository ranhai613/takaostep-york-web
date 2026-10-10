import test from 'node:test';
import assert from 'node:assert/strict';
import { showIntro, showTravel, showPuzzleBriefing } from '../../js/ui/screens.js';

test('story screens keep navigation actions but no duplicate audio controls', () => {
  globalThis.document={querySelector(){return {addEventListener(){}}}};
  const rendered=[];
  const renderer={render(markup){rendered.push(markup)}};
  try {
    showIntro(renderer,{clip:{subtitle:'導入'},onNext(){}});
    showTravel(renderer,{spot:{title:'地点',directionText:'進む',safeStopText:'止まる'},index:1,subtitle:'移動通信',inventory:'',onArrive(){},onLocation(){}});
    showPuzzleBriefing(renderer,{puzzle:{order:1},clip:{subtitle:'通信'},onContinue(){}});
  } finally {
    delete globalThis.document;
  }
  assert.equal(rendered.length,3);
  for(const markup of rendered){
    assert.doesNotMatch(markup,/id="(?:intro|audio|briefing)-(?:play|pause|rewind|restart)"/u);
    assert.match(markup,/<details class="subtitle-panel"><summary>字幕を確認する<\/summary>/u);
    assert.doesNotMatch(markup,/<details[^>]*\sopen(?:\s|>)/u);
  }
  assert.match(rendered[0],/id="intro-next"/u);
  assert.match(rendered[1],/id="manual-arrival"/u);
  assert.match(rendered[1],/現在地を再取得/u);
  assert.match(rendered[2],/id="open-puzzle"/u);
});
