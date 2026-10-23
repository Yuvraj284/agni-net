import { Search, X } from 'lucide-react';
import { STATUSES, STATUS_META } from '../../lib/verification';
import { useApp } from '../../state/useApp';
import { DEFAULT_FILTERS, type ConfidenceFilter, type SortKey, type TimeWindow } from '../../state/types';
import type { PriorityBand, VerificationStatus } from '../../types';
import { BAND_META, BAND_ORDER, STATUS_STYLE } from '../common/meta';
import { Chip, Select } from '../common/ui';

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export function AlertFilters({ showMapToggle = false, compact = false }: { showMapToggle?: boolean; compact?: boolean }) {
  const { state, dispatch, visibleAlerts, scopedAlerts } = useApp();
  const f = state.filters;
  const set = (filters: Partial<typeof f>) => dispatch({ type: 'setFilters', filters });
  const dirty =
    f.window !== DEFAULT_FILTERS.window ||
    f.confidence !== DEFAULT_FILTERS.confidence ||
    f.statuses.length > 0 ||
    f.bands.length > 0 ||
    f.search !== '' ||
    f.limitToMap;

  // In narrow side panels the search takes a full row and the selects share the next one.
  const sel = (wide: string) => (compact ? 'min-w-[7.5rem] flex-1' : wide);

  return (
    <div className="space-y-3">
      <div className={`flex flex-wrap items-center gap-2 ${compact ? '' : 'lg:flex-nowrap'}`}>
        <label className={`relative min-w-[12rem] flex-1 ${compact ? 'basis-full' : ''}`}>
          <span className="sr-only">Search alerts</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <input
            value={f.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Search alert or observation ID, region, asset"
            className="field pl-8 pr-8"
          />
          {f.search && (
            <button
              type="button"
              onClick={() => set({ search: '' })}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-fg-subtle hover:text-fg"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </label>
        <Select aria-label="Sort by" value={f.sort} onChange={(e) => set({ sort: e.target.value as SortKey })} className={sel('w-40')}>
          <option value="priority">Sort: priority</option>
          <option value="recent">Sort: most recent</option>
          <option value="confidence">Sort: confidence</option>
          <option value="observations">Sort: observations</option>
          <option value="status">Sort: status</option>
        </Select>
        <Select aria-label="Observed within" value={f.window} onChange={(e) => set({ window: e.target.value as TimeWindow })} className={sel('w-36')}>
          <option value="all">Any time</option>
          <option value="6h">Last 6 hours</option>
          <option value="24h">Last 24 hours</option>
          <option value="72h">Last 72 hours</option>
        </Select>
        <Select
          aria-label="Confidence"
          value={f.confidence}
          onChange={(e) => set({ confidence: e.target.value as ConfidenceFilter })}
          title="Alert's normalised confidence (C): high ≥ 80, nominal 50–79, low < 50"
          className={sel('w-40')}
        >
          <option value="all">Any confidence</option>
          <option value="high">High (C ≥ 80)</option>
          <option value="nominal">Nominal (50–79)</option>
          <option value="low">Low (&lt; 50)</option>
          <option value="unknown">Not reported</option>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {STATUSES.map((s: VerificationStatus) => (
          <Chip key={s} active={f.statuses.includes(s)} onClick={() => set({ statuses: toggle(f.statuses, s) })}>
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_STYLE[s].dot}`} aria-hidden />
            {STATUS_META[s].label}
          </Chip>
        ))}
        <span className="mx-1 hidden h-4 w-px bg-line sm:block" aria-hidden />
        {BAND_ORDER.map((b: PriorityBand) => (
          <Chip key={b} active={f.bands.includes(b)} onClick={() => set({ bands: toggle(f.bands, b) })}>
            <span className={`h-1.5 w-1.5 rounded-full ${BAND_META[b].dot}`} aria-hidden />
            {BAND_META[b].label}
          </Chip>
        ))}
        {showMapToggle && (
          <>
            <span className="mx-1 hidden h-4 w-px bg-line sm:block" aria-hidden />
            <Chip
              active={f.limitToMap}
              onClick={() => set({ limitToMap: !f.limitToMap })}
              title="Only list alerts with an observation inside the current map view"
            >
              In map view only
            </Chip>
          </>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-fg-subtle">
        <span>
          Showing <span className="font-medium tabular-nums text-fg">{visibleAlerts.length}</span> of{' '}
          <span className="tabular-nums">{scopedAlerts.length}</span> candidate alerts
        </span>
        {dirty && (
          <button type="button" onClick={() => dispatch({ type: 'resetFilters' })} className="link text-xs">
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
