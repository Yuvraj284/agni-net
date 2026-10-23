# AgniNet — architecture & design notes

**Satellite fire intelligence and field-response coordination — hackathon prototype.**

AgniNet turns satellite thermal-hotspot observations into **prioritised candidate alerts** that
human reviewers investigate, verify and track. A hotspot is *not* a confirmed fire: the UI keeps
three layers distinct throughout.

| Layer | What it is | Where it lives |
| --- | --- | --- |
| **Raw observation** | One satellite hotspot detection (VIIRS / MODIS, FIRMS-like fields). Immutable. | `src/data/observations.ts` |
| **Candidate alert** | Nearby observations grouped for review, with a priority score. Derived, never stored. | `src/lib/alerts.ts`, `src/lib/scoring.ts` |
| **Verification record** | Append-only, timestamped human review events. A *verified incident* = latest status `Confirmed`. | `src/lib/verification.ts` |

> **All data is DEMO / SAMPLE data.** Observations are synthetic, generated deterministically in the
> browser. No live satellite feed is connected, and asset boundaries are illustrative approximations.

---

## Quick start

Requires Node.js 18+ (tested on Node 24, npm 11).

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
| `npm test` | Vitest unit tests (scoring, verification, dataset, persistence) |
| `npm run check` | All of the above in sequence |

Map tiles load from `tile.openstreetmap.org`, so the map background needs internet access; the
rest of the app works offline.

## Demo walkthrough

1. **Overview** opens directly: metric cards, hotspot map, review queue, status mix, regions, recent activity.
2. Click an alert (in the queue, the table, or a map marker) to open the **details drawer**:
   coordinates, observation times, sources, confidence, the score and its factor breakdown, and the raw observations.
3. In **Verification**, assign a reviewer, choose one of *Awaiting verification / Confirmed / Unconfirmed /
   Inconclusive*, tick actions taken, add a note, and **Save review**.
4. The queue, map marker style, metric cards and activity timeline update together. **Reload the page** and
   the change is still there.
5. Use **Reset demo data** (sidebar) to regenerate the dataset relative to the current time and clear history.

## Architecture

```
src/
  types.ts              Domain types (Observation, CandidateAlert, VerificationEvent, …)
  config/scoring.ts     Weights and every scoring/grouping constant (edit here to re-tune)
  data/                 DEMO data: regions + reviewers, illustrative assets, observation generator + seeded events
  lib/
    geo.ts              Haversine, point-in-polygon, point-to-polygon distance
    alerts.ts           Observation → candidate-alert grouping (single-linkage, 1.5 km)
    scoring.ts          Priority score P and factor normalisation
    verification.ts     Event-log replay, validation, event construction (append-only)
    format.ts           Display formatting
  persistence/storage.ts  Versioned, validated LocalStorage load/save with corrupt-data fallback
  state/
    reducer.ts          App state + actions (pure)
    derive.ts           Pure pipeline: observations → alerts → scores + verification → filters/metrics
    AppProvider.tsx     Wires reducer, derivation, persistence and URL-hash routing
  components/           UI: layout, map (Leaflet + markercluster), alerts, overview, activity, common
  views/                Overview, Live Map, Alerts, Assets, Activity
```

**Single source of truth.** Only user-owned state is persisted: the dataset anchor time, the event log,
the acting reviewer and the last refresh time. Observations, alerts, scores, metrics and timelines are
always re-derived from that in one memoised pipeline (`state/derive.ts`), so the map, queue, cards and
timeline cannot disagree.

**Stable IDs.** Observation IDs are deterministic (`OBS-OD-001`); an alert's ID is derived from its earliest
observation (`ALT-OD-001`), so persisted review history stays attached across reloads.

**Routing.** The active view lives in the URL hash (`#/alerts`), so back/forward and reload work.

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
  The basemap is keyless OpenStreetMap tiles, toned per theme with a CSS filter (warm and desaturated in light,
  dimmed and inverted in dark) so observations stay the focus. Keyless "light/dark" vector-style basemaps such as
  CARTO's now require an API key, which must not be put in a frontend bundle.
- **Type.** Inter for the interface and JetBrains Mono only for IDs, coordinates and absolute timestamps. Labels
  are sentence case.

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

## Sample data

- 50 synthetic observations at 18 sites across five regions: Uttarakhand (Garhwal–Kumaon), Madhya Pradesh
  (Kanha–Mandla), Odisha (Similipal–Rourkela), Mizoram (Lunglei–Mamit) and Punjab (Malwa plains).
- The sites include multi-pass recurring fires, single detections, a missing-confidence detection, a persistent
  industrial heat source (Rourkela steel plant), shifting-cultivation burning and crop-residue burning.
- Timestamps are relative to a persisted **anchor**: the moment the dataset was first generated in your browser.
  **Refresh** re-scores recency against the current time; it does not fetch new data.
- Seeded review events put alerts into all four workflow states and are tagged `DEMO`.
- Reviewers are fictional. Asset names reference real places for context, but their geometry is illustrative.

## Persistence and fallback

- LocalStorage key `agninet:v1`, schema-versioned and validated on load.
- Unreadable or corrupt saved data is backed up to `agninet:v1:corrupt-backup`; the app then starts from fresh
  sample data and shows a banner.
- If storage is blocked or the quota is exceeded, a banner says changes will not persist, and the app keeps working in memory.

## Security notes

There is no backend and there are no API keys. Don't put secrets in `VITE_*` environment variables: anything in
the frontend bundle is public. A future live-data integration (e.g. NASA FIRMS) should proxy through a server
that holds the key.

## Known limitations

- Demo data only: no live FIRMS or other satellite ingestion.
- Single-user, single-browser persistence (LocalStorage); no sync, no authentication, no audit integrity guarantees.
- Scoring weights and normalisation constants are prototype assumptions and have not been calibrated against
  ground truth.
- Asset geometries are hand-drawn approximations; distance uses a local planar approximation (fine at < 50 km).
- Grouping is O(n²), which is fine for hundreds of observations but needs a spatial index for thousands.
- Map tiles require internet access and are subject to the OpenStreetMap tile usage policy.
