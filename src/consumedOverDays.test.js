import assert from 'node:assert/strict';
import test from 'node:test';
import { consumedOverDays } from './consumedOverDays.js';

test('counts consumption between a close and the next close when the gap is under 24 hours', () => {
  // 11:00pm then 10:00pm the next night is 23 hours and two calendar days.
  const earlier = new Date(2026, 9, 21, 23, 0, 0);
  const later = new Date(2026, 9, 22, 22, 0, 0);

  const result = consumedOverDays([
    { date: earlier, amount: 20 },
    { date: later, amount: 8 },
  ]);

  assert.equal(result.periodsCount, 1);
  assert.equal(result.totalDays, 1);
  assert.equal(result.totalConsumed, 12);
  assert.equal(8 / (result.totalConsumed / result.totalDays), 8 / 12);
});

test('does not turn a same-day recount into a daily consumption rate', () => {
  const earlier = new Date(2026, 9, 22, 18, 0, 0);
  const later = new Date(2026, 9, 22, 20, 0, 0);

  const result = consumedOverDays([
    { date: earlier, amount: 20 },
    { date: later, amount: 18 },
  ]);

  assert.equal(result.periodsCount, 0);
  assert.equal(result.totalConsumed, 0);
});

test('ignores restocks and keeps later nights that actually dropped', () => {
  const result = consumedOverDays([
    { date: new Date(2026, 9, 20, 23, 0, 0), amount: 10 },
    { date: new Date(2026, 9, 21, 22, 0, 0), amount: 24 },
    { date: new Date(2026, 9, 22, 22, 30, 0), amount: 16 },
  ]);

  assert.equal(result.periodsCount, 1);
  assert.equal(result.totalConsumed, 8);
  assert.equal(result.totalDays, 1);
});
