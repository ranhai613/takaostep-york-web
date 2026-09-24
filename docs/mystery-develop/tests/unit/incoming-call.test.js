import test from 'node:test';
import assert from 'node:assert/strict';
import { showIncomingCall } from '../../js/ui/screens.js';

test('incoming screen offers an answer action without the old terminal screen', () => {
  const listeners = new Map();
  let html = '';
  globalThis.document = {
    querySelector(selector) {
      if (selector === '#ring-replay') return null;
      return { addEventListener(type, callback) { listeners.set(`${selector}:${type}`, callback); } };
    }
  };
  try {
    let answered = false;
    showIncomingCall({ render(value) { html = value; } }, { onAnswer() { answered = true; } });
    assert.match(html, /INCOMING CALL/u);
    assert.match(html, /通話開始/u);
    assert.doesNotMatch(html, /TERMINAL FOUND|未知の端末を発見/u);
    listeners.get('#answer-call:click')();
    assert.equal(answered, true);
  } finally {
    delete globalThis.document;
  }
});
