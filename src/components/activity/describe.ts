import { ClipboardCheck, MessageSquareText, Server, ShieldCheck, UserRoundCheck, type LucideIcon } from 'lucide-react';
import { reviewerName } from '../../data/regions';
import { STATUS_META } from '../../lib/verification';
import type { VerificationEvent } from '../../types';
import { STATUS_STYLE } from '../common/meta';

export const EVENT_TYPE_LABEL: Record<VerificationEvent['type'], string> = {
  status_change: 'Verification',
  assignment: 'Assignment',
  action: 'Action',
  note: 'Note',
  system: 'System',
};

/** Title, icon and icon-chip colour for an event. Verification changes take the new status colour. */
export function describeEvent(e: VerificationEvent): { icon: LucideIcon; title: string; chip: string } {
  switch (e.type) {
    case 'assignment':
      return {
        icon: UserRoundCheck,
        title: e.reviewerId ? `Assigned to ${reviewerName(e.reviewerId)}` : 'Reviewer unassigned',
        chip: 'bg-info/10 text-info',
      };
    case 'status_change':
      return {
        icon: ShieldCheck,
        title: `${STATUS_META[e.fromStatus ?? 'awaiting'].label} → ${STATUS_META[e.toStatus ?? 'awaiting'].label}`,
        chip: STATUS_STYLE[e.toStatus ?? 'awaiting'].tint,
      };
    case 'action':
      return { icon: ClipboardCheck, title: e.action ?? 'Action recorded', chip: 'bg-accent/10 text-accent' };
    case 'note':
      return { icon: MessageSquareText, title: 'Added a review note', chip: 'bg-surface-3 text-fg-muted' };
    case 'system':
      return { icon: Server, title: 'System event', chip: 'bg-surface-3 text-fg-subtle' };
  }
}
