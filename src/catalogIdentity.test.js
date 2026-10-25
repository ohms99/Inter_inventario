import assert from 'node:assert/strict';
import test from 'node:test';
import { planAddBeer, planAddLiquorBottle } from './catalogIdentity.js';

const beerCatalog = {
  miller_high_life_media: { label: 'Miller High Life', category: 'Media' },
  miller_high_life_caguama: { label: 'Miller High Life', category: 'Caguama' },
  XX_Lager_media: { label: 'XX Lager', category: 'Media' },
  carta_blanca_caguamita: { label: 'Carta Blanca', category: 'Caguamita' },
  indio_media: { label: 'Indio', category: 'Media' },
};

const liquorCatalog = {
  tequila: {
    patron: { label: 'Patrón', volume: 750, emptyWeight: 480, fullWeight: 1072 },
  },
  mezcal: {
    Apaluz: { label: 'Apaluz', volume: 750, emptyWeight: 485, fullWeight: 1190 },
  },
  vodka: {
    oso_negro: { label: 'Oso Negro', volume: 1000, emptyWeight: 665, fullWeight: 1620 },
  },
  licor: {
    flamingo_blue: { label: 'Flamingo Blue Curacao', volume: 1000, emptyWeight: 635, fullWeight: 1700 },
  },
};

test('re-adding a built-in multi-word beer reuses the existing catalog entry', () => {
  const plan = planAddBeer(beerCatalog, 'Miller High Life', 'Media');
  assert.equal(plan.ok, false);
  assert.equal(plan.reason, 'duplicate');
  assert.equal(plan.duplicate.key, 'miller_high_life_media');
});

test('mixed-case beer keys still count as the same product', () => {
  const plan = planAddBeer(beerCatalog, 'XX Lager', 'Media');
  assert.equal(plan.ok, false);
  assert.equal(plan.duplicate.key, 'XX_Lager_media');
});

test('hyphenated input matches underscore catalog keys', () => {
  const plan = planAddBeer(beerCatalog, 'Carta Blanca', 'Caguamita');
  assert.equal(plan.ok, false);
  assert.equal(plan.duplicate.key, 'carta_blanca_caguamita');
});

test('a different bottle size is not a duplicate', () => {
  const plan = planAddBeer(beerCatalog, 'Miller High Life', 'Lata');
  assert.equal(plan.ok, true);
  assert.equal(plan.key, 'miller_high_life_lata');
});

test('a beer that is not in the catalog can be added', () => {
  const plan = planAddBeer(beerCatalog, 'Corona Extra', 'Media');
  assert.equal(plan.ok, true);
  assert.equal(plan.key, 'corona_extra_media');
});

test('accented liquor labels match the unaccented catalog key', () => {
  const plan = planAddLiquorBottle(liquorCatalog.tequila, 'Patrón');
  assert.equal(plan.ok, false);
  assert.equal(plan.reason, 'duplicate');
  assert.equal(plan.duplicate.key, 'patron');
});

test('case-sensitive liquor keys match a lowercase re-entry', () => {
  const plan = planAddLiquorBottle(liquorCatalog.mezcal, 'Apaluz');
  assert.equal(plan.ok, false);
  assert.equal(plan.duplicate.key, 'Apaluz');
});

test('an existing liquor name is rejected even when the spacing differs', () => {
  const plan = planAddLiquorBottle(liquorCatalog.vodka, 'Oso  Negro');
  assert.equal(plan.ok, false);
  assert.equal(plan.duplicate.key, 'oso_negro');
});

test('a new liquor bottle receives a stable key', () => {
  const plan = planAddLiquorBottle(liquorCatalog.tequila, 'Don Julio 70');
  assert.equal(plan.ok, true);
  assert.equal(plan.key, 'don_julio_70');
});

test('the full flamingo label is the same bottle as its short catalog key', () => {
  const plan = planAddLiquorBottle(liquorCatalog.licor, 'Flamingo Blue Curacao');
  assert.equal(plan.ok, false);
  assert.equal(plan.duplicate.key, 'flamingo_blue');
});
