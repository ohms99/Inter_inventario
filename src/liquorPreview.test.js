import assert from 'node:assert/strict';
import test from 'node:test';
import { isCurrentLiquorPreview } from './liquorPreview.js';

const patronPreview = {
  type: 'tequila',
  name: 'Patrón',
  currentWeight_g: 776,
  percentage: '50.0',
  remainingFlOz: '12.68',
  servings: 8,
};

test('the preview can be saved when the bottle and weight are unchanged', () => {
  assert.equal(
    isCurrentLiquorPreview(patronPreview, { weight: '776', type: 'tequila', label: 'Patrón' }),
    true,
  );
});

test('a corrected scale weight is not the weight that was calculated', () => {
  assert.equal(
    isCurrentLiquorPreview(patronPreview, { weight: '900', type: 'tequila', label: 'Patrón' }),
    false,
  );
});

test('switching bottles keeps the preview from being filed under the new name', () => {
  assert.equal(
    isCurrentLiquorPreview(patronPreview, { weight: '776', type: 'ron', label: 'Antillano' }),
    false,
  );
});

test('decimal weight text matches the number stored on the preview', () => {
  assert.equal(
    isCurrentLiquorPreview(patronPreview, { weight: '776.0', type: 'tequila', label: 'Patrón' }),
    true,
  );
});

test('nothing is current when calculation has not produced a preview', () => {
  assert.equal(
    isCurrentLiquorPreview(null, { weight: '776', type: 'tequila', label: 'Patrón' }),
    false,
  );
});
