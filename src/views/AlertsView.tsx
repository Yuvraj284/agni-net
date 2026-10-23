import { AlertFilters } from '../components/alerts/AlertFilters';
import { AlertTable } from '../components/alerts/AlertTable';
import { Panel } from '../components/common/ui';
import { useApp } from '../state/useApp';

export function AlertsView() {
  const { visibleAlerts } = useApp();
  return (
    <div className="mx-auto max-w-[1680px] p-4 sm:p-6">
      <Panel className="overflow-hidden">
        <div className="px-5 pb-4 pt-5">
          <AlertFilters />
        </div>
        <AlertTable alerts={visibleAlerts} />
      </Panel>
      <p className="mt-3 px-1 text-xs text-fg-subtle">
        Candidate alerts group satellite hotspots within 1.5 km. Priority orders human review; it is not a probability of fire.
      </p>
    </div>
  );
}
