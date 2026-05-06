import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  PencilSimple,
} from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/site/container";
import { LetterAvatar } from "@/components/browse/letter-avatar";
import { StatusPill } from "@/components/admin/status-pill";
import { getAdminSession } from "@/lib/auth/admin-session";
import { listApps } from "@/lib/queries/apps";
import { relativeDays } from "@/lib/browse/dates";

export const metadata: Metadata = {
  title: "Admin · Apps",
  alternates: { canonical: "/admin/apps" },
};

export default async function AdminAppsPage() {
  await getAdminSession();
  const sorted = await listApps({ status: "published" });

  return (
    <Container className="max-w-6xl py-10 md:py-14">
      <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
        Catalogue
      </p>
      <h1 className="mt-4 font-heading text-[36px] leading-[1.04] tracking-tight md:text-[52px]">
        Published apps.
      </h1>
      <p className="mt-3 max-w-[60ch] text-[13px] leading-relaxed text-[var(--color-ink-2)] md:text-[14px]">
        <span className="num text-[var(--color-ink)]">{sorted.length}</span>{" "}
        listings live in the directory.
      </p>

      <ul className="mt-10 border-y border-[var(--color-line-strong)] divide-y divide-[var(--color-line)]">
        <li className="hidden grid-cols-[40px_minmax(0,2fr)_minmax(0,1.4fr)_72px_auto] items-center gap-4 px-3 py-3 md:grid">
          <span aria-hidden />
          <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
            Product
          </span>
          <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
            Stages
          </span>
          <span className="text-right text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
            Status
          </span>
          <span className="text-right text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
            Actions
          </span>
        </li>
        {sorted.map((app) => (
          <li
            key={app.slug}
            className="grid grid-cols-[40px_1fr_auto] items-center gap-3 py-4 transition-colors hover:bg-[var(--color-canvas-warm)]/30 md:grid-cols-[40px_minmax(0,2fr)_minmax(0,1.4fr)_72px_auto] md:gap-4 md:px-3 md:py-4"
          >
            <LetterAvatar name={app.name} className="h-9 w-9" />

            <div className="min-w-0">
              <p className="font-heading text-[17px] leading-tight md:text-[18px]">
                {app.name}
              </p>
              <p className="mt-0.5 truncate text-[11px] uppercase tracking-[0.18em] text-[var(--color-coral)]">
                {app.vendor.name}
              </p>
            </div>

            <p className="hidden truncate text-[12px] text-[var(--color-ink-2)] md:block">
              {app.stages.map((s) => s.name).join(" · ")}
            </p>
            <StatusPill status="live" className="hidden md:inline-flex" />

            <div className="flex items-center gap-1.5 md:justify-end">
              <Link
                href={`/apps/${app.slug}`}
                target="_blank"
                rel="noopener"
                title="View public listing"
                className="inline-flex h-8 w-8 items-center justify-center border border-[var(--color-line-strong)] text-[var(--color-ink-2)] transition-colors hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]"
              >
                <ArrowUpRight size={12} weight="bold" />
              </Link>
              <button
                type="button"
                title="Edit (lands with single-app editor)"
                className="inline-flex h-8 w-8 items-center justify-center border border-[var(--color-line-strong)] text-[var(--color-ink-2)] transition-colors hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]"
              >
                <PencilSimple size={12} weight="regular" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-8 max-w-[60ch] text-[12px] leading-relaxed text-[var(--color-ink-3)]">
        Per-app editor and bulk actions land in the next admin pass. For now,
        edits route through the queue when vendors submit changes.
      </p>
    </Container>
  );
}
