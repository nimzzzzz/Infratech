import type { CtrRow } from "@/lib/queries/analytics";

/**
 * Per-app outbound click-through rate table. Ordered by CTR%
 * descending, then by views. Only includes published apps with at
 * least one view OR click in the window (filter applied in the
 * query).
 */
export function CtrTable({ rows }: { rows: CtrRow[] }) {
  return (
    <div className="-mx-5 overflow-x-auto md:-mx-6">
      <table className="w-full min-w-[480px] border-collapse text-[14px]">
        <thead>
          <tr className="border-y border-[var(--color-line)] text-left">
            <th className="px-5 py-2 text-[12px] uppercase tracking-[0.22em] text-[var(--color-ink-3)] md:px-6">
              App
            </th>
            <th className="px-3 py-2 text-right text-[12px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
              Views
            </th>
            <th className="px-3 py-2 text-right text-[12px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
              Clicks
            </th>
            <th className="px-5 py-2 text-right text-[12px] uppercase tracking-[0.22em] text-[var(--color-ink-3)] md:px-6">
              CTR
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-line)]">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-5 py-2.5 md:px-6">
                <p className="truncate text-[15px] text-[var(--color-ink)]">
                  {r.name}
                </p>
                <p className="mt-0.5 truncate text-[12px] uppercase tracking-[0.16em] text-[var(--color-coral)]">
                  {r.vendorName}
                </p>
              </td>
              <td className="num px-3 py-2.5 text-right text-[var(--color-ink-2)]">
                {r.views.toLocaleString()}
              </td>
              <td className="num px-3 py-2.5 text-right text-[var(--color-ink-2)]">
                {r.clicks.toLocaleString()}
              </td>
              <td className="num px-5 py-2.5 text-right text-[var(--color-ink)] md:px-6">
                {r.ctrPercent.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
