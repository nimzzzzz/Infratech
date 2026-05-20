import type { SignupFunnel } from "@/lib/queries/analytics";

/**
 * Vendor signup funnel — horizontal bar stack. State-snapshot
 * semantics (current state across all time, not period-bound).
 *
 * Each stage's bar width is proportional to its count relative to
 * the largest stage (typically "signed up", the leftmost). Stages
 * that have 0 still render a label and a hairline bar so the chart
 * shape is visible.
 *
 * Drop-off between consecutive stages is rendered as a small "→ N%"
 * indicator. When the prior stage is 0, drop-off renders as "—".
 */
export function FunnelList({ funnel }: { funnel: SignupFunnel }) {
  const stages = [
    { key: "Signed up", value: funnel.signedUp },
    { key: "Onboarded", value: funnel.onboarded },
    { key: "Company created", value: funnel.companyCreated },
    { key: "≥ 1 published app", value: funnel.hasPublishedApp },
  ];
  const max = Math.max(1, ...stages.map((s) => s.value));

  return (
    <ul className="space-y-3">
      {stages.map((s, i) => {
        const pct = (s.value / max) * 100;
        const prior = i > 0 ? stages[i - 1].value : null;
        const dropoff =
          prior == null
            ? null
            : prior === 0
              ? "—"
              : `${Math.round((s.value / prior) * 100)}%`;
        return (
          <li key={s.key}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[14px] text-[var(--color-ink-2)]">
                {s.key}
              </p>
              <div className="flex items-baseline gap-3">
                {dropoff ? (
                  <span className="num text-[12px] uppercase tracking-[0.18em] text-[var(--color-ink-3)]">
                    → {dropoff}
                  </span>
                ) : null}
                <span className="num text-[16px] text-[var(--color-ink)]">
                  {s.value.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="mt-1.5 h-2 w-full bg-[var(--color-canvas-warm)]">
              <div
                className="h-2"
                style={{
                  width: `${Math.max(2, pct)}%`,
                  background: "var(--color-coral)",
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
