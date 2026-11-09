# Inventory operations

What the current source does when someone counts stock. This is not a list of intended future behavior.

Counts never leave the browser. Two browsers do not share history. Clearing site data for this origin deletes every key in the storage table below.

## Liquor

Implemented in `src/Tracker.jsx`. Route `/`.

### Catalog

The in-memory seed is `bottleData`. Each bottle is:

```js
patron: { label: 'Patrón', volume: 750, emptyWeight: 480, fullWeight: 1072 }
```

`volume` is milliliters. Both weights are grams. `label` is the name copied onto each count line.

| Type | Key | Label | ml | Empty g | Full g |
| --- | --- | --- | --- | --- | --- |
| tequila | `patron` | Patrón | 750 | 480 | 1072 |
| vodka | `oso_negro` | Oso Negro | 1000 | 665 | 1620 |
| ginebra | `oso_negro` | Oso Negro | 1000 | 665 | 1620 |
| mezcal | `Apaluz` | Apaluz | 750 | 485 | 1190 |
| ron | `antillano` | Antillano | 1000 | 625 | 1580 |
| licor | `flamingo_blue` | Flamingo Blue Curacao | 1000 | 635 | 1700 |
| licor | `sangrita_viuda_sanchez` | Sangrita Viuda Sanchez | 1000 | 640 | 1695 |

`whiskey` and `brandy` exist as empty objects. They appear in the type dropdown and have no bottles. The mezcal key keeps the capital `A`. The other keys are lowercase. Vodka and ginebra both use the key `oso_negro` under different types, so they do not collide.

### Add a bottle

**Agregar Nueva Botella**, then **Guardar Nueva Botella**.

The form requires a type, a name, volume, empty weight, and full weight. Empty strings are rejected with `Por favor, complete todos los campos para la nueva botella, incluyendo el peso llena.` The check is only that the strings are non-empty. Zero and negative numbers are accepted here. Volume and both weights are stored with `parseInt` (base 10), so a decimal is truncated.

The type is either an existing catalog key, lowercased, or **Otro (Especificar)...** (`__NEW_TYPE__`). The custom type is trimmed and lowercased. A blank custom type sets `Por favor, especifique el nuevo tipo de licor.`

The bottle key is the trimmed name, lowercased, with spaces replaced by `_`, then with every character outside `a-z`, `0-9`, and `_` removed. `Don Julio 70` becomes `don_julio_70`. If that leaves an empty string, the form sets `El nombre de la botella resulta en una clave inválida...`. Accented letters are stripped, so two names that differ only by accents can land on the same key.

If that key already exists for the type, the catalog is left unchanged and this message is scheduled:

`Error: La botella "<name>" ya existe como "<key>" bajo el tipo "<type>"...`

The click handler always clears the fields, closes the form, and calls `setError('')` after scheduling the catalog update. The duplicate `setError` runs inside the update. That message is rendered inside the new-bottle form and, while a count is open, under the scale form. A closed form is not proof the bottle was saved. Reopen the type and confirm the name in the dropdown.

A successful save replaces the whole `localStorage` value `allBottleData` with the catalog currently in memory.

The tracker does not read `allBottleData` on load. The mount effect only reads `inventoryHistory`. The `getLiquorBottleDefinitions()` call that was meant to load a catalog is commented out. After a refresh the dropdowns show `bottleData` again. Custom bottles stay in `localStorage` until the next successful save. That save writes memory (the seed, plus the bottle just added) and drops custom bottles that were never loaded back.

`fullWeight` does not have to exceed `emptyWeight` at save time. The scale form rejects that bottle later.

### Count

1. **Iniciar Inventario** clears the open list, sets `startDate` to an ISO timestamp, and shows the scale form.
2. Choose a type and a bottle. Each option is `label (volume ml)`. When both weights are numbers, the form prints empty and full grams.
3. Enter **Peso Actual (g)** and press **Calcular**.
4. **Confirmar y Agregar** appends the preview and clears the weight. The trash control removes one open row.
5. **Terminar y Guardar** appends a session, writes `inventoryHistory`, and clears the open list. An empty list is still saved. The beer screen refuses that case.

**Exportar CSV** downloads `inventario_licores.csv` for every saved session, not the unsaved list. Cells are joined with commas and are not quoted. A name that contains a comma shifts the columns.

Header: `Fecha Inicio`, `Fecha Fin`, `Tipo`, `Nombre`, `Volumen`, `% Restante`, `Oz Restante`, `Bebidas`.

Dates are the stored ISO strings. The file has no scale weight and no cambio columns. Those exist only on **Ver Detalles**.

`simulateScaleReading` sets the weight to `1480` and calculates. The button that called it is commented out.

### Remaining liquid

`calculateRemaining` uses the selected bottle and the scale reading:

```
liquidGrams = fullWeight - emptyWeight
netGrams    = clamp(currentWeight - emptyWeight, 0, liquidGrams)
percent     = netGrams / liquidGrams * 100
mlLeft      = volume * percent / 100
flOzLeft    = mlLeft / 29.5735
servings    = floor(flOzLeft / 1.5)
```

`liquidGrams` must be greater than 0, or the form shows `El peso llena debe ser mayor que el peso tara de la botella.` A missing bottle or a non-numeric weight shows `Datos de botella incompletos o peso actual no válido...`.

Readings below the empty weight become 0%. Readings above the full weight become 100%. The UI does not say the scale was out of range. A sealed bottle that weighs more than the stored full weight looks full until `fullWeight` is corrected.

One serving is 1.5 fl oz. `Math.floor` drops a partial serving. The milliliter conversion constant is `29.5735`.

Patrón is 750 ml, 480 g empty, 1072 g full (592 g of liquid):

| Scale (g) | % | fl oz | Servings |
| --- | --- | --- | --- |
| 480 or below | 0.0 | 0.00 | 0 |
| 776 | 50.0 | 12.68 | 8 |
| 1072 or above | 100.0 | 25.36 | 16 |

The preview stores `percentage` with one decimal and `remainingFlOz` with two, both as strings. `servings` is an integer. `currentWeight_g` is the parsed reading as a number, before clamping. A clamped 0% row can still carry a scale value below the empty weight.

### Saved session

```js
{
  startDate: "2026-11-09T16:00:00.000Z",
  endDate: "2026-11-09T16:20:00.000Z",
  items: {
    "tequila_Patrón": {
      type: "tequila",
      name: "Patrón",
      volume: 750,
      percentage: "50.0",
      remainingFlOz: "12.68",
      servings: 8,
      currentWeight_g: 776
    }
  }
}
```

The item key is `` `${type}_${name}` `` and `name` is the catalog label, not the catalog key.

Two open rows with the same type and label become one item:

- `remainingFlOz` is summed and written back with two decimals
- `servings` is summed
- `percentage`, `volume`, and `currentWeight_g` stay from the first row

The percent column and the gram cambio then describe the first row, while ounces and servings describe the sum.

### Cambio

**Ver Detalles** compares each item with the previous session in array order (save order, not a re-sort by date). The first session shows `-` for both cambio columns.

| Previous session | Cambio (oz) | Cambio (g) |
| --- | --- | --- |
| Same key, and both rows have `currentWeight_g` | previous fl oz − current fl oz, two decimals, then ` oz` | previous grams − current grams, two decimals, then ` g` |
| Same key, either row missing `currentWeight_g` | ounces still computed | `Dato Viejo` |
| Key absent | `Nuevo` | `Nuevo` |

A positive value means the earlier count was higher. A negative value means the later count is higher. Rows saved before `currentWeight_g` existed show `Dato Viejo` for grams.

**Resumen del Último Inventario Guardado** uses the last session only. Per type it shows the sum of `servings`, the item count, and the average of `percentage` to one decimal.

## Beer

Implemented in `src/BeerTracker.jsx`. Route `/beer-tracker`. **Ir a Licores** returns to `/`.

### Catalog

```js
miller_high_life_media: { label: 'Miller High Life', category: 'Media' }
```

| Key | Label | Category |
| --- | --- | --- |
| `miller_high_life_media` | Miller High Life | Media |
| `XX_Lager_media` | XX Lager | Media |
| `indio_media` | Indio | Media |
| `carta_blanca_caguamita` | Carta Blanca | Caguamita |
| `miller_high_life_caguama` | Miller High Life | Caguama |
| `amstel_ultra_media` | Amstel Ultra | Media |
| `XX_ultra_media` | XX Ultra | Media |

On load, a missing `beerCatalog` is filled with this seed and written to `localStorage`. JSON that is not an object is replaced with the seed and saved. A saved object is used as-is and is not merged with the seed, so bottles added to the seed in a later release do not show up in a browser that already has a catalog.

**Guardar Cerveza** requires a name and a category (`Beer name and category are required.`). The key is:

```
lowercase(name) with spaces as "-" + "_" + lowercase(category) with spaces as "-"
```

Other characters are kept. `Miller High Life` and `Media` become `miller-high-life_media`, which is a different key from the seed `miller_high_life_media`. Saving that pair adds a second Miller High Life Media. An existing key sets `This beer with this size/category already exists in the catalog.` The new entry is written to `beerCatalog` immediately.

### Count

1. **Iniciar Inventario Cervezas** clears the open list and stores an ISO start time.
2. Pick a beer. Options read `label (category)`. Enter a unit count and press **Agregar al Inventario**.
3. The count must be an integer greater than 0 (`Please enter a valid count (greater than 0).`). An empty selection sets `Please select a beer.`
4. **Terminar y Guardar** will not save an empty list or a missing start time (`No items in current inventory or start date missing.`).

Rows that share a catalog key in one session have `count` summed. The on-screen total is the sum of the open rows before that collapse.

**Exportar CSV** downloads `beer_inventory_history.csv`, or alerts `No inventory history to export.` Header: `Inventory Start`, `Inventory End`, `Beer Name`, `Category`, `Count`. Dates are `toLocaleString()` in the browser locale, not ISO. Those strings often contain commas, and fields are not quoted, so a locale that inserts commas splits the date across columns.

### Saved session

```js
{
  startDate: "2026-11-09T16:00:00.000Z",
  endDate: "2026-11-09T16:20:00.000Z",
  items: {
    miller_high_life_media: {
      key: "miller_high_life_media",
      label: "Miller High Life",
      category: "Media",
      count: 24
    }
  }
}
```

The history key is `beerInventoryHistory`. Invalid JSON or a non-array is replaced with `[]` and saved.

### Cambio (unidades)

Same save-order comparison as liquor, using the catalog key:

| Previous session | Cambio |
| --- | --- |
| First session | `-` |
| Key absent | `Nuevo` |
| Key present | `previous count - current count`, as a string |

Positive means the earlier count had more units.

## Dashboard

`src/Dashboard.jsx`, route `/dashboard`. It reads `localStorage` once on mount. A count saved in another tab is invisible until reload. **Ir al Tracker** goes to `/`. There is no link from the dashboard to the beer screen.

### Low stock

Liquor only, and only the latest session. An item is listed when `servings < 5` or `percentage < 15`. The reason is `Servings`, `Percentage`, or `Servings & Percentage`. The cutoffs are `LOW_SERVINGS_THRESHOLD` and `LOW_PERCENTAGE_THRESHOLD`. Beer has no alert list.

### Reorder estimates

At least two sessions are required. With fewer, the card says so and the list stays empty.

Liquor groups rows by `` `${type}__${name}` `` (two underscores). That key is local to this calculation. It is not the session item key, which uses one underscore.

Points are sorted by session `endDate`. For each consecutive pair:

- `days` is `differenceInDays` from `date-fns` (calendar-day boundaries in local time, not elapsed hours)
- `used` is earlier remaining fl oz minus later remaining fl oz

The pair is included only when `days > 0` and `used > 0`. Two sessions that end on the same local calendar date add nothing. A later count that is higher than the earlier one is ignored. It is not negative consumption.

```
avgDailyOz = totalUsedOz / totalDays
daysLeft   = latestRemainingOz / avgDailyOz
```

If no pair qualifies, average consumption is `0`, `daysLeft` is `Infinity`, and the note is `No consumption data or stock stable/increased.`

`daysLeft < 7` uses a red card and the label **¡CRÍTICO!**. `daysLeft < 30` uses a yellow border. The list is ordered by `daysLeft` ascending, then by name. Infinite values sort last.

Beer uses the same day and decrease rules, with unit counts instead of ounces. The series key is `item.label` alone. Category is ignored, so `Miller High Life` Media and `Miller High Life` Caguama are one series. A session that contains both appends two points, and a later pair can compare different sizes. The beer history screen does not do this. It compares catalog keys.

On the liquor card, the help icon passes `title` into the Recharts `Tooltip` component, so the browser does not show a native tooltip. The beer card sets `title` on the icon.

### Charts

The per-bottle line chart plots remaining fl oz against session end date. The two selectors read `allBottleData`.

If that key is missing or is not valid JSON, the selectors use `initialBottleDataReference` inside `Dashboard.jsx`, which is not the tracker seed:

| Type | Key | Label | ml | Empty g | Full g |
| --- | --- | --- | --- | --- | --- |
| tequila | `herradura` | Herradura | 750 | 500 | 1092 |
| tequila | `patron` | Patrón | 750 | 480 | 1072 |
| whiskey | `jackdaniels` | Jack Daniel's | 1000 | 700 | 1489 |
| whiskey | `jameson` | Jameson | 750 | 510 | 1102 |

Lookup key for a point is `` `${type}_${label}` ``. A counted Patrón matches the fallback, because both labels are `Patrón` and the type is `tequila`. Oso Negro, Apaluz, Antillano, and the two liqueurs are not in the fallback, so they cannot be selected until a successful **Guardar Nueva Botella** has written `allBottleData`. Herradura, Jack Daniel's, and Jameson can be selected from the fallback and show `No hay datos históricos para la botella seleccionada.` unless a session item was stored under that exact type and label.

**Servings & % Restante por Sesión** sums `servings` and averages `percentage` for each session. An empty liquor session divides by zero items. `(0 / 0).toFixed(1)` becomes the string `NaN`, and the chart receives `NaN` for the average.

**Total Oz Acumulado por Tipo (Histórico)** adds `remainingFlOz` across every session. It is a historical sum of remaining ounces, not the latest stock.

`beerCatalog` is loaded into dashboard state, including a separate fallback list (`Corona Extra`, `Modelo Especial`, `Heineken`, `Stella Artois`, `Guinness Draught`) when the stored catalog is missing or invalid. No dashboard control reads that state. Beer estimates come from `beerInventoryHistory`.

## localStorage

| Key | Written by | Read by |
| --- | --- | --- |
| `inventoryHistory` | Liquor **Terminar y Guardar** | Tracker and dashboard, `JSON.parse` with no `try/catch` |
| `allBottleData` | Successful liquor **Guardar Nueva Botella** | Dashboard only |
| `beerCatalog` | Beer page load (seed) and **Guardar Cerveza** | Beer page. Dashboard loads it and does not render it |
| `beerInventoryHistory` | Beer **Terminar y Guardar** | Beer page and dashboard |

A corrupt `inventoryHistory` throws while the liquor page or the dashboard is loading. Beer catalog and beer history parse errors are caught. The beer page then stores the seed or an empty history in place of the bad value.

## API module

`src/apiService.js` exports `getLiquorBottleDefinitions`. The function body is comments, so the call returns `undefined`. `Tracker.jsx` imports it and does not call it.

The comments describe a `GET {STRAPI_URL}/api/liquor-bottle-definitions` that is not issued. `STRAPI_URL` in those comments is `process.env.REACT_APP_STRAPI_URL` or `http://localhost:1337`. The commented mapper expects `data.data[].attributes` fields `type`, `unique_key`, `name`, `volume_ml`, `empty_weight_g`, and `full_weight_g`, and would build the same `{ label, volume, emptyWeight, fullWeight }` catalog shape. Nothing in the app saves sessions or bottles to that API.

## Quick checks

| Symptom | Cause in the current code |
| --- | --- |
| Custom liquor bottle missing after refresh | Tracker never loads `allBottleData`. |
| Saving one new bottle removed older custom bottles | The save writes the in-memory seed plus the new bottle over `allBottleData`. |
| Dashboard list is Herradura, Jack Daniel's, and Jameson | `allBottleData` is missing or invalid, so the dashboard fallback is in use. |
| Counted bottle has no graph | The selector label must equal `item.name`, and the type must match. Fallback entries other than Patrón do not match the tracker seed. |
| Cambio (g) is `Dato Viejo` | The previous row has no `currentWeight_g`. Ounces can still be shown. |
| Same beer name, odd reorder timing | Beer estimates group by label and ignore category. |
| Two counts today produced no estimate | `differenceInDays` is 0 for one calendar day, so the pair is skipped. |
| Stock increased and days left is blank / infinite | Only a decrease counts as consumption. |
| Refresh on `/dashboard` is a 404 | The Netlify SPA redirect is commented out. |
| Liquor page fails after a storage edit | `inventoryHistory` is not valid JSON. |
| Second Miller High Life Media in the beer list | New keys use hyphens. The seed key uses underscores. |
| Beer CSV dates split into extra columns | `toLocaleString()` commas are not quoted. |
