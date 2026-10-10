import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAnswer, isAcceptedAnswer } from '../../js/core/answer-normalizer.js';

test('normalizes case, trim and fullwidth ASCII', () => assert.equal(normalizeAnswer('  ｕＮｉＶｅＲｓＥ  ', ['trim','fullwidth-to-ascii','case-fold']), 'UNIVERSE'));
test('normalizes spaces and hyphens for numbers', () => assert.equal(normalizeAnswer('５９９ - ７', ['fullwidth-to-ascii','remove-space','remove-hyphen']), '5997'));
test('compares accepted answers with the same rules', () => assert.equal(isAcceptedAnswer(' holes ', ['HOLES'], ['trim','case-fold']), true));
