import { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, Send, ShieldAlert, X } from 'lucide-react';
import { formatCoord, formatDateTime } from '../../lib/format';
import { bearingToCompass, fetchFireWeather, type FireWeather } from '../../lib/weather';
import { useApp } from '../../state/useApp';
import type { EnrichedAlert } from '../../types';

const CONTACT_PRESETS = [
  { label: 'Forest Range Officer (QRT - Quick Response Team)', phone: '+918958705587' },
  { label: 'DFO (Divisional Forest Officer) Headquarters', phone: '+919696909327' },
  { label: 'District Emergency Operations Center (DEOC)', phone: '+918958705587' },
  { label: 'State Disaster Response Force (SDRF) Duty Desk', phone: '+918958705587' },
];

export function WhatsAppDispatchModal({
  alert,
  isOpen,
  onClose,
}: {
  alert: EnrichedAlert;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { actions } = useApp();
  const [selectedContact, setSelectedContact] = useState(CONTACT_PRESETS[0]);
  const [phone, setPhone] = useState(CONTACT_PRESETS[0].phone);
  const [copied, setCopied] = useState(false);
  const [weather, setWeather] = useState<FireWeather | null>(null);
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLogged(false);
    fetchFireWeather(alert.centroid[0], alert.centroid[1], alert.regionId).then(setWeather);
  }, [alert.id, alert.centroid, alert.regionId, isOpen]);

  if (!isOpen) return null;

  const lat = alert.centroid[0].toFixed(4);
  const lon = alert.centroid[1].toFixed(4);
  const mapsLink = `https://maps.google.com/?q=${lat},${lon}`;
  const weatherText = weather
    ? `${weather.temperatureC}°C, RH ${weather.relativeHumidity}%, Wind ${weather.windSpeedKmh} km/h towards ${bearingToCompass(weather.downwindBearingDeg)}`
    : 'Pending meteorological sync';

  const nearestAssetText = alert.nearestAsset
    ? alert.nearestAsset.distanceKm === 0
      ? `INSIDE ${alert.nearestAsset.asset.name}`
      : `${alert.nearestAsset.asset.name} (~${alert.nearestAsset.distanceKm.toFixed(1)} km away)`
    : 'No critical asset within 10 km';

  const dispatchMessage =
    `🔥 *AGNI-NET EMERGENCY WILDFIRE ALERT* 🔥\n` +
    `--------------------------------------\n` +
    `*Incident ID:* ${alert.id}\n` +
    `*Priority:* ${alert.band.toUpperCase()} (Score: ${alert.score.score.toFixed(1)}/100)\n` +
    `*Region:* ${alert.regionName}\n` +
    `*Coordinates:* ${formatCoord(alert.centroid[0], alert.centroid[1])}\n` +
    `*Nearest Asset:* ${nearestAssetText}\n` +
    `*Detections:* ${alert.observations.length} points across ${alert.distinctPasses} pass(es)\n` +
    `*Last Observed:* ${formatDateTime(alert.lastObservedAt)}\n` +
    `*Fire Weather:* ${weatherText}\n` +
    `*Status:* ${alert.verification.status.toUpperCase()}\n\n` +
    `📍 *Google Maps Pin:* ${mapsLink}\n` +
    `--------------------------------------\n` +
    `*Tactical Directive:* Immediate ground verification / counter-fire preparation advised.\n` +
    `_Sent via AgniNet Satellite Command Center_`;

  const cleanPhone = phone.replace(/[^\d+]/g, '');
  const waUrl = cleanPhone
    ? `https://api.whatsapp.com/send?phone=${encodeURIComponent(cleanPhone)}&text=${encodeURIComponent(dispatchMessage)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(dispatchMessage)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(dispatchMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = () => {
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    if (!logged) {
      actions.saveReview(alert.id, {
        status: alert.verification.status,
        reviewerId: alert.verification.reviewerId,
        note: `Dispatched tactical WhatsApp alert to ${selectedContact.label} (${phone || 'Field units'}).`,
        actions: ['Escalated to district control room'],
      });
      setLogged(true);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="WhatsApp Field Ranger Dispatch"
      className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-line bg-surface shadow-2xl">
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Send className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-fg">WhatsApp Ranger Dispatch</h3>
              <p className="text-xs text-fg-subtle">Send pre-formatted field intelligence to response teams</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-fg-subtle hover:bg-surface-2 hover:text-fg"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-5 text-13">
          {/* Recipient Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-fg-muted">Target Duty Officer / Control Desk</label>
            <select
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-fg focus:border-accent focus:outline-none"
              value={selectedContact.label}
              onChange={(e) => {
                const found = CONTACT_PRESETS.find((c) => c.label === e.target.value);
                if (found) {
                  setSelectedContact(found);
                  setPhone(found.phone);
                }
              }}
            >
              {CONTACT_PRESETS.map((c) => (
                <option key={c.label} value={c.label}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-fg-muted">WhatsApp Phone Number</label>
            <input
              type="text"
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 font-mono text-xs text-fg focus:border-accent focus:outline-none"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91..."
            />
          </div>

          {/* Message Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-fg-muted">Message Payload Preview</span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs text-accent hover:underline"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied to clipboard' : 'Copy text'}
              </button>
            </div>
            <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl border border-line bg-surface-2/70 p-3 font-mono text-2xs leading-relaxed text-fg-muted">
              {dispatchMessage}
            </pre>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-accent/[0.07] p-2.5 text-xs text-fg">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span>
              Clicking <strong>Send via WhatsApp</strong> opens the WhatsApp API with the dispatch preloaded and logs an
              audit entry into AgniNet&apos;s append-only verification log.
            </span>
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2.5 border-t border-line px-5 py-3.5">
          <button type="button" onClick={onClose} className="btn btn-ghost px-4 py-2 text-xs">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            className="btn flex items-center gap-2 bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500 shadow-md"
          >
            <Send className="h-3.5 w-3.5" />
            Send via WhatsApp
            <ExternalLink className="h-3 w-3 opacity-75" />
          </button>
        </footer>
      </div>
    </div>
  );
}
