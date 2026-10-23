import { useState } from 'react';
import { ChevronDown, Info, Navigation } from 'lucide-react';
import { ASSET_TYPE_META } from '../../data/assets';
import type { AssetType } from '../../types';
import { ASSET_STYLE, BAND_META, BAND_ORDER } from '../common/meta';

function Row({ children }: { children: React.ReactNode }) {
  return <span className="flex items-center gap-2 text-xs text-fg-muted">{children}</span>;
}

export function MapLegend() {
  const [open, setOpen] = useState(false);
  return (
    <div className="absolute bottom-7 left-3 z-[500] w-56 overflow-hidden rounded-xl border border-line bg-surface shadow-raised">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-13 font-medium text-fg hover:bg-surface-2"
      >
        <span className="flex items-center gap-2">
          <Info className="h-3.5 w-3.5 text-fg-subtle" aria-hidden />
          Legend
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-fg-subtle transition-transform ${open ? '' : 'rotate-180'}`} aria-hidden />
      </button>
      {open && (
        <div className="animate-fade-up space-y-3 border-t border-line px-3 pb-3 pt-2.5">
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-fg">Alert priority</div>
            <div className="grid grid-cols-2 gap-1.5">
              {BAND_ORDER.map((b) => (
                <Row key={b}>
                  <span className={`agn-legend-dot ${BAND_META[b].marker}`} />
                  {BAND_META[b].label}
                </Row>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-fg">Verification</div>
            <Row><span className="agn-legend-dot agn-band-high" />Awaiting — solid</Row>
            <Row><span className="agn-legend-dot agn-band-critical agn-st-confirmed" />Confirmed — ringed</Row>
            <Row><span className="agn-legend-dot agn-band-high agn-st-inconclusive" />Inconclusive — blue ring</Row>
            <Row><span className="agn-legend-dot agn-band-high agn-st-unconfirmed" />Unconfirmed — hollow</Row>
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-fg">Selected alert: wind and spread</div>
            <Row>
              <span className="w-3 border-t-2 border-dashed border-high" aria-hidden />
              Illustrative 3 h envelope
            </Row>
            <Row>
              <span className="w-3 border-t-2 border-dashed border-critical" aria-hidden />
              Illustrative 6 h envelope
            </Row>
            <Row>
              <Navigation className="h-3 w-3 rotate-45 text-accent" aria-hidden />
              Wind, pointing downwind
            </Row>
            <p className="text-2xs leading-snug text-fg-subtle">Heuristic envelopes, not a fire-spread forecast.</p>
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-fg">Mapped assets</div>
            {(Object.keys(ASSET_TYPE_META) as AssetType[]).map((t) => (
              <Row key={t}>
                <span className={`h-2.5 w-2.5 rounded-sm ${ASSET_STYLE[t].swatch}`} />
                {ASSET_TYPE_META[t].label}
              </Row>
            ))}
          </div>
          <p className="text-xs leading-snug text-fg-subtle">
            Numbered circles group nearby observations on screen. Zoom in to see each detection.
          </p>
        </div>
      )}
    </div>
  );
}
