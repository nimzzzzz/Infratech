import { Container } from "@/components/site/container";

/**
 * Loading state for /dashboard/messages/[id] (message detail).
 * Back link + subject + sender meta + body paragraphs.
 */
export default function MessageDetailLoading() {
  return (
    <Container className="max-w-3xl py-10 md:py-14">
      <div className="animate-pulse">
        <div className="h-3 w-20 bg-[var(--color-line-strong)]/30" />

        <div className="mt-8 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="h-3 w-24 bg-[var(--color-line-strong)]/30" />
            <div className="mt-3 h-10 w-3/4 bg-[var(--color-line-strong)]/40 md:h-12" />
            <div className="mt-3 h-4 w-1/2 bg-[var(--color-line-strong)]/20" />
          </div>
          <div className="h-10 w-28 bg-[var(--color-line-strong)]/40" />
        </div>

        <div className="mt-10 space-y-4 border-t border-[var(--color-line)] pt-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-4 bg-[var(--color-line-strong)]/20"
              style={{ width: `${85 - i * 5}%` }}
            />
          ))}
        </div>
      </div>
    </Container>
  );
}
