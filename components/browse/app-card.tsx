import Link from "next/link";
import type { AppCard as AppCardData } from "@/lib/queries/apps";
import { lookups } from "@/lib/data/taxonomy";
import { formatStageLabel } from "@/lib/stages/format";
import { LetterAvatar } from "./letter-avatar";

export function AppCard({ app }: { app: AppCardData }) {
  const pricingLabel = app.pricingSlug
    ? (lookups.pricing.get(app.pricingSlug) ?? app.pricingSlug)
    : "—";
  return (
    <Link
      href={`/apps/${app.slug}`}
      className="group relative flex h-full flex-col overflow-hidden border border-[var(--color-line)] bg-[var(--color-surface)] transition-colors duration-300 hover:border-[var(--color-ink)]/40"
    >
      <div className="flex h-[120px] shrink-0 items-center justify-center border-b border-[var(--color-line)] bg-[var(--color-canvas-warm)]">
        {app.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={app.logoUrl}
            alt=""
            className="h-16 w-16 object-contain"
          />
        ) : (
          <LetterAvatar
            name={app.name}
            className="h-16 w-16"
            letterClassName="text-[32px]"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="flex flex-col gap-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-magenta)]">
            {app.vendor.name}
          </p>
          <p className="font-heading text-[23px] leading-tight text-[var(--color-ink)]">
            {app.name}
          </p>
          <p className="text-[15px] leading-relaxed text-[var(--color-ink-2)]">
            {app.tagline}
          </p>
        </div>

        <div className="mt-auto pt-5">
          <ul className="flex flex-wrap gap-1.5">
            {app.stages.map((s) => (
              <li key={s.slug}>
                <span className="inline-block border border-[var(--color-line-strong)] px-2 py-[3px] text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink-2)]">
                  {formatStageLabel(s.slug)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-[var(--color-line)] pt-3 text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-3)]">
            {pricingLabel}
          </p>
        </div>
      </div>
    </Link>
  );
}
