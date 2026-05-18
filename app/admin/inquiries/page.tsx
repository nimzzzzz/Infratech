import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/site/container";
import { getAdminSession } from "@/lib/auth/admin-session";
import { listInquiriesForAdmin } from "@/lib/queries/messages";
import { relativeDays } from "@/lib/browse/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Admin · Inquiries",
  alternates: { canonical: "/admin/inquiries" },
};

/**
 * Admin-wide inquiry list. Newest first, single sorted list — no
 * filters in v1 (status pill on each row is enough triage signal at
 * the current scale). Read-only — clicking a row navigates to the
 * detail page; no actions on this page mutate inquiry state.
 */
export default async function AdminInquiriesPage() {
  // Perf — race the auth check against the fetch. Admin queries are
  // global, so the data fetch has no dependency on session; auth
  // still gates rendering via its redirect.
  const [, list] = await Promise.all([
    getAdminSession(),
    listInquiriesForAdmin(),
  ]);

  return (
    <Container className="max-w-6xl py-12 md:py-16">
      <p className="text-[13px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
        Editorial admin
      </p>
      <h1 className="mt-4 font-heading text-[40px] leading-[1.04] tracking-tight md:text-[48px]">
        Inquiries
      </h1>
      <p className="mt-3 max-w-[60ch] text-[16px] leading-relaxed text-[var(--color-ink-2)] md:text-[17px]">
        Every visitor message sent through the &ldquo;Contact vendor&rdquo;
        form on a product page. Vendors handle their own replies via email;
        this list is for editorial oversight only.
      </p>

      <ul className="mt-10 border-y border-[var(--color-line)] divide-y divide-[var(--color-line)]">
        {list.length === 0 ? (
          <li className="py-12 text-center text-[16px] text-[var(--color-ink-3)]">
            No inquiries yet.
          </li>
        ) : (
          list.map((msg) => (
            <li key={msg.id}>
              <Link
                href={`/admin/inquiries/${msg.id}`}
                prefetch
                className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-5 transition-colors hover:bg-[var(--color-canvas-warm)]/40 md:grid-cols-[auto_minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.5fr)_88px] md:gap-6 md:px-3"
              >
                <StatusPill status={msg.status} />
                <div className="min-w-0">
                  <p className="truncate text-[17px] leading-tight text-[var(--color-ink)] md:text-[18px]">
                    {msg.subject}
                  </p>
                  <p className="mt-1 truncate text-[14px] text-[var(--color-ink-3)]">
                    {msg.senderName}
                    {msg.senderCompany ? ` · ${msg.senderCompany}` : ""}
                    {msg.senderRole ? ` · ${msg.senderRole}` : ""}
                  </p>
                </div>
                <div className="hidden min-w-0 md:block">
                  <p className="truncate text-[14px] uppercase tracking-[0.16em] text-[var(--color-coral)]">
                    {msg.appName}
                  </p>
                  <p className="mt-1 truncate text-[13px] text-[var(--color-ink-3)]">
                    {msg.vendorName}
                  </p>
                </div>
                <p className="hidden truncate text-[14px] text-[var(--color-ink-2)] md:block">
                  {snippet(msg.body)}
                </p>
                <span className="num text-right text-[13px] text-[var(--color-ink-3)]">
                  {relativeDays(msg.createdAt.toISOString().slice(0, 10)).label}
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </Container>
  );
}

function StatusPill({ status }: { status: "unread" | "read" | "archived" }) {
  const tone =
    status === "unread"
      ? "bg-[var(--color-coral)]/10 text-[var(--color-coral)] ring-[var(--color-coral)]/40"
      : status === "read"
        ? "bg-[var(--color-canvas-warm)] text-[var(--color-ink-2)] ring-[var(--color-line-strong)]"
        : "bg-slate-50 text-slate-600 ring-slate-300";
  const label =
    status === "unread"
      ? "Unread"
      : status === "read"
        ? "Read"
        : "Archived";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[13px] uppercase tracking-[0.18em] ring-1",
        tone,
      )}
    >
      {label}
    </span>
  );
}

function snippet(body: string, len = 120): string {
  const oneLine = body.replace(/\s+/g, " ").trim();
  return oneLine.length > len ? `${oneLine.slice(0, len)}…` : oneLine;
}
