import type { Metadata } from "next";
import { Container } from "@/components/site/container";
import { getAdminSession } from "@/lib/auth/admin-session";
import {
  parseRange,
  resolveRange,
  getDailyPageViews,
  getInquiriesSeries,
  getInquiriesTotal,
} from "@/lib/queries/analytics";
import { MetricCard } from "@/components/admin/analytics/metric-card";
import { LineChart } from "@/components/admin/analytics/line-chart";
import { RangePicker } from "@/components/admin/analytics/range-picker";

export const metadata: Metadata = {
  title: "Admin · Analytics",
  alternates: { canonical: "/admin/analytics" },
  robots: { index: false, follow: false },
};

/**
 * /admin/analytics — A.6 PR 1.
 *
 * Currently wires only metric 4 (Inquiries) and metric 1 (Daily page
 * views), both using the LineChart primitive. The checkpoint PR
 * proves the chart aesthetic + range-picker mechanic before the
 * remaining six metrics layer in.
 *
 * All queries fire in parallel via Promise.all alongside the auth
 * check. Pure dynamic — no caching; admin-only page with 2 users.
 */
export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const range = parseRange(sp.range);
  const resolved = resolveRange(range);

  const [, dailyViews, inquiriesSeries, inquiriesTotal] = await Promise.all([
    getAdminSession(),
    getDailyPageViews(resolved),
    getInquiriesSeries(resolved),
    getInquiriesTotal(resolved),
  ]);

  return (
    <Container className="max-w-6xl py-12 md:py-16">
      <p className="text-[13px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
        Editorial admin
      </p>
      <div className="mt-4 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-heading text-[40px] leading-[1.04] tracking-tight md:text-[48px]">
            Analytics
          </h1>
          <p className="mt-3 max-w-[60ch] text-[16px] leading-relaxed text-[var(--color-ink-2)] md:text-[17px]">
            Directory-wide traffic, inquiries, and submission throughput.
            Updated live on every visit.
          </p>
        </div>
        <RangePicker active={range} />
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2 md:gap-6">
        <MetricCard
          eyebrow="Traffic"
          title="Daily page views"
          stat={dailyViews.reduce((sum, p) => sum + p.views, 0)}
          statSuffix={`views · ${rangeLabel(range)}`}
          isEmpty={dailyViews.length === 0}
          emptyMessage="No page views recorded in this range yet."
        >
          <LineChart
            points={dailyViews.map((p) => ({ day: p.day, value: p.views }))}
            label="page views"
          />
        </MetricCard>

        <MetricCard
          eyebrow="Inbound"
          title="Inquiries received"
          stat={inquiriesTotal}
          statSuffix={`inquiries · ${rangeLabel(range)}`}
          isEmpty={inquiriesSeries.length === 0}
          emptyMessage="No inquiries received in this range yet."
        >
          <LineChart
            points={inquiriesSeries.map((p) => ({
              day: p.day,
              value: p.inquiries,
            }))}
            label="inquiries"
          />
        </MetricCard>
      </div>

      <p className="mt-10 max-w-[60ch] text-[14px] leading-relaxed text-[var(--color-ink-3)]">
        Six more metrics land in follow-up: click-through rate per app,
        submission throughput, time-to-publish, vendor signup funnel, top
        most-viewed apps, and admin activity. This view ships the chart
        primitive + date range plumbing first.
      </p>
    </Container>
  );
}

function rangeLabel(range: "7d" | "30d" | "90d" | "all"): string {
  switch (range) {
    case "7d":
      return "last 7 days";
    case "30d":
      return "last 30 days";
    case "90d":
      return "last 90 days";
    case "all":
      return "all time";
  }
}
