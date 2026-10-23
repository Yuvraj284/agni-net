import type { AssetType, PriorityBand, VerificationStatus } from '../../types';

/** Visual treatment per priority band. All classes resolve to theme tokens. */
export const BAND_META: Record<PriorityBand, { label: string; pill: string; dot: string; text: string; marker: string }> = {
  critical: { label: 'Critical', pill: 'bg-critical/10 text-critical', dot: 'bg-critical', text: 'text-critical', marker: 'agn-band-critical' },
  high: { label: 'High', pill: 'bg-high/10 text-high', dot: 'bg-high', text: 'text-high', marker: 'agn-band-high' },
  medium: { label: 'Medium', pill: 'bg-medium/10 text-medium', dot: 'bg-medium', text: 'text-medium', marker: 'agn-band-medium' },
  low: { label: 'Low', pill: 'bg-surface-2 text-fg-muted', dot: 'bg-low', text: 'text-fg-muted', marker: 'agn-band-low' },
};

export const BAND_ORDER: PriorityBand[] = ['critical', 'high', 'medium', 'low'];

/**
 * Verification status treatment. "Awaiting" is deliberately quiet because most alerts sit in
 * that state; colour is reserved for human determinations.
 */
export const STATUS_STYLE: Record<VerificationStatus, { pill: string; dot: string; bar: string; tint: string }> = {
  awaiting: { pill: 'bg-surface-2 text-fg-muted', dot: 'bg-medium', bar: 'bg-medium', tint: 'bg-medium/10 text-medium' },
  confirmed: { pill: 'bg-critical/10 text-critical', dot: 'bg-critical', bar: 'bg-critical', tint: 'bg-critical/10 text-critical' },
  unconfirmed: { pill: 'bg-surface-2 text-fg-muted', dot: 'border border-fg-subtle bg-transparent', bar: 'bg-low/60', tint: 'bg-surface-3 text-fg-muted' },
  inconclusive: { pill: 'bg-info/10 text-info', dot: 'bg-info', bar: 'bg-info', tint: 'bg-info/10 text-info' },
};

/** Asset swatches (Tailwind) and Leaflet path classes (see index.css). */
export const ASSET_STYLE: Record<AssetType, { swatch: string; path: string }> = {
  protected_area: { swatch: 'bg-asset-protected', path: 'agn-asset-protected' },
  forest: { swatch: 'bg-asset-forest', path: 'agn-asset-forest' },
  infrastructure: { swatch: 'bg-asset-infra', path: 'agn-asset-infra' },
  settlement: { swatch: 'bg-asset-settlement', path: 'agn-asset-settlement' },
  industrial_heat_source: { swatch: 'bg-asset-heat', path: 'agn-asset-heat' },
};
