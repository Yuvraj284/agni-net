# AgniNet — architecture & design notes

**Satellite fire intelligence and field-response coordination — hackathon prototype.**

AgniNet turns satellite thermal-hotspot observations into **prioritised candidate alerts** that
human reviewers investigate, verify and track. A hotspot is *not* a confirmed fire: the UI keeps
three layers distinct throughout.

| Layer | What it is | Where it lives |
| --- | --- | --- |
| **Raw observation** | One satellite hotspot detection (VIIRS / MODIS). Immutable. Synthetic sample, or NASA FIRMS when live. | `src/data/observations.ts`, `src/lib/firms.ts` |
| **Candidate alert** | Nearby observations grouped for review, with a priority score. Derived, never stored. | `src/lib/alerts.ts`, `src/lib/scoring.ts` |
| **Verification record** | Append-only, timestamped human review events. A *verified incident* = latest status `Confirmed`. | `src/lib/verification.ts` |

> **Sample data by default.** Observations are synthetic, generated deterministically in the browser. An
> optional live mode loads NASA FIRMS near-real-time detections through a server-side proxy (see
> [Live data](#live-data-nasa-firms)). Asset boundaries are illustrative approximations either way.

---

## Quick start

Requires Node.js 20+ (CI uses Node 22; tested locally on Node 24, npm 11).

```bash
cd agninet
npm install
npm run dev          # → http://127.0.0.1:5173
```

Other scripts:

| Command | Purpose |
| --- | --- |
| `npm run build` | Type-check and produce a production build in `dist/` |
| `npm run preview` | Serve the production build (http://127.0.0.1:4173) |
| `npm run typecheck` | TypeScript only |
| `npm run lint` | ESLint (flat config, typescript-eslint, react-hooks) |
| `npm test` | Vitest unit tests (scoring, verification, dataset, persistence, boundary, FIRMS, export) |
| `npm run test:e2e` | Playwright browser tests (uses installed Chrome locally, bundled Chromium in CI) |
| `npm run check` | Typecheck, lint, unit tests and build in sequence |

Map tiles, fonts and weather load from the internet (OpenFreeMap, Open-Meteo); the rest of the app works
offline. CI (`.github/workflows/ci.yml`) runs `npm run check`, a production dependency audit and the
Playwright suite on every push and pull request.

## Demo walkthrough

A timed, step-by-step demo script is in [DEMO.md](DEMO.md).

## Architecture

```
src/
  types.ts              Domain types (Observation, CandidateAlert, VerificationEvent, …)
  config/scoring.ts     Weights and every scoring/grouping constant (edit here to re-tune)
  data/                 DEMO data: regions + reviewers, illustrative assets, observation generator + seeded events
  lib/
    geo.ts              Haversine, point-in-polygon, point-to-polygon distance
    firms.ts            NASA FIRMS CSV → observations; client for the /api/firms proxy
    weather.ts          Open-Meteo current weather + illustrative spread envelope
    dispatch.ts         WhatsApp message text; exportCsv.ts — alert queue CSV
    alerts.ts           Observation → candidate-alert grouping (single-linkage, 1.5 km)
    scoring.ts          Priority score P and factor normalisation
    verification.ts     Event-log replay, validation, event construction (append-only)
    format.ts           Display formatting
  persistence/storage.ts  Versioned, validated LocalStorage load/save with corrupt-data fallback
  state/hash.ts         URL hash routing (#/view/alert-id)
  state/
    reducer.ts          App state + actions (pure)
    derive.ts           Pure pipeline: observations → alerts → scores + verification → filters/metrics
    AppProvider.tsx     Wires reducer, derivation, persistence and URL-hash routing
  components/           UI: layout, map (Leaflet + markercluster + MapLibre basemap), alerts, overview, activity, common
  views/                Overview, Live Map, Alerts, Assets, Activity
server/firms.ts         Server-side FIRMS proxy (holds the key), wired into Vite dev/preview
public/geo/             India land boundary (official depiction) used by the basemap
e2e/                    Playwright tests
```

**Single source of truth.** Only user-owned state is persisted: the dataset anchor time, the event log,
the acting reviewer and the last refresh time. Observations, alerts, scores, metrics and timelines are
always re-derived from that in one memoised pipeline (`state/derive.ts`), so the map, queue, cards and
timeline cannot disagree.

**Stable IDs.** Observation IDs are deterministic (`OBS-OD-001`; live FIRMS detections get a hash of their
product, time and position, `F-k3j9x0a`); an alert's ID is derived from its earliest observation
(`ALT-OD-001`, `ALT-F-k3j9x0a`), so persisted review history stays attached across reloads.

**Routing.** The view and the selected alert live in the URL hash (`#/map/ALT-OD-001`), so back/forward,
reload and shared links work. The drawer's link button copies that URL; alert ids in the hash are validated.

## Design system and theming

- **Tokens, not palette colours.** Every colour is a semantic CSS variable in `src/index.css`, with light values
  on `:root` and dark values under `html.dark`. They are exposed to Tailwind in `tailwind.config.js`:
  `canvas`, `surface`/`surface-2`/`surface-3`, `line`, `fg`/`fg-muted`/`fg-subtle`, `accent` (forest green),
  the priority and status semantics `critical`/`high`/`medium`/`low`/`info`, plus `asset-*` and `factor-*`.
  Components use only these names, so both themes stay consistent. Shared control styles (`.btn`, `.field`,
  `.chip`, `.link`) live in the same file.
- **Theme toggle.** The sun/moon button in the top bar. Light is the default for first-time visitors, and the
  choice is stored in `localStorage` under `agninet:theme` (separate from demo data, so *Reset demo data* keeps it).
  A synchronous script in `index.html` applies the saved theme before first paint, so there is no flash of the
  wrong theme. `src/theme/theme.ts` is the store and `useTheme()` reads it.
- **Map.** Markers, clusters, asset overlays, Leaflet controls and tooltips are all styled from the same tokens.
  The basemap is a MapLibre vector map with its own light and dark styles (`components/map/basemapStyle.ts`) —
  see [Map and India's boundary](#map-and-indias-boundary).
- **Type.** Inter for the interface and JetBrains Mono only for IDs, coordinates and absolute timestamps. Labels
  are sentence case.

## Map and India's boundary

The map shows **India's boundary as officially depicted by the Government of India**: Jammu & Kashmir and
Ladakh in full, including Pakistan-occupied Kashmir (Gilgit-Baltistan), Aksai Chin and the Shaksgam valley.

- **Basemap.** OpenFreeMap vector tiles (OpenMapTiles schema, built from OpenStreetMap; free, no key), drawn
  by MapLibre GL inside Leaflet's tile pane (`components/map/maplibreLayer.ts`), so every Leaflet overlay works
  unchanged. MapLibre is lazy-loaded into its own chunk; its worker is bundled via Vite's `?worker&url`.
- **Why vector tiles.** OpenStreetMap draws boundaries as controlled on the ground, and raster tiles cannot be
  edited. With vector tiles the style hides every OSM boundary that touches India, every disputed line (LoC,
  LAC and claim lines) and the China–Pakistan line through Shaksgam, and suppresses OSM's Pakistani
  administrative labels inside PoK.
- **India's boundary** is drawn from `public/geo/india-land-borders.geojson`: the land border of India from
  Natural Earth's *India point-of-view* admin-0 dataset (v5.1.1, public domain), extracted with mapshaper as the
  shared edge between India and its neighbours (no coastline). `src/data/indiaOutline.ts` is a simplified
  outline used to keep state labels to India and in tests.
- **Tests** (`basemapStyle.test.ts`) pin this: Gilgit, Muzaffarabad, Skardu, Aksai Chin and Shaksgam are inside
  the outline; the drawn border follows the Wakhan corridor and does not follow the LoC; the style filters hide
  the disputed and India-touching OSM lines while keeping unrelated borders.
- **Accuracy.** Natural Earth is a 1:10m dataset, so at street-level zoom the drawn border can sit a few hundred
  metres from OSM features. Fine for situational awareness; not a survey boundary.

## Priority scoring

```
P = 0.35·C + 0.25·R + 0.20·F + 0.20·A        (weights configurable in src/config/scoring.ts)
```

All inputs are normalised to 0–100. **P is a triage priority for ordering human review — not the probability
that a fire exists.**

| Factor | Rule |
| --- | --- |
| **C — detection confidence** | Per observation: VIIRS `low/nominal/high` → 30 / 65 / 90 (prototype mapping); MODIS percentage used as-is if it is a finite number in 0–100. The alert takes the **maximum** across its observations. |
| **R — recency** | From **observation time** (not ingest time): `R = 100 · 0.5^(age_h / 12)` using the most recent valid observation. Halves every 12 h. |
| **F — recurrence** | Counts **distinct overpasses** (satellite + acquisition minute), so adjacent pixels from one pass don't inflate it. `F = 100 · min(1, (passes − 1) / 4)`: one pass → 0, five or more → 100. |
| **A — asset proximity** | For each asset: `sensitivity · 100 · max(0, 1 − d / 10 km)`, where `d` is the minimum distance from any observation to the asset (0 inside a polygon). Take the max. Sensitivity: protected area 1.0, critical infrastructure 1.0, settlement 0.9, forest 0.85, **known industrial heat source 0** — heat sources never raise priority but flag alerts within 2 km. |

**Missing / incomparable inputs are explicit, never assumed.**
- No confidence reported → C is `missing`; out-of-range MODIS values → `incomparable`.
- Observation stamped more than 15 min in the future, or unparseable → excluded from R; if none remain, R is `incomparable`.
- No assets loaded → A is `missing`.

A missing factor contributes 0, so the displayed score is a **lower bound** (shown as `≥ 21.8`). The drawer
also shows the range up to the score if that factor were 100, and the alert is counted under "incomplete inputs".

Priority bands: Critical ≥ 75, High ≥ 60, Medium ≥ 40, Low < 40.

## Grouping and clustering

Two separate, documented mechanisms:

1. **Candidate-alert grouping** (`lib/alerts.ts`) — single-linkage spatial clustering within one region: two
   observations join the same alert if they lie within **1.5 km** of each other, directly or through a chain.
   That is about four VIIRS I-band pixels, so adjacent pixels and repeat passes merge while separate sites stay apart.
2. **Map marker clustering** (`components/map/ClusterLayer.tsx`) — purely visual. One marker per raw observation;
   Leaflet.markercluster merges markers within 40 px on screen and is disabled from zoom 12. Clusters are coloured
   by the highest priority band inside them.

Neither mechanism deletes or modifies observations.

## Verification workflow

- Reviews are stored as **append-only events**: `assignment`, `status_change` (with from → to), `action`, `note`.
  Current state is computed by replaying events in time order, and earlier events are never rewritten.
- Validation rules: something must change; recording *Confirmed / Unconfirmed / Inconclusive* needs a note of at
  least 10 characters; *Confirmed* needs an assigned reviewer; the reviewer must be on the roster; notes are capped
  at 1000 characters.
- Recorded actions describe what a reviewer did (e.g. "Requested field verification"). They are not outcomes, and
  the app never claims a field response happened.
- There is no authentication. "Acting as" in the sidebar sets the name recorded on new events.

## Weather, spread estimate and WhatsApp sharing

- **Weather** for the selected alert comes from Open-Meteo (free, no key): the alert's rounded coordinate is
  sent to `api.open-meteo.com`. Requests are cached for 10 minutes and shared between components. When the
  request fails, a deterministic **sample estimate** is used and labelled as such everywhere.
- **Spread envelope.** A simple heuristic, a fixed base rate scaled up by wind speed and low humidity, drawn as
  3 h and 6 h downwind shapes. It ignores fuel, slope and terrain and is not validated: it is labelled
  *illustrative, not a forecast* in the drawer, legend and map tooltips.
- **WhatsApp sharing** opens `api.whatsapp.com/send` with a pre-filled message (the alert's coordinates go to
  WhatsApp and a Google Maps link). No phone numbers ship with the app: the operator types one or picks the
  contact in WhatsApp. Messages say whether the alert is a candidate or a verified incident, are marked as demo
  data or as an unverified FIRMS detection, and ask for ground verification. AgniNet records one history note
  per dialog that a message was *opened*; it cannot confirm delivery.

## Live data (NASA FIRMS)

- **Proxy.** `server/firms.ts` handles `GET /api/firms?days=1` in the Vite dev and preview servers. It reads
  `FIRMS_MAP_KEY` from the server environment (`.env.local`, see `.env.example`; get a key at
  https://firms.modaps.eosdis.nasa.gov/api/map_key/), queries the VIIRS SNPP / NOAA-20 / NOAA-21 and MODIS NRT
  products for an India bounding box, and returns the raw CSV. The key is never sent to the browser or echoed
  in errors; responses are cached for 10 minutes. The handler is framework-neutral, ready to back a
  serverless function when the app is deployed.
- **Client.** `src/lib/firms.ts` maps rows to observations (satellite from the product, VIIRS category or MODIS
  percent confidence, UTC time), de-duplicates them and keeps only detections inside AgniNet's five monitored
  regions; the rest are counted ("elsewhere in India, not shown").
- **Switching.** The data-source button in the top bar switches between sample data and FIRMS. Live data is
  not persisted: each session starts on sample data, and review history is shared across both. Without a key
  or proxy the app explains why and stays on sample data.

## Sample data

- 50 synthetic observations at 18 sites across five regions: Uttarakhand (Garhwal–Kumaon), Madhya Pradesh
  (Kanha–Mandla), Odisha (Similipal–Rourkela), Mizoram (Lunglei–Mamit) and Punjab (Malwa plains).
- The sites include multi-pass recurring fires, single detections, a missing-confidence detection, a persistent
  industrial heat source (Rourkela steel plant), shifting-cultivation burning and crop-residue burning.
- Timestamps are relative to a persisted **anchor**: the moment the dataset was first generated in your browser.
  **Refresh** re-scores recency against the current time (in live mode it re-fetches FIRMS).
- Seeded review events put alerts into all four workflow states and are tagged `DEMO`.
- Reviewers are fictional. Asset names reference real places for context, but their geometry is illustrative.

## Persistence and fallback

- LocalStorage key `agninet:v1`, schema-versioned and validated on load.
- Unreadable or corrupt saved data is backed up to `agninet:v1:corrupt-backup`; the app then starts from fresh
  sample data and shows a banner.
- If storage is blocked or the quota is exceeded, a banner says changes will not persist, and the app keeps working in memory.

## Security notes

- The only secret is `FIRMS_MAP_KEY`, read by the server-side proxy. Never use a `VITE_` prefix for secrets:
  anything in the frontend bundle is public. `.env` and `.env.*` (except `.env.example`) are gitignored.
- CSV export neutralises spreadsheet formulas; tooltips escape HTML; alert ids from the URL hash are validated.
- Data leaving the browser: map tiles and fonts (OpenFreeMap), the selected alert's coordinate (Open-Meteo),
  and, only when the operator opens WhatsApp, the message text.

## Known limitations

- Live FIRMS data needs a key and the dev/preview server (no deployment yet); it covers the five monitored
  regions only and is not persisted.
- Single-user, single-browser persistence (LocalStorage); no sync, no authentication, no audit integrity guarantees.
- Scoring weights and normalisation constants are prototype assumptions and have not been calibrated against
  ground truth.
- Asset geometries are hand-drawn approximations; distance uses a local planar approximation (fine at < 50 km).
- Grouping is O(n²), which is fine for hundreds of observations but needs a spatial index for thousands.
- The basemap and weather need internet access. The spread envelope is a heuristic, not a fire-behaviour model.
- Asset boundaries are still hand-drawn. Official protected-area polygons (e.g. WDPA) have licence terms that
  restrict redistribution, so they need a licence check before bundling.
