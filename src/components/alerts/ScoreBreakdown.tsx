import { CircleHelp } from 'lucide-react';
import type { FactorKey, ScoreResult } from '../../types';

const FACTOR_COLOR: Record<FactorKey, string> = {
  C: 'bg-factor-c',
  R: 'bg-factor-r',
  F: 'bg-factor-f',
  A: 'bg-factor-a',
};
const ORDER: FactorKey[] = ['C', 'R', 'F', 'A'];

export function ScoreBreakdown({ score }: { score: ScoreResult }) {
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[28px] font-semibold leading-none tracking-tight tabular-nums text-fg">
              {score.incomplete && <span className="mr-0.5 text-xl font-normal text-fg-subtle">≥</span>}
              {score.score.toFixed(1)}
            </span>
            <span className="text-13 text-fg-subtle">/ 100</span>
          </div>
          <div className="mt-1.5 font-mono text-2xs text-fg-subtle">
            P = {ORDER.map((k) => `${score.factors[k].weight.toFixed(2)}${k}`).join(' + ')}
          </div>
        </div>
        {score.incomplete && (
          <div className="rounded-lg bg-medium/10 px-2.5 py-1.5 text-right text-xs text-medium">
            <div className="font-medium">Incomplete inputs</div>
            <div className="tabular-nums opacity-90">
              Possible range {score.score.toFixed(1)}–{score.upperBound.toFixed(1)}
            </div>
          </div>
        )}
      </div>

      <div className="flex h-2 gap-px overflow-hidden rounded-full bg-surface-3" role="img" aria-label="Score contributions by factor">
        {ORDER.map((k) => (
          <div
            key={k}
            className={FACTOR_COLOR[k]}
            style={{ width: `${score.factors[k].contribution}%` }}
            title={`${score.factors[k].label}: ${score.factors[k].contribution.toFixed(1)} points`}
          />
        ))}
      </div>

      <ul className="space-y-3">
        {ORDER.map((k) => {
          const f = score.factors[k];
          const missing = f.value === null;
          return (
            <li key={k} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5">
              <div className="flex items-center gap-2 text-13 text-fg">
                <span className={`h-2.5 w-2.5 rounded-sm ${FACTOR_COLOR[k]}`} aria-hidden />
                {f.label}
                <span className="font-mono text-2xs text-fg-subtle">
                  {k} · ×{f.weight.toFixed(2)}
                </span>
              </div>
              <div className="text-right text-13 font-semibold tabular-nums text-fg">
                {f.contribution.toFixed(1)}
                <span className="ml-1 text-xs font-normal text-fg-subtle">pts</span>
              </div>
              <p className="pl-[18px] text-xs leading-snug text-fg-subtle">{f.explanation}</p>
              <div className="text-right text-xs tabular-nums">
                {missing ? (
                  <span className="rounded bg-medium/10 px-1.5 py-px font-medium text-medium">{f.status}</span>
                ) : (
                  <span className="text-fg-subtle">input {f.value!.toFixed(0)}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="flex gap-2 rounded-lg bg-surface-2 px-3 py-2 text-xs leading-snug text-fg-muted">
        <CircleHelp className="mt-px h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
        A triage priority for ordering human review, not the probability that a fire exists. Missing inputs score zero and
        are flagged rather than assumed.
      </p>
    </div>
  );
}
