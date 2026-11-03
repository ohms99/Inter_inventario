import test from 'node:test';
import assert from 'node:assert/strict';
import { parseISO } from 'date-fns';
import { anchorSeriesToLatestSnapshot, realSnapshotDates } from './stockSeries.js';

const day1 = '2026-11-01T23:00:00.000Z';
const day2 = '2026-11-02T23:00:00.000Z';
const day3 = '2026-11-03T23:00:00.000Z';

function session(endDate, names) {
  const items = {};
  names.forEach((name) => {
    items[name] = { name };
  });
  return { endDate, items };
}

test('a bottle left out of the newest count is anchored at zero', () => {
  const history = [
    session(day1, ['Antillano', 'Patrón']),
    session(day2, ['Antillano', 'Patrón']),
    session(day3, ['Patrón']),
  ];
  const { latest, previous } = realSnapshotDates(history);
  const points = [
    { date: parseISO(day1), oz: 20, servings: 10, percentage: 80, name: 'Antillano', type: 'ron' },
    { date: parseISO(day2), oz: 10, servings: 5, percentage: 40, name: 'Antillano', type: 'ron' },
  ];

  const anchored = anchorSeriesToLatestSnapshot(points, latest, previous);

  assert.equal(anchored.length, 3);
  assert.equal(anchored[2].oz, 0);
  assert.equal(anchored[2].count, 0);
  assert.equal(anchored[2].servings, 0);
  assert.equal(anchored[2].percentage, 0);
  assert.equal(typeof anchored[2].percentage, 'number');
  assert.equal(anchored[2].date.getTime(), latest.getTime());
  assert.equal(anchored[2].name, 'Antillano');
  assert.equal(points.length, 2);
  assert.equal(points[1].oz, 10);
});

test('a bottle that was counted keeps its latest level', () => {
  const history = [
    session(day1, ['Patrón']),
    session(day2, ['Patrón']),
  ];
  const { latest, previous } = realSnapshotDates(history);
  const points = [
    { date: parseISO(day1), oz: 25, servings: 12, percentage: 90, name: 'Patrón', type: 'tequila' },
    { date: parseISO(day2), oz: 15, servings: 7, percentage: 55, name: 'Patrón', type: 'tequila' },
  ];

  const anchored = anchorSeriesToLatestSnapshot(points, latest, previous);

  assert.equal(anchored.length, 2);
  assert.equal(anchored[1].oz, 15);
  assert.equal(anchored[1].servings, 7);
});

test('a sold-out beer that was on the previous count ends at zero units', () => {
  const history = [
    session(day1, ['Miller High Life']),
    session(day2, ['Miller High Life']),
    session(day3, ['Indio']),
  ];
  const { latest, previous } = realSnapshotDates(history);
  const points = [
    { date: parseISO(day1), count: 24, name: 'Miller High Life', category: 'Media' },
    { date: parseISO(day2), count: 10, name: 'Miller High Life', category: 'Media' },
  ];

  const anchored = anchorSeriesToLatestSnapshot(points, latest, previous);

  assert.equal(anchored[anchored.length - 1].count, 0);
  assert.equal(anchored[anchored.length - 1].date.getTime(), parseISO(day3).getTime());
});

test('a product already missing before the latest count is not kept at its old level', () => {
  const history = [
    session(day1, ['Antillano']),
    session(day2, ['Patrón']),
    session(day3, ['Patrón']),
  ];
  const { latest, previous } = realSnapshotDates(history);
  const points = [
    { date: parseISO(day1), oz: 20, servings: 10, percentage: 80, name: 'Antillano', type: 'ron' },
  ];

  const anchored = anchorSeriesToLatestSnapshot(points, latest, previous);

  assert.deepEqual(anchored, []);
});

test('a trailing blank session is not the snapshot that clears stock', () => {
  const history = [
    session(day1, ['Antillano', 'Patrón']),
    session(day2, ['Antillano', 'Patrón']),
    { endDate: day3, items: {} },
  ];
  const { latest, previous } = realSnapshotDates(history);

  assert.equal(latest.toISOString(), day2);
  assert.equal(previous.toISOString(), day1);

  const points = [
    { date: parseISO(day1), oz: 20, servings: 10, percentage: 80, name: 'Antillano', type: 'ron' },
    { date: parseISO(day2), oz: 10, servings: 5, percentage: 40, name: 'Antillano', type: 'ron' },
  ];
  const anchored = anchorSeriesToLatestSnapshot(points, latest, previous);
  assert.equal(anchored.length, 2);
  assert.equal(anchored[1].oz, 10);
});
