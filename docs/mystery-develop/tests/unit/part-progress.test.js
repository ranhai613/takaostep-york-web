import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPartProgress } from '../../js/ui/renderer.js';

const parts = [
  { id: 'part-r', displayText: 'R' },
  { id: 'part-a', displayText: 'A' },
  { id: 'part-m', displayText: 'M' },
  { id: 'part-i', displayText: 'I' }
];

test('header progress reveals each canonical part slot as it is collected', () => {
  assert.equal(formatPartProgress(parts, []), '?/?/?/?');
  assert.equal(formatPartProgress(parts, ['part-r']), 'R/?/?/?');
  assert.equal(formatPartProgress(parts, ['part-r', 'part-a']), 'R/A/?/?');
  assert.equal(formatPartProgress(parts, ['part-r', 'part-a', 'part-m']), 'R/A/M/?');
  assert.equal(formatPartProgress(parts, ['part-r', 'part-a', 'part-m', 'part-i']), 'R/A/M/I');
});

test('header progress uses canonical slots rather than collection array order', () => {
  assert.equal(formatPartProgress(parts, ['part-m', 'part-r']), 'R/?/M/?');
});
