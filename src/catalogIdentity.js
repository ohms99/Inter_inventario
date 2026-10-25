// Catalog entries are keyed inconsistently: built-in beers use underscores
// ("miller_high_life_media") while the add form used hyphens, and liquor keys
// mix case ("Apaluz") with accented labels ("Patrón"). Comparing the raw
// generated key misses those entries, so the same product is stored twice and
// later counts no longer line up.

export function normalizeCatalogKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function beerCatalogKey(label, category) {
  const labelKey = normalizeCatalogKey(label);
  const categoryKey = normalizeCatalogKey(category);
  if (!labelKey || !categoryKey) return '';
  return `${labelKey}_${categoryKey}`;
}

export function findDuplicateBeer(catalog, label, category) {
  const identity = beerCatalogKey(label, category);
  if (!identity) return null;

  for (const [key, beer] of Object.entries(catalog || {})) {
    const fromFields = beerCatalogKey(beer?.label, beer?.category);
    if (normalizeCatalogKey(key) === identity || fromFields === identity) {
      return { key, beer };
    }
  }
  return null;
}

export function planAddBeer(catalog, label, category) {
  const key = beerCatalogKey(label, category);
  if (!key) return { ok: false, reason: 'invalid' };
  const duplicate = findDuplicateBeer(catalog, label, category);
  if (duplicate) return { ok: false, reason: 'duplicate', duplicate };
  return { ok: true, key };
}

export function findDuplicateLiquorBottle(bottlesForType, name) {
  const identity = normalizeCatalogKey(name);
  if (!identity) return null;

  for (const [key, bottle] of Object.entries(bottlesForType || {})) {
    if (
      normalizeCatalogKey(key) === identity ||
      normalizeCatalogKey(bottle?.label) === identity
    ) {
      return { key, bottle };
    }
  }
  return null;
}

export function planAddLiquorBottle(bottlesForType, name) {
  const key = normalizeCatalogKey(name);
  if (!key) return { ok: false, reason: 'invalid' };
  const duplicate = findDuplicateLiquorBottle(bottlesForType, name);
  if (duplicate) return { ok: false, reason: 'duplicate', duplicate };
  return { ok: true, key };
}
