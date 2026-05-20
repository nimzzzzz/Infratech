import "server-only";
import { sql, inArray, isNotNull, desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  vendors as vendorsTable,
  apps as appsTable,
  submissions as submissionsTable,
  vendorMembers as vendorMembersTable,
  auditLog,
} from "@/lib/db/schema";

/**
 * Admin audit-log queries. Phase A.6 PR 2 (pivoted scope —
 * rendered inline at the bottom of /admin/analytics rather than
 * via a standalone /admin/audit-log route).
 *
 * Read-only reads against `audit_log` with batched target
 * resolution. Always orders by `created_at DESC, id DESC` — never
 * configurable.
 *
 * GDPR-safe: `vendor_member.gdpr_delete` rows have their
 * before/after payloads scrubbed at THIS layer before they cross
 * the query boundary. The render layer (audit-entry-row) also
 * refuses to expand for that action (belt + braces) but the
 * canonical guarantee lives here.
 */

const GDPR_REDACTED_ACTIONS = new Set(["vendor_member.gdpr_delete"]);

// ── Row shape ──────────────────────────────────────────────────────

export type AuditLogRow = {
  id: number;
  action: string;
  targetType: string;
  targetId: string;
  /** GDPR-redacted to `null` for `vendor_member.gdpr_delete` rows. */
  before: unknown;
  /** GDPR-redacted to `null` for `vendor_member.gdpr_delete` rows. */
  after: unknown;
  createdAt: Date;
  /** null for system rows. */
  actorVendorMemberId: number | null;
  actorName: string | null;
  actorEmail: string | null;
  actorIsAdmin: boolean | null;
};

// ── Core list query ────────────────────────────────────────────────

/**
 * Fetch the N most-recent audit_log rows, newest first, joined to
 * vendor_members for actor display. The embedded /admin/analytics
 * "Recent activity" surface intentionally exposes only a 30/100
 * row-count toggle and an opt-in system-events toggle. For richer
 * filtering, query Neon directly.
 *
 * Caller's `limit` is clamped to [1, 100] to keep response bounded
 * even if a future caller passes an unbounded value.
 *
 * System rows (`actor_vendor_member_id IS NULL` — webhook events,
 * GDPR deletes, metadata-sync failures) are EXCLUDED by default;
 * pass `includeSystem: true` to surface them. Hiding by default
 * keeps the human-activity feed uncluttered for the common case.
 */
export async function listAuditEntries(opts: {
  limit: number;
  includeSystem?: boolean;
}): Promise<AuditLogRow[]> {
  const limit = Math.max(1, Math.min(100, Math.floor(opts.limit)));
  const includeSystem = opts.includeSystem === true;

  const rows = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      targetType: auditLog.targetType,
      targetId: auditLog.targetId,
      before: auditLog.before,
      after: auditLog.after,
      createdAt: auditLog.createdAt,
      actorVendorMemberId: auditLog.actorVendorMemberId,
      actorName: vendorMembersTable.name,
      actorEmail: vendorMembersTable.primaryEmail,
      actorIsAdmin: vendorMembersTable.isAdmin,
    })
    .from(auditLog)
    .leftJoin(
      vendorMembersTable,
      sql`${vendorMembersTable.id} = ${auditLog.actorVendorMemberId}`,
    )
    .where(includeSystem ? undefined : isNotNull(auditLog.actorVendorMemberId))
    .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
    .limit(limit);

  // GDPR redaction: scrub PII-bearing payloads BEFORE the row
  // crosses the function return boundary. The `before` payload of a
  // vendor_member.gdpr_delete row contains the deleted human's name
  // + email by design (the audit purpose is to record "we erased
  // this row"), but the viewer must never surface them — that
  // defeats the GDPR request.
  return rows.map((r) => {
    const isRedacted = GDPR_REDACTED_ACTIONS.has(r.action);
    return {
      id: r.id,
      action: r.action,
      targetType: r.targetType,
      targetId: r.targetId,
      before: isRedacted ? null : r.before,
      after: isRedacted ? null : r.after,
      createdAt: r.createdAt,
      actorVendorMemberId: r.actorVendorMemberId,
      actorName: r.actorName,
      actorEmail: r.actorEmail,
      actorIsAdmin: r.actorIsAdmin,
    };
  });
}

// ── Target resolution ──────────────────────────────────────────────

export type ResolvedTarget = {
  /** Display name. For deleted vendors falls back to the audit
   *  row's `before.name`. For unresolvable rows (e.g. Clerk-user-id
   *  targets) renders as the raw target_id. */
  name: string;
  /** Admin route the target links to, or null if no route exists. */
  href: string | null;
  /** True when the target row no longer exists in the source table
   *  but a fallback name was recovered from the audit payload. */
  deleted: boolean;
};

export type TargetMap = Map<string, ResolvedTarget>;

/**
 * Batched per-type lookup. Collects target_ids by type, fires up to
 * 4 IN-queries (one per resolvable type), then returns a single map
 * keyed by `"{targetType}:{targetId}"`.
 *
 * Deleted-vendor fallback: when target_type='vendor' AND the live
 * row is missing AND the audit row's action is 'vendor.delete', we
 * pull the name from the audit row's `before` payload (which the
 * delete handler stashes for exactly this purpose).
 */
export async function resolveTargets(rows: AuditLogRow[]): Promise<TargetMap> {
  const byType = new Map<string, Set<string>>();
  for (const row of rows) {
    const set = byType.get(row.targetType) ?? new Set();
    set.add(row.targetId);
    byType.set(row.targetType, set);
  }

  // Parse numeric ids per type; non-numeric (Clerk user_id) are
  // unresolvable — render as-is in the render layer.
  function numericIds(type: string): number[] {
    const set = byType.get(type);
    if (!set) return [];
    return Array.from(set)
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n) && n > 0);
  }

  const vendorIds = numericIds("vendor");
  const appIds = numericIds("app");
  const submissionIds = numericIds("submission");
  const vendorMemberIds = numericIds("vendor_member");

  // Use drizzle's inArray operator + query builder rather than raw
  // `= ANY(${arr})` in a sql template — postgres-js mis-binds a JS
  // array passed to ANY (flattens to a scalar). The query builder
  // emits a properly-bound IN clause.
  const [vendorRows, appRows, submissionRows, vendorMemberRows] =
    await Promise.all([
      vendorIds.length > 0
        ? db
            .select({ id: vendorsTable.id, name: vendorsTable.name })
            .from(vendorsTable)
            .where(inArray(vendorsTable.id, vendorIds))
        : Promise.resolve([] as { id: number; name: string }[]),
      appIds.length > 0
        ? db
            .select({
              id: appsTable.id,
              name: appsTable.name,
              slug: appsTable.slug,
            })
            .from(appsTable)
            .where(inArray(appsTable.id, appIds))
        : Promise.resolve([] as { id: number; name: string; slug: string }[]),
      submissionIds.length > 0
        ? db
            .select({
              id: submissionsTable.id,
              productName: sql<string | null>`${submissionsTable.payload}->>'name'`,
            })
            .from(submissionsTable)
            .where(inArray(submissionsTable.id, submissionIds))
        : Promise.resolve(
            [] as { id: number; productName: string | null }[],
          ),
      vendorMemberIds.length > 0
        ? db
            .select({
              id: vendorMembersTable.id,
              name: vendorMembersTable.name,
            })
            .from(vendorMembersTable)
            .where(inArray(vendorMembersTable.id, vendorMemberIds))
        : Promise.resolve([] as { id: number; name: string }[]),
    ]);

  const vendorLookup = new Map<number, string>(
    vendorRows.map((r) => [r.id, r.name]),
  );
  const appLookup = new Map<number, { name: string; slug: string }>(
    appRows.map((r) => [r.id, { name: r.name, slug: r.slug }]),
  );
  const submissionLookup = new Map<number, string | null>(
    submissionRows.map((r) => [r.id, r.productName]),
  );
  const vendorMemberLookup = new Map<number, string>(
    vendorMemberRows.map((r) => [r.id, r.name]),
  );

  // Build the result map row-by-row so we can apply per-row fallback
  // logic (e.g. deleted-vendor name from `before` payload).
  const result: TargetMap = new Map();
  for (const row of rows) {
    const key = `${row.targetType}:${row.targetId}`;
    if (result.has(key)) continue;

    const numericId = Number(row.targetId);
    const isNumeric = Number.isFinite(numericId) && numericId > 0;

    if (row.targetType === "vendor") {
      if (!isNumeric) {
        // Clerk-user-id target from clerk.metadata_sync_failed
        result.set(key, {
          name: `User: ${row.targetId}`,
          href: null,
          deleted: false,
        });
        continue;
      }
      const live = vendorLookup.get(numericId);
      if (live) {
        result.set(key, {
          name: live,
          href: `/admin/directory/${numericId}`,
          deleted: false,
        });
        continue;
      }
      // Deleted-vendor fallback — pull name from the audit row's
      // `before` payload (vendor.delete stashes the full row there).
      const fallbackName = (row.before as { name?: unknown } | null)?.name;
      const name =
        typeof fallbackName === "string"
          ? `${fallbackName} (deleted)`
          : `Vendor #${numericId} (deleted)`;
      result.set(key, { name, href: null, deleted: true });
      continue;
    }

    if (row.targetType === "app") {
      if (!isNumeric) {
        result.set(key, {
          name: `App: ${row.targetId}`,
          href: null,
          deleted: false,
        });
        continue;
      }
      const live = appLookup.get(numericId);
      if (live) {
        result.set(key, {
          name: live.name,
          // No admin route for individual apps; link to the public
          // listing for context.
          href: `/apps/${live.slug}`,
          deleted: false,
        });
        continue;
      }
      result.set(key, {
        name: `App #${numericId} (deleted)`,
        href: null,
        deleted: true,
      });
      continue;
    }

    if (row.targetType === "submission") {
      if (!isNumeric) {
        result.set(key, {
          name: `Submission: ${row.targetId}`,
          href: null,
          deleted: false,
        });
        continue;
      }
      const productName = submissionLookup.get(numericId);
      if (productName !== undefined) {
        result.set(key, {
          name:
            productName && productName.length > 0
              ? productName
              : `Submission #${numericId}`,
          href: `/admin/submissions/${numericId}`,
          deleted: false,
        });
        continue;
      }
      result.set(key, {
        name: `Submission #${numericId} (deleted)`,
        href: null,
        deleted: true,
      });
      continue;
    }

    if (row.targetType === "vendor_member") {
      if (!isNumeric) {
        result.set(key, {
          name: `Member: ${row.targetId}`,
          href: null,
          deleted: false,
        });
        continue;
      }
      const live = vendorMemberLookup.get(numericId);
      // Post-GDPR-anonymise the name is "deleted-{n}" — surface it
      // verbatim. The audit log shouldn't pretend the row is intact.
      result.set(key, {
        name: live ?? `Member #${numericId} (deleted)`,
        href: null,
        deleted: !live,
      });
      continue;
    }

    // Unknown target_type — render verbatim, no link.
    result.set(key, {
      name: `${row.targetType}: ${row.targetId}`,
      href: null,
      deleted: false,
    });
  }

  return result;
}

