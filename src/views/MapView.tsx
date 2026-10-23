import { useCallback } from 'react';
import { AlertFilters } from '../components/alerts/AlertFilters';
import { AlertList } from '../components/alerts/AlertList';
import { OpsMap } from '../components/map/OpsMap';
import { useApp } from '../state/useApp';
import type { Bounds } from '../state/types';

/**
 * The queue and the map render the same filtered alert list, so filters always apply to both.
 * With "In map view only" on, the queue is further narrowed to alerts on screen; the map keeps
 * showing every filtered alert so panning never hides the markers you are panning towards.
 */
export function MapView() {
  const { visibleAlerts, filteredAlerts, assets, selectedAlert, state, dispatch } = useApp();
  const onBounds = useCallback((bounds: Bounds) => dispatch({ type: 'setMapBounds', bounds }), [dispatch]);
  const regionAssets = state.regionId === 'all' ? assets : assets.filter((a) => a.regionId === state.regionId);

  return (
    <div className="flex h-full flex-col-reverse lg:flex-row">
      <div className="flex h-[48%] min-h-0 flex-col border-t border-line bg-surface lg:h-full lg:w-[400px] lg:shrink-0 lg:border-r lg:border-t-0">
        <div className="border-b border-line px-4 pb-4 pt-4">
          <AlertFilters showMapToggle compact />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <AlertList alerts={visibleAlerts} />
        </div>
      </div>
      <OpsMap
        className="min-h-0 flex-1"
        alerts={filteredAlerts}
        assets={regionAssets}
        selectedAlert={selectedAlert}
        onSelect={(id) => dispatch({ type: 'select', alertId: id })}
        regionId={state.regionId}
        onBoundsChange={onBounds}
      />
    </div>
  );
}
