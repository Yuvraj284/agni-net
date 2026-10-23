import { useEffect, useRef, useState } from 'react';
import { Check, Copy, ExternalLink, Info, Send, X } from 'lucide-react';
import { buildDispatchMessage } from '../../lib/dispatch';
import { isLiveAlert } from '../../lib/provenance';
import { fetchFireWeather, type FireWeather } from '../../lib/weather';
import { useApp } from '../../state/useApp';
import type { EnrichedAlert } from '../../types';
import { Select } from '../common/ui';

/**
 * Recipient roles only. No phone numbers are shipped with the app: the operator types the
 * number, or leaves it empty and picks the contact inside WhatsApp.
 */
const RECIPIENT_ROLES = [
  'Forest range officer (quick response team)',
  'Divisional forest officer',
  'District emergency operations centre',
  'State disaster response force duty desk',
] as const;

export function WhatsAppDispatchModal({ alert, onClose }: { alert: EnrichedAlert; onClose: () => void }) {
  const { state, actions } = useApp();
  const [role, setRole] = useState<string>(RECIPIENT_ROLES[0]);
  const [phone, setPhone] = useState('');
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [weather, setWeather] = useState<FireWeather | null>(null);
  const [logged, setLogged] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    fetchFireWeather(alert.centroid[0], alert.centroid[1], alert.regionId).then((w) => active && setWeather(w));
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

  const message = buildDispatchMessage(alert, weather);
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
    // Opening WhatsApp is not delivery: record exactly what happened, nothing more.
    actions.saveReview(alert.id, {
      status: alert.verification.status,
      reviewerId: alert.verification.reviewerId,
      note:
        `Opened a WhatsApp dispatch message for: ${role}` +
        `${cleanPhone ? ` (+${cleanPhone})` : ' (recipient chosen in WhatsApp)'}. ` +
        'Delivery and response are not tracked by AgniNet.',
      actions: [],
    });
    setLogged(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dispatch-title"
      className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[90vh] w-full max-w-lg animate-fade-up flex-col rounded-xl border border-line bg-surface shadow-pop">
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h3 id="dispatch-title" className="text-sm font-semibold text-fg">
              Share with a field team
            </h3>
            <p className="mt-0.5 text-xs text-fg-subtle">
              Opens WhatsApp with a pre-filled message for <span className="mono-id">{alert.id}</span>
            </p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="btn btn-ghost btn-icon -mr-2 -mt-1" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-13">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-fg-muted">Recipient role</span>
              <Select className="w-full" value={role} onChange={(e) => setRole(e.target.value)}>
                {RECIPIENT_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-fg-muted">WhatsApp number (optional)</span>
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
              <span className="text-xs font-medium text-fg-muted">Message preview</span>
              <button type="button" onClick={handleCopy} className="link inline-flex items-center gap-1 text-xs">
                {copied === 'copied' ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                {copied === 'copied' ? 'Copied' : copied === 'failed' ? 'Copy failed' : 'Copy text'}
              </button>
            </div>
            <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg border border-line bg-surface-2 p-3 font-mono text-2xs leading-relaxed text-fg-muted">
              {message}
            </pre>
          </div>

          <p className="flex items-start gap-2 rounded-lg bg-surface-2 px-3 py-2 text-xs leading-relaxed text-fg-muted">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
            <span>
              {isLiveAlert(alert)
                ? 'The message says the detection is not yet verified on the ground.'
                : 'The message is marked as demo data.'}{' '}
              AgniNet only opens WhatsApp — it cannot confirm delivery. A history entry
              noting that the message was opened is recorded as {state.actingAs}.
            </span>
          </p>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
          <button type="button" onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
          <button type="button" onClick={handleOpen} className="btn btn-primary">
            <Send className="h-3.5 w-3.5" aria-hidden />
            {logged ? 'Open WhatsApp again' : 'Open in WhatsApp'}
            <ExternalLink className="h-3 w-3 opacity-75" aria-hidden />
          </button>
        </footer>
      </div>
    </div>
  );
}
