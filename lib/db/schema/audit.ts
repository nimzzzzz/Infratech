import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { vendorMembers } from "./vendors";

/**
 * Immutable audit_log.
 *
 * Captures every consequential moderation / lifecycle action.
 * `actor_vendor_member_id` is NULLABLE because system events
 * (GDPR-triggered deletes, webhook metadata-sync failures) are
 * recorded with a NULL actor. Inserts only — never UPDATE or
 * DELETE rows from audit_log; corrections append a new row with
 * a "correction" action.
 *
 * The legacy `admins` table + `admin_id` column were dropped in
 * A.6 PR 3 (drizzle/0022_drop_legacy_admins_table.sql). Every
 * actor since Phase A.1 is a `vendor_members` row, distinguished
 * by `is_admin`.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: serial("id").primaryKey(),
    /**
     * The vendor_member.id who performed the action. NULL for
     * system-level actions (GDPR-triggered deletes, webhook
     * metadata-sync failures). Works for admin AND vendor actors
     * since the single-human-table model (Phase A.1) put both in
     * vendor_members.
     */
    actorVendorMemberId: integer("actor_vendor_member_id").references(
      () => vendorMembers.id,
      { onDelete: "set null" },
    ),
    /** dot-namespaced action key, e.g. "submission.approve", "vendor_member.gdpr_delete". */
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("ix_audit_target").on(t.targetType, t.targetId),
    index("ix_audit_actor_created").on(t.actorVendorMemberId, t.createdAt),
  ],
);

export type AuditEntry = typeof auditLog.$inferSelect;
export type NewAuditEntry = typeof auditLog.$inferInsert;
