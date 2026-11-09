# Inter Inventario

Browser app for counting a bar's liquor and beer, then reviewing what is left and how it changed since the previous count. Saved catalogs and history stay in the browser's `localStorage`. The running app does not call a backend.

The screen labels are Spanish. A few beer validation strings are English.

## Routes

| Path | Screen | Source |
| --- | --- | --- |
| `/` | Liquor count | `src/Tracker.jsx` (`LiquorInventoryCalculator`) |
| `/beer-tracker` | Beer count | `src/BeerTracker.jsx` |
| `/dashboard` | Alerts, reorder estimates, charts | `src/Dashboard.jsx` |

`src/app.jsx` registers the routes with `BrowserRouter`. `src/main.jsx` renders the app into `#app`.

## Run locally

The locked Vite 6.3.4 requires Node.js `^18.0.0 || ^20.0.0 || >=22.0.0`.

```bash
npm install
npm run dev
```

The dev server prints its URL. The Vite default is `http://localhost:5173`.

| Script | Result |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production bundle in `dist/` |
| `npm run preview` | Serves `dist/` |
| `npm run deploy` | Runs `gh-pages -d dist` after a build |

## Stack

- Preact 10, bundled by Vite 6 and `@preact/preset-vite`
- `react-router-dom` 7
- Tailwind utility classes in `src/index.css` and `src/app.css`, with `@tailwindcss/vite` registered in `vite.config.js`
- Recharts on the dashboard
- `date-fns` (`parseISO`, `differenceInDays`) for reorder estimates
- `lucide-react` icons

`chart.js` and `react-chartjs-2` are dependencies and are not imported under `src/`.

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

The `/*` → `/index.html` redirect in `netlify.toml` is commented out. Opening or refreshing `/dashboard` or `/beer-tracker` on Netlify returns the host 404. Navigation from inside the app still works, because the router does not request those paths from the server.

Commit `0e2c63e` removed the GitHub Pages `homepage` and the Vite `base` of `/Inter_inventario`. `package.json` still depends on `gh-pages` and still defines `predeploy` / `deploy`. `npm run deploy` publishes `dist/` with Vite `base` `/`, so asset URLs point at the domain root rather than a project-site subpath.
