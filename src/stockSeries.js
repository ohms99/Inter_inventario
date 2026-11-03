import { parseISO } from 'date-fns';

function countedSessionDate(session) {
  if (!session || typeof session.endDate !== 'string' || session.endDate.length === 0) return null;
  const items = session.items;
  if (!items || typeof items !== 'object' || Array.isArray(items)) return null;
  if (Object.keys(items).length === 0) return null;
  const date = parseISO(session.endDate);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

// Blank sessions are not a count. The latest real snapshot is what is on the shelf.
export function realSnapshotDates(history) {
  const found = [];
  if (Array.isArray(history)) {
    for (let i = history.length - 1; i >= 0 && found.length < 2; i -= 1) {
      const date = countedSessionDate(history[i]);
      if (date) found.push(date);
    }
  }
  return { latest: found[0] || null, previous: found[1] || null };
}

/**
 * Counts are full snapshots. A product that was on the previous count and is
 * missing from the latest one is gone, so the series ends at zero. A product
 * already missing before that stays off the list instead of keeping a stale level.
 */
export function anchorSeriesToLatestSnapshot(points, latestDate, previousDate) {
  const sorted = [...(points || [])].sort((a, b) => a.date - b.date);
  if (sorted.length === 0 || !(latestDate instanceof Date) || Number.isNaN(latestDate.getTime())) {
    return sorted;
  }
  const last = sorted[sorted.length - 1];
  if (!(last.date instanceof Date) || Number.isNaN(last.date.getTime())) return sorted;
  if (last.date.getTime() >= latestDate.getTime()) return sorted;

  const wasOnPreviousCount = previousDate instanceof Date
    && !Number.isNaN(previousDate.getTime())
    && sorted.some((point) => point.date instanceof Date && point.date.getTime() === previousDate.getTime());

  if (!wasOnPreviousCount) return [];

  return [...sorted, {
    ...last,
    date: latestDate,
    oz: 0,
    count: 0,
    servings: 0,
    percentage: 0,
  }];
}
