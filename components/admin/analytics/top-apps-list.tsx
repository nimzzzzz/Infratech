import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { LetterAvatar } from "@/components/browse/letter-avatar";
import type { TopAppRow } from "@/lib/queries/analytics";

/**
 * Ranked list of the top 10 most-viewed apps over the selected
 * range. Each row links to the public app detail page in a new
 * tab so admins can sanity-check the listing while triaging.
 *
 * Renders fewer than 10 rows if the dataset is smaller — no
 * padding to a fixed length.
 */
export function TopAppsList({ rows }: { rows: TopAppRow[] }) {
  return (
    <ol className="divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
      {rows.map((app, i) => (
        <li
          key={app.id}
          className="grid grid-cols-[28px_40px_minmax(0,1fr)_auto] items-center gap-3 py-3 md:gap-4"
        >
          <span className="num text-[14px] text-[var(--color-ink-3)]">
            {String(i + 1).padStart(2, "0")}
          </span>
          {app.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={app.logoUrl}
              alt=""
              className="h-9 w-9 object-contain"
            />
          ) : (
            <LetterAvatar name={app.name} className="h-9 w-9" />
          )}
          <div className="min-w-0">
            <p className="truncate text-[15px] text-[var(--color-ink)] md:text-[16px]">
              {app.name}
            </p>
            <p className="mt-0.5 truncate text-[13px] uppercase tracking-[0.16em] text-[var(--color-coral)]">
              {app.vendorName}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="num text-right text-[15px] text-[var(--color-ink)] md:text-[16px]">
              {app.views.toLocaleString()}
            </span>
            <Link
              href={`/apps/${app.slug}`}
              target="_blank"
              rel="noopener"
              title="View public listing"
              className="inline-flex h-7 w-7 items-center justify-center border border-[var(--color-line-strong)] text-[var(--color-ink-2)] transition-colors hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]"
            >
              <ArrowUpRight size={11} weight="bold" />
            </Link>
          </div>
        </li>
      ))}
    </ol>
  );
}
