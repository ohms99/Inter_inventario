import assert from 'node:assert/strict';
import test from 'node:test';
import { bottleOzSeries, bottlesInHistory, historyItemKey } from './bottleHistoryChart.js';

function session(endDate, items) {
  return { endDate, items };
}

test('lists bottles that were actually counted, not a separate fallback catalog', () => {
  const history = [
    session('2026-10-24T06:00:00.000Z', {
      [historyItemKey('ron', 'Antillano')]: { type: 'ron', name: 'Antillano', remainingFlOz: '23.67' },
      [historyItemKey('tequila', 'Patrón')]: { type: 'tequila', name: 'Patrón', remainingFlOz: '20.28' },
      [historyItemKey('mezcal', 'Apaluz')]: { type: 'mezcal', name: 'Apaluz', remainingFlOz: '12.00' },
    }),
  ];

  const bottles = bottlesInHistory(history);

  assert.deepEqual(bottles.ron, ['Antillano']);
  assert.deepEqual(bottles.tequila, ['Patrón']);
  assert.deepEqual(bottles.mezcal, ['Apaluz']);
  assert.equal(bottles.whiskey, undefined);
  assert.equal(bottles.Herradura, undefined);
});

test('graphs remaining ounces for a built-in bottle the fallback catalog omitted', () => {
  const history = [
    session('2026-10-24T06:00:00.000Z', {
      ron_Antillano: { type: 'ron', name: 'Antillano', remainingFlOz: '23.67' },
    }),
    session('2026-10-25T06:00:00.000Z', {
      ron_Antillano: { type: 'ron', name: 'Antillano', remainingFlOz: '13.53' },
    }),
  ];

  const series = bottleOzSeries(history, 'ron', 'Antillano');

  assert.equal(historyItemKey('ron', 'Antillano'), 'ron_Antillano');
  assert.deepEqual(series.map(point => point.oz), [23.67, 13.53]);
});

test('ignores sessions with no items and empty history', () => {
  assert.deepEqual(bottlesInHistory([]), {});
  assert.deepEqual(bottlesInHistory(null), {});
  assert.deepEqual(bottlesInHistory([
    { endDate: '2026-10-24T06:00:00.000Z', items: {} },
    { endDate: '2026-10-25T06:00:00.000Z' },
  ]), {});
  assert.deepEqual(bottleOzSeries([], 'ron', 'Antillano'), []);
});
