import assert from 'node:assert/strict';
import test from 'node:test';
import { parseBeerCount } from './parseBeerCount.js';

test('accepts zero so a sold-out beer can be recorded', () => {
  assert.equal(parseBeerCount('0'), 0);
  assert.equal(parseBeerCount('00'), 0);
});

test('accepts a positive unit count', () => {
  assert.equal(parseBeerCount('18'), 18);
});

test('rejects blank, negative, and non-numeric counts', () => {
  assert.equal(parseBeerCount(''), null);
  assert.equal(parseBeerCount('   '), null);
  assert.equal(parseBeerCount('-1'), null);
  assert.equal(parseBeerCount('abc'), null);
  assert.equal(parseBeerCount('0.5'), null);
  assert.equal(parseBeerCount('8abc'), null);
});
