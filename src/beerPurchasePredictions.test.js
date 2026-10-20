import assert from 'node:assert/strict';
import test from 'node:test';
import { buildBeerPurchasePredictions } from './beerPurchasePredictions.js';

function session(endDate, items) {
  return { endDate, items };
}

test('predicts each bottle size separately when labels match', () => {
  const history = [
    session('2026-10-01T12:00:00.000Z', {
      miller_high_life_media: { label: 'Miller High Life', category: 'Media', count: 20 },
      miller_high_life_caguama: { label: 'Miller High Life', category: 'Caguama', count: 10 },
    }),
    session('2026-10-03T12:00:00.000Z', {
      miller_high_life_media: { label: 'Miller High Life', category: 'Media', count: 10 },
      miller_high_life_caguama: { label: 'Miller High Life', category: 'Caguama', count: 8 },
    }),
  ];

  const predictions = buildBeerPurchasePredictions(history);

  assert.equal(predictions.length, 2);
  const media = predictions.find(item => item.category === 'Media');
  const caguama = predictions.find(item => item.category === 'Caguama');

  assert.equal(media.latestCount, 10);
  assert.equal(media.avgDailyUnitConsumption, 5);
  assert.equal(media.daysLeft, 2);

  assert.equal(caguama.latestCount, 8);
  assert.equal(caguama.avgDailyUnitConsumption, 1);
  assert.equal(caguama.daysLeft, 8);
});

test('still predicts a single size from its own counts', () => {
  const history = [
    session('2026-10-01T12:00:00.000Z', {
      indio_media: { label: 'Indio', category: 'Media', count: 12 },
    }),
    session('2026-10-05T12:00:00.000Z', {
      indio_media: { label: 'Indio', category: 'Media', count: 4 },
    }),
  ];

  const predictions = buildBeerPurchasePredictions(history);

  assert.equal(predictions.length, 1);
  assert.equal(predictions[0].name, 'Indio');
  assert.equal(predictions[0].category, 'Media');
  assert.equal(predictions[0].avgDailyUnitConsumption, 2);
  assert.equal(predictions[0].daysLeft, 2);
});

test('returns no predictions until two sessions exist', () => {
  assert.deepEqual(buildBeerPurchasePredictions([]), []);
  assert.deepEqual(buildBeerPurchasePredictions([
    session('2026-10-01T12:00:00.000Z', {
      indio_media: { label: 'Indio', category: 'Media', count: 12 },
    }),
  ]), []);
});
