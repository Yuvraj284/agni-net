import { Inbox, TriangleAlert } from 'lucide-react';
import { reviewerName } from '../../data/regions';
import { formatDateTime, formatKm, relativeTime } from '../../lib/format';
import { confidenceClass } from '../../state/derive';
import { useApp } from '../../state/useApp';
import type { EnrichedAlert } from '../../types';
import { EmptyState, ScorePill, StatusBadge } from '../common/ui';

const CONF_LABEL = { high: 'High', nominal: 'Nominal', low: 'Low', unknown: 'Not reported' } as const;

const th = 'px-4 py-2.5 text-xs font-medium text-fg-subtle';

export function AlertTable({ alerts }: { alerts: EnrichedAlert[] }) {
  const { state, dispatch } = useApp();
  const now = new Date(state.scoredAt);

  if (alerts.length === 0) {
    return (
      <EmptyState icon={Inbox} title="No candidate alerts match">
        Try clearing filters or choosing “All regions”.
      </EmptyState>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1000px] text-left text-13">
        <thead className="sticky top-0 z-10 bg-surface">
          <tr className="border-y border-line">
            <th className={th}>Priority</th>
            <th className={th}>Alert</th>
            <th className={th}>Verification</th>
            <th className={th}>Reviewer</th>
            <th className={`${th} text-right`}>Observations</th>
            <th className={th}>Confidence</th>
            <th className={th}>Last observed</th>
            <th className={th}>Nearest asset</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map((a) => {
            const selected = state.selectedAlertId === a.id;
            const select = () => dispatch({ type: 'select', alertId: a.id });
            return (
              <tr
                key={a.id}
                onClick={select}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    select();
                  }
                }}
                tabIndex={0}
                aria-selected={selected}
                className={`group cursor-pointer border-b border-line/70 outline-none transition-colors last:border-0 focus-visible:bg-surface-2 ${
                  selected ? 'bg-accent/[0.06]' : 'hover:bg-surface-2/70'
                }`}
              >
                <td className={`relative px-4 py-3 ${selected ? 'shadow-[inset_3px_0_0_rgb(var(--accent))]' : ''}`}>
                  <ScorePill score={a.score.score} band={a.band} incomplete={a.score.incomplete} />
                </td>
                <td className="px-4 py-3">
                  <div className="mono-id text-fg">{a.id}</div>
                  <div className="text-xs text-fg-subtle">{a.regionName}</div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={a.verification.status} />
                </td>
                <td className={`px-4 py-3 ${a.verification.reviewerId ? 'text-fg' : 'text-fg-subtle'}`}>
                  {reviewerName(a.verification.reviewerId)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-fg">
                  {a.observations.length}
                  <span className="text-fg-subtle"> · {a.distinctPasses} pass{a.distinctPasses === 1 ? '' : 'es'}</span>
                </td>
                <td className="px-4 py-3 text-fg-muted">
                  {CONF_LABEL[confidenceClass(a)]}
                  {a.score.factors.C.value !== null && (
                    <span className="ml-1 tabular-nums text-fg-subtle">{Math.round(a.score.factors.C.value)}</span>
                  )}
                </td>
                <td className="px-4 py-3" title={formatDateTime(a.lastObservedAt)}>
                  <div className="tabular-nums text-fg">{relativeTime(a.lastObservedAt, now)}</div>
                  <div className="font-mono text-2xs text-fg-subtle">{formatDateTime(a.lastObservedAt)}</div>
                </td>
                <td className="max-w-[15rem] px-4 py-3 text-fg-muted">
                  {a.nearHeatSource ? (
                    <span className="flex items-center gap-1.5">
                      <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-medium" aria-hidden />
                      <span className="truncate">Heat source: {a.nearHeatSource.asset.name}</span>
                    </span>
                  ) : a.nearestAsset ? (
                    <span className="block truncate" title={a.nearestAsset.asset.name}>
                      {a.nearestAsset.distanceKm === 0 ? (
                        <>
                          <span className="text-fg-subtle">Inside </span>
                          {a.nearestAsset.asset.name}
                        </>
                      ) : (
                        <>
                          {a.nearestAsset.asset.name}
                          <span className="text-fg-subtle"> · {formatKm(a.nearestAsset.distanceKm)}</span>
                        </>
                      )}
                    </span>
                  ) : (
                    <span className="text-fg-subtle">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
