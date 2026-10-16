import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPartProgress } from '../../js/ui/renderer.js';

const parts = [
  { id: 'part-a', displayText: 'A' },
  { id: 'part-i', displayText: 'I' },
  { id: 'part-r', displayText: 'R' },
  { id: 'part-m', displayText: 'M' }
];

test('header progress reports only the number of recovered parts', () => {
  assert.equal(formatPartProgress(parts, []), '0/4');
  assert.equal(formatPartProgress(parts, ['part-r']), '1/4');
  assert.equal(formatPartProgress(parts, ['part-r', 'part-a']), '2/4');
  assert.equal(formatPartProgress(parts, ['part-a', 'part-i', 'part-r']), '3/4');
  assert.equal(formatPartProgress(parts, ['part-a', 'part-i', 'part-r', 'part-m']), '4/4');
});

test('header progress is independent of collection order', () => {
  assert.equal(formatPartProgress(parts, ['part-m', 'part-r']), '2/4');
});
