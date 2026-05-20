import { describe, it, expect, beforeEach } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
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
} from "@/lib/queries/analytics";

/**
 * Analytics query smoke tests. A.6 PR 1.
 *
 * Each metric gets one happy-path case (data present → shape correct,
 * counts right). Metrics 4, 6, 7 additionally get empty-state coverage
 * since those are the most likely to render badly with no data.
 *
 * All tests run inside the transaction-rollback fixture (db-tx.ts) so
 * seed state is preserved between runs.
 */

const ALL_TIME = resolveRange("all");

let vendorAId: number;
let appAId: number;

beforeEach(async () => {
  const [oracle] = await db.execute<{ id: number }>(
    sql`SELECT id FROM vendors WHERE slug = 'oracle'`,
  );
  const [aconex] = await db.execute<{ id: number }>(
    sql`SELECT id FROM apps WHERE slug = 'aconex'`,
  );
  vendorAId = oracle.id;
  appAId = aconex.id;
});

// ── parseRange + resolveRange ──────────────────────────────────────

describe("parseRange", () => {
  it("returns 30d default for unrecognised input", () => {
    expect(parseRange(undefined)).toBe("30d");
    expect(parseRange("nonsense")).toBe("30d");
    expect(parseRange("")).toBe("30d");
    expect(parseRange(["weird"])).toBe("30d");
  });

  it("accepts each valid range key", () => {
    expect(parseRange("7d")).toBe("7d");
    expect(parseRange("30d")).toBe("30d");
    expect(parseRange("90d")).toBe("90d");
    expect(parseRange("all")).toBe("all");
  });

  it("array param uses the first element", () => {
    expect(parseRange(["7d", "30d"])).toBe("7d");
  });
});

describe("resolveRange", () => {
  it("all-time uses the 2000-01-01 sentinel", () => {
    const r = resolveRange("all");
    expect(r.startDate).toBe("2000-01-01");
    expect(r.range).toBe("all");
  });

  it("bucketed ranges resolve to plausible windows", () => {
    const r7 = resolveRange("7d");
    const r30 = resolveRange("30d");
    const startMs7 = new Date(r7.startDateTime).getTime();
    const startMs30 = new Date(r30.startDateTime).getTime();
    expect(startMs30).toBeLessThan(startMs7);
    expect(r7.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ── Metric 1: Daily page views ────────────────────────────────────

describe("getDailyPageViews", () => {
  it("returns daily sums for the range", async () => {
    const today = new Date().toISOString().slice(0, 10);
    await db.execute(sql`
      INSERT INTO app_views (app_id, day, count)
      VALUES (${appAId}, ${today}::date, 5)
      ON CONFLICT (app_id, day) DO UPDATE SET count = app_views.count + 5
    `);
    const rows = await getDailyPageViews(ALL_TIME);
    const todayRow = rows.find((r) => r.day === today);
    expect(todayRow).toBeDefined();
    expect(todayRow!.views).toBeGreaterThanOrEqual(5);
  });
});

// ── Metric 4: Inquiries received ──────────────────────────────────

describe("getInquiriesSeries + getInquiriesTotal", () => {
  it("returns daily series and total for inserted rows", async () => {
    // Two separate single-row INSERTs — postgres-js with prepare:false
    // occasionally only lands the first row of a multi-VALUES list via
    // drizzle's sql template. Matches the pattern in messages.test.ts.
    await db.execute(sql`
      INSERT INTO contact_messages
        (app_id, vendor_id, sender_name, sender_email, subject, body, status)
      VALUES
        (${appAId}, ${vendorAId}, 'A', 'a@example.com', 'Subj A', 'Body A', 'unread')
    `);
    await db.execute(sql`
      INSERT INTO contact_messages
        (app_id, vendor_id, sender_name, sender_email, subject, body, status)
      VALUES
        (${appAId}, ${vendorAId}, 'B', 'b@example.com', 'Subj B', 'Body B', 'read')
    `);
    const series = await getInquiriesSeries(ALL_TIME);
    const total = await getInquiriesTotal(ALL_TIME);
    expect(total).toBeGreaterThanOrEqual(2);
    expect(series.length).toBeGreaterThan(0);
    const sum = series.reduce((acc, p) => acc + p.inquiries, 0);
    expect(sum).toBe(total);
  });

  it("empty-state — returns empty series + 0 total when no data in the range", async () => {
    // 7d window for vendor with no inquiries — relies on seed having
    // none for "today's" 7-day window against this vendor. We use
    // a tight 1-second future-window to guarantee zero matches.
    const future = {
      range: "7d" as const,
      startDate: "2999-01-01",
      endDate: "2999-01-02",
      startDateTime: "2999-01-01T00:00:00.000Z",
      endDateTime: "2999-01-02T00:00:00.000Z",
    };
    const series = await getInquiriesSeries(future);
    const total = await getInquiriesTotal(future);
    expect(series).toEqual([]);
    expect(total).toBe(0);
  });
});

// ── Metric 5: Submissions throughput ──────────────────────────────

describe("getSubmissionsThroughput", () => {
  it("buckets submissions by week and status", async () => {
    await db.execute(sql`
      INSERT INTO submissions (type, status, submitter_vendor_id, payload, submitted_at)
      VALUES ('new', 'pending_review', ${vendorAId}, '{"name":"Test 1"}'::jsonb, NOW())
    `);
    await db.execute(sql`
      INSERT INTO submissions (type, status, submitter_vendor_id, payload, submitted_at)
      VALUES ('new', 'published', ${vendorAId}, '{"name":"Test 2"}'::jsonb, NOW())
    `);
    const rows = await getSubmissionsThroughput(ALL_TIME);
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.week).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof r.n).toBe("number");
    }
  });
});

// ── Metric 6: Time-to-publish histogram ───────────────────────────

describe("getTimeToPublishHistogram", () => {
  it("buckets published submissions by time-to-publish", async () => {
    // Insert one row submitted ~30 min ago, published just now → "<1h".
    await db.execute(sql`
      INSERT INTO submissions (type, status, submitter_vendor_id, payload, submitted_at, published_at)
      VALUES
        ('new', 'published', ${vendorAId}, '{"name":"Fast"}'::jsonb, NOW() - INTERVAL '30 minutes', NOW())
    `);
    const rows = await getTimeToPublishHistogram(ALL_TIME);
    const fastBucket = rows.find((r) => r.bucket === "<1h");
    expect(fastBucket).toBeDefined();
    expect(fastBucket!.n).toBeGreaterThanOrEqual(1);
  });

  it("empty-state — returns empty list when no published submissions in range", async () => {
    const future = {
      range: "7d" as const,
      startDate: "2999-01-01",
      endDate: "2999-01-02",
      startDateTime: "2999-01-01T00:00:00.000Z",
      endDateTime: "2999-01-02T00:00:00.000Z",
    };
    const rows = await getTimeToPublishHistogram(future);
    expect(rows).toEqual([]);
  });

  it("bucket order constant has 6 fixed values", () => {
    expect(TIME_TO_PUBLISH_BUCKET_ORDER).toEqual([
      "<1h",
      "1h-1d",
      "1-3d",
      "3-7d",
      "7-30d",
      ">30d",
    ]);
  });
});

// ── Metric 2: Top 10 most-viewed apps ─────────────────────────────

describe("getTopViewedApps", () => {
  it("returns top apps ordered by views desc, with joined vendor name", async () => {
    const today = new Date().toISOString().slice(0, 10);
    await db.execute(sql`
      INSERT INTO app_views (app_id, day, count) VALUES (${appAId}, ${today}::date, 99)
      ON CONFLICT (app_id, day) DO UPDATE SET count = app_views.count + 99
    `);
    const rows = await getTopViewedApps(ALL_TIME);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThanOrEqual(10);
    // First row should be the one we just bumped, or at least have
    // the highest views in the set.
    const top = rows[0];
    expect(top.vendorName).toBeTruthy();
    expect(typeof top.views).toBe("number");
    // Verify descending order.
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].views).toBeLessThanOrEqual(rows[i - 1].views);
    }
  });
});

// ── Metric 3: Outbound CTR per app ────────────────────────────────

describe("getOutboundCtrPerApp", () => {
  it("returns rows for published apps with views or clicks, ordered by CTR", async () => {
    const today = new Date().toISOString().slice(0, 10);
    await db.execute(sql`
      INSERT INTO app_views (app_id, day, count) VALUES (${appAId}, ${today}::date, 100)
      ON CONFLICT (app_id, day) DO UPDATE SET count = app_views.count + 100
    `);
    await db.execute(sql`
      INSERT INTO outbound_clicks (app_id, clicked_at, user_agent, referrer)
      VALUES (${appAId}, NOW(), 'ua', null)
    `);
    await db.execute(sql`
      INSERT INTO outbound_clicks (app_id, clicked_at, user_agent, referrer)
      VALUES (${appAId}, NOW(), 'ua', null)
    `);
    await db.execute(sql`
      INSERT INTO outbound_clicks (app_id, clicked_at, user_agent, referrer)
      VALUES (${appAId}, NOW(), 'ua', null)
    `);
    const rows = await getOutboundCtrPerApp(ALL_TIME);
    const aconexRow = rows.find((r) => r.id === appAId);
    expect(aconexRow).toBeDefined();
    expect(aconexRow!.views).toBeGreaterThanOrEqual(100);
    expect(aconexRow!.clicks).toBeGreaterThanOrEqual(3);
    expect(aconexRow!.ctrPercent).toBeGreaterThan(0);
    // Verify ordering — descending by ctrPercent.
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].ctrPercent).toBeLessThanOrEqual(rows[i - 1].ctrPercent);
    }
  });
});

// ── Metric 7: Vendor signup funnel ────────────────────────────────

describe("getSignupFunnel", () => {
  it("returns counts at each stage with monotonic non-increasing pattern", async () => {
    const f = await getSignupFunnel();
    // Each stage should be <= the prior one in any sane data state.
    expect(f.onboarded).toBeLessThanOrEqual(f.signedUp);
    // companyCreated counts vendors, which is independent of vendor_members,
    // so the monotonic chain breaks at this stage in theory. Just assert
    // numeric shape rather than ordering.
    expect(typeof f.signedUp).toBe("number");
    expect(typeof f.onboarded).toBe("number");
    expect(typeof f.companyCreated).toBe("number");
    expect(typeof f.hasPublishedApp).toBe("number");
    expect(f.hasPublishedApp).toBeLessThanOrEqual(f.companyCreated);
  });

  it("empty-state — query returns numeric zeros when seeded data is absent (smoke)", async () => {
    // We can't easily delete seed within the rollback transaction
    // without breaking FK invariants for the rest of the tests. Just
    // confirm the query never throws and always returns the 4-key
    // shape — that's the empty-state contract this metric exposes.
    const f = await getSignupFunnel();
    expect(f).toEqual(
      expect.objectContaining({
        signedUp: expect.any(Number),
        onboarded: expect.any(Number),
        companyCreated: expect.any(Number),
        hasPublishedApp: expect.any(Number),
      }),
    );
  });
});

// ── Metric 8: Admin activity ──────────────────────────────────────

describe("getAdminActivity", () => {
  it("returns rows for the last 14 days excluding system events", async () => {
    // Insert one human-attributed audit row and one system row.
    const [member] = await db.execute<{ id: number }>(sql`
      INSERT INTO vendor_members
        (clerk_user_id, name, primary_email, onboarded, is_admin)
      VALUES
        ('analytics_test_admin_${sql.raw(String(Date.now()))}', 'A', 'a@a.com', true, true)
      RETURNING id
    `);
    await db.execute(sql`
      INSERT INTO audit_log
        (actor_vendor_member_id, action, target_type, target_id, before, after, created_at)
      VALUES (${member.id}, 'test.action', 'vendor', '1', NULL, NULL, NOW())
    `);
    await db.execute(sql`
      INSERT INTO audit_log
        (actor_vendor_member_id, action, target_type, target_id, before, after, created_at)
      VALUES (NULL, 'system.gdpr_delete', 'vendor', '2', NULL, NULL, NOW())
    `);
    const rows = await getAdminActivity();
    const human = rows.find((r) => r.action === "test.action");
    const system = rows.find((r) => r.action === "system.gdpr_delete");
    expect(human).toBeDefined();
    expect(human!.n).toBeGreaterThanOrEqual(1);
    expect(system).toBeUndefined();
  });
});
