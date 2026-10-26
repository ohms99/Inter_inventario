import { parseISO } from 'date-fns';

// Inventory rows are stored under type + bottle label. The dashboard graph
// must use that same key. The old fallback catalog (Herradura, Jack Daniel's)
// did not contain the bottles the tracker actually counts.
export function historyItemKey(type, name) {
  return `${type}_${name}`;
}

export function bottlesInHistory(inventoryHistory) {
  const byType = new Map();
  if (!Array.isArray(inventoryHistory)) return {};

  for (const session of inventoryHistory) {
    if (!session?.items || typeof session.items !== 'object') continue;
    for (const item of Object.values(session.items)) {
      if (!item?.type || !item?.name) continue;
      if (!byType.has(item.type)) byType.set(item.type, new Set());
      byType.get(item.type).add(item.name);
    }
  }

  const result = {};
  for (const type of [...byType.keys()].sort((a, b) => a.localeCompare(b))) {
    result[type] = [...byType.get(type)].sort((a, b) => a.localeCompare(b));
  }
  return result;
}

export function bottleOzSeries(inventoryHistory, type, name) {
  if (!type || !name || !Array.isArray(inventoryHistory)) return [];
  const itemKey = historyItemKey(type, name);

  return inventoryHistory
    .filter(session => session?.items && session.items[itemKey])
    .map(session => ({
      originalDate: parseISO(session.endDate),
      oz: parseFloat(session.items[itemKey].remainingFlOz),
    }))
    .sort((a, b) => a.originalDate - b.originalDate)
    .map(data => ({
      date: data.originalDate.toLocaleDateString(),
      oz: data.oz,
    }));
}
