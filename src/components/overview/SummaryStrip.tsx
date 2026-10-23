import { ArrowRight } from 'lucide-react';
import { useApp } from '../../state/useApp';
import type { Filters, ViewId } from '../../state/types';

interface Stat {
  label: string;
  value: number;
  detail: string;
  accent?: string;
  go: { view: ViewId; filters?: Partial<Filters> };
}

/**
 * Operational summary. The review backlog leads; pipeline counts (observations → alerts) are
 * secondary. Each figure opens the matching, pre-filtered alert queue.
 */
export function SummaryStrip() {
  const { metrics: m, dispatch, state } = useApp();

  const open = (go: Stat['go']) => {
    dispatch({ type: 'resetFilters' });
    if (go.filters) dispatch({ type: 'setFilters', filters: go.filters });
    dispatch({ type: 'setView', view: go.view });
  };

  const primary: Stat[] = [
    {
      label: 'High priority, awaiting',
      value: m.urgentAwaiting,
      detail: 'Critical or high band (P ≥ 60)',
      accent: 'bg-critical',
      go: { view: 'alerts', filters: { statuses: ['awaiting'], bands: ['critical', 'high'] } },
    },
    {
      label: 'Awaiting verification',
      value: m.awaiting,
      detail: 'No human determination yet',
      accent: 'bg-medium',
      go: { view: 'alerts', filters: { statuses: ['awaiting'] } },
    },
    {
      label: 'Verified incidents',
      value: m.confirmed,
      detail: 'Confirmed by a reviewer',
      go: { view: 'alerts', filters: { statuses: ['confirmed'] } },
    },
    {
      label: 'Reviewed, not confirmed',
      value: m.unconfirmed + m.inconclusive,
      detail: `${m.unconfirmed} unconfirmed · ${m.inconclusive} inconclusive`,
      go: { view: 'alerts', filters: { statuses: ['unconfirmed', 'inconclusive'] } },
    },
  ];

  return (
    <section
      aria-label="Operational summary"
      className="grid grid-cols-2 overflow-hidden rounded-xl border border-line bg-surface shadow-card lg:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.15fr)]"
    >
      {primary.map((s, i) => (
        <button
          key={s.label}
          type="button"
          onClick={() => open(s.go)}
          className={`group px-5 py-4 text-left transition-colors hover:bg-surface-2/70 ${
            i % 2 === 1 ? 'border-l border-line' : ''
          } ${i >= 2 ? 'border-t border-line lg:border-t-0' : ''} ${i === 2 ? 'lg:border-l' : ''}`}
        >
          <div className="flex items-center gap-2 text-13 text-fg-muted">
            {s.accent && <span className={`h-2 w-2 rounded-full ${s.accent}`} aria-hidden />}
            {s.label}
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-[26px] font-semibold leading-none tracking-tight tabular-nums text-fg">{s.value}</span>
            <ArrowRight className="h-3.5 w-3.5 -translate-x-1 text-fg-subtle opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" aria-hidden />
          </div>
          <div className="mt-1 truncate text-xs text-fg-subtle">{s.detail}</div>
        </button>
      ))}

      <div className="col-span-2 flex flex-col justify-center gap-1.5 border-t border-line bg-surface-2/50 px-5 py-4 text-13 text-fg-muted lg:col-span-1 lg:border-l lg:border-t-0">
        <button type="button" onClick={() => open({ view: 'map' })} className="text-left hover:text-fg">
          <span className="font-semibold tabular-nums text-fg">{m.observations}</span> raw observations
        </button>
        <button type="button" onClick={() => open({ view: 'alerts' })} className="text-left hover:text-fg">
          grouped into <span className="font-semibold tabular-nums text-fg">{m.alerts}</span> candidate alerts
        </button>
        <span className="text-xs text-fg-subtle">
          {state.regionId === 'all' ? 'All regions' : 'Selected region'}
          {m.incomplete > 0 && ` · ${m.incomplete} with incomplete score inputs`}
        </span>
      </div>
    </section>
  );
}
