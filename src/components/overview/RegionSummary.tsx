import { REGIONS } from '../../data/regions';
import { STATUSES, STATUS_META } from '../../lib/verification';
import { useApp } from '../../state/useApp';
import { STATUS_STYLE } from '../common/meta';
import { ScorePill } from '../common/ui';

/** Workflow status distribution for the current scope. */
export function StatusBreakdown() {
  const { metrics, scopedAlerts } = useApp();
  const total = Math.max(1, metrics.alerts);
  const counts = Object.fromEntries(STATUSES.map((s) => [s, scopedAlerts.filter((a) => a.verification.status === s).length]));
  return (
    <div className="space-y-4 px-5 pb-5">
      <div className="flex h-2 gap-px overflow-hidden rounded-full bg-surface-3" role="img" aria-label="Verification status distribution">
        {STATUSES.map((s) => (
          <div
            key={s}
            className={STATUS_STYLE[s].bar}
            style={{ width: `${(counts[s] / total) * 100}%` }}
            title={`${STATUS_META[s].label}: ${counts[s]}`}
          />
        ))}
      </div>
      <ul className="space-y-2 text-13">
        {STATUSES.map((s) => (
          <li key={s} className="flex items-center gap-2.5">
            <span className={`h-2 w-2 rounded-full ${STATUS_STYLE[s].dot}`} aria-hidden />
            <span className="text-fg-muted">{STATUS_META[s].label}</span>
            <span className="ml-auto font-medium tabular-nums text-fg">{counts[s]}</span>
            <span className="w-9 text-right text-xs tabular-nums text-fg-subtle">{Math.round((counts[s] / total) * 100)}%</span>
          </li>
        ))}
      </ul>
      {metrics.incomplete > 0 && (
        <p className="rounded-lg bg-medium/10 px-3 py-2 text-xs text-medium">
          {metrics.incomplete} alert{metrics.incomplete === 1 ? ' has' : 's have'} incomplete score inputs, shown as “≥”.
        </p>
      )}
    </div>
  );
}

export function RegionSummary() {
  const { allAlerts, state, dispatch } = useApp();
  return (
    <ul className="px-2 pb-3">
      {REGIONS.map((r) => {
        const list = allAlerts.filter((a) => a.regionId === r.id);
        const top = [...list].sort((a, b) => b.score.score - a.score.score)[0];
        const awaiting = list.filter((a) => a.verification.status === 'awaiting').length;
        const confirmed = list.filter((a) => a.verification.status === 'confirmed').length;
        const active = state.regionId === r.id;
        return (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => dispatch({ type: 'setRegion', regionId: active ? 'all' : r.id })}
              aria-pressed={active}
              title={active ? 'Show all regions' : `Scope the dashboard to ${r.name}`}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                active ? 'bg-accent/[0.07] ring-1 ring-accent/30' : 'hover:bg-surface-2'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-13 font-medium text-fg">{r.name}</div>
                <div className="truncate text-xs text-fg-subtle">
                  {r.state} · {list.length} alerts · {awaiting} awaiting
                  {confirmed > 0 && <span className="text-critical"> · {confirmed} confirmed</span>}
                </div>
              </div>
              {top && <ScorePill score={top.score.score} band={top.band} incomplete={top.score.incomplete} />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
