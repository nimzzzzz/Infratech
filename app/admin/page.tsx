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

/**
 * Minimal projection of the real submission payload shape written by
 * /api/submissions (Phase B.2 PR 2). The page reads only `name` for
 * the recent-activity title; everything else comes off the joined
 * submission row. We project loosely (all fields optional) so a
 * malformed payload doesn't crash render.
 */
type SubmissionPayload = {
  name?: string;
  slug?: string;
};

export const metadata: Metadata = {
  title: "Admin · Overview",
  alternates: { canonical: "/admin" },
};

export default async function AdminOverviewPage() {
  const { user } = await getAdminSession();
  const firstName = user.name.split(" ")[0];

  const [pendingRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(submissions)
    .where(eq(submissions.status, "pending_review"));
  const [inReviewRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(submissions)
    .where(eq(submissions.status, "edited_awaiting_vendor_approval"));
  const [publishedAppsRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(apps)
    .where(eq(apps.status, "published"));
  const [vendorsRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(vendors)
    .where(eq(vendors.suspended, false));

  const pending = pendingRow?.n ?? 0;
  const inReview = inReviewRow?.n ?? 0;
  const publishedAppsCount = publishedAppsRow?.n ?? 0;
  const activeVendors = vendorsRow?.n ?? 0;

  const recentSubs = await listSubmissions();
  const recent = recentSubs.slice(0, 6);

  // Pull payload for each visible row so we can show the product
  // title. The previous implementation read this as the legacy
  // MockSubmission shape (`p.submitter.companyName`, `p.app.name`,
  // discriminated on `p.type`) which crashed once production had its
  // first real /api/submissions row — real payloads are flat
  // (see /api/submissions/route.ts:254). Phase A.2 will replace this
  // ad-hoc projection with a proper submissions-list query that
  // returns typed rows.
  const payloads = await db
    .select({ id: submissions.id, payload: submissions.payload })
    .from(submissions);
  const payloadById = new Map(
    payloads.map((row) => [row.id, row.payload as SubmissionPayload | null]),
  );

  return (
    <Container className="max-w-6xl py-12 md:py-16">
      <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
        Editorial admin
      </p>
      <h1 className="mt-4 font-heading text-[36px] leading-[1.04] tracking-tight md:text-[52px]">
        Good {timeOfDay()}, {firstName}.
      </h1>
      <p className="mt-3 max-w-[60ch] text-[14px] leading-relaxed text-[var(--color-ink-2)] md:text-[15px]">
        <span className="num text-[var(--color-ink)]">{pending}</span> new
        submissions waiting on you.{" "}
        <Link
          href="/admin/submissions"
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
          <h2 className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-2)]">
            Recent activity
          </h2>
          <Link
            href="/admin/submissions"
            className="group inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
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
            const p = payloadById.get(sub.id);
            const title =
              typeof p?.name === "string" && p.name.length > 0 ? p.name : "—";
            const company = sub.submitterName ?? "—";
            return (
              <li key={sub.id}>
                <Link
                  href={`/admin/submissions/${sub.id}`}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4 transition-colors hover:bg-[var(--color-canvas-warm)]/40 md:grid-cols-[100px_1fr_auto_72px] md:gap-6 md:px-3"
                >
                  <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
                    {sub.type === "new" ? "New product" : "Claim"}
                  </span>
                  <div className="min-w-0">
                    <p className="font-heading text-[18px] leading-tight">
                      {title}
                    </p>
                    <p className="mt-0.5 truncate text-[12px] text-[var(--color-ink-3)]">
                      {company}
                    </p>
                  </div>
                  <StatusPill
                    status={mapStatusForPill(sub.status)}
                    className="hidden md:inline-flex"
                  />
                  <span className="num text-right text-[12px] text-[var(--color-ink-3)]">
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
          <p className="num font-heading text-[36px] leading-none tracking-tight md:text-[44px]">
            {String(value).padStart(2, "0")}
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
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
