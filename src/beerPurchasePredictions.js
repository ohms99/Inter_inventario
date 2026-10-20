import { differenceInDays, parseISO } from 'date-fns';

// Purchase predictions must follow each beer size separately.
// Several catalog entries share a label (Miller High Life Media and Caguama).
// Grouping by label alone interleaves those counts and reports no consumption.
export function beerHistoryKey(item) {
  return `${item.label}__${item.category}`;
}

export function buildBeerPurchasePredictions(beerInventoryHistory) {
  if (!Array.isArray(beerInventoryHistory) || beerInventoryHistory.length < 2) {
    return [];
  }

  const beerItemHistories = {};

  beerInventoryHistory.forEach(session => {
    if (!session || !session.items) return;
    const sessionDate = parseISO(session.endDate);
    Object.values(session.items).forEach(item => {
      if (!item || item.label == null) return;
      const itemKey = beerHistoryKey(item);
      if (!beerItemHistories[itemKey]) {
        beerItemHistories[itemKey] = [];
      }
      beerItemHistories[itemKey].push({
        date: sessionDate,
        count: parseInt(item.count, 10),
        name: item.label,
        category: item.category,
      });
    });
  });

  const beerPredictions = [];
  for (const itemKey in beerItemHistories) {
    const history = beerItemHistories[itemKey].sort((a, b) => a.date - b.date);
    if (history.length < 2) continue;

    let totalUnitsConsumed = 0;
    let totalDays = 0;
    let periodsCount = 0;

    for (let i = 1; i < history.length; i++) {
      const prevEntry = history[i - 1];
      const currentEntry = history[i];

      const unitsChange = prevEntry.count - currentEntry.count;
      const daysChange = differenceInDays(currentEntry.date, prevEntry.date);

      if (daysChange > 0 && unitsChange > 0) {
        totalUnitsConsumed += unitsChange;
        totalDays += daysChange;
        periodsCount++;
      }
    }

    const latestEntry = history[history.length - 1];
    if (periodsCount > 0) {
      const avgDailyUnitConsumption = totalUnitsConsumed / totalDays;
      const daysLeft = latestEntry.count / avgDailyUnitConsumption;
      beerPredictions.push({
        name: latestEntry.name,
        category: latestEntry.category,
        latestCount: latestEntry.count,
        avgDailyUnitConsumption: parseFloat(avgDailyUnitConsumption.toFixed(2)),
        daysLeft: parseFloat(daysLeft.toFixed(1)),
      });
    } else {
      beerPredictions.push({
        name: latestEntry.name,
        category: latestEntry.category,
        latestCount: latestEntry.count,
        avgDailyUnitConsumption: 0,
        daysLeft: Infinity,
        note: 'No consumption data or stock stable/increased.',
      });
    }
  }

  beerPredictions.sort((a, b) => {
    if (a.daysLeft === Infinity && b.daysLeft !== Infinity) return 1;
    if (a.daysLeft !== Infinity && b.daysLeft === Infinity) return -1;
    if (a.daysLeft === Infinity && b.daysLeft === Infinity) return a.name.localeCompare(b.name);
    if (a.daysLeft !== b.daysLeft) return a.daysLeft - b.daysLeft;
    return a.name.localeCompare(b.name);
  });

  return beerPredictions;
}
