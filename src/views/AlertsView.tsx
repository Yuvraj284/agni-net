import { Download } from 'lucide-react';
import { AlertFilters } from '../components/alerts/AlertFilters';
import { AlertTable } from '../components/alerts/AlertTable';
import { Panel } from '../components/common/ui';
import { alertsToCsv, downloadCsv } from '../lib/exportCsv';
import { useApp } from '../state/useApp';

export function AlertsView() {
  const { visibleAlerts, state } = useApp();

  const exportCsv = () => {
    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
    downloadCsv(`agninet-alerts-${state.dataSource}-${stamp}.csv`, alertsToCsv(visibleAlerts));
  };

  return (
    <div className="mx-auto max-w-[1680px] p-4 sm:p-6">
      <Panel className="overflow-hidden">
        <div className="px-5 pb-4 pt-5">
          <AlertFilters />
        </div>
        <div className="flex items-center justify-end border-t border-line px-5 py-2">
          <button type="button" onClick={exportCsv} disabled={visibleAlerts.length === 0} className="btn btn-ghost">
            <Download className="h-3.5 w-3.5" aria-hidden />
            Export {visibleAlerts.length} as CSV
          </button>
        </div>
        <AlertTable alerts={visibleAlerts} />
      </Panel>
      <p className="mt-3 px-1 text-xs text-fg-subtle">
        Candidate alerts group satellite hotspots within 1.5 km. Priority orders human review; it is not a probability of fire.
      </p>
    </div>
  );
}
