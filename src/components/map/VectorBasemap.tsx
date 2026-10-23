import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L, { type MaplibreGL } from 'leaflet';
import { useTheme } from '../../theme/useTheme';
import { BASEMAP_ATTRIBUTION, buildBasemapStyle } from './basemapStyle';

/**
 * Renders the MapLibre vector basemap inside Leaflet's tile pane, so every Leaflet overlay
 * (clusters, assets, spread projection) keeps working unchanged. MapLibre is loaded lazily to
 * keep it out of the initial bundle.
 */
export function VectorBasemap({ onError, onLoad }: { onError: () => void; onLoad: () => void }) {
  const map = useMap();
  const [theme] = useTheme();
  const layerRef = useRef<MaplibreGL | null>(null);
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const handlers = useRef({ onError, onLoad });
  handlers.current = { onError, onLoad };

  useEffect(() => {
    let cancelled = false;
    let layer: MaplibreGL | null = null;

    (async () => {
      try {
        await import('maplibre-gl/dist/maplibre-gl.css');
        await import('@maplibre/maplibre-gl-leaflet'); // registers L.maplibreGL
        if (cancelled) return;
        layer = L.maplibreGL({
          style: buildBasemapStyle(themeRef.current),
          // The plugin forwards this to Leaflet's attribution control.
          attributionControl: { customAttribution: BASEMAP_ATTRIBUTION },
        });
        layer.addTo(map);
        layerRef.current = layer;
        const gl = layer.getMaplibreMap();
        gl.on('error', () => handlers.current.onError());
        gl.on('idle', () => handlers.current.onLoad());
      } catch {
        handlers.current.onError();
      }
    })();

    return () => {
      cancelled = true;
      layerRef.current = null;
      if (layer) map.removeLayer(layer);
    };
  }, [map]);

  useEffect(() => {
    layerRef.current?.getMaplibreMap().setStyle(buildBasemapStyle(theme));
  }, [theme]);

  return null;
}
