import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  parseRange,
  resolveRange,
  type Range,
  type ResolvedRange,
} from "@/lib/queries/analytics";

/**
 * Admin audit-log queries. Phase A.6 PR 2.
 *
 * Read-only reads against `audit_log` with batched target resolution.
 * Always orders by `created_at DESC, id DESC` — never configurable.
 * GDPR-safe: `vendor_member.gdpr_delete` rows have their before/after
 * payloads scrubbed at THIS layer before they cross the query
 * boundary. The render layer also refuses to expand for that action
 * (belt + braces) but the canonical guarantee lives here.
 */

export const PAGE_SIZE = 50;

const GDPR_REDACTED_ACTIONS = new Set(["vendor_member.gdpr_delete"]);

/** Special actor-filter sentinel for `actor_vendor_member_id IS NULL`
 *  rows. Surfaced as "[System]" in the UI. */
export const ACTOR_SYSTEM = "system" as const;

export type AuditLogFilters = {
  page: number;
  range: Range;
  resolvedRange: ResolvedRange;
  /** vendor_member.id as string, or "system" for null-actor rows,
   *  or undefined for no filter. */
  actor: string | undefined;
  /** action key, or undefined. */
  action: string | undefined;
  /** target_type, or undefined. */
  targetType: string | undefined;
};

/**
 * Parse + validate searchParams into a typed filter object. Falls
 * back to safe defaults on any malformed input.
 */
export function parseAuditLogParams(
  sp: Record<string, string | string[] | undefined>,
): AuditLogFilters {
  const get = (k: string): string | undefined => {
    const v = sp[k];
    if (Array.isArray(v)) return v[0];
    return v;
  };

  const range = parseRange(get("range"));
  const resolvedRange = resolveRange(range);

  const rawPage = Number(get("page") ?? "1");
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;

  const actor = get("actor");
  const action = get("action");
  const targetType = get("type");

  return {
    page,
    range,
    resolvedRange,
    actor: actor && actor.length > 0 ? actor : undefined,
    action: action && action.length > 0 ? action : undefined,
    targetType: targetType && targetType.length > 0 ? targetType : undefined,
  };
}

// ── Core list query ────────────────────────────────────────────────

export type AuditLogRow = {
  id: number;
  action: string;
  targetType: string;
  targetId: string;
  /** GDPR-redacted to `null` for `vendor_member.gdpr_delete` rows
   *  (see `GDPR_REDACTED_ACTIONS`). */
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

export type AuditLogPage = {
  rows: AuditLogRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

/**
 * Paginated audit-log fetch with optional filters. Joins
 * `vendor_members` to surface the actor's display name + admin flag
 * in one round trip. GDPR-redacts before/after for redacted actions
 * AFTER the SQL returns — the data never leaves this function with
 * the deleted human's PII attached.
 */
export async function listAuditEntries(
  f: AuditLogFilters,
): Promise<AuditLogPage> {
  // Build optional WHERE-clause fragments. drizzle's sql template
  // expands an empty sql`` to an empty string when interpolated,
  // so a missing filter just doesn't add a fragment.
  const actorFragment =
    f.actor === ACTOR_SYSTEM
      ? sql`AND al.actor_vendor_member_id IS NULL`
      : (() => {
          if (f.actor === undefined) return sql``;
          const n = Number(f.actor);
          if (!Number.isFinite(n) || n <= 0) return sql``;
          return sql`AND al.actor_vendor_member_id = ${n}`;
        })();
  const actionFragment =
    f.action !== undefined ? sql`AND al.action = ${f.action}` : sql``;
  const typeFragment =
    f.targetType !== undefined
      ? sql`AND al.target_type = ${f.targetType}`
      : sql``;

  const offset = (f.page - 1) * PAGE_SIZE;

  const [rowsRaw, totalRows] = await Promise.all([
    db.execute<{
      id: number;
      action: string;
      target_type: string;
      target_id: string;
      before: unknown;
      after: unknown;
      created_at: Date;
      actor_vendor_member_id: number | null;
      actor_name: string | null;
      actor_email: string | null;
      actor_is_admin: boolean | null;
    }>(sql`
      SELECT
        al.id,
        al.action,
        al.target_type,
        al.target_id,
        al.before,
        al.after,
        al.created_at,
        al.actor_vendor_member_id,
        vm.name AS actor_name,
        vm.primary_email AS actor_email,
        vm.is_admin AS actor_is_admin
      FROM audit_log al
      LEFT JOIN vendor_members vm ON vm.id = al.actor_vendor_member_id
      WHERE al.created_at >= ${f.resolvedRange.startDateTime}::timestamptz
        ${actorFragment}
        ${actionFragment}
        ${typeFragment}
      ORDER BY al.created_at DESC, al.id DESC
      LIMIT ${PAGE_SIZE} OFFSET ${offset}
    `),
    db.execute<{ n: number }>(sql`
      SELECT COUNT(*)::int AS n
      FROM audit_log al
      WHERE al.created_at >= ${f.resolvedRange.startDateTime}::timestamptz
        ${actorFragment}
        ${actionFragment}
        ${typeFragment}
    `),
  ]);

  const rows: AuditLogRow[] = (rowsRaw as unknown as Array<{
    id: number;
    action: string;
    target_type: string;
    target_id: string;
    before: unknown;
    after: unknown;
    created_at: Date;
    actor_vendor_member_id: number | null;
    actor_name: string | null;
    actor_email: string | null;
    actor_is_admin: boolean | null;
  }>).map((r) => {
    const isRedacted = GDPR_REDACTED_ACTIONS.has(r.action);
    return {
      id: r.id,
      action: r.action,
      targetType: r.target_type,
      targetId: r.target_id,
      // GDPR redaction: scrub PII-bearing payloads BEFORE the row
      // crosses the query-layer boundary. The before payload of a
      // vendor_member.gdpr_delete row contains the deleted human's
      // name + email by design (the original audit-log purpose is
      // to record "we erased this row"), but the viewer must never
      // surface them — that defeats the GDPR request.
      before: isRedacted ? null : r.before,
      after: isRedacted ? null : r.after,
      createdAt: new Date(r.created_at),
      actorVendorMemberId: r.actor_vendor_member_id,
      actorName: r.actor_name,
      actorEmail: r.actor_email,
      actorIsAdmin: r.actor_is_admin,
    };
  });

  const total =
    (totalRows as unknown as Array<{ n: number }>)[0]?.n ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return { rows, total, page: f.page, pageSize: PAGE_SIZE, pageCount };
}

// ── Filter dropdown options ────────────────────────────────────────

export type ActorOption =
  | { kind: "human"; id: number; name: string; isAdmin: boolean; vendorName: string | null }
  | { kind: "system" };

/**
 * Actor dropdown options. Returns every human who has ever written
 * to audit_log, plus a synthetic "[System]" entry when any null-actor
 * rows exist. Admins sort first (is_admin DESC), vendors alphabetical,
 * "[System]" at the bottom.
 */
export async function getActorDropdownOptions(): Promise<ActorOption[]> {
  const humanRows = await db.execute<{
    id: number;
    name: string;
    is_admin: boolean;
    vendor_name: string | null;
  }>(sql`
    SELECT DISTINCT
      vm.id,
      vm.name,
      vm.is_admin,
      v.name AS vendor_name
    FROM audit_log al
    INNER JOIN vendor_members vm ON vm.id = al.actor_vendor_member_id
    LEFT JOIN vendors v ON v.id = vm.vendor_id
    ORDER BY vm.is_admin DESC, vm.name ASC
  `);

  const systemRows = await db.execute<{ n: number }>(sql`
    SELECT COUNT(*)::int AS n FROM audit_log WHERE actor_vendor_member_id IS NULL
  `);
  const hasSystem =
    ((systemRows as unknown as Array<{ n: number }>)[0]?.n ?? 0) > 0;

  const humans: ActorOption[] = (
    humanRows as unknown as Array<{
      id: number;
      name: string;
      is_admin: boolean;
      vendor_name: string | null;
    }>
  ).map((r) => ({
    kind: "human" as const,
    id: r.id,
    name: r.name,
    isAdmin: r.is_admin,
    vendorName: r.vendor_name,
  }));

  return hasSystem ? [...humans, { kind: "system" }] : humans;
}

/** Distinct action keys present in audit_log. Sorted ascending. */
export async function getActionDropdownOptions(): Promise<string[]> {
  const rows = await db.execute<{ action: string }>(sql`
    SELECT DISTINCT action FROM audit_log ORDER BY action ASC
  `);
  return (rows as unknown as Array<{ action: string }>).map((r) => r.action);
}

/** Distinct target_type values present in audit_log. */
export async function getTargetTypeDropdownOptions(): Promise<string[]> {
  const rows = await db.execute<{ target_type: string }>(sql`
    SELECT DISTINCT target_type FROM audit_log ORDER BY target_type ASC
  `);
  return (rows as unknown as Array<{ target_type: string }>).map(
    (r) => r.target_type,
  );
}

// ── Target resolution ──────────────────────────────────────────────

export type ResolvedTarget = {
  /** Display name. For deleted vendors falls back to the
   *  audit row's `before.name`. For unresolvable rows (e.g.
   *  Clerk-user-id targets) renders as the raw target_id. */
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

  const [vendorRows, appRows, submissionRows, vendorMemberRows] = await Promise.all([
    vendorIds.length > 0
      ? db.execute<{ id: number; name: string }>(sql`
          SELECT id, name FROM vendors WHERE id = ANY(${vendorIds})
        `)
      : Promise.resolve([] as unknown[]),
    appIds.length > 0
      ? db.execute<{ id: number; name: string; slug: string }>(sql`
          SELECT id, name, slug FROM apps WHERE id = ANY(${appIds})
        `)
      : Promise.resolve([] as unknown[]),
    submissionIds.length > 0
      ? db.execute<{ id: number; product_name: string | null }>(sql`
          SELECT id, payload->>'name' AS product_name
          FROM submissions
          WHERE id = ANY(${submissionIds})
        `)
      : Promise.resolve([] as unknown[]),
    vendorMemberIds.length > 0
      ? db.execute<{ id: number; name: string }>(sql`
          SELECT id, name FROM vendor_members WHERE id = ANY(${vendorMemberIds})
        `)
      : Promise.resolve([] as unknown[]),
  ]);

  const vendorLookup = new Map<number, string>(
    (vendorRows as unknown as Array<{ id: number; name: string }>).map((r) => [
      r.id,
      r.name,
    ]),
  );
  const appLookup = new Map<number, { name: string; slug: string }>(
    (
      appRows as unknown as Array<{ id: number; name: string; slug: string }>
    ).map((r) => [r.id, { name: r.name, slug: r.slug }]),
  );
  const submissionLookup = new Map<number, string | null>(
    (
      submissionRows as unknown as Array<{
        id: number;
        product_name: string | null;
      }>
    ).map((r) => [r.id, r.product_name]),
  );
  const vendorMemberLookup = new Map<number, string>(
    (
      vendorMemberRows as unknown as Array<{ id: number; name: string }>
    ).map((r) => [r.id, r.name]),
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
      const fallbackName =
        (row.before as { name?: unknown } | null)?.name;
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
