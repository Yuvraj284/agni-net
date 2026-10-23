import { useEffect, useRef, useState } from 'react';
import { Database, MapPin, Moon, RefreshCw, Sun } from 'lucide-react';
import { REGIONS } from '../../data/regions';
import { formatDateTime, relativeTime } from '../../lib/format';
import { useApp } from '../../state/useApp';
import { useTheme } from '../../theme/useTheme';
import type { RegionId } from '../../types';
import type { ViewId } from '../../state/types';
import { Select } from '../common/ui';

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

function SourceOption({
  active,
  title,
  children,
  onSelect,
  disabled,
}: {
  active: boolean;
  title: string;
  children: React.ReactNode;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      disabled={disabled}
      onClick={onSelect}
      className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors disabled:cursor-wait disabled:opacity-60 ${
        active ? 'border-accent/50 bg-accent/[0.06]' : 'border-line hover:border-line-strong hover:bg-surface-2'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-fg">{title}</span>
        {active && <span className="text-xs font-medium text-accent">In use</span>}
      </div>
      <div className="mt-0.5 text-xs leading-relaxed text-fg-muted">{children}</div>
    </button>
  );
}

function SourcePopover() {
  const { state, observations, actions } = useApp();
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

  const live = state.dataSource === 'live';
  const loading = state.live.status === 'loading';
  const dataset = state.live.dataset;
  const label = loading ? 'Loading live data…' : live ? 'NASA FIRMS' : 'Sample data';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Data source: ${label}`}
        className="btn btn-secondary gap-2 px-2.5"
      >
        <span className={`h-2 w-2 rounded-full ${loading ? 'animate-pulse bg-info' : live ? 'bg-success' : 'bg-medium'}`} aria-hidden />
        <Database className="h-3.5 w-3.5 text-fg-subtle sm:hidden" aria-hidden />
        <span className="hidden sm:inline">{label}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-[1200] mt-2 w-[22rem] max-w-[calc(100vw-1.5rem)] animate-fade-up rounded-xl border border-line bg-surface p-4 text-13 text-fg-muted shadow-pop">
          <div className="mb-3 font-semibold text-fg">Data source</div>
          <div className="space-y-2" role="radiogroup" aria-label="Data source">
            <SourceOption active={!live} title="Sample data" onSelect={() => live && actions.switchToDemo()}>
              Synthetic hotspots in a FIRMS-like schema, generated in this browser. Works offline.
            </SourceOption>
            <SourceOption
              active={live}
              disabled={loading}
              title="NASA FIRMS, last 24 hours"
              onSelect={() => void actions.loadLive()}
            >
              Near-real-time VIIRS and MODIS detections for AgniNet&apos;s monitored regions, fetched through this
              server. Needs <span className="font-mono">FIRMS_MAP_KEY</span> in <span className="font-mono">.env.local</span>.
            </SourceOption>
          </div>
          <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-xs">
            {live && dataset ? (
              <>
                <div className="flex justify-between gap-4">
                  <dt className="text-fg-subtle">Fetched</dt>
                  <dd className="font-mono text-fg">{formatDateTime(dataset.fetchedAt)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-fg-subtle">In monitored regions</dt>
                  <dd className="tabular-nums text-fg">{observations.length} detections</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-fg-subtle">Elsewhere in India (not shown)</dt>
                  <dd className="tabular-nums text-fg">{dataset.outsideRegions}</dd>
                </div>
                {dataset.failedSources.length > 0 && (
                  <div className="text-critical">Failed: {dataset.failedSources.map((f) => f.source).join(', ')}</div>
                )}
              </>
            ) : (
              <>
                <div className="flex justify-between gap-4">
                  <dt className="text-fg-subtle">Sample observations</dt>
                  <dd className="tabular-nums text-fg">{observations.length}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-fg-subtle">Dataset generated</dt>
                  <dd className="font-mono text-fg">{formatDateTime(state.anchor)}</dd>
                </div>
              </>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-fg-subtle">Scored at</dt>
              <dd className="font-mono text-fg">{formatDateTime(state.scoredAt)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-fg-subtle">
            Satellite hotspots are candidates, not confirmed fires. Asset boundaries are illustrative.
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
          title={state.dataSource === 'live' ? 'Fetch the latest NASA FIRMS detections' : 'Re-score sample data against the current time'}
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
