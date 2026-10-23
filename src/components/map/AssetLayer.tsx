import { CircleMarker, Polygon, Tooltip } from 'react-leaflet';
import { ASSET_TYPE_META } from '../../data/assets';
import type { Asset } from '../../types';
import { ASSET_STYLE } from '../common/meta';

/** Asset overlays. Colours come from CSS classes so they follow the active theme. */
export function AssetLayer({ assets, highlightId }: { assets: Asset[]; highlightId?: string | null }) {
  return (
    <>
      {assets.map((asset) => {
        const highlighted = asset.id === highlightId;
        const className = ASSET_STYLE[asset.type].path;
        const tooltip = (
          <Tooltip direction="top" sticky={asset.geometry === 'polygon'}>
            <div>
              <div className="agn-tip-title">{asset.name}</div>
              <div className="agn-tip-muted">{ASSET_TYPE_META[asset.type].label} · illustrative geometry</div>
            </div>
          </Tooltip>
        );
        if (asset.geometry === 'polygon') {
          return (
            <Polygon
              key={`${asset.id}-${highlighted}`}
              positions={asset.ring}
              pathOptions={{
                className,
                weight: highlighted ? 2.5 : 1.25,
                opacity: highlighted ? 1 : 0.8,
                fillOpacity: highlighted ? 0.16 : 0.07,
                dashArray: highlighted ? undefined : '4 4',
              }}
            >
              {tooltip}
            </Polygon>
          );
        }
        const heat = asset.type === 'industrial_heat_source';
        return (
          <CircleMarker
            key={`${asset.id}-${highlighted}`}
            center={asset.location}
            radius={highlighted ? 8 : 5.5}
            pathOptions={{
              className,
              weight: 1.5,
              fillOpacity: heat ? 0.15 : 0.45,
              dashArray: heat ? '2 2' : undefined,
            }}
          >
            {tooltip}
          </CircleMarker>
        );
      })}
    </>
  );
}
