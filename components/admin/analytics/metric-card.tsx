/**
 * Metric card shell for /admin/analytics. Eyebrow + heading + optional
 * stat number + slot for the chart / list body.
 *
 * Server component — no interactivity beyond what children render.
 * Matches the existing admin design language (no rounded corners,
 * bordered cells, uppercase eyebrows in coral, tabular nums on
 * stats).
 */
export function MetricCard({
  eyebrow,
  title,
  stat,
  statSuffix,
  emptyMessage,
  isEmpty,
  children,
}: {
  eyebrow: string;
  title: string;
  /** Optional headline number rendered above the body slot. */
  stat?: number | string;
  /** Optional unit/label rendered next to the stat in muted ink. */
  statSuffix?: string;
  /** Copy to show in place of the chart when there's no data. */
  emptyMessage?: string;
  /** Toggles the empty state. When true, children are not rendered. */
  isEmpty?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-5 md:p-6">
      <header className="flex items-baseline justify-between gap-4">
        <p className="text-[12px] uppercase tracking-[0.22em] text-[var(--color-coral)]">
          {eyebrow}
        </p>
      </header>
      <h2 className="mt-3 font-heading text-[22px] leading-tight tracking-tight text-[var(--color-ink)] md:text-[24px]">
        {title}
      </h2>

      {stat !== undefined ? (
        <p className="mt-3 flex items-baseline gap-2">
          <span className="num font-heading text-[40px] leading-none tracking-tight text-[var(--color-ink)] md:text-[48px]">
            {stat}
          </span>
          {statSuffix ? (
            <span className="text-[13px] uppercase tracking-[0.18em] text-[var(--color-ink-3)]">
              {statSuffix}
            </span>
          ) : null}
        </p>
      ) : null}

      <div className="mt-5">
        {isEmpty ? (
          <p className="py-8 text-center text-[14px] text-[var(--color-ink-3)]">
            {emptyMessage ?? "No data in this range yet."}
          </p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
