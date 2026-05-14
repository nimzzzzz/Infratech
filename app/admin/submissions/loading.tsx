import { Container } from "@/components/site/container";

/**
 * Loading state for /admin/submissions (queue list). Eyebrow +
 * page H1 + tabs + a few row placeholders.
 */
export default function SubmissionsListLoading() {
  return (
    <Container className="max-w-6xl py-12 md:py-16">
      <div className="animate-pulse">
        <div className="h-3 w-32 bg-[var(--color-line-strong)]/40" />
        <div className="mt-4 flex items-end justify-between gap-4">
          <div className="h-10 w-40 bg-[var(--color-line-strong)]/40 md:h-12" />
          <div className="h-3 w-20 bg-[var(--color-line-strong)]/20" />
        </div>

        <div className="mt-8 flex flex-wrap gap-2 border border-[var(--color-line-strong)] p-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-8 w-20 bg-[var(--color-line-strong)]/20"
            />
          ))}
        </div>

        <ul className="mt-6 border-y border-[var(--color-line)] divide-y divide-[var(--color-line)]">
          {[0, 1, 2, 3, 4].map((i) => (
            <li
              key={i}
              className="grid grid-cols-[100px_1fr_auto_72px] items-center gap-6 py-4 md:px-3"
            >
              <div className="h-3 w-16 bg-[var(--color-line-strong)]/20" />
              <div>
                <div className="h-5 w-3/4 bg-[var(--color-line-strong)]/30" />
                <div className="mt-2 h-3 w-1/2 bg-[var(--color-line-strong)]/20" />
              </div>
              <div className="h-5 w-20 bg-[var(--color-line-strong)]/30" />
              <div className="h-3 w-12 bg-[var(--color-line-strong)]/20" />
            </li>
          ))}
        </ul>
      </div>
    </Container>
  );
}
