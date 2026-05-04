import Link from "next/link";
import type { App } from "@/lib/data/apps";
import { stageNameMap } from "@/lib/data/stages";
import { lookups } from "@/lib/data/taxonomy";
import { LetterAvatar } from "./letter-avatar";

export function AppCard({ app, index }: { app: App; index: number }) {
  const number = String(index).padStart(2, "0");
  const pricingLabel = lookups.pricing.get(app.pricing) ?? app.pricing;
  return (
    <Link
      href={`/apps/${app.slug}`}
      className="group relative flex h-full flex-col gap-5 border border-[var(--color-line)] bg-[var(--color-surface)] p-6 transition-colors duration-300 hover:border-[var(--color-ink)]/40"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="num font-heading text-[14px] tracking-[0.05em] text-[var(--color-magenta)]">
          {number}
        </span>
        <span className="text-right text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-3)]">
          {pricingLabel}
        </span>
      </div>

      <LetterAvatar name={app.name} />

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

      <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
        {app.stages.map((s) => (
          <span
            key={s}
            className="border border-[var(--color-line-strong)] px-2 py-[3px] text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink-2)]"
          >
            {stageNameMap.get(s) ?? s}
          </span>
        ))}
      </div>
    </Link>
  );
}
