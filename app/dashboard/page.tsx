import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  EnvelopeSimple,
  Stack,
  UserCircle,
  Plus,
} from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/site/container";
import { LetterAvatar } from "@/components/browse/letter-avatar";
import {
  getVendorSession,
  isDemoOverride,
} from "@/lib/auth/session";
import { listAppsForOwnerVendor } from "@/lib/queries/apps";
import { listMessagesForVendor } from "@/lib/queries/messages";
import {
  getMostRecentSubmissionForVendor,
  listPendingSubmissionsForVendor,
} from "@/lib/queries/submissions";
import { relativeDays } from "@/lib/browse/dates";
import { cn } from "@/lib/utils";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";
import { SubmissionEditedCard } from "@/components/dashboard/submission-edited-card";
import { SubmissionRejectedCard } from "@/components/dashboard/submission-rejected-card";

export const metadata: Metadata = {
  title: "Dashboard",
  alternates: { canonical: "/dashboard" },
};

export default async function DashboardOverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const asParam = Array.isArray(sp.as) ? sp.as[0] : sp.as;
  const demoOverride = isDemoOverride(asParam) ? asParam : undefined;

  // requireOnboarded defaults to true — implicit on dashboard pages.
  const { vendor, user } = await getVendorSession({ demoOverride });

  const [listings, mostRecentSubmission] = await Promise.all([
    listAppsForOwnerVendor(vendor.id),
    getMostRecentSubmissionForVendor(vendor.id),
  ]);
  const pendingSubmissions = listings.length === 0
    ? await listPendingSubmissionsForVendor(vendor.id)
    : [];

  // Phase A.2 PR 2 — top-of-dashboard lifecycle cards. Rendered for
  // both the empty-state branch and the main listings view so a
  // vendor with no published apps yet still sees the edited /
  // rejected status if their latest submission is in that state.
  const submissionCard = (() => {
    if (!mostRecentSubmission) return null;
    const productName =
      ((mostRecentSubmission.adminEdits as { name?: string } | null)
        ?.name as string | undefined) ??
      ((mostRecentSubmission.payload as { name?: string } | null)
        ?.name as string | undefined) ??
      "your product";
    if (mostRecentSubmission.status === "edited_awaiting_vendor_approval") {
      return (
        <SubmissionEditedCard
          submissionId={mostRecentSubmission.id}
          productName={productName}
          payload={
            mostRecentSubmission.payload as Record<string, unknown> | null
          }
          adminEdits={
            mostRecentSubmission.adminEdits as Record<string, unknown> | null
          }
        />
      );
    }
    if (mostRecentSubmission.status === "rejected") {
      return (
        <SubmissionRejectedCard
          submissionId={mostRecentSubmission.id}
          productName={productName}
          rejectionReason={
            mostRecentSubmission.rejectionReason ??
            "No reason provided. Reach out at team@allinfratech.com if you need clarification."
          }
        />
      );
    }
    return null;
  })();

  // Empty state: vendor exists but has neither published listings nor
  // anything pending in the queue (e.g. they just confirmed their
  // company but haven't started a submission yet). Render an inviting
  // dashboard rather than bouncing them away from a route they
  // explicitly navigated to — Phase B.2 PR 2 decision, was a redirect
  // pre-PR-2.
  if (listings.length === 0) {
    return (
      <>
        {submissionCard ? (
          <Container className="max-w-6xl pt-12 md:pt-16">
            {submissionCard}
          </Container>
        ) : null}
        <DashboardEmptyState
          firstName={user.name.split(" ")[0]}
          vendorName={vendor.name}
          pendingSubmissions={pendingSubmissions.map((s) => ({
            id: s.id,
            // listPendingSubmissionsForVendor already filters to
            // pending_review | in_review only — narrow the type here
            // so the empty-state component's prop contract holds.
            status: s.status as "pending_review" | "in_review",
            submittedAt: s.submittedAt,
            productName:
              (s.payload as { name?: string } | null)?.name ?? "Untitled product",
          }))}
        />
      </>
    );
  }

  // Perf pass 1 — derive unread from the message list rather than
  // firing a separate count query (the layout's header badge has
  // its own count). One round trip instead of two.
  const allMessages = await listMessagesForVendor(vendor.id);
  const unread = allMessages.reduce(
    (n, m) => (m.status === "unread" ? n + 1 : n),
    0,
  );
  const recent = allMessages.slice(0, 4);

  const firstName = user.name.split(" ")[0];
  const liveCount = listings.filter((l) => l.status === "published").length;
  const inReviewCount = listings.filter(
    (l) => l.status === "pending_review" || l.status === "changes_requested",
  ).length;

  return (
    <Container className="max-w-6xl py-12 md:py-16">
      {submissionCard}
      <p className="text-[14px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
        Vendor dashboard
      </p>
      <h1 className="mt-4 font-heading text-[40px] leading-[1.04] tracking-tight md:text-[56px]">
        Welcome back, {firstName}.
      </h1>
      <p className="mt-3 max-w-[60ch] text-[16px] leading-relaxed text-[var(--color-ink-2)] md:text-[17px]">
        {vendor.name}&rsquo;s account, at a glance. New inquiries and listing
        status sit here.
      </p>

      <Link
        href="/dashboard/company"
        prefetch
        className="group mt-5 inline-flex items-center gap-1.5 text-[13px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
      >
        Edit company profile
        <ArrowRight
          size={11}
          weight="bold"
          className="transition-transform duration-300 group-hover:translate-x-0.5"
        />
      </Link>

      <ul className="mt-10 grid grid-cols-1 gap-px border border-[var(--color-line-strong)] bg-[var(--color-line-strong)] sm:grid-cols-3">
        <StatCard
          icon={EnvelopeSimple}
          label="Unread inquiries"
          value={unread}
          href="/dashboard/messages"
          accent={unread > 0}
        />
        <StatCard
          icon={Stack}
          label="Listed products"
          value={liveCount}
          href="#listings"
        />
        <StatCard
          icon={UserCircle}
          label="In review"
          value={inReviewCount}
          href="#listings"
        />
      </ul>

      <section className="mt-14">
        <header className="flex items-end justify-between gap-4 border-b border-[var(--color-line-strong)] pb-3">
          <h2 className="text-[13px] uppercase tracking-[0.22em] text-[var(--color-ink-2)]">
            Recent inquiries
          </h2>
          <Link
            href="/dashboard/messages"
            prefetch
            className="group inline-flex items-center gap-1.5 text-[13px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
          >
            View all
            <ArrowRight
              size={11}
              weight="bold"
              className="transition-transform duration-300 group-hover:translate-x-0.5"
            />
          </Link>
        </header>

        {recent.length === 0 ? (
          <p className="mt-6 text-[16px] text-[var(--color-ink-3)]">
            No inquiries yet.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-line)]">
            {recent.map((msg) => (
              <li key={msg.id}>
                <Link
                  href={`/dashboard/messages/${msg.id}`}
                  prefetch
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4 transition-colors hover:bg-[var(--color-canvas-warm)]/40 md:grid-cols-[auto_1fr_auto_88px] md:gap-6 md:px-3"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      msg.status === "unread"
                        ? "bg-[var(--color-coral)]"
                        : "bg-[var(--color-line-strong)]",
                    )}
                  />
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-[17px] leading-tight",
                        msg.status === "unread"
                          ? "text-[var(--color-ink)]"
                          : "text-[var(--color-ink-2)]",
                      )}
                    >
                      {msg.subject}
                    </p>
                    <p className="mt-0.5 truncate text-[14px] text-[var(--color-ink-3)]">
                      {msg.senderName}
                      {msg.senderCompany ? ` · ${msg.senderCompany}` : ""} ·{" "}
                      <span className="text-[var(--color-coral)]">
                        {msg.appName}
                      </span>
                    </p>
                  </div>
                  <span className="hidden text-[13px] uppercase tracking-[0.18em] text-[var(--color-ink-3)] md:inline">
                    {msg.senderRole ?? ""}
                  </span>
                  <span className="num text-right text-[13px] text-[var(--color-ink-3)]">
                    {
                      relativeDays(msg.createdAt.toISOString().slice(0, 10))
                        .label
                    }
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="listings" className="mt-14 scroll-mt-24">
        <header className="flex items-end justify-between gap-4 border-b border-[var(--color-line-strong)] pb-3">
          <h2 className="text-[13px] uppercase tracking-[0.22em] text-[var(--color-ink-2)]">
            Your listings
          </h2>
          <Link
            href="/dashboard/onboarding/submit?as=returning"
            prefetch
            className="group inline-flex items-center gap-1.5 text-[13px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
          >
            <Plus size={11} weight="bold" />
            Add another product
          </Link>
        </header>

        <ul className="divide-y divide-[var(--color-line)]">
          {listings.map((listing) => (
            <li
              key={listing.slug}
              className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 py-5 md:gap-6 md:px-3"
            >
              <LetterAvatar name={listing.name} className="h-10 w-10" />
              <div className="min-w-0">
                <p className="font-heading text-[22px] leading-tight">
                  {listing.name}
                </p>
                <p className="mt-0.5 text-[13px] uppercase tracking-[0.18em] text-[var(--color-ink-3)]">
                  Listed{" "}
                  <span className="num">
                    {
                      relativeDays(
                        (listing.publishedAt ?? listing.createdAt)
                          .toISOString()
                          .slice(0, 10),
                      ).label
                    }
                  </span>
                </p>
              </div>
              {listing.status === "published" ? (
                <Link
                  href={`/dashboard/products/${listing.id}/edit`}
                  prefetch
                  className="group inline-flex items-center gap-1.5 text-[13px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
                >
                  Edit
                  <ArrowRight
                    size={11}
                    weight="bold"
                    className="transition-transform duration-300 group-hover:translate-x-0.5"
                  />
                </Link>
              ) : (
                <span />
              )}
              <StatusBadge status={listing.status} />
            </li>
          ))}
        </ul>
      </section>
    </Container>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  href,
  accent,
}: {
  icon: React.ComponentType<{
    size?: number;
    weight?: "regular" | "bold" | "fill";
    className?: string;
  }>;
  label: string;
  value: number;
  href: string;
  accent?: boolean;
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
            className={cn(
              accent ? "text-[var(--color-coral)]" : "text-[var(--color-ink-2)]",
            )}
          />
          <ArrowRight
            size={14}
            weight="regular"
            className="text-[var(--color-ink-3)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </div>
        <div>
          <p
            className={cn(
              "num font-heading text-[40px] leading-none tracking-tight md:text-[48px]",
              accent ? "text-[var(--color-coral)]" : "text-[var(--color-ink)]",
            )}
          >
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

function StatusBadge({
  status,
}: {
  status:
    | "draft"
    | "pending_review"
    | "published"
    | "changes_requested"
    | "rejected"
    | "unpublished";
}) {
  const config: Record<
    typeof status,
    { label: string; className: string }
  > = {
    published: {
      label: "Live",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-300",
    },
    pending_review: {
      label: "In review",
      className:
        "bg-[var(--color-coral)]/10 text-[var(--color-coral)] ring-[var(--color-coral)]/40",
    },
    changes_requested: {
      label: "Changes requested",
      className: "bg-amber-50 text-amber-700 ring-amber-300",
    },
    draft: {
      label: "Draft",
      className: "bg-[var(--color-canvas-warm)] text-[var(--color-ink-2)] ring-[var(--color-line-strong)]",
    },
    rejected: {
      label: "Rejected",
      className: "bg-rose-50 text-rose-700 ring-rose-300",
    },
    unpublished: {
      label: "Unpublished",
      className: "bg-slate-50 text-slate-600 ring-slate-300",
    },
  };
  const c = config[status];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[13px] uppercase tracking-[0.18em] ring-1",
        c.className,
      )}
    >
      {c.label}
    </span>
  );
}
