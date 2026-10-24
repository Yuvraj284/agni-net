import { useEffect, useRef, useState } from 'react';
import { Check, Copy, ExternalLink, Flame, Info, PhoneCall, Send, X } from 'lucide-react';
import { buildFireStationDispatchMessage } from '../../lib/dispatch';
import { formatKm } from '../../lib/format';
import { isLiveAlert } from '../../lib/provenance';
import { fetchFireWeather, type FireWeather } from '../../lib/weather';
import { useApp } from '../../state/useApp';
import type { EnrichedAlert, NearestFireStation } from '../../types';

export function FireStationDispatchModal({
  alert,
  nearestStation,
  onClose,
}: {
  alert: EnrichedAlert;
  nearestStation: NearestFireStation;
  onClose: () => void;
}) {
  const { state, actions } = useApp();
  const { station, distanceKm, estimatedMinutes } = nearestStation;

  const [phone, setPhone] = useState(station.whatsappPhone || station.phone.replace(/[^\d]/g, ''));
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [weather, setWeather] = useState<FireWeather | null>(null);
  const [logged, setLogged] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    fetchFireWeather(alert.centroid[0], alert.centroid[1], alert.regionId).then((w) => {
      if (active) setWeather(w);
    });
    return () => {
      active = false;
    };
  }, [alert.centroid, alert.regionId]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const message = buildFireStationDispatchMessage(alert, station, distanceKm, estimatedMinutes, weather);
  const cleanPhone = phone.replace(/[^\d]/g, '');
  const waUrl = `https://api.whatsapp.com/send?${cleanPhone ? `phone=${cleanPhone}&` : ''}text=${encodeURIComponent(message)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied('copied');
    } catch {
      setCopied('failed');
    }
    setTimeout(() => setCopied('idle'), 2000);
  };

  const handleOpen = () => {
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    if (logged) return;

    actions.saveReview(alert.id, {
      status: alert.verification.status,
      reviewerId: alert.verification.reviewerId,
      note:
        `Dispatched emergency callout to Fire Station: ${station.name}` +
        `${cleanPhone ? ` (+${cleanPhone})` : ''} · ~${distanceKm.toFixed(1)} km away. ` +
        `Tactical driving route and weather spread advisory transmitted.`,
      actions: ['Requested field verification'],
    });
    setLogged(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fire-station-dispatch-title"
      className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[92vh] w-full max-w-lg animate-fade-up flex-col rounded-xl border border-line bg-surface shadow-pop">
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex items-start gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-critical/15 text-critical">
              <Flame className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h3 id="fire-station-dispatch-title" className="text-sm font-semibold text-fg">
                Emergency Fire Station Callout
              </h3>
              <p className="mt-0.5 text-xs text-fg-subtle">
                Tactical alert dispatch for <span className="mono-id">{alert.id}</span>
              </p>
            </div>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="btn btn-ghost btn-icon -mr-2 -mt-1" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-13">
          {/* Station Summary Card */}
          <div className="rounded-lg border border-line bg-surface-2 p-3.5 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-2xs font-semibold uppercase tracking-wider text-critical">Nearest Responding Station</span>
                <h4 className="text-sm font-medium text-fg">{station.name}</h4>
              </div>
              <span className="rounded-full bg-surface-3 px-2 py-0.5 font-mono text-2xs font-medium text-fg-muted">
                {formatKm(distanceKm)} · ~{estimatedMinutes}m transit
              </span>
            </div>

            <div className="grid grid-cols-1 gap-1 text-xs text-fg-muted sm:grid-cols-2">
              <div>
                <span className="text-fg-subtle">Officer:</span> {station.officerInCharge}
              </div>
              <div>
                <span className="text-fg-subtle">Desk Phone:</span>{' '}
                <a href={`tel:${station.phone}`} className="link font-mono font-medium text-fg hover:underline">
                  {station.phone}
                </a>
              </div>
              {station.appliances && (
                <div className="sm:col-span-2 text-2xs text-fg-subtle">
                  <span>Units: {station.appliances}</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-fg-muted">Target Fire Unit</span>
              <input
                type="text"
                disabled
                className="field text-xs bg-surface-3 cursor-not-allowed opacity-80"
                value={`${station.name} (Control Desk)`}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-fg-muted">WhatsApp Dispatch Number</span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="off"
                className="field font-mono text-xs"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Country code and number"
              />
            </label>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-fg-muted">Tactical message preview</span>
              <button type="button" onClick={handleCopy} className="link inline-flex items-center gap-1 text-xs">
                {copied === 'copied' ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                {copied === 'copied' ? 'Copied' : copied === 'failed' ? 'Copy failed' : 'Copy message'}
              </button>
            </div>
            <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg border border-line bg-surface-2 p-3 font-mono text-2xs leading-relaxed text-fg-muted">
              {message}
            </pre>
          </div>

          <p className="flex items-start gap-2 rounded-lg bg-surface-2 px-3 py-2 text-xs leading-relaxed text-fg-muted">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
            <span>
              {isLiveAlert(alert)
                ? 'Includes Google Maps direct driving navigation route from station coordinates to incident site.'
                : 'Marked as a simulation drill.'}{' '}
              Recorded in audit log as <strong className="font-medium text-fg">{state.actingAs}</strong>.
            </span>
          </p>
        </div>

        <footer className="flex items-center justify-between border-t border-line px-5 py-3">
          <a
            href={`tel:${station.phone}`}
            className="btn btn-ghost inline-flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg"
            title="Dial phone number"
          >
            <PhoneCall className="h-3.5 w-3.5 text-fg-subtle" aria-hidden />
            Call {station.phone}
          </a>

          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button type="button" onClick={handleOpen} className="btn btn-primary bg-critical text-white hover:bg-critical/90">
              <Send className="h-3.5 w-3.5" aria-hidden />
              {logged ? 'Send Alert Again' : 'Dispatch via WhatsApp'}
              <ExternalLink className="h-3 w-3 opacity-75" aria-hidden />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
