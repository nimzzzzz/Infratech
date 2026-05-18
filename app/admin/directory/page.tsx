import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/site/container";
import { getAdminSession } from "@/lib/auth/admin-session";
import { listCompaniesForAdmin } from "@/lib/queries/directory";
import { relativeDays } from "@/lib/browse/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Admin · Directory",
  alternates: { canonical: "/admin/directory" },
};

/**
 * Admin company directory — every vendor with at-a-glance counts +
 * suspended/active status. Sorted createdAt desc. No filters in v1
 * (matches the A.5 inquiries pattern). Read-only at the LIST level;
 * actions (Suspend / Unsuspend) live on the detail page.
 *
 * Includes suspended vendors deliberately — admins need to act on
 * them. The public-side suspended filter lives in lib/queries/
 * apps.ts + lib/queries/search.ts only.
 */
export default async function AdminDirectoryPage() {
  const [, list] = await Promise.all([
    getAdminSession(),
    listCompaniesForAdmin(),
  ]);

  return (
    <Container className="max-w-6xl py-12 md:py-16">
      <p className="text-[13px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
        Editorial admin
      </p>
      <h1 className="mt-4 font-heading text-[40px] leading-[1.04] tracking-tight md:text-[48px]">
        Directory
      </h1>
      <p className="mt-3 max-w-[60ch] text-[16px] leading-relaxed text-[var(--color-ink-2)] md:text-[17px]">
        Every company on AllInfratech. Click a row to see their products,
        members, and moderation actions.
      </p>

      <ul className="mt-10 border-y border-[var(--color-line)] divide-y divide-[var(--color-line)]">
        {list.length === 0 ? (
          <li className="py-12 text-center text-[16px] text-[var(--color-ink-3)]">
            No companies yet.
          </li>
        ) : (
          list.map((c) => (
            <li key={c.id}>
              <Link
                href={`/admin/directory/${c.id}`}
                prefetch
                className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-5 transition-colors hover:bg-[var(--color-canvas-warm)]/40 md:grid-cols-[auto_minmax(0,2fr)_auto_auto_auto_88px] md:gap-6 md:px-3"
              >
                <StatusPill suspended={c.suspended} />
                <div className="min-w-0">
                  <p className="truncate font-heading text-[20px] leading-tight">
                    {c.name}
                  </p>
                </div>
                <Stat label="Products" value={c.productCount} />
                <Stat label="Pending" value={c.pendingSubmissionCount} />
                <Stat label="Members" value={c.memberCount} />
                <span className="num text-right text-[13px] text-[var(--color-ink-3)]">
                  {relativeDays(c.createdAt.toISOString().slice(0, 10)).label}
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </Container>
  );
}

function StatusPill({ suspended }: { suspended: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[13px] uppercase tracking-[0.18em] ring-1",
        suspended
          ? "bg-rose-50 text-rose-700 ring-rose-300"
          : "bg-emerald-50 text-emerald-700 ring-emerald-300",
      )}
    >
      {suspended ? "Suspended" : "Active"}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="hidden text-right md:block">
      <p className="num text-[15px] text-[var(--color-ink)]">{value}</p>
      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-3)]">
        {label}
      </p>
    </div>
  );
}
