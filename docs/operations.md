# Inventory operations

What the current source does when someone counts stock. Counts never leave the browser. Two browsers do not share history. Clearing site data for this origin deletes every key below.

Saved sessions and catalog rows cannot be edited or deleted in the UI. Histories only append. Removing a bad count means editing or deleting that `localStorage` value.

## localStorage

| Key | Written by | Read by |
| --- | --- | --- |
| `inventoryHistory` | Liquor **Terminar y Guardar** | Tracker and dashboard. `JSON.parse` with no `try/catch` |
| `allBottleData` | A successful liquor **Guardar Nueva Botella** | Dashboard only. Tracker does not read it |
| `beerCatalog` | Beer page, when the key is missing or is not a plain object, and **Guardar Cerveza** | Beer page. Dashboard loads it and does not render it |
| `beerInventoryHistory` | Beer **Terminar y Guardar**, and when the stored value parses but is not an array | Beer page and dashboard |

Invalid `inventoryHistory` JSON throws from the mount effect. The liquor screen keeps the empty initial list. On the dashboard that parse runs first, so a bad liquor history also skips the reads of `allBottleData`, `beerCatalog`, and `beerInventoryHistory` in the same effect.

Beer catalog and beer history parse errors are caught.

| Stored value | Beer catalog | Beer history |
| --- | --- | --- |
| Missing | Seed is written | Stays empty. Nothing is written |
| Invalid JSON | Seed is used in memory. The bad value stays in storage | `[]` in memory. The bad value stays in storage |
| Parses, wrong type | Seed is written over it | `[]` is written over it |
| Plain object / array | Used as stored. Not merged with the seed | Used as stored |

A browser that already has `beerCatalog` will not see bottles added to `INITIAL_BEER_CATALOG` in a later release.

## Liquor

`src/Tracker.jsx`, route `/`.

### Catalog the screen actually uses

Tracker mounts from the hardcoded `bottleData`. The mount effect's `localStorage` load and the `getLiquorBottleDefinitions()` call are comments. After a refresh the dropdowns show this seed again.

| Type | Key | Label | ml | Empty g | Full g |
| --- | --- | --- | --- | --- | --- |
| tequila | `patron` | Patrón | 750 | 480 | 1072 |
| vodka | `oso_negro` | Oso Negro | 1000 | 665 | 1620 |
| ginebra | `oso_negro` | Oso Negro | 1000 | 665 | 1620 |
| mezcal | `Apaluz` | Apaluz | 750 | 485 | 1190 |
| ron | `antillano` | Antillano | 1000 | 625 | 1580 |
| licor | `flamingo_blue` | Flamingo Blue Curacao | 1000 | 635 | 1700 |
| licor | `sangrita_viuda_sanchez` | Sangrita Viuda Sanchez | 1000 | 640 | 1695 |

`whiskey` and `brandy` are empty objects. They still appear in the type dropdown, and the bottle dropdown then has no options. The mezcal key keeps the capital `A`. Vodka and ginebra share the key `oso_negro` under different types, so they do not collide. `label` is the name copied onto each count line.

`src/apiService.js` exports `async function getLiquorBottleDefinitions`. The body is comments, so the promise resolves to `undefined`. Tracker imports it and does not call it. The comments describe a `GET {STRAPI_URL}/api/liquor-bottle-definitions` that is not issued. `STRAPI_URL` in the commented line is `process.env.REACT_APP_STRAPI_URL` or `http://localhost:1337`. The commented mapper expects `data.data[].attributes` fields `type`, `unique_key`, `name`, `volume_ml`, `empty_weight_g`, and `full_weight_g`.

### Add a bottle

**Agregar Nueva Botella**, then **Guardar Nueva Botella**.

The form requires a type, a name, volume, empty weight, and full weight. Empty strings set `Por favor, complete todos los campos para la nueva botella, incluyendo el peso llena.` and leave the form open. Zero and negative numbers pass that check. Volume and both weights are stored with `parseInt` (base 10), so a decimal is truncated. `fullWeight` does not have to exceed `emptyWeight` here. The scale form rejects that bottle later.

The type is an existing catalog key, lowercased, or **Otro (Especificar)...** (`__NEW_TYPE__`). A custom type is trimmed and lowercased. Spaces and accents stay in the type string. A blank custom type sets `Por favor, especifique el nuevo tipo de licor.`

The bottle key is the trimmed name, lowercased, spaces replaced by `_`, then every character outside `a-z`, `0-9`, and `_` removed. `Don Julio 70` becomes `don_julio_70`. Accented letters are stripped, so `Café` and `Caf` share the key `caf`. An empty key sets `El nombre de la botella resulta en una clave inválida...` and leaves the form open.

If the key already exists for that type, the updater returns the previous catalog and calls `setError` with `Error: La botella "<name>" ya existe como "<key>" bajo el tipo "<type>"...`. The click handler then clears every field, closes the form, and calls `setError('')`. The duplicate message is not left on screen. A closed form is not proof the bottle was saved. Reopen the type and look for the name.

A successful save writes the in-memory catalog to `allBottleData`. That value is the seed plus bottles added in this page load. Custom bottles that were saved on an earlier visit are not in memory, so this write drops them.

### Count

1. **Iniciar Inventario** clears the open list, stores an ISO `startDate`, and shows the scale form.
2. Choose a type and a bottle. Each option is `label (volume ml)`. When both weights are numbers, the form prints empty and full grams.
3. Enter **Peso Actual (g)** and press **Calcular**. Editing the weight does not recalculate.
4. **Confirmar y Agregar** appends the current preview and clears the weight. The trash control removes one open row.
5. **Terminar y Guardar** appends a session even when the list is empty, writes `inventoryHistory`, and clears the open list and the preview.

Changing the type or the bottle does not clear `preview` or the weight. **Confirmar y Agregar** stores the last preview, including its type, label, and weight, even when the selects now show a different bottle.

`simulateScaleReading` would set the weight to `1480` and calculate. The button that called it is commented out.

### Remaining liquid

```text
liquidGrams = fullWeight - emptyWeight
netGrams    = clamp(currentWeight - emptyWeight, 0, liquidGrams)
percent     = netGrams / liquidGrams * 100
mlLeft      = volume * percent / 100
flOzLeft    = mlLeft / 29.5735
servings    = floor(flOzLeft / 1.5)
```

`29.5735` is milliliters per US fluid ounce. One serving is 1.5 fl oz. `Math.floor` drops a partial serving.

`liquidGrams` must be greater than 0, or the form shows `El peso llena debe ser mayor que el peso tara de la botella.` and clears the preview. A missing bottle or a non-numeric weight shows `Datos de botella incompletos o peso actual no válido...` and clears the preview.

A reading below the empty weight becomes 0%. A reading above the full weight becomes 100%. The UI does not say the scale was out of range. `currentWeight_g` stores the parsed reading before clamping, so a 0% row can still carry a weight below the empty bottle.

Patrón is 750 ml, 480 g empty, 1072 g full (592 g of liquid):

| Scale (g) | % | fl oz | Servings |
| --- | --- | --- | --- |
| 480 or below | 0.0 | 0.00 | 0 |
| 776 | 50.0 | 12.68 | 8 |
| 1072 or above | 100.0 | 25.36 | 16 |

Oso Negro (vodka or ginebra) at the midpoint, 1142.5 g, is 50.0%, 16.91 oz, 11 servings.

`percentage` is stored with one decimal and `remainingFlOz` with two, both as strings. `servings` is an integer.

### Saved session

```js
{
  startDate: "2026-11-16T16:00:00.000Z",
  endDate: "2026-11-16T16:20:00.000Z",
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

The item key is `` `${type}_${name}` ``. `name` is the catalog label, not the catalog key, so spaces and accents stay in the key.

Two open rows with the same type and label become one item. `remainingFlOz` is summed and written with two decimals. `servings` is summed. `percentage`, `volume`, and `currentWeight_g` stay from the first row. The percent column, the gram cambio, and the low-stock check then describe the first row, while ounces and servings describe the sum.

### Cambio

**Ver Detalles** compares each item with the previous session in array order (save order, not a re-sort by date). A bottle left out of a session has no row, so it does not show a change.

| Previous session | Cambio (oz) | Cambio (g) |
| --- | --- | --- |
| First session | `-` | `-` |
| Key absent | `Nuevo` | `Nuevo` |
| Key present | previous `remainingFlOz` minus current, with ` oz` | previous `currentWeight_g` minus current, with ` g` |
| Key present, either row missing `currentWeight_g` | ounces still computed | `Dato Viejo` |

A positive value means the earlier count was higher.

**Resumen del Último Inventario Guardado** uses the last session only. Per type it shows the sum of `servings`, the bottle count, and the average of `percentage` to one decimal.

### CSV

**Exportar CSV** always downloads `inventario_licores.csv`, including when history is empty. It covers every saved session and skips the unsaved list. An empty session adds no data rows, so an empty history is the header alone. Cells are joined with commas and are not quoted. A name that contains a comma shifts the columns.

Header: `Fecha Inicio`, `Fecha Fin`, `Tipo`, `Nombre`, `Volumen`, `% Restante`, `Oz Restante`, `Bebidas`.

Dates are the stored ISO strings, which do not contain commas. The file has no scale weight and no cambio columns.

## Beer

`src/BeerTracker.jsx`, route `/beer-tracker`. **Ir a Licores** returns to `/`.

### Catalog

| Key | Label | Category |
| --- | --- | --- |
| `miller_high_life_media` | Miller High Life | Media |
| `XX_Lager_media` | XX Lager | Media |
| `indio_media` | Indio | Media |
| `carta_blanca_caguamita` | Carta Blanca | Caguamita |
| `miller_high_life_caguama` | Miller High Life | Caguama |
| `amstel_ultra_media` | Amstel Ultra | Media |
| `XX_ultra_media` | XX Ultra | Media |

**Guardar Cerveza** requires a name and a category (`Beer name and category are required.`). The key is the trimmed, lowercased name, spaces replaced by `-`, then `_`, then the category slug built the same way. Other characters are kept. `Miller High Life` and `Media` become `miller-high-life_media`, a different key from the seed `miller_high_life_media`. `XX Lager` and `Media` become `xx-lager_media`, not `XX_Lager_media`. Saving either pair adds a second row with the same label and category.

An existing key sets `This beer with this size/category already exists in the catalog.` and leaves the form open. A new entry is written to `beerCatalog` immediately.

### Count

1. **Iniciar Inventario Cervezas** clears the open list and stores an ISO start time.
2. Pick a beer. Options read `label (category)`. Enter a unit count and press **Agregar al Inventario**.
3. The count must be an integer greater than 0 (`Please enter a valid count (greater than 0).`). An empty selection sets `Please select a beer.` A missing catalog entry sets `Selected beer not found in catalog.`
4. **Terminar y Guardar** refuses an empty list or a missing start time (`No items in current inventory or start date missing.`).

A count of 0 cannot be saved. Leaving a sold-out beer off the session writes no row. Predictions keep the last saved positive count as the latest level.

Rows that share a catalog key in one session have `count` summed. The on-screen total is the sum of the open rows before that collapse.

### Saved session

```js
{
  startDate: "2026-11-16T16:00:00.000Z",
  endDate: "2026-11-16T16:20:00.000Z",
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

The history key is `beerInventoryHistory`. The item key is the catalog key.

### Cambio (unidades)

Same save-order comparison as liquor, using the catalog key:

| Previous session | Cambio |
| --- | --- |
| First session | `-` |
| Key absent | `Nuevo` |
| Key present | `previous count - current count`, as a string |

A positive number means the earlier count had more units.

### CSV

**Exportar CSV Cervezas** downloads `beer_inventory_history.csv`, or alerts `No inventory history to export.` Header: `Inventory Start`, `Inventory End`, `Beer Name`, `Category`, `Count`.

Dates are `toLocaleString()` with no locale argument. In `en-US` and `es-MX` that string contains a comma between the date and the time (`11/16/2026, 4:03:00 PM`, `16/11/2026, 4:03:00 p.m.`). Fields are not quoted, so those rows split into extra columns.

## Dashboard

`src/Dashboard.jsx`, route `/dashboard`. It reads `localStorage` once on mount. A count saved in another tab is invisible until reload. **Ir al Tracker** goes to `/`. There is no link to the beer screen.

### Low stock

Liquor only, and only the latest session. An item is listed when `servings < 5` or `parseFloat(percentage) < 15`. The reason is `Servings`, `Percentage`, or `Servings & Percentage`. The cutoffs are `LOW_SERVINGS_THRESHOLD` and `LOW_PERCENTAGE_THRESHOLD`. Beer has no alert list. An empty latest session produces no alerts.

### Reorder estimates

At least two sessions are required. With fewer, the card says so and the list stays empty.

Liquor groups rows by `` `${type}__${name}` `` (two underscores). That key is local to this calculation. The session item key uses one underscore.

Points are sorted by session `endDate`. For each consecutive pair:

- `days` is `differenceInDays` (calendar-day boundaries in local time, not elapsed hours)
- `used` is earlier remaining fl oz minus later remaining fl oz

The pair counts only when `days > 0` and `used > 0`. Two sessions that end on the same local calendar date add nothing, even if many hours apart. A count at 23:00 and another at 01:00 the next calendar day counts as one day. A later count that is higher is ignored. It is not negative consumption. A bottle omitted from a later session adds no point, so its latest ounces stay at the last session that included it.

```text
avgDailyOz = totalUsedOz / totalDays
daysLeft   = latestRemainingOz / avgDailyOz
```

If no pair qualifies, average consumption is `0`, `daysLeft` is `Infinity`, and the note is `No consumption data or stock stable/increased.`

`daysLeft < 7` uses a red card and the label **¡CRÍTICO!**. `daysLeft < 30` uses a yellow border. The list is ordered by `daysLeft` ascending, then by name. Infinite values sort last.

On a liquor card with no rate, the note text is in the paragraph. The help icon is a child of the Recharts `Tooltip`. That component does not render `props.children`. It renders a tooltip box whose visibility is `hidden` unless `active` and a non-empty payload are set, which this usage never does. The icon is not in the page. The beer card renders `HelpCircle` directly and sets the HTML `title` on it.

Beer uses the same day and decrease rules, with unit counts instead of ounces. The series key is `item.label` alone. Category is ignored, so Miller High Life Media and Miller High Life Caguama are one series. A session that contains both appends two points with the same timestamp. `differenceInDays` between those two is 0, so that pair is skipped, and the next comparison can be between different sizes. The category printed on the card is the category of the last point. A size that was not counted does not move `latestCount` to 0. The beer history screen does not do this. It compares catalog keys.

### Charts

The per-bottle line chart plots remaining fl oz against `endDate` formatted with `toLocaleDateString()`, after sorting by the real end date. The selectors read `allBottleData`.

If that key is missing or is not valid JSON, the selectors use `initialBottleDataReference` inside `Dashboard.jsx`:

| Type | Key | Label | ml | Empty g | Full g |
| --- | --- | --- | --- | --- | --- |
| tequila | `herradura` | Herradura | 750 | 500 | 1092 |
| tequila | `patron` | Patrón | 750 | 480 | 1072 |
| whiskey | `jackdaniels` | Jack Daniel's | 1000 | 700 | 1489 |
| whiskey | `jameson` | Jameson | 750 | 510 | 1102 |

The lookup key is `` `${type}_${label}` ``. A counted Patrón matches, because both labels are `Patrón` and the type is `tequila`. Oso Negro, Apaluz, Antillano, and the two liqueurs are not in the fallback, so they cannot be selected until a successful **Guardar Nueva Botella** has written `allBottleData`. Herradura, Jack Daniel's, and Jameson can be selected from the fallback and show `No hay datos históricos para la botella seleccionada.` unless a session item was stored under that exact type and label.

**Servings & % Restante por Sesión** sums `servings` and averages `percentage` for each session, in save order. Dates are `toLocaleDateString()`, so two sessions on the same local day share an x label. An empty liquor session divides by zero items. `(0 / 0).toFixed(1)` is the string `"NaN"`, and `parseFloat` stores `NaN` for the average.

**Total Oz Acumulado por Tipo (Histórico)** adds `remainingFlOz` across every session. It is a historical sum of remaining ounces, not the latest stock.

`beerCatalog` is loaded into dashboard state, including a separate fallback (`Corona Extra`, `Modelo Especial`, `Heineken`, `Stella Artois`, `Guinness Draught`) when the stored catalog is missing, invalid JSON, or not a plain object. No dashboard control reads that state. Beer estimates come from `beerInventoryHistory`.

## Quick checks

| Symptom | Cause in the current code |
| --- | --- |
| Custom liquor bottle missing after refresh | Tracker mounts from `bottleData` and does not read `allBottleData`. |
| Saving one new bottle removed older custom bottles | The save writes the in-memory seed plus bottles added this visit. |
| Duplicate bottle closed the form with no error | The duplicate path calls `setError`, then the handler closes the form and calls `setError('')`. |
| **Confirmar y Agregar** stored the previous bottle or the previous weight | The selects and the weight field do not clear `preview`. Calculation runs only from **Calcular**. |
| Dashboard bottle list is Herradura, Jack Daniel's, and Jameson | `allBottleData` is missing or invalid, so the dashboard fallback is in use. |
| Counted bottle has no graph | The selector label must equal `item.name`, and the type must match. |
| Cambio (g) is `Dato Viejo` | One of the two rows has no `currentWeight_g`. Ounces can still be shown. |
| Same bottle twice, and percent or grams look like only the first pour | Save keeps the first row's percentage and weight and sums ounces and servings. |
| Two counts today produced no estimate | `differenceInDays` is 0 on one calendar day, so the pair is skipped. |
| Stock went up and days left is infinite | Only a decrease counts as consumption. |
| A sold-out beer still shows days of stock | Counts must be greater than 0. Omitting the beer leaves the last positive count. |
| Same beer name, odd reorder timing | Beer estimates group by `label` and ignore category. |
| Second Miller High Life Media, or a second XX Lager | New keys are lowercased and hyphenated. The seed uses underscores, and the XX keys keep capitals. |
| Beer CSV dates split into extra columns | `toLocaleString()` in `en-US` and `es-MX` contains a comma, and fields are not quoted. |
| Liquor CSV columns split on a name | Fields are joined with commas and are not quoted. ISO dates do not contain commas. |
| Refresh on `/dashboard` is a 404 on Netlify | The SPA redirect is commented out. Vite's dev server and preview still serve `index.html`. |
| Liquor page shows no history after a storage edit | `inventoryHistory` is not valid JSON. The mount effect throws and keeps the empty list. |
| Dashboard also lost the beer estimates after that edit | The dashboard effect parses liquor history before the beer keys. The throw skips those reads. |
| A bad beer catalog comes back after refresh | Invalid JSON is caught and is not overwritten. Only a non-object that parses is replaced. |
| Theme edits in `tailwind.config.js` never show up | The file is invalid JavaScript and no stylesheet points at it with `@config`. |
| Liquor cards with no consumption rate have no help icon | `HelpCircle` is a child of Recharts `Tooltip`, which does not render `children`. |
