import { Inbox, MapPin, TriangleAlert } from 'lucide-react';
import { reviewerName } from '../../data/regions';
import { formatKm, relativeTime } from '../../lib/format';
import { useApp } from '../../state/useApp';
import type { EnrichedAlert } from '../../types';
import { EmptyState, ScorePill, StatusBadge } from '../common/ui';

function AssetHint({ alert }: { alert: EnrichedAlert }) {
  if (alert.nearHeatSource) {
    return (
      <span className="flex min-w-0 items-center gap-1 text-fg-muted">
        <TriangleAlert className="h-3 w-3 shrink-0 text-medium" aria-hidden />
        <span className="truncate">Near known heat source</span>
      </span>
    );
  }
  if (!alert.nearestAsset) return null;
  const { asset, distanceKm } = alert.nearestAsset;
  return (
    <span className="flex min-w-0 items-center gap-1">
      <MapPin className="h-3 w-3 shrink-0" aria-hidden />
      <span className="truncate">{distanceKm === 0 ? `Inside ${asset.name}` : `${formatKm(distanceKm)} from ${asset.name}`}</span>
    </span>
  );
}

/** Compact, keyboard-accessible alert queue used beside maps. */
export function AlertList({ alerts, limit }: { alerts: EnrichedAlert[]; limit?: number }) {
  const { state, dispatch } = useApp();
  const now = new Date(state.scoredAt);
  const shown = limit ? alerts.slice(0, limit) : alerts;

  if (alerts.length === 0) {
    return (
      <EmptyState icon={Inbox} title="No candidate alerts match">
        Adjust the region, time window or filters to see more.
      </EmptyState>
    );
  }

  return (
    <ul className="space-y-0.5 p-2">
      {shown.map((a) => {
        const selected = state.selectedAlertId === a.id;
        return (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => dispatch({ type: 'select', alertId: a.id })}
              aria-current={selected ? 'true' : undefined}
              className={`relative w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                selected ? 'bg-accent/[0.07] ring-1 ring-accent/30' : 'hover:bg-surface-2'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ScorePill score={a.score.score} band={a.band} incomplete={a.score.incomplete} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="mono-id truncate text-fg">{a.id}</span>
                    <StatusBadge status={a.verification.status} compact />
                  </div>
                </div>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-3 pl-[58px] text-xs text-fg-subtle">
                <span className="truncate">
                  <span className="text-fg-muted">{a.regionName}</span> · {a.observations.length} obs · {a.distinctPasses} pass
                  {a.distinctPasses === 1 ? '' : 'es'}
                </span>
                <span className="shrink-0 tabular-nums">{relativeTime(a.lastObservedAt, now)}</span>
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-3 pl-[58px] text-xs text-fg-subtle">
                <AssetHint alert={a} />
                <span className="shrink-0">{reviewerName(a.verification.reviewerId)}</span>
              </div>
            </button>
          </li>
        );
      })}
      {limit && alerts.length > limit && (
        <li className="px-3 py-2 text-center text-xs text-fg-subtle">+{alerts.length - limit} more in the alert queue</li>
      )}
    </ul>
  );
}
