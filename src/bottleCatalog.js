// Restores the liquor bottle catalog persisted in localStorage.
// Custom bottles are stored there by the tracker; dropping this on load
// makes them vanish from the dropdown and the next save overwrites them.
export function loadStoredBottleCatalog(storedJson, defaults) {
  if (!storedJson) return defaults;

  try {
    const loadedData = JSON.parse(storedJson);
    // Mutable copy so callers can keep editing the catalog in state.
    const processedData = JSON.parse(JSON.stringify(loadedData));

    for (const type in processedData) {
      if (!defaults[type] || !processedData[type] || typeof processedData[type] !== 'object') continue;

      for (const bottleKey in processedData[type]) {
        const currentBottle = processedData[type][bottleKey];
        const initialBottleMatch = defaults[type][bottleKey];
        if (!initialBottleMatch || !currentBottle || typeof currentBottle !== 'object') continue;

        // Repair known bottles that were saved without weights or volume.
        // Leave every other field, and every custom bottle, untouched.
        const restoreNeeded =
          (typeof currentBottle.fullWeight !== 'number' && typeof initialBottleMatch.fullWeight === 'number') ||
          (typeof currentBottle.emptyWeight !== 'number' && typeof initialBottleMatch.emptyWeight === 'number') ||
          (typeof currentBottle.volume !== 'number' && typeof initialBottleMatch.volume === 'number') ||
          (typeof currentBottle.label !== 'string' && typeof initialBottleMatch.label === 'string');

        if (restoreNeeded) {
          console.warn(`Bottle ${type} - ${bottleKey} from localStorage is missing or has invalid critical fields. Restoring from defaults.`);
          processedData[type][bottleKey] = { ...initialBottleMatch };
        }
      }
    }

    return processedData;
  } catch (e) {
    console.error('Failed to parse or process allBottleData from localStorage:', e);
    return defaults;
  }
}
