import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Tray,
  Stack,
  ChartLineUp,
  ClipboardText,
} from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/site/container";
import { StatusPill } from "@/components/admin/status-pill";
import { getMockAdmin } from "@/lib/auth/mock-admin";
import {
  queue,
  pendingCount,
  inReviewCount,
  publishedAppsCount,
} from "@/lib/data/admin-queue";
import { relativeDays } from "@/lib/browse/dates";

export const metadata: Metadata = {
  title: "Admin · Overview",
  alternates: { canonical: "/admin" },
};

export default function AdminOverviewPage() {
  const admin = getMockAdmin();
  const firstName = admin.name.split(" ")[0];
  const recent = [...queue]
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .slice(0, 6);

  return (
    <Container className="max-w-6xl py-12 md:py-16">
      <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
        &sect; Editorial admin
      </p>
      <h1 className="mt-4 font-heading text-[36px] leading-[1.04] tracking-tight md:text-[52px]">
        Good {timeOfDay()}, {firstName}.
      </h1>
      <p className="mt-3 max-w-[60ch] text-[14px] leading-relaxed text-[var(--color-ink-2)] md:text-[15px]">
        <span className="num text-[var(--color-ink)]">{pendingCount()}</span>{" "}
        new submissions waiting on you.{" "}
        <Link
          href="/admin/queue"
          className="underline underline-offset-4 hover:text-[var(--color-ink)]"
        >
          Open the queue &rarr;
        </Link>
      </p>

      {/* stats */}
      <ul className="mt-10 grid grid-cols-2 gap-px border border-[var(--color-line-strong)] bg-[var(--color-line-strong)] md:grid-cols-4">
        <StatCard
          icon={Tray}
          label="Pending"
          value={pendingCount()}
          href="/admin/queue?status=pending"
        />
        <StatCard
          icon={ClipboardText}
          label="In review"
          value={inReviewCount()}
          href="/admin/queue?status=in-review"
        />
        <StatCard
          icon={Stack}
          label="Published apps"
          value={publishedAppsCount()}
          href="/admin/apps"
        />
        <StatCard
          icon={ChartLineUp}
          label="Active vendors"
          value={3}
          href="/admin/apps"
          muted
        />
      </ul>

      {/* recent activity */}
      <section className="mt-14">
        <header className="flex items-end justify-between gap-4 border-b border-[var(--color-line-strong)] pb-3">
          <h2 className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-2)]">
            Recent activity
          </h2>
          <Link
            href="/admin/queue"
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
          {recent.map((sub) => (
            <li key={sub.id}>
              <Link
                href={`/admin/queue#${sub.id}`}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4 transition-colors hover:bg-[var(--color-canvas-warm)]/40 md:grid-cols-[100px_1fr_auto_72px] md:gap-6 md:px-3"
              >
                <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
                  {sub.type === "new" ? "New product" : "Claim"}
                </span>
                <div className="min-w-0">
                  <p className="font-heading text-[18px] leading-tight">
                    {sub.type === "new" ? sub.app.name : sub.claimAppName}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-[var(--color-ink-3)]">
                    {sub.submitter.name} &middot; {sub.submitter.companyName}
                  </p>
                </div>
                <StatusPill status={sub.status} className="hidden md:inline-flex" />
                <span className="num text-right text-[12px] text-[var(--color-ink-3)]">
                  {relativeDays(sub.submittedAt.slice(0, 10)).label}
                </span>
              </Link>
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
  muted,
}: {
  icon: React.ComponentType<{
    size?: number;
    weight?: "regular" | "bold" | "fill";
    className?: string;
  }>;
  label: string;
  value: number;
  href: string;
  muted?: boolean;
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
            {muted ? " (mocked)" : ""}
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
