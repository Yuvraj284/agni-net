import { useEffect, useRef, useState } from 'react';
import { Circle, MapContainer, useMap, useMapEvents } from 'react-leaflet';
import { latLng, type LatLng, type LatLngBoundsExpression, type Map as LeafletMap } from 'leaflet';
import { CloudOff, Layers, Wind } from 'lucide-react';
import { INDIA_VIEW, regionById } from '../../data/regions';
import type { Asset, EnrichedAlert, RegionId } from '../../types';
import type { Bounds } from '../../state/types';
import { AssetLayer } from './AssetLayer';
import { ClusterLayer } from './ClusterLayer';
import { FireSpreadLayer } from './FireSpreadLayer';
import { MapLegend } from './MapLegend';
import { VectorBasemap } from './VectorBasemap';

export interface MapFocus {
  key: string;
  bounds?: LatLngBoundsExpression;
  center?: [number, number];
  zoom?: number;
}

/** Leaflet measures its container once; re-measure whenever the React layout resizes it. */
function ResizeHandler() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

function RegionFitter({ regionId }: { regionId: RegionId | 'all' }) {
  const map = useMap();
  useEffect(() => {
    if (regionId === 'all') map.setView(INDIA_VIEW.center, INDIA_VIEW.zoom);
    else map.fitBounds(regionById(regionId).bounds, { padding: [16, 16] });
  }, [map, regionId]);
  return null;
}

/**
 * Map centre that puts `target` in the middle of the part of the map not covered by the alert
 * drawer (which overlays the right edge on wide screens).
 */
function centreBesideDrawer(map: LeafletMap, target: [number, number], zoom: number): LatLng {
  const drawer = document.querySelector('aside[aria-label$=" details"]');
  const mapRect = map.getContainer().getBoundingClientRect();
  const covered = drawer ? Math.max(0, mapRect.right - drawer.getBoundingClientRect().left) : 0;
  if (covered <= 0 || covered >= mapRect.width * 0.8) return latLng(target);
  return map.unproject(map.project(target, zoom).add([covered / 2, 0]), zoom);
}

function SelectionFlyer({ alert }: { alert: EnrichedAlert | null }) {
  const map = useMap();
  const id = alert?.id ?? null;
  const centroid = alert?.centroid;
  const lastId = useRef<string | null>(null);
  const jumped = useRef(false);
  useEffect(() => {
    if (!id || !centroid || id === lastId.current) return;
    lastId.current = id;
    const zoom = Math.max(map.getZoom(), 11);
    if (jumped.current) {
      map.flyTo(centreBesideDrawer(map, centroid, zoom), zoom, { duration: 0.6 });
      return;
    }
    // First selection (e.g. opening a shared #/map/ALT-… link): jump once the region fit and
    // layout have settled, otherwise they would reset the view straight after.
    const t = window.setTimeout(() => {
      jumped.current = true;
      map.setView(centreBesideDrawer(map, centroid, zoom), zoom, { animate: false });
    });
    return () => {
      window.clearTimeout(t);
      if (!jumped.current) lastId.current = null;
    };
  }, [map, id, centroid]);
  return null;
}

function FocusController({ focus }: { focus: MapFocus | null | undefined }) {
  const map = useMap();
  const key = focus?.key;
  useEffect(() => {
    if (!focus) return;
    if (focus.bounds) map.flyToBounds(focus.bounds, { padding: [24, 24], duration: 0.6, maxZoom: 12 });
    else if (focus.center) map.flyTo(focus.center, focus.zoom ?? 11, { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when the focus target changes
  }, [map, key]);
  return null;
}

function BoundsReporter({ onChange }: { onChange: (b: Bounds) => void }) {
  const map = useMapEvents({
    moveend: () => report(),
  });
  const report = () => {
    const b = map.getBounds();
    onChange([[b.getSouth(), b.getWest()], [b.getNorth(), b.getEast()]]);
  };
  useEffect(() => {
    report();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- report initial bounds once
  }, []);
  return null;
}

export function OpsMap({
  alerts,
  assets,
  selectedAlert,
  onSelect,
  regionId,
  onBoundsChange,
  focus,
  highlightAssetId,
  className = '',
}: {
  alerts: EnrichedAlert[];
  assets: Asset[];
  selectedAlert: EnrichedAlert | null;
  onSelect: (alertId: string) => void;
  regionId: RegionId | 'all';
  onBoundsChange?: (b: Bounds) => void;
  focus?: MapFocus | null;
  highlightAssetId?: string | null;
  className?: string;
}) {
  const [showAssets, setShowAssets] = useState(true);
  const [showSpread, setShowSpread] = useState(true);
  const [tileErrors, setTileErrors] = useState(0);
  const selectedVisible = selectedAlert && alerts.some((a) => a.id === selectedAlert.id);
  const observationCount = alerts.reduce((s, a) => s + a.observations.length, 0);

  return (
    <div className={`relative isolate overflow-hidden ${className}`}>
      <MapContainer
        center={INDIA_VIEW.center}
        zoom={INDIA_VIEW.zoom}
        minZoom={4}
        maxZoom={16}
        className="agn-map h-full w-full"
        worldCopyJump
      >
        {/* Vector basemap with India's official boundary — see basemapStyle.ts */}
        <VectorBasemap onError={() => setTileErrors((n) => n + 1)} onLoad={() => setTileErrors(0)} />
        <ResizeHandler />
        <RegionFitter regionId={regionId} />
        {showAssets && <AssetLayer assets={assets} highlightId={highlightAssetId} />}
        {selectedAlert && selectedVisible && showSpread && <FireSpreadLayer alert={selectedAlert} />}
        {selectedAlert && selectedVisible && (
          <Circle
            center={selectedAlert.centroid}
            radius={Math.max(700, selectedAlert.extentKm * 1000 + 500)}
            pathOptions={{ className: 'agn-selection', weight: 1.5, dashArray: '4 4', fillOpacity: 0.06 }}
            interactive={false}
          />
        )}
        <ClusterLayer alerts={alerts} selectedId={selectedAlert?.id ?? null} onSelect={onSelect} />
        <SelectionFlyer alert={selectedVisible ? selectedAlert : null} />
        <FocusController focus={focus} />
        {onBoundsChange && <BoundsReporter onChange={onBoundsChange} />}
      </MapContainer>

      {/* Layer controls */}
      <div className="absolute right-3 top-3 z-[500] flex flex-col items-end gap-2 sm:flex-row">
        <button
          type="button"
          role="switch"
          aria-checked={showSpread}
          onClick={() => setShowSpread((v) => !v)}
          className="flex h-8 items-center gap-2 rounded-lg border border-line bg-surface pl-2.5 pr-2 text-13 text-fg shadow-raised transition-colors hover:bg-surface-2"
          title="Wind and illustrative spread envelope for the selected alert"
        >
          <Wind className="h-3.5 w-3.5 text-fg-subtle" aria-hidden />
          Wind and spread
          <span
            className={`relative ml-1 inline-flex h-4 w-7 items-center rounded-full transition-colors ${showSpread ? 'bg-accent' : 'bg-line-strong'}`}
            aria-hidden
          >
            <span
              className={`h-3 w-3 rounded-full bg-surface shadow-card transition-transform ${showSpread ? 'translate-x-3.5' : 'translate-x-0.5'}`}
            />
          </span>
        </button>

        <button
          type="button"
          role="switch"
          aria-checked={showAssets}
          onClick={() => setShowAssets((v) => !v)}
          className="flex h-8 items-center gap-2 rounded-lg border border-line bg-surface pl-2.5 pr-2 text-13 text-fg shadow-raised transition-colors hover:bg-surface-2"
        >
          <Layers className="h-3.5 w-3.5 text-fg-subtle" aria-hidden />
          Mapped assets
          <span
            className={`relative ml-1 inline-flex h-4 w-7 items-center rounded-full transition-colors ${showAssets ? 'bg-accent' : 'bg-line-strong'}`}
            aria-hidden
          >
            <span
              className={`h-3 w-3 rounded-full bg-surface shadow-card transition-transform ${showAssets ? 'translate-x-3.5' : 'translate-x-0.5'}`}
            />
          </span>
        </button>
      </div>

      {/* Observation count */}
      <div className="pointer-events-none absolute left-14 top-3 z-[500] hidden rounded-lg sm:block border border-line bg-surface/95 px-2.5 py-1.5 text-xs text-fg-muted shadow-raised">
        <span className="font-semibold tabular-nums text-fg">{observationCount}</span> observations ·{' '}
        <span className="font-semibold tabular-nums text-fg">{alerts.length}</span> alerts
      </div>

      <MapLegend />

      {tileErrors > 3 && (
        <div className="absolute inset-x-3 bottom-20 z-[500] mx-auto flex max-w-sm items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-fg-muted shadow-pop">
          <CloudOff className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
          Basemap tiles could not be loaded (offline?). Observations and assets are still shown.
        </div>
      )}

      {alerts.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center">
          <div className="rounded-xl border border-line bg-surface px-4 py-3 text-center text-13 text-fg-muted shadow-pop">
            No observations match the current region and filters.
          </div>
        </div>
      )}
    </div>
  );
}
