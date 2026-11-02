# Inter Inventario

Browser app for a bar inventory. Staff weigh open liquor bottles to estimate what is left, count beers by size, and review history, low-stock alerts, and purchase timing on a dashboard.

Everything the app remembers stays in `localStorage` in that browser. There is no login and no live API.

## Stack and routes

Preact 10, Vite 6, React Router 7 (`BrowserRouter`), Tailwind CSS 4 (`@tailwindcss/vite`), Recharts, and `date-fns`. `lucide-react` supplies icons. Components import `react` and `react-router-dom`. `@preact/preset-vite` 2.10.1 aliases `react` and `react-dom` to `preact/compat` (`reactAliasesEnabled` defaults to true). `chart.js` and `react-chartjs-2` are listed in `package.json` and are not imported. `autoprefixer` and `postcss` are devDependencies; the repo has no PostCSS config.

| Path | File | Screen |
| --- | --- | --- |
| `/` | `src/Tracker.jsx` | Inventario de Licores |
| `/beer-tracker` | `src/BeerTracker.jsx` | Inventario de Cervezas |
| `/dashboard` | `src/Dashboard.jsx` | Bar Dashboard |

`src/app.jsx` registers those three routes. `src/main.jsx` renders `<App />` into `#app`. Only `/` links to the other two screens. The beer screen and the dashboard each link back to `/`.

`tailwind.config.js` begins with a bare `@type` line, so Node cannot parse it. `npm run build` still succeeds: `@tailwindcss/vite` compiles `src/app.css` and `src/index.css` and does not load that file. Edits there do not change the built CSS.

## Setup

```bash
npm install
npm run dev
```

Vite serves the app on port 5173 and falls back to `index.html` for `/dashboard` and `/beer-tracker`.

```bash
npm run build    # writes dist/
npm run preview  # serves the production build
```

## Deploy

`netlify.toml` builds with `npm run build` and publishes `dist`. The `functions` directory it names (`netlify/functions`) is not in the repo.

The SPA redirect in that file is commented out. On Netlify, opening or refreshing `/dashboard` or `/beer-tracker` returns a 404 until this block is active:

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

`package.json` still has `predeploy` / `deploy` scripts that publish `dist` with `gh-pages`. The `homepage` field and the Vite `base` of `/Inter_inventario` were removed, so a GitHub project-pages deploy would request assets from the domain root. Netlify is the host config that matches the current Vite setup.

## Where data lives

| Key | Written by | Read by | Shape |
| --- | --- | --- | --- |
| `inventoryHistory` | Tracker, on **Terminar y Guardar** | Tracker, Dashboard | Array of liquor sessions |
| `allBottleData` | Tracker, when a new bottle is saved | Dashboard | `{ [type]: { [bottleKey]: Bottle } }` |
| `beerCatalog` | Beer tracker | Beer tracker. Dashboard loads it and never reads that state | `{ [beerKey]: { label, category } }` |
| `beerInventoryHistory` | Beer tracker, on **Terminar y Guardar** | Beer tracker, Dashboard | Array of beer sessions |

Clearing site data for the origin deletes the catalog additions and every saved count. Two browsers do not share inventory.

Tracker and Dashboard call `JSON.parse` on `inventoryHistory` with no try/catch. Invalid JSON throws while those screens render. Dashboard try/catches `allBottleData`, `beerCatalog`, and `beerInventoryHistory`. Beer tracker try/catches its two keys; see the beer catalog section for which bad values it overwrites.

A liquor session is `{ startDate, endDate, items }`. `items` is an object keyed by `` `${type}_${label}` `` (the display name, including spaces and accents). Each item stores `type`, `name`, `volume` (ml), `percentage` (one decimal string), `remainingFlOz` (two decimal string), `servings` (integer), and `currentWeight_g` (the grams typed in).

A beer session uses the same dates. `items` is keyed by the catalog key. Each item stores `key`, `label`, `category`, and `count`.

Neither screen can delete or edit a saved session or a catalog row. Both histories only append. Removing a bad count means editing or deleting that `localStorage` key.

## Liquor count

1. **Iniciar Inventario** clears the in-progress list and stores a start timestamp. The form is hidden until a session is open.
2. Choose a type, then a bottle. The option text is `Label (750ml)`. When both weights are numbers, the form shows **Peso Botella Vacía** and **Peso Botella Llena**.
3. Enter **Peso Actual (g)** and press **Calcular**.
4. **Confirmar y Agregar** appends the preview row. **Terminar y Guardar** writes the session and clears the in-progress list.

Changing the type or the bottle does not clear `preview` or the weight field. **Confirmar y Agregar** stores the last preview, including its type, label, and weight, even when the selects now show a different bottle.

**Terminar y Guardar** allows an empty list, so a session with zero bottles can be stored.

### Remaining liquid

For the selected bottle, with weights in grams and `volume` in milliliters:

```text
liquidCapacity = fullWeight - emptyWeight
netWeight      = clamp(currentWeight - emptyWeight, 0, liquidCapacity)
percentage     = netWeight / liquidCapacity * 100
remainingMl    = volume * percentage / 100
remainingFlOz  = remainingMl / 29.5735
servings       = floor(remainingFlOz / 1.5)
```

`29.5735` is milliliters per US fluid ounce. One serving is 1.5 fl oz. A current weight below the empty weight becomes 0%. A current weight above the full weight becomes 100%. Calculation stops, and the preview is cleared, when any input is missing or when `fullWeight` is less than or equal to `emptyWeight`.

Patrón is 750 ml, empty 480 g, full 1072 g (592 g of liquid):

| Scale | Result |
| --- | --- |
| 776 g | 50.0%, 12.68 oz, 8 servings |
| 400 g | 0.0%, 0.00 oz, 0 servings |
| 1072 g or more | 100.0%, 25.36 oz, 16 servings |

Oso Negro vodka or ginebra at the midpoint (1142.5 g) is 50.0%, 16.91 oz, 11 servings.

### One session, same bottle twice

On save, rows with the same `` `${type}_${label}` `` are combined. `remainingFlOz` is summed and `servings` is added. `percentage`, `volume`, and `currentWeight_g` stay on the first row. The history table and the low-stock check then use that first percentage and that first weight.

### Change since the previous session

In **Historial de Inventarios**, each row is compared with the previous session’s item that has the same key:

| Column | Value |
| --- | --- |
| First session | `-` for both change columns |
| Key absent from the previous session | `Nuevo` |
| **Cambio (oz)** | previous `remainingFlOz` minus current `remainingFlOz` |
| **Cambio (g)** | previous `currentWeight_g` minus current `currentWeight_g` |
| Gram column, older row with no `currentWeight_g` | `Dato Viejo` |

A positive change is liquid or weight that left the bottle. The comparison is only against the immediately previous session. A bottle left out of the new session has no row, so it does not show a change.

**Resumen del Último Inventario Guardado** groups that last session by type: sum of servings, mean of `percentage`, and bottle count.

**Exportar CSV** downloads `inventario_licores.csv` with ISO start and end timestamps, type, name, volume, percentage, ounces, and servings. Weight and change columns are not included. Fields are joined with commas and are not quoted. The timestamps are the stored ISO strings, which do not contain commas.

### Bottle catalog

Tracker always mounts with the hardcoded `bottleData` in `src/Tracker.jsx`. The `localStorage` load and the Strapi fetch in its mount effect are comments. `src/apiService.js` exports `getLiquorBottleDefinitions`. The function is `async` and its body is commented out, so awaiting it resolves to `undefined`. Tracker imports it and does not call it.

| Type | Key | Label | ml | Empty g | Full g |
| --- | --- | --- | --- | --- | --- |
| tequila | `patron` | Patrón | 750 | 480 | 1072 |
| whiskey | — | — | — | — | — |
| vodka | `oso_negro` | Oso Negro | 1000 | 665 | 1620 |
| ginebra | `oso_negro` | Oso Negro | 1000 | 665 | 1620 |
| brandy | — | — | — | — | — |
| mezcal | `Apaluz` | Apaluz | 750 | 485 | 1190 |
| ron | `antillano` | Antillano | 1000 | 625 | 1580 |
| licor | `flamingo_blue` | Flamingo Blue Curacao | 1000 | 635 | 1700 |
| licor | `sangrita_viuda_sanchez` | Sangrita Viuda Sanchez | 1000 | 640 | 1695 |

`whiskey` and `brandy` are empty objects and still appear in the type dropdown. The bottle dropdown then has no options. The mezcal key keeps the capital `A`. New bottles do not.

**Agregar Nueva Botella** requires type, name, volume (ml), empty weight, and full weight. An existing type can be chosen, or **Otro (Especificar)...** stores `customNewBottleType` trimmed and lowercased (spaces and accents stay in the type string). The bottle key is the trimmed name, lowercased, with spaces turned into `_`, then with every character outside `a-z`, `0-9`, and `_` removed. `Don Julio 70` becomes `don_julio_70`. An empty key is rejected. Volume and both weights are saved with `parseInt`.

A key that already exists for that type is left out of the catalog and is not written to `localStorage`. The click handler still resets the form, closes it, and sets `error` to an empty string after scheduling that update.

A successful save writes the whole catalog to `allBottleData`. Tracker does not read that key on the next visit, so the new bottle is gone from the liquor screen after a refresh. Dashboard does read `allBottleData` and uses it for the per-bottle chart dropdown. If the key is missing or invalid JSON, Dashboard falls back to its own `initialBottleDataReference` (Herradura, Patrón, Jack Daniel's, Jameson), which is a different set from `bottleData`. The per-bottle chart looks up `` `${type}_${catalogLabel}` ``. A label that does not match the `name` stored on the session produces the empty-history message.

## Beer count

1. **Iniciar Inventario Cervezas** opens a session.
2. Pick a beer. Options read `Label (Category)`.
3. Enter a unit count greater than 0 and press **Agregar al Inventario**.
4. **Terminar y Guardar** requires a start time and at least one row. Rows that share a catalog key have their counts added.

A count of 0 or less is rejected, so a sold-out beer cannot be saved. Leaving it off the session writes no row. **Cambio (Unidades)** is computed only for keys present in the session being viewed, and purchase predictions keep the last saved positive count as the latest level.

**Cambio (Unidades)** uses the same previous-session rules as liquor ounces: `-` on the first session, `Nuevo` when the key is new, otherwise previous count minus current count. A positive number is units that left stock.

The running total under the open list is the sum of the counts currently on screen, before same-key rows are merged.

**Exportar CSV Cervezas** downloads `beer_inventory_history.csv` (localized start and end, name, category, count) or alerts when history is empty. Fields are not quoted. Dates come from `Date.prototype.toLocaleString()` with no locale argument. In `en-US` and `es-MX` that string contains a comma between the date and the time, so those rows split into extra columns.

### Beer catalog

On first load, if `beerCatalog` is missing, Beer tracker writes `INITIAL_BEER_CATALOG`. A later visit uses the saved object. Invalid JSON stays in storage; the screen uses the seed catalog in memory only. A value that parses but is not a plain object is overwritten with the seed catalog.

Invalid `beerInventoryHistory` JSON stays in storage and the screen uses an empty list in memory. A value that parses but is not an array is overwritten with `[]`.

| Key | Label | Category |
| --- | --- | --- |
| `miller_high_life_media` | Miller High Life | Media |
| `XX_Lager_media` | XX Lager | Media |
| `indio_media` | Indio | Media |
| `carta_blanca_caguamita` | Carta Blanca | Caguamita |
| `miller_high_life_caguama` | Miller High Life | Caguama |
| `amstel_ultra_media` | Amstel Ultra | Media |
| `XX_ultra_media` | XX Ultra | Media |

**Agregar Nueva Cerveza al Catálogo** requires a name and a category. The key is `` `${label slug}_${category slug}` ``, where each slug is trimmed, lowercased, and has whitespace turned into `-`. `Corona Extra` plus `Lata` becomes `corona-extra_lata`. The same name in two categories is two catalog rows. An existing key is rejected and the form stays open with an error. Seed keys above were written by hand, so they use `_` inside the name; newly saved beers use `-`. Saving **Miller High Life** and **Media** again is allowed: the new key is `miller-high-life_media`, and the dropdown shows two rows with the same label and category. Predictions still fold both into one series because they group by `label`.

Dashboard copies `beerCatalog` into state (or the fallback Corona Extra, Modelo Especial, Heineken, Stella Artois, and Guinness Draught list when the stored value is missing or invalid) and never reads that state. Beer predictions use `beerInventoryHistory` only.

## Dashboard

**Alertas de Stock Bajo** looks at the latest liquor session only. Beer counts do not raise alerts. A bottle is listed when `servings` is below 5 or `percentage` is below 15. The reason text is `Servings`, `Percentage`, or `Servings & Percentage`.

**Predicciones de Compra** needs at least two liquor sessions. History is grouped by `` `${type}__${name}` ``. For each later point, `date-fns` `differenceInDays` compares the calendar dates of the session end times (local timezone). A gap counts only when that day difference is greater than 0 and the remaining ounces fell. Average daily use is total ounces lost divided by those days. Days remaining is the latest remaining ounces divided by that average. Two counts on the same calendar day add nothing. A count at 23:00 and another at 01:00 the next calendar day counts as one day. Increases in stock are skipped. A bottle omitted from a later session adds no new point, so its latest ounces stay at the last session that included it. With no decreasing gap, days remaining is infinite and the card shows the note `No consumption data or stock stable/increased.` Cards under 7 days show **¡CRÍTICO!** and a red border. Cards under 30 days use a yellow border. The list is ordered by days remaining, then name.

On a liquor card with no rate, the note text is the `<p>`. The help icon is a child of Recharts `Tooltip`, and that component does not render `children`. It renders a tooltip box that stays `visibility: hidden` unless `active` is set and the payload is non-empty, which this usage never does. The icon is not in the page. The beer card renders `HelpCircle` directly and sets the HTML `title` on it.

**Predicciones de Compra de Cervezas** uses the same day and “only decreases” rules on unit counts. The series key is `item.label`, so Miller High Life Media and Miller High Life Caguama share one series. Consecutive points can be different categories, and the category printed on the card is the category of the last point. A size that was not counted in the latest session does not move `latestCount` to 0.

**Gráficos de Inventario por Artículo** plots remaining ounces for one liquor bottle. See the catalog section for the key it looks up.

**Servings & % Restante por Sesión** plots, per session, the sum of servings and the average of `percentage` across that session’s items. An empty session divides by zero, so `avgPercentage` is the string `"NaN"`.

**Total Oz Acumulado por Tipo (Histórico)** sums `remainingFlOz` by type across every session. It is a running sum of snapshots, not the latest on-hand total.

## Troubleshooting

| What you see | What the code is doing |
| --- | --- |
| A bottle saved with **Guardar Nueva Botella** is missing after refresh | Tracker mounts from hardcoded `bottleData` and does not read `allBottleData`. |
| Dashboard bottle list does not match the liquor screen | Dashboard is showing saved `allBottleData` or its own fallback catalog. |
| Per-bottle chart says there is no history | The catalog label used for `` `${type}_${label}` `` does not match the `name` stored on the session. |
| Confirmar y Agregar stored the previous bottle | The type and bottle selects do not clear `preview`. |
| Change in grams says `Dato Viejo` | That older session was saved before `currentWeight_g` was stored. |
| Purchase timing stays empty after several counts on one calendar day | `differenceInDays` is 0, so those gaps are ignored. |
| A sold-out beer still shows days of stock | Counts must be greater than 0. Omitting the beer leaves the last positive count as the latest level. |
| Beer timing looks unrelated to one size | Sizes that share a label are one prediction series. |
| Two identical Miller High Life (Media) rows | The seed key is `miller_high_life_media`. The form saves `miller-high-life_media`. |
| Low stock or change looks wrong after counting the same bottle twice | Save kept the first row’s percentage and weight and only summed ounces and servings. |
| Liquor tracker or dashboard crashes on load | `inventoryHistory` is not valid JSON. Those screens parse it with no try/catch. |
| `/dashboard` 404s on Netlify and works locally | The SPA redirect in `netlify.toml` is commented out. Vite’s dev server still serves `index.html`. |
| Liquor CSV columns split on a name that contains a comma | Fields are joined with commas and are not quoted. Timestamps are ISO strings. |
| Beer CSV columns shift even when names have no comma | `toLocaleString()` dates include a comma in `en-US` and `es-MX`, and fields are not quoted. |
| A bad session cannot be removed from the screen | Histories only append. Delete or edit the `localStorage` value. |
| Theme edits in `tailwind.config.js` never show up | The file is invalid JavaScript and the Vite build does not load it. |
| Liquor cards with no consumption rate have no help icon | `HelpCircle` is a child of Recharts `Tooltip`, which does not render `children`. The beer cards render the icon directly. |
