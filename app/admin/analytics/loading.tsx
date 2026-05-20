import { Container } from "@/components/site/container";

/**
 * Skeleton for /admin/analytics. Mirrors the live page's structure:
 * eyebrow + H1 + intro + range-picker, then 5 rows of metric cards
 * (two 2-up rows, one full-width funnel placeholder, one 2-up, and
 * one full-width admin-activity placeholder). Heights match the
 * chart-container minimums so layout doesn't shift on swap.
 */
export default function AdminAnalyticsLoading() {
  return (
    <Container className="max-w-6xl py-12 md:py-16">
      <div className="animate-pulse">
        <div className="h-3 w-32 bg-[var(--color-line-strong)]/40" />
        <div className="mt-4 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="h-10 w-48 bg-[var(--color-line-strong)]/40 md:h-12" />
            <div className="mt-3 h-4 w-3/4 max-w-lg bg-[var(--color-line-strong)]/30" />
          </div>
          <div className="h-10 w-72 bg-[var(--color-line-strong)]/20" />
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 md:gap-6">
          <MetricSkeleton tall />
          <MetricSkeleton tall />
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 md:gap-6">
          <MetricSkeleton tall />
          <MetricSkeleton tall />
        </div>

        <div className="mt-6">
          <MetricSkeleton listLike />
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 md:gap-6">
          <MetricSkeleton listLike />
          <MetricSkeleton listLike />
        </div>

        <div className="mt-6">
          <MetricSkeleton tall />
        </div>
      </div>
    </Container>
  );
}

function MetricSkeleton({
  tall,
  listLike,
}: {
  tall?: boolean;
  listLike?: boolean;
}) {
  return (
    <section className="border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-5 md:p-6">
      <div className="h-3 w-20 bg-[var(--color-line-strong)]/30" />
      <div className="mt-3 h-6 w-44 bg-[var(--color-line-strong)]/40" />
      <div className="mt-3 h-10 w-24 bg-[var(--color-line-strong)]/30" />
      {listLike ? (
        <ul className="mt-5 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="flex items-center gap-3">
              <div className="h-3 w-3 bg-[var(--color-line-strong)]/30" />
              <div className="h-3 flex-1 bg-[var(--color-line-strong)]/20" />
              <div className="h-3 w-10 bg-[var(--color-line-strong)]/30" />
            </li>
          ))}
        </ul>
      ) : (
        <div
          className="mt-5 w-full bg-[var(--color-line-strong)]/20"
          style={{ height: tall ? 200 : 120 }}
        />
      )}
    </section>
  );
}
