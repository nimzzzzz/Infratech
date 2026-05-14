import { Container } from "@/components/site/container";

/**
 * Loading state for /dashboard (overview). Renders immediately on
 * navigation while the page's server components resolve, so the
 * user sees a page-shaped silhouette instead of staring at the old
 * page or a white flash.
 *
 * Silhouette mirrors the overview's eyebrow + H1 + 3-stat-card row
 * + recent-inquiries section. Subtle animate-pulse on the grey
 * blocks; no spinners.
 */
export default function DashboardLoading() {
  return (
    <Container className="max-w-6xl py-12 md:py-16">
      <div className="animate-pulse">
        <div className="h-3 w-32 bg-[var(--color-line-strong)]/40" />
        <div className="mt-4 h-12 w-3/4 bg-[var(--color-line-strong)]/40 md:h-14" />
        <div className="mt-3 h-4 w-1/2 bg-[var(--color-line-strong)]/30" />

        <ul className="mt-10 grid grid-cols-1 gap-px border border-[var(--color-line-strong)] bg-[var(--color-line-strong)] sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <li key={i} className="bg-[var(--color-surface)] p-5 md:p-6">
              <div className="h-4 w-4 bg-[var(--color-line-strong)]/40" />
              <div className="mt-12 h-10 w-14 bg-[var(--color-line-strong)]/40 md:h-12" />
              <div className="mt-2 h-3 w-24 bg-[var(--color-line-strong)]/30" />
            </li>
          ))}
        </ul>

        <section className="mt-14">
          <div className="flex items-end justify-between border-b border-[var(--color-line-strong)] pb-3">
            <div className="h-3 w-36 bg-[var(--color-line-strong)]/30" />
            <div className="h-3 w-16 bg-[var(--color-line-strong)]/20" />
          </div>
          <ul className="divide-y divide-[var(--color-line)]">
            {[0, 1, 2].map((i) => (
              <li
                key={i}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4 md:px-3"
              >
                <span className="h-2 w-2 rounded-full bg-[var(--color-line-strong)]/30" />
                <div>
                  <div className="h-4 w-3/4 bg-[var(--color-line-strong)]/30" />
                  <div className="mt-2 h-3 w-1/2 bg-[var(--color-line-strong)]/20" />
                </div>
                <div className="h-3 w-12 bg-[var(--color-line-strong)]/20" />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Container>
  );
}
