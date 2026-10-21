function toNumber(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function finiteOrNull(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

// Bottles of the same product are stored as one row. Ounces and servings were
// already totaled; weight and fill percentage have to be totaled the same way
// or every bottle after the first is dropped from the saved session.
export function aggregateLiquorItems(items) {
  const grouped = {};

  for (const item of items) {
    const key = `${item.type}_${item.name}`;
    const volume = toNumber(item.volume);
    const percentage = toNumber(item.percentage);
    const weight = finiteOrNull(item.currentWeight_g);

    if (!grouped[key]) {
      grouped[key] = {
        item: { ...item },
        capacityMl: volume,
        fillMl: volume * (percentage / 100),
        weightG: weight,
        count: 1,
      };
      continue;
    }

    const group = grouped[key];
    group.count += 1;
    group.item.remainingFlOz = (
      toNumber(group.item.remainingFlOz) + toNumber(item.remainingFlOz)
    ).toFixed(2);
    group.item.servings += item.servings;
    group.capacityMl += volume;
    group.fillMl += volume * (percentage / 100);
    if (group.weightG != null && weight != null) {
      group.weightG += weight;
    } else {
      group.weightG = null;
    }
  }

  const result = {};
  for (const [key, group] of Object.entries(grouped)) {
    const item = group.item;
    if (group.count > 1) {
      if (group.capacityMl > 0) {
        item.percentage = ((group.fillMl / group.capacityMl) * 100).toFixed(1);
      }
      if (group.weightG == null) {
        delete item.currentWeight_g;
      } else {
        item.currentWeight_g = group.weightG;
      }
    }
    result[key] = item;
  }
  return result;
}
