import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { ActivityTimeline } from '../components/activity/ActivityTimeline';
import { EVENT_TYPE_LABEL, describeEvent } from '../components/activity/describe';
import { Chip, Panel } from '../components/common/ui';
import { formatDay } from '../lib/format';
import { sortEvents } from '../lib/verification';
import { useApp } from '../state/useApp';
import type { VerificationEvent } from '../types';

type EventType = VerificationEvent['type'];
const TYPES: EventType[] = ['status_change', 'assignment', 'action', 'note', 'system'];

export function ActivityView() {
  const { state, alertById, actions } = useApp();
  const [types, setTypes] = useState<EventType[]>([]);
  const [query, setQuery] = useState('');

  const scoped = useMemo(
    () =>
      sortEvents(state.events)
        .reverse()
        .filter((e) => state.regionId === 'all' || (e.alertId && alertById.get(e.alertId)?.regionId === state.regionId)),
    [state.events, state.regionId, alertById],
  );

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = scoped
      .filter((e) => types.length === 0 || types.includes(e.type))
      .filter((e) => !q || [e.alertId ?? '', e.actor, e.note ?? '', e.action ?? ''].join(' ').toLowerCase().includes(q));
    const byDay = new Map<string, VerificationEvent[]>();
    for (const e of list) {
      const day = formatDay(e.at);
      byDay.set(day, [...(byDay.get(day) ?? []), e]);
    }
    return [...byDay.entries()];
  }, [scoped, types, query]);

  const total = groups.reduce((s, [, l]) => s + l.length, 0);
  const typeCount = (t: EventType) => scoped.filter((e) => e.type === t).length;

  return (
    <div className="mx-auto max-w-[920px] p-4 sm:p-6">
      <div className="mb-4 space-y-3">
        <label className="relative block">
          <span className="sr-only">Search activity</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by alert ID, person or note"
            className="field pl-8"
          />
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
          {TYPES.map((t) => {
            const Icon = describeEvent({ id: '', alertId: null, at: '', actor: '', type: t }).icon;
            return (
              <Chip key={t} active={types.includes(t)} onClick={() => setTypes((c) => (c.includes(t) ? c.filter((x) => x !== t) : [...c, t]))}>
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {EVENT_TYPE_LABEL[t]}
                <span className="tabular-nums text-fg-subtle">{typeCount(t)}</span>
              </Chip>
            );
          })}
          <span className="ml-auto text-xs text-fg-subtle">
            <span className="font-medium tabular-nums text-fg">{total}</span> events · newest first · append-only
          </span>
        </div>
      </div>

      <Panel className="px-5 py-5 sm:px-6">
        {groups.length === 0 ? (
          <ActivityTimeline events={[]} emptyText="No events match these filters." />
        ) : (
          <div className="space-y-7">
            {groups.map(([day, events]) => (
              <section key={day}>
                <h3 className="mb-3 text-13 font-semibold text-fg">{day}</h3>
                <ActivityTimeline events={events} onOpenAlert={(id) => actions.openAlert(id)} />
              </section>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
