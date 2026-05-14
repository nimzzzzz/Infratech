import { Container } from "@/components/site/container";

/**
 * Loading state for /admin/submissions/[id] (detail). Mirrors the
 * back-link + meta block + payload-card silhouette.
 */
export default function SubmissionDetailLoading() {
  return (
    <Container className="max-w-4xl py-10 md:py-14">
      <div className="animate-pulse">
        <div className="h-3 w-32 bg-[var(--color-line-strong)]/30" />

        <div className="mt-8 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="h-3 w-24 bg-[var(--color-line-strong)]/30" />
            <div className="mt-3 h-10 w-2/3 bg-[var(--color-line-strong)]/40 md:h-12" />
            <div className="mt-3 h-4 w-1/2 bg-[var(--color-line-strong)]/20" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-[var(--color-line-strong)]/40" />
            <div className="h-10 w-24 bg-[var(--color-line-strong)]/40" />
          </div>
        </div>

        <div className="mt-10 border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-6 md:p-8">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="grid grid-cols-[140px_1fr] items-start gap-4 border-b border-[var(--color-line)] py-3 last:border-b-0"
            >
              <div className="h-3 w-20 bg-[var(--color-line-strong)]/20" />
              <div
                className="h-4 bg-[var(--color-line-strong)]/30"
                style={{ width: `${85 - (i % 3) * 10}%` }}
              />
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}
