# Inter Inventario

Browser app for counting a bar's liquor and beer, then reviewing what is left and how it changed since the previous count. Catalogs and history stay in that browser's `localStorage`. The running app does not call a backend.

Screen labels are Spanish. A few beer validation strings are English. The document title in `index.html` is still `Vite + Preact`.

## Routes

| Path | Screen | Source |
| --- | --- | --- |
| `/` | Liquor count | `src/Tracker.jsx` (`LiquorInventoryCalculator`) |
| `/beer-tracker` | Beer count | `src/BeerTracker.jsx` |
| `/dashboard` | Alerts, reorder estimates, charts | `src/Dashboard.jsx` |

`src/app.jsx` registers those routes with `BrowserRouter`. `src/main.jsx` renders `<App />` into `#app`. Only `/` links to the other two screens. The beer screen and the dashboard each link back to `/`.

## Run locally

The locked Vite 6.3.4 requires Node.js `^18.0.0 || ^20.0.0 || >=22.0.0`.

```bash
npm install
npm run dev
```

Vite prints the URL. The default is `http://localhost:5173`. `vite.config.js` does not set `appType`, so it stays `spa`: the dev server and `vite preview` both serve `index.html` for `/dashboard` and `/beer-tracker`.

| Script | Result |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production bundle in `dist/` |
| `npm run preview` | Serves `dist/` |
| `npm run deploy` | Runs `gh-pages -d dist` after `predeploy` builds |

## Stack

- Preact 10, bundled by Vite 6 and `@preact/preset-vite` 2.10.1
- `react-router-dom` 7
- Tailwind utility classes, compiled by `@tailwindcss/vite` in `vite.config.js`
- Recharts on the dashboard
- `date-fns` (`parseISO`, `differenceInDays`) for reorder estimates
- `lucide-react` icons

Screens import `useState` and `useEffect` from `react`. The Preact preset aliases `react` and `react-dom` to `preact/compat` (`reactAliasesEnabled` defaults to `true`).

`chart.js` and `react-chartjs-2` are dependencies and are not imported under `src/`. `autoprefixer` and `postcss` are devDependencies. The repo has no PostCSS config. `npm run build` succeeds without them.

`tailwind.config.js` starts with a bare `@type` line, so Node cannot parse it (`node --check tailwind.config.js` fails). Neither `src/app.css` nor `src/index.css` references it with `@config`. The Vite build does not load that file. Theme edits there do not change the CSS.

`src/app.css` starts with `@import "tailwindcss"`. `src/index.css` and `src/app.css` also contain the older `@tailwind base/components/utilities` lines. `main.jsx` imports both stylesheets, and `app.jsx` imports `app.css` again.

## Code map

| Behavior | File |
| --- | --- |
| Liquor catalog, gram math, sessions, CSV, cambio in oz and grams | `src/Tracker.jsx` |
| Beer catalog, unit counts, CSV, cambio in units | `src/BeerTracker.jsx` |
| Low stock, predictions, charts | `src/Dashboard.jsx` |
| Strapi client stub (not called) | `src/apiService.js` |
| Netlify build settings | `netlify.toml` |

Formulas, storage keys, cambio rules, and failure cases: [docs/operations.md](docs/operations.md).

## Deploy

`netlify.toml` builds with `npm run build` and publishes `dist`. It also sets `functions = "netlify/functions"`. That directory is not in the repo.

The `/*` → `/index.html` redirect is commented out. On Netlify, opening or refreshing `/dashboard` or `/beer-tracker` returns the host 404. In-app navigation still works, because the router does not request those paths from the server. The block to enable is:

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Commit `0e2c63e` removed the `homepage` field (`https://ohms99.github.io/Inter_inventario/`) and the Vite `base` of `/Inter_inventario`. `package.json` still depends on `gh-pages` and still defines `predeploy` / `deploy`. `npm run deploy` publishes `dist/` with Vite `base` `/`, so asset URLs point at the domain root rather than a project-site subpath.
