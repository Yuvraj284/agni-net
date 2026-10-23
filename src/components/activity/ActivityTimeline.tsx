import { History } from 'lucide-react';
import { formatDateTime, relativeTime } from '../../lib/format';
import type { VerificationEvent } from '../../types';
import { EmptyState } from '../common/ui';
import { EVENT_TYPE_LABEL, describeEvent } from './describe';

/** Renders events newest-first. Expects an already-filtered list. */
export function ActivityTimeline({
  events,
  onOpenAlert,
  emptyText = 'No activity recorded yet.',
  dense = false,
}: {
  events: VerificationEvent[];
  onOpenAlert?: (alertId: string) => void;
  emptyText?: string;
  dense?: boolean;
}) {
  if (events.length === 0) return <EmptyState icon={History} title={emptyText} />;
  return (
    <ol>
      {events.map((e, i) => {
        const { icon: Icon, title, chip } = describeEvent(e);
        const last = i === events.length - 1;
        return (
          <li key={e.id} className={`relative flex gap-3 ${last ? '' : dense ? 'pb-4' : 'pb-5'}`}>
            {!last && <span className="absolute bottom-0 left-[13px] top-8 w-px bg-line" aria-hidden />}
            <span className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${chip}`}>
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-13 font-medium text-fg">{title}</span>
                {e.alertId &&
                  (onOpenAlert ? (
                    <button
                      type="button"
                      onClick={() => onOpenAlert(e.alertId!)}
                      className="mono-id text-xs text-accent hover:text-accent-strong hover:underline"
                    >
                      {e.alertId}
                    </button>
                  ) : null)}
              </div>
              {e.note && (
                <p className={`mt-1.5 whitespace-pre-wrap rounded-lg bg-surface-2 px-3 py-2 text-13 leading-relaxed text-fg-muted ${dense ? 'line-clamp-2' : ''}`}>
                  {e.note}
                </p>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-fg-subtle">
                <span>{EVENT_TYPE_LABEL[e.type]}</span>
                <span aria-hidden>·</span>
                <span>{e.actor}</span>
                <span aria-hidden>·</span>
                <time dateTime={e.at} title={formatDateTime(e.at)}>
                  {relativeTime(e.at)}
                </time>
                {e.seeded && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="rounded border border-line px-1 text-2xs">demo record</span>
                  </>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
