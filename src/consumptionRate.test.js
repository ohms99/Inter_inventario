import assert from 'node:assert/strict';
import test from 'node:test';
import { differenceInDays } from 'date-fns';
import { summarizeConsumption } from './consumptionRate.js';

const noon = (year, month, day) => new Date(year, month, day, 12, 0, 0);

test('unsold days between counts stay in the daily rate', () => {
  // 30 oz on June 1, still 30 oz on June 11, then 20 oz on June 12.
  // The quiet ten days are real time. Dropping them reports 10 oz/day
  // and 2 days of stock instead of 10 oz across 11 days (about 22 days left).
  const day0 = noon(2026, 5, 1);
  const day10 = noon(2026, 5, 11);
  const day11 = noon(2026, 5, 12);

  const result = summarizeConsumption([
    { date: day0, amount: 30 },
    { date: day10, amount: 30 },
    { date: day11, amount: 20 },
  ]);

  const quietDays = differenceInDays(day10, day0);
  const saleDays = differenceInDays(day11, day10);
  assert.equal(result.periodsCount, 1);
  assert.equal(result.totalConsumed, 10);
  assert.equal(result.totalDays, quietDays + saleDays);
  assert.ok(result.totalDays > saleDays);

  const daysLeft = 20 / (result.totalConsumed / result.totalDays);
  assert.equal(daysLeft, 22);
});

test('a bottle that never drops is not treated as consumption', () => {
  const result = summarizeConsumption([
    { date: noon(2026, 5, 1), amount: 24 },
    { date: noon(2026, 5, 8), amount: 24 },
    { date: noon(2026, 5, 15), amount: 24 },
  ]);

  assert.equal(result.periodsCount, 0);
  assert.equal(result.totalConsumed, 0);
  assert.ok(result.totalDays > 0);
});

test('a restock is ignored and a later drop is kept', () => {
  const result = summarizeConsumption([
    { date: noon(2026, 5, 1), amount: 10 },
    { date: noon(2026, 5, 2), amount: 24 },
    { date: noon(2026, 5, 4), amount: 16 },
  ]);

  assert.equal(result.periodsCount, 1);
  assert.equal(result.totalConsumed, 8);
  assert.equal(result.totalDays, 2);
});

test('a steady drop still uses the whole gap', () => {
  const earlier = noon(2026, 5, 1);
  const later = noon(2026, 5, 11);
  const result = summarizeConsumption([
    { date: earlier, amount: 30 },
    { date: later, amount: 10 },
  ]);

  assert.equal(result.periodsCount, 1);
  assert.equal(result.totalConsumed, 20);
  assert.equal(result.totalDays, differenceInDays(later, earlier));
});
