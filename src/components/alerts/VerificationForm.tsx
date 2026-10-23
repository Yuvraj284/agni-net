import { useState } from 'react';
import { CircleAlert, Save, Undo2 } from 'lucide-react';
import { REVIEWERS } from '../../data/regions';
import { NOTE_MAX, REVIEW_ACTIONS, STATUSES, STATUS_META, type ReviewDraft } from '../../lib/verification';
import { useApp } from '../../state/useApp';
import type { EnrichedAlert } from '../../types';
import { STATUS_STYLE } from '../common/meta';
import { Select } from '../common/ui';

/**
 * Review form. Draft state is local until "Save review"; saving appends new timestamped events
 * and never rewrites earlier history. The parent re-mounts this form (via `key`) after each save.
 */
export function VerificationForm({ alert }: { alert: EnrichedAlert }) {
  const { state, actions } = useApp();
  const current = alert.verification;
  const initial: ReviewDraft = { status: current.status, reviewerId: current.reviewerId, note: '', actions: [] };
  const [draft, setDraft] = useState<ReviewDraft>(initial);
  const [errors, setErrors] = useState<string[]>([]);

  const dirty =
    draft.status !== current.status ||
    draft.reviewerId !== current.reviewerId ||
    draft.note.trim() !== '' ||
    draft.actions.length > 0;

  const update = (patch: Partial<ReviewDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setErrors([]);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors(actions.saveReview(alert.id, draft));
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <label className="block">
        <span className="label">Reviewer</span>
        <Select
          className="mt-1.5 w-full"
          value={draft.reviewerId ?? ''}
          onChange={(e) => update({ reviewerId: e.target.value || null })}
        >
          <option value="">Unassigned</option>
          {REVIEWERS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} — {r.role}
            </option>
          ))}
        </Select>
      </label>

      <fieldset>
        <legend className="label">Verification status</legend>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {STATUSES.map((s) => {
            const active = draft.status === s;
            return (
              <label
                key={s}
                className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors ${
                  active ? 'border-accent/50 bg-accent/[0.06] ring-1 ring-accent/30' : 'border-line hover:border-line-strong hover:bg-surface-2/60'
                }`}
              >
                <input
                  type="radio"
                  name={`status-${alert.id}`}
                  value={s}
                  checked={active}
                  onChange={() => update({ status: s })}
                  className="mt-[3px] accent-[rgb(var(--accent))]"
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-13 font-medium text-fg">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_STYLE[s].dot}`} aria-hidden />
                    {STATUS_META[s].label}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-fg-subtle">
                    {s === current.status ? 'Current status' : STATUS_META[s].description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">Actions taken</legend>
        <div className="mt-1.5 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
          {REVIEW_ACTIONS.map((a) => (
            <label key={a} className="flex cursor-pointer items-start gap-2 text-13 text-fg-muted hover:text-fg">
              <input
                type="checkbox"
                checked={draft.actions.includes(a)}
                onChange={(e) =>
                  update({ actions: e.target.checked ? [...draft.actions, a] : draft.actions.filter((x) => x !== a) })
                }
                className="mt-[3px] accent-[rgb(var(--accent))]"
              />
              {a}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="flex items-baseline justify-between">
          <span className="label">Review note</span>
          <span className={`text-xs tabular-nums ${draft.note.length > NOTE_MAX ? 'text-critical' : 'text-fg-subtle'}`}>
            {draft.note.length}/{NOTE_MAX}
          </span>
        </span>
        <textarea
          value={draft.note}
          onChange={(e) => update({ note: e.target.value })}
          rows={3}
          placeholder="Evidence and reasoning — required for Confirmed, Unconfirmed or Inconclusive"
          className="field mt-1.5 resize-y"
        />
      </label>

      {errors.length > 0 && (
        <div role="alert" className="animate-fade-up space-y-1 rounded-lg border border-critical/25 bg-critical/5 px-3 py-2.5 text-13 text-critical">
          {errors.map((err) => (
            <p key={err} className="flex gap-2">
              <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {err}
            </p>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
        <span className="text-xs text-fg-subtle">
          Recording as <span className="font-medium text-fg-muted">{state.actingAs}</span>
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!dirty}
            onClick={() => {
              setDraft(initial);
              setErrors([]);
            }}
            className="btn btn-ghost"
          >
            <Undo2 className="h-3.5 w-3.5" aria-hidden /> Discard
          </button>
          <button
            type="submit"
            disabled={!dirty}
            title={dirty ? 'Append these changes to the review history' : 'No changes to save'}
            className="btn btn-primary"
          >
            <Save className="h-3.5 w-3.5" aria-hidden /> Save review
          </button>
        </div>
      </div>
    </form>
  );
}
