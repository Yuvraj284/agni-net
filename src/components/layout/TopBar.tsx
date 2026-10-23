import { useEffect, useRef, useState } from 'react';
import { Database, MapPin, Moon, RefreshCw, Sun } from 'lucide-react';
import { REGIONS } from '../../data/regions';
import { formatDateTime, relativeTime } from '../../lib/format';
import { useApp } from '../../state/useApp';
import { useTheme } from '../../theme/useTheme';
import type { RegionId } from '../../types';
import type { ViewId } from '../../state/types';
import { DemoTag, Select } from '../common/ui';

const TITLES: Record<ViewId, { title: string; subtitle: string }> = {
  overview: { title: 'Overview', subtitle: 'Satellite hotspots, prioritised for human review' },
  map: { title: 'Live map', subtitle: 'Raw observations grouped into candidate alerts' },
  alerts: { title: 'Alerts', subtitle: 'Candidate alert queue and verification status' },
  assets: { title: 'Assets', subtitle: 'Mapped areas of concern used for proximity scoring' },
  activity: { title: 'Activity', subtitle: 'Append-only review and system history' },
};

function ThemeToggle() {
  const [theme, setTheme] = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className="btn btn-ghost btn-icon"
    >
      {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" aria-hidden /> : <Moon className="h-[18px] w-[18px]" aria-hidden />}
    </button>
  );
}

function SourcePopover() {
  const { state, observations } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Data source: sample data, offline"
        className="btn btn-secondary gap-2 px-2.5"
      >
        <span className="h-2 w-2 rounded-full bg-medium" aria-hidden />
        <Database className="h-3.5 w-3.5 text-fg-subtle sm:hidden" aria-hidden />
        <span className="hidden sm:inline">Sample data</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-[1200] mt-2 w-80 animate-fade-up rounded-xl border border-line bg-surface p-4 text-13 text-fg-muted shadow-pop">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold text-fg">Data source</span>
            <DemoTag label="Demo / sample" />
          </div>
          <p className="leading-relaxed">
            {observations.length} synthetic hotspot observations in a FIRMS-like schema (VIIRS and MODIS fields), generated
            in this browser. <span className="font-medium text-fg">No live satellite feed is connected.</span>
          </p>
          <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-xs">
            <div className="flex justify-between gap-4">
              <dt className="text-fg-subtle">Dataset generated</dt>
              <dd className="font-mono text-fg">{formatDateTime(state.anchor)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-fg-subtle">Scored at</dt>
              <dd className="font-mono text-fg">{formatDateTime(state.scoredAt)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-fg-subtle">
            Refresh re-scores recency against the current time. Asset boundaries are illustrative.
          </p>
        </div>
      )}
    </div>
  );
}

export function TopBar() {
  const { state, dispatch, actions } = useApp();
  // Re-render every 30 s so "x min ago" stays accurate.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 30_000);
    return () => window.clearInterval(t);
  }, []);
  const heading = TITLES[state.view];

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-canvas px-3 sm:px-6">
      <div className="hidden min-w-0 md:block">
        <h1 className="truncate text-[17px] font-semibold leading-tight tracking-tight text-fg">{heading.title}</h1>
        <p className="truncate text-xs text-fg-subtle">{heading.subtitle}</p>
      </div>

      <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
        <label className="relative flex items-center">
          <span className="sr-only">Region</span>
          <MapPin className="pointer-events-none absolute left-2.5 z-10 h-3.5 w-3.5 text-fg-subtle" aria-hidden />
          <Select
            className="w-36 sm:w-56 [&_select]:pl-7"
            value={state.regionId}
            onChange={(e) => dispatch({ type: 'setRegion', regionId: e.target.value as RegionId | 'all' })}
          >
            <option value="all">All regions</option>
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}, {r.state}
              </option>
            ))}
          </Select>
        </label>

        <SourcePopover />

        <div className="hidden items-center gap-1 pl-1 text-xs text-fg-subtle lg:flex" title={formatDateTime(state.lastRefreshedAt)}>
          Updated <span className="tabular-nums text-fg-muted">{relativeTime(state.lastRefreshedAt)}</span>
        </div>
        <button
          type="button"
          onClick={actions.refresh}
          title="Re-score sample data against the current time"
          aria-label="Refresh"
          className="btn btn-ghost btn-icon"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
        </button>
        <span className="mx-0.5 h-5 w-px bg-line" aria-hidden />
        <ThemeToggle />
      </div>
    </header>
  );
}
