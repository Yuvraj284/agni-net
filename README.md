# AgniNet

Satellite fire intelligence and field-response coordination — a hackathon prototype.

AgniNet turns satellite thermal-hotspot observations into **prioritised candidate alerts** that human reviewers
investigate, verify and track. A hotspot is not a confirmed fire: raw observations, candidate alerts and
human-verified incidents are kept distinct throughout.

> **Demo data only.** All observations are synthetic and generated in the browser. No live satellite feed is
> connected, and mapped asset boundaries are illustrative.

## Features

- Operational overview, live map, alert queue, mapped assets and activity log
- Leaflet + OpenStreetMap map with marker clustering and asset overlays
- Documented priority score `P = 0.35C + 0.25R + 0.20F + 0.20A` with a per-factor breakdown; missing inputs are
  flagged, never assumed
- Verification workflow: assign reviewers, record status, actions and notes as an append-only history
- LocalStorage persistence, plus light/dark themes

## Quick start

```bash
npm install
npm run dev      # http://127.0.0.1:5173
```

| Command | Purpose |
| --- | --- |
| `npm run build` | Type-check and build to `dist/` |
| `npm test` | Unit tests (Vitest) |
| `npm run check` | Typecheck, lint, test and build |

## Tech stack

React 18 · TypeScript · Vite · Tailwind CSS · Leaflet / react-leaflet · lucide-react

## Documentation

Architecture, scoring rules, grouping, the theming system and known limitations are covered in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Limitations

Prototype only. There is no backend, authentication or live data ingestion, and the scoring weights have not been
calibrated.
