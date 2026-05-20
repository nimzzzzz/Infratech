import { describe, it, expect, beforeEach } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { listAuditEntries } from "@/lib/queries/audit-log";

/**
 * Audit-log query tests. A.6 PR 2.
 *
 * Run against the tests/setup/db-tx.ts transaction-rollback fixture
 * so seed state survives between cases and inserts are isolated.
 *
 * The most load-bearing test here is the GDPR redaction lock —
 * regardless of what's persisted in the DB row, listAuditEntries
 * must return before === null AND after === null for any
 * vendor_member.gdpr_delete row. Defense-in-depth.
 */

let actorId: number;

beforeEach(async () => {
  // Insert a fresh admin actor inside the transaction so its id is
  // predictable and unique per test. Rollback wipes it cleanly.
  const [row] = await db.execute<{ id: number }>(sql`
    INSERT INTO vendor_members
      (clerk_user_id, name, primary_email, onboarded, is_admin)
    VALUES
      ('test_audit_actor_${sql.raw(String(Date.now()))}',
       'Audit Test Admin',
       'audit_test@admin.test',
       true,
       true)
    RETURNING id
  `);
  actorId = row.id;
});

// ── Sort + default exclusion ───────────────────────────────────────

describe("listAuditEntries — sort + default system-row exclusion", () => {
  it("returns rows sorted by created_at DESC (newest first)", async () => {
    // Insert two rows with explicit timestamps, older first.
    await db.execute(sql`
      INSERT INTO audit_log
        (admin_id, actor_vendor_member_id, action, target_type, target_id, before, after, created_at)
      VALUES (NULL, ${actorId}, 'test.older', 'vendor', '1', NULL, NULL, NOW() - INTERVAL '2 minutes')
    `);
    await db.execute(sql`
      INSERT INTO audit_log
        (admin_id, actor_vendor_member_id, action, target_type, target_id, before, after, created_at)
      VALUES (NULL, ${actorId}, 'test.newer', 'vendor', '2', NULL, NULL, NOW() - INTERVAL '1 minute')
    `);

    const rows = await listAuditEntries({ limit: 100 });

    // Both rows must appear, with the newer one positioned earlier.
    const newerIdx = rows.findIndex((r) => r.action === "test.newer");
    const olderIdx = rows.findIndex((r) => r.action === "test.older");
    expect(newerIdx).toBeGreaterThanOrEqual(0);
    expect(olderIdx).toBeGreaterThanOrEqual(0);
    expect(newerIdx).toBeLessThan(olderIdx);
  });

  it("limit parameter respects the [1, 100] cap", async () => {
    const rows30 = await listAuditEntries({ limit: 30 });
    const rows100 = await listAuditEntries({ limit: 100 });
    expect(rows30.length).toBeLessThanOrEqual(30);
    expect(rows100.length).toBeLessThanOrEqual(100);
    // An out-of-range limit should be clamped (200 → 100).
    const rowsClamped = await listAuditEntries({ limit: 200 });
    expect(rowsClamped.length).toBeLessThanOrEqual(100);
  });

  it("excludes system rows (actor_vendor_member_id IS NULL) by default", async () => {
    await db.execute(sql`
      INSERT INTO audit_log
        (admin_id, actor_vendor_member_id, action, target_type, target_id, before, after, created_at)
      VALUES (NULL, NULL, 'test.system_marker', 'vendor', '99', NULL, NULL, NOW())
    `);
    const rows = await listAuditEntries({ limit: 100 });
    const system = rows.find((r) => r.action === "test.system_marker");
    expect(system).toBeUndefined();
  });

  it("includes system rows when includeSystem: true is passed", async () => {
    await db.execute(sql`
      INSERT INTO audit_log
        (admin_id, actor_vendor_member_id, action, target_type, target_id, before, after, created_at)
      VALUES (NULL, NULL, 'test.system_marker_2', 'vendor', '99', NULL, NULL, NOW())
    `);
    const rows = await listAuditEntries({ limit: 100, includeSystem: true });
    const system = rows.find((r) => r.action === "test.system_marker_2");
    expect(system).toBeDefined();
    expect(system!.actorVendorMemberId).toBeNull();
    expect(system!.actorName).toBeNull();
  });
});

// ── GDPR redaction lock ────────────────────────────────────────────

describe("listAuditEntries — GDPR redaction (load-bearing)", () => {
  it("nulls before AND after for vendor_member.gdpr_delete rows regardless of what was seeded", async () => {
    // Seed a GDPR row WITH PII deliberately in before + after.
    // The query layer must scrub both.
    await db.execute(sql`
      INSERT INTO audit_log
        (admin_id, actor_vendor_member_id, action, target_type, target_id, before, after, created_at)
      VALUES (
        NULL, NULL, 'vendor_member.gdpr_delete', 'vendor_member', '12345',
        ${sql.raw(
          `'${JSON.stringify({
            name: "Jane Doe",
            primaryEmail: "jane@example.com",
            sensitiveField: "DO NOT SURFACE",
          })}'::jsonb`,
        )},
        ${sql.raw(
          `'${JSON.stringify({
            anotherSensitive: "ALSO DO NOT SURFACE",
          })}'::jsonb`,
        )},
        NOW()
      )
    `);

    const rows = await listAuditEntries({ limit: 100, includeSystem: true });
    const gdpr = rows.find(
      (r) => r.action === "vendor_member.gdpr_delete" && r.targetId === "12345",
    );
    expect(gdpr).toBeDefined();
    expect(gdpr!.before).toBeNull();
    expect(gdpr!.after).toBeNull();

    // Defense-in-depth: serialise the row and verify no PII leaked
    // through any path (including the actorName/actorEmail join,
    // which is fine since the actor is NULL for system rows).
    const serialised = JSON.stringify(gdpr);
    expect(serialised).not.toMatch(/Jane Doe/);
    expect(serialised).not.toMatch(/jane@example\.com/);
    expect(serialised).not.toMatch(/DO NOT SURFACE/);
  });

  it("preserves before/after for non-GDPR actions", async () => {
    const before = { suspended: false };
    const after = { suspended: true, reason: "Spam content" };
    await db.execute(sql`
      INSERT INTO audit_log
        (admin_id, actor_vendor_member_id, action, target_type, target_id, before, after, created_at)
      VALUES (
        NULL, ${actorId}, 'vendor.suspend', 'vendor', '777',
        ${sql.raw(`'${JSON.stringify(before)}'::jsonb`)},
        ${sql.raw(`'${JSON.stringify(after)}'::jsonb`)},
        NOW()
      )
    `);
    const rows = await listAuditEntries({ limit: 100 });
    const suspend = rows.find(
      (r) => r.action === "vendor.suspend" && r.targetId === "777",
    );
    expect(suspend).toBeDefined();
    expect(suspend!.before).toEqual(before);
    expect(suspend!.after).toEqual(after);
  });
});
