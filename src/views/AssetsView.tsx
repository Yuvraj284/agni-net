import { useMemo, useState } from 'react';
import { Shapes, TriangleAlert } from 'lucide-react';
import { ASSET_TYPE_META } from '../data/assets';
import { regionById } from '../data/regions';
import { SCORING_CONFIG } from '../config/scoring';
import { distanceToAssetKm } from '../lib/geo';
import { ASSET_STYLE } from '../components/common/meta';
import { Chip, DemoTag, EmptyState, ScorePill } from '../components/common/ui';
import { OpsMap, type MapFocus } from '../components/map/OpsMap';
import { useApp } from '../state/useApp';
import type { Asset, AssetType } from '../types';

const RADIUS_KM = SCORING_CONFIG.proximity.decayKm;

function assetBounds(asset: Asset): MapFocus['bounds'] {
  if (asset.geometry === 'point') {
    const [lat, lon] = asset.location;
    return [[lat - 0.06, lon - 0.06], [lat + 0.06, lon + 0.06]];
  }
  const lats = asset.ring.map((p) => p[0]);
  const lons = asset.ring.map((p) => p[1]);
  return [[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]];
}

/** Asset workspace: list and map side by side; selecting an asset focuses and highlights it. */
export function AssetsView() {
  const { assets, scopedAlerts, selectedAlert, state, dispatch } = useApp();
  const [types, setTypes] = useState<AssetType[]>([]);
  const [focusId, setFocusId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const inRegion = state.regionId === 'all' ? assets : assets.filter((a) => a.regionId === state.regionId);
    return inRegion
      .filter((a) => types.length === 0 || types.includes(a.type))
      .map((asset) => {
        const nearby = scopedAlerts.filter((al) =>
          al.observations.some((o) => distanceToAssetKm([o.lat, o.lon], asset) <= RADIUS_KM),
        );
        const top = [...nearby].sort((a, b) => b.score.score - a.score.score)[0] ?? null;
        return {
          asset,
          nearby: nearby.length,
          awaiting: nearby.filter((a) => a.verification.status === 'awaiting').length,
          top,
        };
      });
  }, [assets, scopedAlerts, state.regionId, types]);

  const focusAsset = rows.find((r) => r.asset.id === focusId)?.asset ?? null;
  const focus: MapFocus | null = focusAsset ? { key: focusAsset.id, bounds: assetBounds(focusAsset) } : null;

  return (
    <div className="flex h-full flex-col-reverse lg:flex-row">
      <div className="flex h-[52%] min-h-0 flex-col border-t border-line bg-surface lg:h-full lg:w-[400px] lg:shrink-0 lg:border-r lg:border-t-0">
        <div className="space-y-3 border-b border-line p-4">
          <div className="flex items-center justify-between">
            <span className="text-13 text-fg-muted">
              <span className="font-semibold tabular-nums text-fg">{rows.length}</span> mapped assets
            </span>
            <DemoTag label="Illustrative geometry" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(ASSET_TYPE_META) as AssetType[]).map((t) => (
              <Chip
                key={t}
                active={types.includes(t)}
                onClick={() => setTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))}
              >
                <span className={`h-2 w-2 rounded-sm ${ASSET_STYLE[t].swatch}`} aria-hidden />
                {ASSET_TYPE_META[t].label}
              </Chip>
            ))}
          </div>
          <p className="text-xs leading-relaxed text-fg-subtle">
            Assets drive the proximity factor (A): full weight inside a polygon, decaying to zero at {RADIUS_KM} km. Known
            industrial heat sources never raise priority; they flag alerts within {SCORING_CONFIG.proximity.heatSourceFlagKm} km.
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {rows.length === 0 ? (
            <EmptyState icon={Shapes} title="No assets for this selection">
              Choose another region or clear the type filters.
            </EmptyState>
          ) : (
            <ul className="space-y-0.5 p-2">
              {rows.map(({ asset, nearby, awaiting, top }) => {
                const active = asset.id === focusId;
                return (
                  <li key={asset.id}>
                    <button
                      type="button"
                      onClick={() => setFocusId(active ? null : asset.id)}
                      aria-pressed={active}
                      className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                        active ? 'bg-accent/[0.07] ring-1 ring-accent/30' : 'hover:bg-surface-2'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${ASSET_STYLE[asset.type].swatch}`} aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-13 font-medium text-fg">{asset.name}</span>
                        {asset.type === 'industrial_heat_source' && (
                          <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-medium" aria-label="Known heat source" />
                        )}
                        {top && <ScorePill score={top.score.score} band={top.band} incomplete={top.score.incomplete} />}
                      </div>
                      <div className="mt-1 pl-5 text-xs text-fg-subtle">
                        {ASSET_TYPE_META[asset.type].label} · {regionById(asset.regionId).name}
                      </div>
                      <div className="mt-0.5 pl-5 text-xs text-fg-muted">
                        {nearby === 0 ? (
                          <span className="text-fg-subtle">No alerts within {RADIUS_KM} km</span>
                        ) : (
                          <>
                            <span className="font-medium tabular-nums text-fg">{nearby}</span> alert{nearby === 1 ? '' : 's'} within{' '}
                            {RADIUS_KM} km
                            {awaiting > 0 && <span className="text-medium"> · {awaiting} awaiting</span>}
                          </>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      <OpsMap
        className="min-h-0 flex-1"
        alerts={scopedAlerts}
        assets={rows.map((r) => r.asset)}
        selectedAlert={selectedAlert}
        onSelect={(id) => dispatch({ type: 'select', alertId: id })}
        regionId={state.regionId}
        focus={focus}
        highlightAssetId={focusId}
      />
    </div>
  );
}
