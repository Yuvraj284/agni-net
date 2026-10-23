import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { useTheme } from '../../theme/useTheme';
import { BASEMAP_ATTRIBUTION, buildBasemapStyle } from './basemapStyle';
import type { MaplibreLayer } from './maplibreLayer';

/**
 * Renders the MapLibre vector basemap inside Leaflet's tile pane, so every Leaflet overlay
 * (clusters, assets, spread projection) keeps working unchanged. MapLibre is loaded lazily to
 * keep it out of the initial bundle. The map container's `data-basemap` attribute reports
 * `loading`, `ready` or `error` (used by the end-to-end tests).
 */
export function VectorBasemap({ onError, onLoad }: { onError: () => void; onLoad: () => void }) {
  const map = useMap();
  const [theme] = useTheme();
  const layerRef = useRef<MaplibreLayer | null>(null);
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const handlers = useRef({ onError, onLoad });
  handlers.current = { onError, onLoad };

  useEffect(() => {
    let cancelled = false;
    let layer: MaplibreLayer | null = null;
    const el = map.getContainer();
    el.dataset.basemap = 'loading';

    import('./maplibreLayer')
      .then(({ MaplibreLayer }) => {
        if (cancelled) return;
        layer = new MaplibreLayer(
          buildBasemapStyle(themeRef.current),
          {
            onLoad: () => {
              el.dataset.basemap = 'ready';
              handlers.current.onLoad();
            },
            onError: () => handlers.current.onError(),
          },
          BASEMAP_ATTRIBUTION,
        );
        layer.addTo(map);
        layerRef.current = layer;
      })
      .catch(() => {
        el.dataset.basemap = 'error';
        handlers.current.onError();
      });

    return () => {
      cancelled = true;
      layerRef.current = null;
      if (layer) map.removeLayer(layer);
    };
  }, [map]);

  useEffect(() => {
    layerRef.current?.setStyle(buildBasemapStyle(theme));
  }, [theme]);

  return null;
}
