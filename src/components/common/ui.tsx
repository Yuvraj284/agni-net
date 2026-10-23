import type { ReactNode, SelectHTMLAttributes } from 'react';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { STATUS_META } from '../../lib/verification';
import type { PriorityBand, VerificationStatus } from '../../types';
import { BAND_META, STATUS_STYLE } from './meta';

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-line bg-surface shadow-card ${className}`}>{children}</section>;
}

export function PanelHeader({
  title,
  subtitle,
  right,
  className = '',
}: {
  title: string;
  subtitle?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`flex items-start justify-between gap-3 px-5 pb-3 pt-4 ${className}`}>
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold text-fg">{title}</h2>
        {subtitle && <p className="mt-0.5 truncate text-xs text-fg-subtle">{subtitle}</p>}
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </header>
  );
}

export function StatusBadge({ status, compact = false }: { status: VerificationStatus; compact?: boolean }) {
  const s = STATUS_STYLE[status];
  return (
    <span
      className={`inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-xs font-medium ${s.pill}`}
      title={STATUS_META[status].description}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden />
      {compact && status === 'awaiting' ? 'Awaiting' : STATUS_META[status].label}
    </span>
  );
}

export function BandBadge({ band }: { band: PriorityBand }) {
  const b = BAND_META[band];
  return (
    <span className={`inline-flex h-[22px] items-center gap-1.5 rounded-full px-2 text-xs font-medium ${b.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${b.dot}`} aria-hidden />
      {b.label} priority
    </span>
  );
}

/** Priority score with band colour; "≥" marks a lower bound when inputs were missing. */
export function ScorePill({ score, band, incomplete }: { score: number; band: PriorityBand; incomplete?: boolean }) {
  return (
    <span
      className={`inline-flex h-6 min-w-[3rem] items-center justify-center rounded-md px-1.5 text-13 font-semibold tabular-nums ${BAND_META[band].pill}`}
      title={
        incomplete
          ? 'Incomplete score — some inputs were missing, so this is a lower bound.'
          : `${BAND_META[band].label} priority score (0–100). Not a probability of fire.`
      }
    >
      {incomplete && <span className="mr-px font-normal opacity-70">≥</span>}
      {score.toFixed(1)}
    </span>
  );
}

export function DemoTag({ label = 'Demo data' }: { label?: string }) {
  return (
    <span className="inline-flex h-5 items-center rounded-full border border-medium/30 bg-medium/10 px-2 text-2xs font-medium text-medium">
      {label}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <span className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-surface-2">
        <Icon className="h-5 w-5 text-fg-subtle" aria-hidden />
      </span>
      <p className="text-sm font-medium text-fg">{title}</p>
      {children && <div className="max-w-xs text-13 text-fg-subtle">{children}</div>}
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  title?: string;
}) {
  return (
    <button type="button" onClick={onClick} title={title} aria-pressed={active} className="chip">
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-fg-subtle">{label}</dt>
      <dd className="mt-0.5 truncate text-13 text-fg">{children}</dd>
    </div>
  );
}

/** Native select styled with theme tokens and a consistent chevron. */
export function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={`relative inline-flex ${className}`}>
      <select {...props} className="field">
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" aria-hidden />
    </span>
  );
}
