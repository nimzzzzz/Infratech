import Link from "next/link";
import type { App } from "@/lib/data/apps";
import { stageNameMap } from "@/lib/data/stages";
import { lookups } from "@/lib/data/taxonomy";
import { LetterAvatar } from "./letter-avatar";

export function AppCard({ app }: { app: App }) {
  const pricingLabel = lookups.pricing.get(app.pricing) ?? app.pricing;
  return (
    <Link
      href={`/apps/${app.slug}`}
      className="group relative flex h-full flex-col overflow-hidden border border-[var(--color-line)] bg-[var(--color-surface)] transition-colors duration-300 hover:border-[var(--color-ink)]/40"
    >
      {/* LOGO BANNER — full-width header, warm canvas background, centered avatar.
          When real logos arrive in Phase 2 (R2 / Blob), the avatar is replaced
          by the vendor's uploaded logo at this same scale. */}
      <div className="flex h-[120px] shrink-0 items-center justify-center border-b border-[var(--color-line)] bg-[var(--color-canvas-warm)]">
        <LetterAvatar
          name={app.name}
          className="h-16 w-16"
          letterClassName="text-[32px]"
        />
      </div>

      {/* CONTENT */}
      <div className="flex flex-1 flex-col p-6">
        <div className="flex flex-col gap-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-magenta)]">
            {app.vendor}
          </p>
          <p className="font-heading text-[23px] leading-tight text-[var(--color-ink)]">
            {app.name}
          </p>
          <p className="text-[15px] leading-relaxed text-[var(--color-ink-2)]">
            {app.blurb}
          </p>
        </div>

        {/* BOTTOM BLOCK — stages on top row, pricing on its own row below.
            mt-auto anchors the whole block to the bottom of the card so
            pricing sits at the same vertical spot on every card. */}
        <div className="mt-auto pt-5">
          <ul className="flex flex-wrap gap-1.5">
            {app.stages.map((s) => (
              <li key={s}>
                <span className="inline-block border border-[var(--color-line-strong)] px-2 py-[3px] text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink-2)]">
                  {stageNameMap.get(s) ?? s}
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
