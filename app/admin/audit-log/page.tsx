import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/site/container";
import { getAdminSession } from "@/lib/auth/admin-session";
import {
  parseAuditLogParams,
  listAuditEntries,
  resolveTargets,
  PAGE_SIZE,
} from "@/lib/queries/audit-log";
import { actionLabel, actionColor } from "@/lib/admin/action-palette";
import { relativeDays } from "@/lib/browse/dates";

export const metadata: Metadata = {
  title: "Admin · Audit log",
  alternates: { canonical: "/admin/audit-log" },
  robots: { index: false, follow: false },
};

/**
 * /admin/audit-log — A.6 PR 2.
 *
 * CHECKPOINT 1 build: minimal list + nav + target resolution. No
 * filter bar, no pagination UI, no metadata <details> expander
 * yet — those land at CHECKPOINT 2.
 */
export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseAuditLogParams(sp);

  const [, listed] = await Promise.all([
    getAdminSession(),
    listAuditEntries(filters),
  ]);
  const targets = await resolveTargets(listed.rows);

  return (
    <Container className="max-w-6xl py-12 md:py-16">
      <p className="text-[13px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
        Editorial admin
      </p>
      <div className="mt-4">
        <h1 className="font-heading text-[40px] leading-[1.04] tracking-tight md:text-[48px]">
          Audit log
        </h1>
        <p className="mt-3 max-w-[60ch] text-[16px] leading-relaxed text-[var(--color-ink-2)] md:text-[17px]">
          Every consequential action across the platform. Read-only, newest
          first. {listed.total.toLocaleString()} total entries.
        </p>
      </div>

      {listed.rows.length === 0 ? (
        <p className="mt-12 text-[16px] text-[var(--color-ink-3)]">
          Nothing in this view.
        </p>
      ) : (
        <ul className="mt-10 divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
          {listed.rows.map((row) => {
            const target = targets.get(`${row.targetType}:${row.targetId}`);
            const targetName = target?.name ?? `${row.targetType}#${row.targetId}`;
            const targetHref = target?.href ?? null;
            const targetDeleted = target?.deleted ?? false;
            const actor =
              row.actorVendorMemberId === null
                ? { label: "[System]", isSystem: true }
                : {
                    label: row.actorName ?? `Member #${row.actorVendorMemberId}`,
                    isSystem: false,
                  };
            return (
              <li
                key={row.id}
                className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1.5 py-4 md:grid-cols-[140px_1fr_auto] md:gap-x-6 md:px-3"
              >
                <time
                  dateTime={row.createdAt.toISOString()}
                  title={row.createdAt.toUTCString()}
                  className="num text-[13px] text-[var(--color-ink-3)]"
                >
                  {
                    relativeDays(row.createdAt.toISOString().slice(0, 10))
                      .label
                  }
                </time>
                <div className="min-w-0 md:col-start-2">
                  <p className="text-[16px] text-[var(--color-ink)]">
                    <span
                      className="inline-flex items-center gap-1.5 text-[13px] uppercase tracking-[0.16em]"
                      style={{ color: actionColor(row.action) }}
                    >
                      <span
                        aria-hidden
                        className="inline-block h-2 w-2"
                        style={{ background: actionColor(row.action) }}
                      />
                      {actionLabel(row.action)}
                    </span>
                    <span className="ml-3 text-[var(--color-ink-3)]">on</span>{" "}
                    {targetHref ? (
                      <Link
                        href={targetHref}
                        prefetch={targetHref.startsWith("/admin")}
                        className="text-[var(--color-ink)] underline-offset-4 hover:underline"
                      >
                        {targetName}
                      </Link>
                    ) : (
                      <span
                        className={
                          targetDeleted
                            ? "italic text-[var(--color-ink-3)]"
                            : "text-[var(--color-ink-2)]"
                        }
                      >
                        {targetName}
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-[13px] text-[var(--color-ink-3)]">
                    <span
                      className={
                        actor.isSystem
                          ? "italic text-[var(--color-ink-3)]"
                          : "text-[var(--color-ink-2)]"
                      }
                    >
                      {actor.label}
                    </span>
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-8 max-w-[60ch] text-[13px] leading-relaxed text-[var(--color-ink-3)]">
        Checkpoint 1 build — filter bar, pagination, and inline metadata
        expander land in the follow-up. Page size {PAGE_SIZE}.
      </p>
    </Container>
  );
}
