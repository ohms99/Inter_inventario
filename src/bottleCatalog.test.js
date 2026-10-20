import assert from 'node:assert/strict';
import test from 'node:test';
import { loadStoredBottleCatalog } from './bottleCatalog.js';

const defaults = {
  tequila: {
    patron: { label: 'Patrón', volume: 750, emptyWeight: 480, fullWeight: 1072 },
  },
};

test('keeps custom bottles saved alongside the built-in catalog', () => {
  const stored = {
    tequila: {
      patron: { label: 'Patrón', volume: 750, emptyWeight: 480, fullWeight: 1072 },
      don_julio: { label: 'Don Julio 70', volume: 700, emptyWeight: 500, fullWeight: 1180 },
    },
    mezcal: {
      apaluz: { label: 'Apaluz', volume: 750, emptyWeight: 485, fullWeight: 1190 },
    },
  };

  const loaded = loadStoredBottleCatalog(JSON.stringify(stored), defaults);

  assert.equal(loaded.tequila.don_julio.label, 'Don Julio 70');
  assert.equal(loaded.tequila.don_julio.fullWeight, 1180);
  assert.equal(loaded.mezcal.apaluz.label, 'Apaluz');
  assert.equal(loaded.tequila.patron.fullWeight, 1072);
});

test('repairs a built-in bottle missing weights without dropping custom bottles', () => {
  const stored = {
    tequila: {
      patron: { label: 'Patrón', volume: 750 },
      don_julio: { label: 'Don Julio 70', volume: 700, emptyWeight: 500, fullWeight: 1180 },
    },
  };

  const loaded = loadStoredBottleCatalog(JSON.stringify(stored), defaults);

  assert.equal(loaded.tequila.patron.fullWeight, 1072);
  assert.equal(loaded.tequila.patron.emptyWeight, 480);
  assert.equal(loaded.tequila.don_julio.label, 'Don Julio 70');
});

test('falls back to defaults when stored catalog JSON is corrupt', () => {
  const loaded = loadStoredBottleCatalog('{not json', defaults);
  assert.equal(loaded, defaults);
});

test('uses defaults when nothing has been stored', () => {
  assert.equal(loadStoredBottleCatalog(null, defaults), defaults);
  assert.equal(loadStoredBottleCatalog('', defaults), defaults);
});
