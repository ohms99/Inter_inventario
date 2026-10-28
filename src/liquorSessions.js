export function sessionHasItems(session) {
  return Boolean(session && session.items && Object.keys(session.items).length > 0);
}

export function canSaveLiquorInventory(inventoryList) {
  return Array.isArray(inventoryList) && inventoryList.length > 0;
}

export function previousCountedSession(history, index) {
  for (let i = index - 1; i >= 0; i -= 1) {
    if (sessionHasItems(history[i])) return history[i];
  }
  return null;
}

export function latestCountedSession(history) {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (sessionHasItems(history[i])) return history[i];
  }
  return null;
}

export function averageRemainingPercent(session) {
  if (!sessionHasItems(session)) return null;
  const items = Object.values(session.items);
  const total = items.reduce((acc, item) => acc + parseFloat(item.percentage), 0);
  return parseFloat((total / items.length).toFixed(1));
}
