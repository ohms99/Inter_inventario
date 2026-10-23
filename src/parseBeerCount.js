// A sold-out beer is a real count. Rejecting zero kept the last positive
// count on the forecast, so a stockout followed by a restock looked like
// the beer was never consumed.
export function parseBeerCount(raw) {
  const text = String(raw ?? '').trim();
  if (!/^\d+$/.test(text)) return null;
  const count = Number(text);
  if (!Number.isSafeInteger(count)) return null;
  return count;
}
