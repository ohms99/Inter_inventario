import test from 'node:test';
import assert from 'node:assert/strict';
import {
  averageRemainingPercent,
  canSaveLiquorInventory,
  latestCountedSession,
  previousCountedSession,
} from './liquorSessions.js';

const patron = (oz, grams) => ({
  remainingFlOz: oz,
  currentWeight_g: grams,
  servings: 2,
  percentage: '8.0',
  name: 'Patrón',
  type: 'tequila',
});

test('an inventory with no bottles is not saved', () => {
  assert.equal(canSaveLiquorInventory([]), false);
  assert.equal(canSaveLiquorInventory(null), false);
  assert.equal(canSaveLiquorInventory([patron('20.00', 900)]), true);
});

test('a blank session does not become the baseline for the next count', () => {
  const history = [
    { items: { tequila_Patrón: patron('20.00', 900) } },
    { items: {} },
    { items: { tequila_Patrón: patron('8.00', 700) } },
  ];

  const previous = previousCountedSession(history, 2);
  assert.equal(previous, history[0]);

  const current = history[2].items.tequila_Patrón;
  const prior = previous.items.tequila_Patrón;
  assert.equal(parseFloat(prior.remainingFlOz) - parseFloat(current.remainingFlOz), 12);
  assert.equal(prior.currentWeight_g - current.currentWeight_g, 200);
});

test('a trailing blank session does not hide the last real count', () => {
  const history = [
    { items: { tequila_Patrón: patron('8.00', 700) } },
    { items: {} },
  ];

  assert.equal(latestCountedSession(history), history[0]);
  assert.equal(latestCountedSession([{ items: {} }]), null);
  assert.equal(latestCountedSession([]), null);
});

test('a blank session has no average fill for the session chart', () => {
  assert.equal(averageRemainingPercent({ items: {} }), null);
  assert.equal(averageRemainingPercent({}), null);
  assert.equal(
    averageRemainingPercent({
      items: {
        a: { percentage: '40.0' },
        b: { percentage: '60.0' },
      },
    }),
    50,
  );
});
