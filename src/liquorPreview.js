// The confirm button stores the last calculation. Editing the grams or choosing
// another bottle does not recalculate, so a stale preview would record the
// previous bottle and weight.

export function isCurrentLiquorPreview(preview, { weight, type, label } = {}) {
  if (!preview) return false;

  const typedWeight = typeof weight === 'number' ? weight : parseFloat(weight);
  if (!Number.isFinite(typedWeight) || typedWeight !== preview.currentWeight_g) return false;
  if (preview.type !== type) return false;
  if (!label || preview.name !== label) return false;
  return true;
}
