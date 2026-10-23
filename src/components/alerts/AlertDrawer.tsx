import { useEffect, useMemo, useState } from 'react';
import { Send, ShieldAlert, TriangleAlert, X } from 'lucide-react';
import { reviewerName } from '../../data/regions';
import { formatCoord, formatDateTime, formatKm, formatUtc, relativeTime } from '../../lib/format';
import { sortEvents } from '../../lib/verification';
import { useApp } from '../../state/useApp';
import { ActivityTimeline } from '../activity/ActivityTimeline';
import { BandBadge, DemoTag, Field, StatusBadge } from '../common/ui';
import { FireWeatherCard } from './FireWeatherCard';
import { ObservationTable } from './ObservationTable';
import { ScoreBreakdown } from './ScoreBreakdown';
import { VerificationForm } from './VerificationForm';
import { WhatsAppDispatchModal } from './WhatsAppDispatchModal';

function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-t border-line px-6 py-5">
      <div className="mb-3.5 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
        {aside && <span className="text-xs text-fg-subtle">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

export function AlertDrawer() {
  const { selectedAlert: alert, state, dispatch } = useApp();
  const [dispatchOpen, setDispatchOpen] = useState(false);

  useEffect(() => {
    if (!alert) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dispatch({ type: 'select', alertId: null });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [alert, dispatch]);

  const history = useMemo(
    () => (alert ? sortEvents(state.events.filter((e) => e.alertId === alert.id)).reverse() : []),
    [alert, state.events],
  );

  if (!alert) return null;
  const now = new Date(state.scoredAt);
  const isIncident = alert.verification.status === 'confirmed';
  const instruments = [...new Set(alert.observations.map((o) => o.instrument))].join(' + ');

  return (
    <>
      <aside
        className="fixed inset-y-0 right-0 z-[1100] flex w-full animate-drawer-in flex-col border-l border-line bg-surface shadow-pop sm:w-[520px]"
        aria-label={`Alert ${alert.id} details`}
      >
        <header className="px-6 pb-5 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-fg-subtle">{isIncident ? 'Verified incident' : 'Candidate alert'} · {alert.regionName}</div>
              <h2 className="mt-1 font-mono text-xl font-medium tracking-tight text-fg">{alert.id}</h2>
            </div>
            <button
              type="button"
              onClick={() => dispatch({ type: 'select', alertId: null })}
              className="btn btn-ghost btn-icon -mr-2 -mt-1"
              aria-label="Close details"
              title="Close (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <BandBadge band={alert.band} />
            <StatusBadge status={alert.verification.status} />
            <DemoTag />
          </div>

          <div className="mt-3.5">
            <button
              type="button"
              onClick={() => setDispatchOpen(true)}
              className="btn flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500"
            >
              <Send className="h-3.5 w-3.5" />
              Dispatch WhatsApp Ranger Alert
            </button>
          </div>

          {isIncident ? (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-critical/[0.07] px-3 py-2 text-13 text-critical">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              Confirmed by a human reviewer. See the review history below for the evidence recorded.
            </p>
          ) : (
            <p className="mt-3 text-13 leading-relaxed text-fg-muted">
              Derived from satellite thermal hotspots. <span className="font-medium text-fg">Not a confirmed fire</span> until a
              reviewer verifies it.
            </p>
          )}
          {alert.nearHeatSource && (
            <p className="mt-2 flex items-start gap-2 rounded-lg bg-medium/10 px-3 py-2 text-13 text-fg">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-medium" aria-hidden />
              <span>
                Within {formatKm(alert.nearHeatSource.distanceKm)} of <strong className="font-medium">{alert.nearHeatSource.asset.name}</strong>,
                a known industrial heat source. Detections here are often not vegetation fires.
              </span>
            </p>
          )}
        </header>

        <div className="flex-1 overflow-y-auto">
          <Section title="Location and timing">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
              <Field label="Centroid">
                <span className="font-mono text-xs">{formatCoord(alert.centroid[0], alert.centroid[1])}</span>
              </Field>
              <Field label="Spatial extent">
                {alert.observations.length === 1 ? 'Single detection' : `${formatKm(alert.extentKm)} radius`}
              </Field>
              <Field label="First observed">
                <span className="font-mono text-xs" title={formatUtc(alert.firstObservedAt)}>
                  {formatDateTime(alert.firstObservedAt)}
                </span>
              </Field>
              <Field label="Last observed">
                <span title={formatUtc(alert.lastObservedAt)}>
                  <span className="font-mono text-xs">{formatDateTime(alert.lastObservedAt)}</span>{' '}
                  <span className="text-fg-subtle">· {relativeTime(alert.lastObservedAt, now)}</span>
                </span>
              </Field>
              <Field label="Observations">
                {alert.observations.length} across {alert.distinctPasses} overpass{alert.distinctPasses === 1 ? '' : 'es'}
              </Field>
              <Field label="Source">{instruments} (sample)</Field>
              <Field label="Nearest asset">
                {alert.nearestAsset ? (
                  <span title={alert.nearestAsset.asset.name}>
                    {alert.nearestAsset.distanceKm === 0
                      ? `Inside ${alert.nearestAsset.asset.name}`
                      : `${alert.nearestAsset.asset.name} · ${formatKm(alert.nearestAsset.distanceKm)}`}
                  </span>
                ) : (
                  '—'
                )}
              </Field>
              <Field label="Reviewer">{reviewerName(alert.verification.reviewerId)}</Field>
            </dl>
          </Section>

          <Section title="Fire weather & spread prediction" aside="Live / Rothermel model">
            <FireWeatherCard alert={alert} />
          </Section>

          <Section title="Priority score">
            <ScoreBreakdown score={alert.score} />
          </Section>

          <Section title="Raw observations" aside={`${alert.observations.length} detection${alert.observations.length === 1 ? '' : 's'}`}>
            <ObservationTable observations={alert.observations} />
          </Section>

          <Section title="Verification">
            <VerificationForm key={`${alert.id}:${alert.verification.eventCount}`} alert={alert} />
          </Section>

          <Section title="Review history" aside={`${history.length} event${history.length === 1 ? '' : 's'}`}>
            <ActivityTimeline events={history} emptyText="No review events yet." />
          </Section>
        </div>
      </aside>

      <WhatsAppDispatchModal
        alert={alert}
        isOpen={dispatchOpen}
        onClose={() => setDispatchOpen(false)}
      />
    </>
  );
}

