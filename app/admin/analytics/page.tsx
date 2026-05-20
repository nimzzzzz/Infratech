import type { Metadata } from "next";
import { Container } from "@/components/site/container";
import { getAdminSession } from "@/lib/auth/admin-session";
import {
  parseRange,
  resolveRange,
  getDailyPageViews,
  getInquiriesSeries,
  getInquiriesTotal,
  getSubmissionsThroughput,
  getTimeToPublishHistogram,
  getTopViewedApps,
  getOutboundCtrPerApp,
  getSignupFunnel,
  getAdminActivity,
  TIME_TO_PUBLISH_BUCKET_ORDER,
  type Range,
  type SubmissionStatusKey,
  type TimeToPublishBucket,
} from "@/lib/queries/analytics";
import { MetricCard } from "@/components/admin/analytics/metric-card";
import { LineChart } from "@/components/admin/analytics/line-chart";
import {
  BarChart,
  BarChartLegend,
  STACKED_PALETTE,
  type Bar,
} from "@/components/admin/analytics/bar-chart";
import { RangePicker } from "@/components/admin/analytics/range-picker";
import { TopAppsList } from "@/components/admin/analytics/top-apps-list";
import { CtrTable } from "@/components/admin/analytics/ctr-table";
import { FunnelList } from "@/components/admin/analytics/funnel-list";

export const metadata: Metadata = {
  title: "Admin · Analytics",
  alternates: { canonical: "/admin/analytics" },
  robots: { index: false, follow: false },
};

/**
 * /admin/analytics — A.6 PR 1. All 8 metrics.
 *
 * Six metrics consume the range param (1 daily views, 4 inquiries,
 * 5 throughput, 6 time-to-publish, 2 top apps, 3 CTR). Two ignore
 * it (7 funnel — state snapshot; 8 admin activity — fixed 14-day
 * window).
 *
 * All queries fire in parallel alongside the auth check. Pure
 * dynamic — no caching.
 */
export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const range = parseRange(sp.range);
  const resolved = resolveRange(range);

  const [
    ,
    dailyViews,
    inquiriesSeries,
    inquiriesTotal,
    throughput,
    timeToPublish,
    topApps,
    ctrRows,
    funnel,
    adminActivity,
  ] = await Promise.all([
    getAdminSession(),
    getDailyPageViews(resolved),
    getInquiriesSeries(resolved),
    getInquiriesTotal(resolved),
    getSubmissionsThroughput(resolved),
    getTimeToPublishHistogram(resolved),
    getTopViewedApps(resolved),
    getOutboundCtrPerApp(resolved),
    getSignupFunnel(),
    getAdminActivity(),
  ]);

  // ── Build chart data ────────────────────────────────────────────
  const throughputBars = buildThroughputBars(throughput);
  const throughputLegend = buildThroughputLegend(throughputBars);
  const timeToPublishBars = buildTimeToPublishBars(timeToPublish);
  const adminActivityBars = buildAdminActivityBars(adminActivity);
  const adminActivityLegend = buildAdminActivityLegend(adminActivityBars);

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
            Directory-wide traffic, inquiries, submission throughput, and
            admin activity. Updated live on every visit.
          </p>
        </div>
        <RangePicker active={range} />
      </div>

      {/* Row 1 — traffic + inbound (charts) */}
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

      {/* Row 2 — submission lifecycle (throughput + time-to-publish) */}
      <div className="mt-6 grid gap-5 md:grid-cols-2 md:gap-6">
        <MetricCard
          eyebrow="Pipeline"
          title="Submissions throughput"
          stat={throughputBars.reduce(
            (sum, b) => sum + b.segments.reduce((s, sg) => s + sg.value, 0),
            0,
          )}
          statSuffix={`submissions · weekly · ${rangeLabel(range)}`}
          isEmpty={throughputBars.length === 0}
          emptyMessage="No submissions made in this range yet."
        >
          <BarChart bars={throughputBars} yAxisLabel="submissions throughput" />
          <BarChartLegend items={throughputLegend} />
        </MetricCard>

        <MetricCard
          eyebrow="Velocity"
          title="Time to publish"
          stat={timeToPublishBars.reduce(
            (sum, b) => sum + b.segments[0].value,
            0,
          )}
          statSuffix={`published · ${rangeLabel(range)}`}
          isEmpty={timeToPublishBars.every((b) => b.segments[0].value === 0)}
          emptyMessage="No submissions published in this range yet."
        >
          <BarChart bars={timeToPublishBars} yAxisLabel="time to publish" />
        </MetricCard>
      </div>

      {/* Row 3 — funnel (full-width — list, no chart) */}
      <div className="mt-6">
        <MetricCard
          eyebrow="Funnel"
          title="Vendor signup funnel"
          isEmpty={
            funnel.signedUp === 0 &&
            funnel.onboarded === 0 &&
            funnel.companyCreated === 0 &&
            funnel.hasPublishedApp === 0
          }
          emptyMessage="No vendor signups yet."
        >
          <p className="-mt-2 mb-4 text-[13px] text-[var(--color-ink-3)]">
            Current state across all time. Date range above does not apply
            to this funnel.
          </p>
          <FunnelList funnel={funnel} />
        </MetricCard>
      </div>

      {/* Row 4 — top apps + CTR */}
      <div className="mt-6 grid gap-5 md:grid-cols-2 md:gap-6">
        <MetricCard
          eyebrow="Engagement"
          title="Top 10 most-viewed apps"
          isEmpty={topApps.length === 0}
          emptyMessage="No app views recorded in this range yet."
        >
          <TopAppsList rows={topApps} />
        </MetricCard>

        <MetricCard
          eyebrow="Conversion"
          title="Outbound click-through"
          isEmpty={ctrRows.length === 0}
          emptyMessage="No clicks or views recorded for any published app in this range."
        >
          <CtrTable rows={ctrRows} />
        </MetricCard>
      </div>

      {/* Row 5 — admin activity (full-width, last 14 days, ignores range) */}
      <div className="mt-6">
        <MetricCard
          eyebrow="Operations"
          title="Admin activity"
          stat={adminActivityBars.reduce(
            (sum, b) => sum + b.segments.reduce((s, sg) => s + sg.value, 0),
            0,
          )}
          statSuffix="admin actions · last 14 days"
          isEmpty={adminActivityBars.length === 0}
          emptyMessage="No admin actions recorded in the last 14 days."
        >
          <p className="-mt-2 mb-4 text-[13px] text-[var(--color-ink-3)]">
            Per-day stack of admin actions (excluding system events).
            Fixed 14-day window — date range above does not apply.
          </p>
          <BarChart bars={adminActivityBars} yAxisLabel="admin activity" />
          <BarChartLegend items={adminActivityLegend} />
        </MetricCard>
      </div>
    </Container>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────

function rangeLabel(range: Range): string {
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

/**
 * Pivot the {week, status, n} row shape into stacked bars per week,
 * one segment per status. Status keys are colored from STACKED_PALETTE
 * in a stable order so the legend matches.
 */
function buildThroughputBars(
  rows: { week: string; status: SubmissionStatusKey; n: number }[],
): Bar[] {
  if (rows.length === 0) return [];

  // Status order — same as the enum but with the most-common ones
  // (pending_review, published, rejected) first so they get the
  // strongest palette slots.
  const STATUS_ORDER: SubmissionStatusKey[] = [
    "published",
    "pending_review",
    "edited_awaiting_vendor_approval",
    "rejected",
    "in_review",
    "changes_requested",
  ];

  const byWeek = new Map<string, Map<SubmissionStatusKey, number>>();
  for (const row of rows) {
    const inner = byWeek.get(row.week) ?? new Map();
    inner.set(row.status, row.n);
    byWeek.set(row.week, inner);
  }

  const weeks = Array.from(byWeek.keys()).sort();

  return weeks.map((week) => {
    const inner = byWeek.get(week) ?? new Map();
    const segments = STATUS_ORDER.flatMap((status, idx) => {
      const v = inner.get(status) ?? 0;
      if (v === 0) return [];
      return [
        {
          key: humanizeStatus(status),
          value: v,
          color: STACKED_PALETTE[idx % STACKED_PALETTE.length],
        },
      ];
    });
    return {
      label: formatWeekShort(week),
      tooltipLabel: `Week of ${formatWeekLong(week)}`,
      segments,
    };
  });
}

function buildThroughputLegend(bars: Bar[]): { key: string; color: string }[] {
  const seen = new Map<string, string>();
  for (const bar of bars) {
    for (const seg of bar.segments) {
      if (!seen.has(seg.key)) {
        seen.set(seg.key, seg.color ?? "var(--color-coral)");
      }
    }
  }
  return Array.from(seen.entries()).map(([key, color]) => ({ key, color }));
}

function buildTimeToPublishBars(rows: { bucket: string; n: number }[]): Bar[] {
  const lookup = new Map(rows.map((r) => [r.bucket, r.n]));
  return TIME_TO_PUBLISH_BUCKET_ORDER.map((b: TimeToPublishBucket) => ({
    label: b,
    segments: [{ key: b, value: lookup.get(b) ?? 0 }],
  }));
}

function buildAdminActivityBars(
  rows: { day: string; action: string; n: number }[],
): Bar[] {
  if (rows.length === 0) return [];

  const byDay = new Map<string, Map<string, number>>();
  const actionsSeen = new Set<string>();
  for (const row of rows) {
    const inner = byDay.get(row.day) ?? new Map();
    inner.set(row.action, row.n);
    byDay.set(row.day, inner);
    actionsSeen.add(row.action);
  }

  // Stable action order — first time we see an action gets the
  // earliest palette slot. Sort actions by total descending so the
  // legend's top entry is the most common action.
  const totals = new Map<string, number>();
  for (const action of actionsSeen) {
    let t = 0;
    for (const inner of byDay.values()) t += inner.get(action) ?? 0;
    totals.set(action, t);
  }
  const orderedActions = Array.from(actionsSeen).sort(
    (a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0),
  );
  const actionColor = new Map<string, string>();
  orderedActions.forEach((action, idx) => {
    actionColor.set(action, STACKED_PALETTE[idx % STACKED_PALETTE.length]);
  });

  const days = Array.from(byDay.keys()).sort();

  return days.map((day) => {
    const inner = byDay.get(day) ?? new Map();
    const segments = orderedActions.flatMap((action) => {
      const v = inner.get(action) ?? 0;
      if (v === 0) return [];
      return [
        {
          key: action,
          value: v,
          color: actionColor.get(action) ?? "var(--color-coral)",
        },
      ];
    });
    return {
      label: formatDayShort(day),
      tooltipLabel: formatDayLong(day),
      segments,
    };
  });
}

function buildAdminActivityLegend(
  bars: Bar[],
): { key: string; color: string }[] {
  const seen = new Map<string, string>();
  for (const bar of bars) {
    for (const seg of bar.segments) {
      if (!seen.has(seg.key)) {
        seen.set(seg.key, seg.color ?? "var(--color-coral)");
      }
    }
  }
  return Array.from(seen.entries()).map(([key, color]) => ({ key, color }));
}

function humanizeStatus(status: SubmissionStatusKey): string {
  switch (status) {
    case "pending_review":
      return "Pending review";
    case "in_review":
      return "In review";
    case "changes_requested":
      return "Changes requested";
    case "published":
      return "Published";
    case "edited_awaiting_vendor_approval":
      return "Awaiting vendor";
    case "rejected":
      return "Rejected";
  }
}

function formatWeekShort(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatWeekLong(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatDayShort(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatDayLong(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
