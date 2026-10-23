/**
 * A Leaflet layer that renders a MapLibre GL map in Leaflet's tile pane and keeps it in sync
 * with Leaflet's pan and zoom, so Leaflet overlays draw on top of a vector basemap.
 *
 * Ported from @maplibre/maplibre-gl-leaflet (ISC licence, © MapLibre contributors, © Mapbox)
 * as an ES module: MapLibre GL 6 is ESM-only and runs its tile parsing in a Web Worker, which
 * Vite bundles via `?worker&url` so it loads in both the dev server and production builds.
 * Loaded lazily by VectorBasemap.
 */
import L from 'leaflet';
import { Map as GlMap, setWorkerUrl, type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

setWorkerUrl(workerUrl);

/** How much the GL canvas extends beyond the Leaflet viewport on each side (fraction of size). */
const PADDING = 0.1;

export class MaplibreLayer extends L.Layer {
  private glMap: GlMap | null = null;
  private container: HTMLDivElement | null = null;
  private offset = L.point(0, 0);
  private zooming = false;
  private readonly throttledUpdate: () => void;

  constructor(
    private style: StyleSpecification,
    private readonly handlers: { onLoad: () => void; onError: () => void },
    attribution: string,
  ) {
    super();
    // Leaflet's class constructor does not apply options for ES subclasses; set them explicitly.
    L.setOptions(this, { pane: 'tilePane', attribution });
    this.throttledUpdate = L.Util.throttle(() => this.update(), 32, this);
  }

  setStyle(style: StyleSpecification) {
    this.style = style;
    this.glMap?.setStyle(style);
  }

  onAdd(map: L.Map) {
    const container = (this.container = L.DomUtil.create('div', 'leaflet-gl-layer'));
    this.resizeContainer();
    L.DomUtil.setPosition(container, this.topLeft());
    map.getPane('tilePane')!.appendChild(container);

    const center = map.getCenter();
    const gl = (this.glMap = new GlMap({
      container,
      style: this.style,
      center: [center.lng, center.lat],
      zoom: map.getZoom() - 1,
      interactive: false,
      attributionControl: false,
    }));
    // Leaflet allows any latitude; do not let MapLibre clamp the camera differently.
    gl.setTransformConstrain((c, z) => ({ center: c, zoom: z }));
    gl.on('idle', this.handlers.onLoad);
    gl.on('error', this.handlers.onError);

    const canvas = gl.getCanvas();
    L.DomUtil.addClass(canvas, 'leaflet-image-layer');
    L.DomUtil.addClass(canvas, 'leaflet-zoom-animated');
    this.offset = map.containerPointToLayerPoint([0, 0]);

    const proxy = (map as unknown as { _proxy?: HTMLElement })._proxy;
    if (proxy && map.options.zoomAnimation) L.DomEvent.on(proxy, L.DomUtil.TRANSITION_END, this.transitionEnd, this);
    return this;
  }

  onRemove(map: L.Map) {
    const proxy = (map as unknown as { _proxy?: HTMLElement })._proxy;
    if (proxy && map.options.zoomAnimation) L.DomEvent.off(proxy, L.DomUtil.TRANSITION_END, this.transitionEnd, this);
    this.glMap?.remove();
    this.glMap = null;
    this.container?.remove();
    this.container = null;
    return this;
  }

  getEvents() {
    return {
      move: this.throttledUpdate,
      zoomanim: this.animateZoom,
      zoom: this.pinchZoom,
      zoomstart: () => (this.zooming = true),
      zoomend: this.zoomEnd,
      resize: this.transitionEnd,
    } as unknown as { [name: string]: L.LeafletEventHandlerFn };
  }

  private size() {
    return this._map.getSize().multiplyBy(1 + PADDING * 2);
  }

  private topLeft() {
    const p = this._map.containerPointToLayerPoint([0, 0]).subtract(this._map.getSize().multiplyBy(PADDING));
    return L.point(Math.round(p.x), Math.round(p.y));
  }

  private resizeContainer() {
    const s = this.size();
    this.container!.style.width = `${s.x}px`;
    this.container!.style.height = `${s.y}px`;
  }

  private syncCamera() {
    const c = this._map.getCenter();
    this.glMap?.jumpTo({ center: [c.lng, c.lat], zoom: this._map.getZoom() - 1 });
  }

  private update() {
    if (!this._map || !this.glMap || !this.container) return;
    this.offset = this._map.containerPointToLayerPoint([0, 0]);
    if (this.zooming) return;
    L.DomUtil.setPosition(this.container, this.topLeft());
    this.syncCamera();
  }

  private pinchZoom = () => this.syncCamera();

  private animateZoom = (e: L.ZoomAnimEvent) => {
    if (!this.glMap) return;
    const map = this._map as L.Map & { _getMapPanePos(): L.Point };
    const scale = map.getZoomScale(e.zoom);
    const padding = map.getSize().multiplyBy(PADDING * scale);
    const viewHalf = this.size().divideBy(2);
    const topLeft = map.project(e.center, e.zoom).subtract(viewHalf).add(map._getMapPanePos().add(padding)).round();
    const offset = map.project(map.getBounds().getNorthWest(), e.zoom).subtract(topLeft);
    L.DomUtil.setTransform(this.glMap.getCanvas(), offset.subtract(this.offset), scale);
  };

  private zoomEnd = () => {
    if (!this.glMap) return;
    L.DomUtil.setTransform(this.glMap.getCanvas(), L.point(0, 0), this._map.getZoomScale(this._map.getZoom()));
    this.zooming = false;
    this.update();
  };

  private transitionEnd() {
    L.Util.requestAnimFrame(() => {
      if (!this._map || !this.glMap) return;
      const offset = this._map.latLngToContainerPoint(this._map.getBounds().getNorthWest());
      this.resizeContainer();
      L.DomUtil.setTransform(this.glMap.getCanvas(), offset, 1);
      this.glMap.once('moveend', () => this.zoomEnd());
      this.syncCamera();
    }, this);
  }
}
