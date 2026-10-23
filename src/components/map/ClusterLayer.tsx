import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import { formatDateTime, describeConfidence } from '../../lib/format';
import { STATUS_META } from '../../lib/verification';
import type { EnrichedAlert, PriorityBand } from '../../types';
import { BAND_META, BAND_ORDER } from '../common/meta';

/**
 * Map marker clustering (visual only)
 * -----------------------------------
 * One marker is drawn per raw observation. Leaflet.markercluster then merges markers whose
 * on-screen positions fall within `maxClusterRadius` (40 px) of each other at the current zoom,
 * labelling the cluster with the observation count and outlining it in the highest priority
 * band inside. From zoom 12 clustering is disabled so every observation is visible; spiderfy
 * separates exact overlaps.
 *
 * This is purely a display aid and is independent of candidate-alert grouping (1.5 km single
 * linkage, see lib/alerts.ts). Observations are never merged, removed or modified.
 */

interface ObservationMarkerOptions extends L.MarkerOptions {
  band: PriorityBand;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function observationIcon(alert: EnrichedAlert, selected: boolean) {
  const cls = ['agn-dot', BAND_META[alert.band].marker, `agn-st-${alert.verification.status}`, selected ? 'agn-selected' : '']
    .filter(Boolean)
    .join(' ');
  return L.divIcon({ html: `<span class="${cls}"></span>`, className: 'agn-marker', iconSize: [20, 20], iconAnchor: [10, 10] });
}

function clusterIcon(cluster: L.MarkerCluster) {
  const children = cluster.getAllChildMarkers();
  const top = BAND_ORDER.find((b) => children.some((m) => (m.options as ObservationMarkerOptions).band === b)) ?? 'low';
  const n = cluster.getChildCount();
  const size = n >= 10 ? 36 : n >= 5 ? 32 : 28;
  return L.divIcon({
    html: `<div class="agn-cluster ${BAND_META[top].marker}" style="width:${size}px;height:${size}px" title="${n} observations — highest priority: ${BAND_META[top].label}">${n}</div>`,
    className: 'agn-cluster-wrap',
    iconSize: [size, size],
  });
}

export function ClusterLayer({
  alerts,
  selectedId,
  onSelect,
}: {
  alerts: EnrichedAlert[];
  selectedId: string | null;
  onSelect: (alertId: string) => void;
}) {
  const map = useMap();
  const groupRef = useRef<L.MarkerClusterGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const group = L.markerClusterGroup({
      maxClusterRadius: 40,
      disableClusteringAtZoom: 12,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      spiderLegPolylineOptions: { weight: 1, color: '#8a8d86', opacity: 0.7 },
      iconCreateFunction: clusterIcon,
    });
    map.addLayer(group);
    groupRef.current = group;
    return () => {
      map.removeLayer(group);
      groupRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.clearLayers();
    const markers = alerts.flatMap((alert) =>
      alert.observations.map((o) => {
        const selected = alert.id === selectedId;
        const options: ObservationMarkerOptions = {
          icon: observationIcon(alert, selected),
          band: alert.band,
          zIndexOffset: selected ? 1000 : 0,
          keyboard: true,
          title: `${o.id} — ${alert.id}`,
          riseOnHover: true,
        };
        const marker = L.marker([o.lat, o.lon], options);
        marker.bindTooltip(
          `<div><span class="agn-tip-id agn-tip-title">${escapeHtml(alert.id)}</span>` +
            ` <span class="agn-tip-muted">· P ${alert.score.score.toFixed(1)} · ${escapeHtml(STATUS_META[alert.verification.status].label)}</span><br/>` +
            `<span class="agn-tip-id">${escapeHtml(o.id)}</span> <span class="agn-tip-muted">${escapeHtml(o.satellite)} ${o.instrument} · ${escapeHtml(describeConfidence(o.confidence))}</span><br/>` +
            `<span class="agn-tip-muted">${escapeHtml(formatDateTime(o.observedAt))}</span></div>`,
          { direction: 'top', offset: [0, -8] },
        );
        marker.on('click', () => onSelectRef.current(alert.id));
        return marker;
      }),
    );
    group.addLayers(markers);
  }, [alerts, selectedId]);

  return null;
}
