import { useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { ActivityTimeline } from '../components/activity/ActivityTimeline';
import { AlertList } from '../components/alerts/AlertList';
import { Panel, PanelHeader } from '../components/common/ui';
import { OpsMap } from '../components/map/OpsMap';
import { RegionSummary, StatusBreakdown } from '../components/overview/RegionSummary';
import { SummaryStrip } from '../components/overview/SummaryStrip';
import { sortEvents } from '../lib/verification';
import { sortAlerts } from '../state/derive';
import { useApp } from '../state/useApp';
import type { ViewId } from '../state/types';

function GoLink({ view, children }: { view: ViewId; children: React.ReactNode }) {
  const { dispatch } = useApp();
  return (
    <button type="button" className="link" onClick={() => dispatch({ type: 'setView', view })}>
      {children} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}

export function OverviewView() {
  const { scopedAlerts, assets, selectedAlert, state, dispatch, alertById, actions } = useApp();

  const queue = useMemo(
    () => sortAlerts(scopedAlerts.filter((a) => a.verification.status === 'awaiting'), 'priority'),
    [scopedAlerts],
  );
  const recent = useMemo(
    () =>
      sortEvents(state.events)
        .reverse()
        .filter((e) => state.regionId === 'all' || (e.alertId && alertById.get(e.alertId)?.regionId === state.regionId))
        .slice(0, 6),
    [state.events, state.regionId, alertById],
  );
  const regionAssets = state.regionId === 'all' ? assets : assets.filter((a) => a.regionId === state.regionId);

  return (
    <div className="mx-auto max-w-[1680px] space-y-5 p-4 sm:p-6">
      <SummaryStrip />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <Panel className="flex flex-col overflow-hidden xl:col-span-8 xl:h-[640px]">
          <PanelHeader
            title="Hotspot map"
            subtitle="Every raw observation, coloured by its alert's priority"
            right={<GoLink view="map">Open live map</GoLink>}
          />
          <OpsMap
            className="h-[440px] border-t border-line xl:h-auto xl:flex-1"
            alerts={scopedAlerts}
            assets={regionAssets}
            selectedAlert={selectedAlert}
            onSelect={(id) => dispatch({ type: 'select', alertId: id })}
            regionId={state.regionId}
          />
        </Panel>

        <Panel className="flex max-h-[640px] flex-col overflow-hidden xl:col-span-4 xl:h-[640px]">
          <PanelHeader
            title="Review queue"
            subtitle={`${queue.length} awaiting · highest priority first`}
            right={<GoLink view="alerts">All alerts</GoLink>}
          />
          <div className="min-h-0 flex-1 overflow-y-auto border-t border-line">
            <AlertList alerts={queue} limit={15} />
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Panel>
          <PanelHeader title="Verification status" subtitle={state.regionId === 'all' ? 'All regions' : 'Selected region'} />
          <StatusBreakdown />
        </Panel>
        <Panel>
          <PanelHeader title="Regions" subtitle="Select a region to scope the dashboard" />
          <RegionSummary />
        </Panel>
        <Panel className="flex max-h-[440px] flex-col md:col-span-2 xl:col-span-1">
          <PanelHeader title="Recent activity" right={<GoLink view="activity">Full log</GoLink>} />
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
            <ActivityTimeline events={recent} onOpenAlert={(id) => actions.openAlert(id)} dense />
          </div>
        </Panel>
      </div>
    </div>
  );
}
