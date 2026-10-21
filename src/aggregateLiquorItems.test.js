import assert from 'node:assert/strict';
import test from 'node:test';
import { aggregateLiquorItems } from './aggregateLiquorItems.js';

test('sums weight and fill when two bottles of the same liquor are counted', () => {
  const items = aggregateLiquorItems([
    {
      type: 'tequila',
      name: 'Patrón',
      volume: 750,
      percentage: '50.0',
      remainingFlOz: '12.68',
      servings: 8,
      currentWeight_g: 776,
    },
    {
      type: 'tequila',
      name: 'Patrón',
      volume: 750,
      percentage: '100.0',
      remainingFlOz: '25.36',
      servings: 16,
      currentWeight_g: 1072,
    },
  ]);

  assert.deepEqual(Object.keys(items), ['tequila_Patrón']);
  const patron = items['tequila_Patrón'];
  assert.equal(patron.currentWeight_g, 1848);
  assert.equal(patron.percentage, '75.0');
  assert.equal(patron.remainingFlOz, '38.04');
  assert.equal(patron.servings, 24);
  assert.equal(patron.volume, 750);
});

test('keeps a single bottle measurement unchanged', () => {
  const source = {
    type: 'ron',
    name: 'Antillano',
    volume: 1000,
    percentage: '40.0',
    remainingFlOz: '13.53',
    servings: 9,
    currentWeight_g: 1007,
  };
  const items = aggregateLiquorItems([source]);
  assert.deepEqual(items.ron_Antillano, source);
  assert.notEqual(items.ron_Antillano, source);
});

test('does not mix different products', () => {
  const items = aggregateLiquorItems([
    {
      type: 'vodka',
      name: 'Oso Negro',
      volume: 1000,
      percentage: '80.0',
      remainingFlOz: '27.05',
      servings: 18,
      currentWeight_g: 1429,
    },
    {
      type: 'ginebra',
      name: 'Oso Negro',
      volume: 1000,
      percentage: '20.0',
      remainingFlOz: '6.76',
      servings: 4,
      currentWeight_g: 856,
    },
  ]);

  assert.equal(items['vodka_Oso Negro'].currentWeight_g, 1429);
  assert.equal(items['ginebra_Oso Negro'].currentWeight_g, 856);
  assert.equal(items['vodka_Oso Negro'].percentage, '80.0');
});

test('drops combined weight when any bottle in the group has no weight', () => {
  const items = aggregateLiquorItems([
    {
      type: 'tequila',
      name: 'Patrón',
      volume: 750,
      percentage: '50.0',
      remainingFlOz: '12.68',
      servings: 8,
      currentWeight_g: 776,
    },
    {
      type: 'tequila',
      name: 'Patrón',
      volume: 750,
      percentage: '50.0',
      remainingFlOz: '12.68',
      servings: 8,
    },
  ]);

  assert.equal(items['tequila_Patrón'].currentWeight_g, undefined);
  assert.equal(items['tequila_Patrón'].percentage, '50.0');
  assert.equal(items['tequila_Patrón'].remainingFlOz, '25.36');
});
