import { useState } from 'react';
import { Activity, Flame, LayoutDashboard, ListChecks, Map as MapIcon, RotateCcw, Shapes, type LucideIcon } from 'lucide-react';
import { DEFAULT_ACTOR, REVIEWERS } from '../../data/regions';
import { useApp } from '../../state/useApp';
import type { ViewId } from '../../state/types';
import { Select } from '../common/ui';

const NAV: { id: ViewId; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'map', label: 'Live map', icon: MapIcon },
  { id: 'alerts', label: 'Alerts', icon: ListChecks },
  { id: 'assets', label: 'Assets', icon: Shapes },
  { id: 'activity', label: 'Activity', icon: Activity },
];

export function Sidebar() {
  const { state, dispatch, metrics, assets, actions } = useApp();
  const [confirmReset, setConfirmReset] = useState(false);

  const counts: Partial<Record<ViewId, { n: number; title: string }>> = {
    alerts: { n: metrics.awaiting, title: 'Awaiting verification' },
    assets: { n: assets.length, title: 'Mapped assets' },
  };

  return (
    <aside className="flex w-[60px] shrink-0 flex-col border-r border-line bg-canvas lg:w-60">
      <div className="flex h-16 items-center gap-2.5 px-3.5 lg:px-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-fg shadow-card">
          <Flame className="h-[18px] w-[18px] text-ember" strokeWidth={2.2} aria-hidden />
        </div>
        <div className="hidden min-w-0 lg:block">
          <div className="text-[15px] font-semibold leading-tight tracking-tight text-fg">AgniNet</div>
          <div className="text-xs leading-tight text-fg-subtle">Fire intelligence</div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-2.5 py-3 lg:px-3" aria-label="Main">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = state.view === id;
          const count = counts[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => dispatch({ type: 'setView', view: id })}
              title={label}
              aria-current={active ? 'page' : undefined}
              className={`group flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-13 transition-colors ${
                active
                  ? 'bg-surface font-medium text-fg shadow-card ring-1 ring-line'
                  : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
              }`}
            >
              <Icon
                className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-accent' : 'text-fg-subtle group-hover:text-fg-muted'}`}
                strokeWidth={1.9}
                aria-hidden
              />
              <span className="hidden flex-1 text-left lg:block">{label}</span>
              {count && (
                <span className="hidden text-xs tabular-nums text-fg-subtle lg:inline" title={count.title}>
                  {count.n}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="hidden space-y-4 border-t border-line px-5 py-4 lg:block">
        <label className="block">
          <span className="label">Acting as</span>
          <Select
            className="mt-1.5 w-full"
            value={state.actingAs}
            onChange={(e) => dispatch({ type: 'setActingAs', actor: e.target.value })}
          >
            <option value={DEFAULT_ACTOR}>{DEFAULT_ACTOR}</option>
            {REVIEWERS.map((r) => (
              <option key={r.id} value={r.name}>
                {r.name}
              </option>
            ))}
          </Select>
          <span className="mt-1.5 block text-xs leading-snug text-fg-subtle">
            No sign-in in this prototype. New review events are recorded under this name.
          </span>
        </label>

        {confirmReset ? (
          <div className="animate-fade-up rounded-lg border border-critical/25 bg-critical/5 p-3 text-xs text-fg">
            Regenerate the demo data and erase all review history?
            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                className="btn h-7 bg-critical px-2.5 text-xs text-white hover:bg-critical/90"
                onClick={() => {
                  actions.resetDemo();
                  setConfirmReset(false);
                }}
              >
                Reset
              </button>
              <button type="button" className="btn btn-ghost h-7 px-2.5 text-xs" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmReset(true)} className="btn btn-ghost -ml-2 h-7 px-2 text-xs">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset demo data
          </button>
        )}
      </div>
    </aside>
  );
}
