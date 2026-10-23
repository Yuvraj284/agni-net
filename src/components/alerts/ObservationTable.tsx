import { describeConfidence, formatDateTime, formatUtc } from '../../lib/format';
import type { Observation } from '../../types';

const th = 'px-3 py-2 text-xs font-medium text-fg-subtle';

export function ObservationTable({ observations }: { observations: Observation[] }) {
  const rows = [...observations].sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt));
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[520px] text-left text-xs">
        <thead className="bg-surface-2/60">
          <tr>
            <th className={th}>Observation</th>
            <th className={th}>Observed</th>
            <th className={th}>Source</th>
            <th className={th}>Confidence</th>
            <th className={`${th} text-right`} title="Brightness temperature (VIIRS I-4 / MODIS band 21), Kelvin">
              Bright. (K)
            </th>
            <th className={`${th} text-right`} title="Fire radiative power, megawatts">
              FRP (MW)
            </th>
            <th className={th} title="Day or night acquisition">
              D/N
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/70 text-fg">
          {rows.map((o) => (
            <tr key={o.id} className="hover:bg-surface-2/50">
              <td className="px-3 py-2">
                <div className="mono-id text-xs">{o.id}</div>
                <div className="font-mono text-2xs text-fg-subtle">
                  {o.lat.toFixed(4)}, {o.lon.toFixed(4)}
                </div>
              </td>
              <td className="whitespace-nowrap px-3 py-2 font-mono text-2xs" title={formatUtc(o.observedAt)}>
                {formatDateTime(o.observedAt)}
              </td>
              <td className="px-3 py-2">
                {o.satellite}
                <div className="text-2xs text-fg-subtle">{o.instrument}</div>
              </td>
              <td className={`px-3 py-2 ${o.confidence.scheme === 'missing' ? 'font-medium text-medium' : ''}`}>
                {describeConfidence(o.confidence)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{o.brightnessK ?? '—'}</td>
              <td className="px-3 py-2 text-right tabular-nums">{o.frpMW ?? <span className="text-fg-subtle">n/a</span>}</td>
              <td className="px-3 py-2 text-fg-muted">{o.dayNight === 'D' ? 'Day' : 'Night'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
