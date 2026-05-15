import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Tray,
  Stack,
  ChartLineUp,
  ClipboardText,
} from "@phosphor-icons/react/dist/ssr";
import { eq, sql } from "drizzle-orm";
import { Container } from "@/components/site/container";
import { StatusPill } from "@/components/admin/status-pill";
import { getAdminSession } from "@/lib/auth/admin-session";
import { db } from "@/lib/db/client";
import { apps, submissions, vendors } from "@/lib/db/schema";
import { listSubmissions } from "@/lib/queries/submissions";
import { relativeDays } from "@/lib/browse/dates";

export const metadata: Metadata = {
  title: "Admin · Overview",
  alternates: { canonical: "/admin" },
};

export default async function AdminOverviewPage() {
  // Perf pass 1 — race auth + data fetches. getAdminSession() is
  // cache()-deduped via the layout's earlier call, so it's a free
  // cache hit; the four data fetches all run in parallel rather
  // than sequentially. Previously the page issued ~6 sequential
  // RTTs (4 separate counts + listSubmissions + a full-table
  // payload scan); now it's one parallel batch of 4 queries.
  //
  // The two submission counts are collapsed into a single SELECT
  // using FILTER so one round trip covers both. The full-table
  // payload scan is gone — listSubmissions now projects
  // payload->>'name' as productName, so the recent-activity list
  // gets product titles in the same query.
  const [session, submissionCounts, publishedAppsRow, vendorsRow, recentSubs] =
    await Promise.all([
      getAdminSession(),
      db
        .select({
          pending: sql<number>`count(*) FILTER (WHERE status = 'pending_review')::int`,
          inReview: sql<number>`count(*) FILTER (WHERE status = 'edited_awaiting_vendor_approval')::int`,
        })
        .from(submissions),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(apps)
        .where(eq(apps.status, "published")),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(vendors)
        .where(eq(vendors.suspended, false)),
      listSubmissions(),
    ]);

  const firstName = session.user.name.split(" ")[0];
  const pending = submissionCounts[0]?.pending ?? 0;
  const inReview = submissionCounts[0]?.inReview ?? 0;
  const publishedAppsCount = publishedAppsRow[0]?.n ?? 0;
  const activeVendors = vendorsRow[0]?.n ?? 0;
  const recent = recentSubs.slice(0, 6);

  return (
    <Container className="max-w-6xl py-12 md:py-16">
      <p className="text-[13px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
        Editorial admin
      </p>
      <h1 className="mt-4 font-heading text-[40px] leading-[1.04] tracking-tight md:text-[56px]">
        Good {timeOfDay()}, {firstName}.
      </h1>
      <p className="mt-3 max-w-[60ch] text-[16px] leading-relaxed text-[var(--color-ink-2)] md:text-[17px]">
        <span className="num text-[var(--color-ink)]">{pending}</span> new
        submissions waiting on you.{" "}
        <Link
          href="/admin/submissions"
          prefetch
          className="underline underline-offset-4 hover:text-[var(--color-ink)]"
        >
          Open the queue &rarr;
        </Link>
      </p>

      <ul className="mt-10 grid grid-cols-2 gap-px border border-[var(--color-line-strong)] bg-[var(--color-line-strong)] md:grid-cols-4">
        <StatCard
          icon={Tray}
          label="Pending"
          value={pending}
          href="/admin/submissions?tab=queue"
        />
        <StatCard
          icon={ClipboardText}
          label="Awaiting vendor"
          value={inReview}
          href="/admin/submissions?tab=queue"
        />
        <StatCard
          icon={Stack}
          label="Published apps"
          value={publishedAppsCount}
          href="/admin/apps"
        />
        <StatCard
          icon={ChartLineUp}
          label="Active vendors"
          value={activeVendors}
          href="/admin/apps"
        />
      </ul>

      <section className="mt-14">
        <header className="flex items-end justify-between gap-4 border-b border-[var(--color-line-strong)] pb-3">
          <h2 className="text-[13px] uppercase tracking-[0.22em] text-[var(--color-ink-2)]">
            Recent activity
          </h2>
          <Link
            href="/admin/submissions"
            prefetch
            className="group inline-flex items-center gap-1.5 text-[13px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
          >
            All activity
            <ArrowRight
              size={11}
              weight="bold"
              className="transition-transform duration-300 group-hover:translate-x-0.5"
            />
          </Link>
        </header>

        <ul className="divide-y divide-[var(--color-line)]">
          {recent.map((sub) => {
            const title =
              sub.productName && sub.productName.length > 0
                ? sub.productName
                : "—";
            const company = sub.submitterName ?? "—";
            return (
              <li key={sub.id}>
                <Link
                  href={`/admin/submissions/${sub.id}`}
                  prefetch
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4 transition-colors hover:bg-[var(--color-canvas-warm)]/40 md:grid-cols-[100px_1fr_auto_72px] md:gap-6 md:px-3"
                >
                  <span className="text-[13px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
                    {sub.type === "new" ? "New product" : "Claim"}
                  </span>
                  <div className="min-w-0">
                    <p className="font-heading text-[20px] leading-tight">
                      {title}
                    </p>
                    <p className="mt-0.5 truncate text-[14px] text-[var(--color-ink-3)]">
                      {company}
                    </p>
                  </div>
                  <StatusPill
                    status={mapStatusForPill(sub.status)}
                    className="hidden md:inline-flex"
                  />
                  <span className="num text-right text-[14px] text-[var(--color-ink-3)]">
                    {
                      relativeDays(sub.submittedAt.toISOString().slice(0, 10))
                        .label
                    }
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </Container>
  );
}

function mapStatusForPill(
  s:
    | "pending_review"
    | "in_review"
    | "changes_requested"
    | "published"
    | "edited_awaiting_vendor_approval"
    | "rejected",
): "pending" | "in-review" | "changes-requested" | "approved" | "rejected" {
  if (s === "pending_review") return "pending";
  if (s === "in_review") return "in-review";
  if (s === "edited_awaiting_vendor_approval") return "in-review";
  if (s === "changes_requested") return "changes-requested";
  if (s === "published") return "approved";
  return "rejected";
}

function StatCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{
    size?: number;
    weight?: "regular" | "bold" | "fill";
    className?: string;
  }>;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <li>
      <Link
        href={href}
        prefetch
        className="group flex h-full flex-col justify-between gap-6 bg-[var(--color-surface)] p-5 transition-colors hover:bg-[var(--color-canvas-warm)]/40 md:p-6"
      >
        <div className="flex items-center justify-between">
          <Icon
            size={18}
            weight="regular"
            className="text-[var(--color-ink-2)]"
          />
          <ArrowRight
            size={14}
            weight="regular"
            className="text-[var(--color-ink-3)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </div>
        <div>
          <p className="num font-heading text-[40px] leading-none tracking-tight md:text-[48px]">
            {String(value).padStart(2, "0")}
          </p>
          <p className="mt-2 text-[13px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
            {label}
          </p>
        </div>
      </Link>
    </li>
  );
}

function timeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}
