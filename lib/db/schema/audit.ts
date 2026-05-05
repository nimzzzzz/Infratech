import {
  pgTable,
  pgEnum,
  serial,
  text,
  integer,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

/**
 * Admin user table + immutable audit_log.
 *
 * admins is a separate table from vendors — admin and vendor sessions never
 * mix (per Stage 1 plan Q4). Both use the same Clerk app, distinguished by
 * publicMetadata.role on the Clerk user; the webhook handler routes each
 * user into the appropriate table on user.created.
 *
 * audit_log captures every consequential admin action. admin_id is NULLABLE
 * because GDPR deletes are recorded as system-level events with admin_id=NULL.
 * Inserts only — never UPDATE or DELETE rows from audit_log; corrections
 * append a new row with a "correction" action.
 */
export const adminRole = pgEnum("admin_role", ["admin", "super_admin"]);

export const admins = pgTable(
  "admins",
  {
    id: serial("id").primaryKey(),
    clerkUserId: text("clerk_user_id").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    role: adminRole("role").notNull().default("admin"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("ux_admins_clerk_user_id").on(t.clerkUserId),
    uniqueIndex("ux_admins_email").on(t.email),
  ],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: serial("id").primaryKey(),
    /** NULL for system-level actions (e.g. GDPR-triggered deletes). */
    adminId: integer("admin_id").references(() => admins.id, {
      onDelete: "set null",
    }),
    /** dot-namespaced action key, e.g. "submission.approve", "vendor.gdpr_delete". */
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
    index("ix_audit_admin_created").on(t.adminId, t.createdAt),
  ],
);

export type Admin = typeof admins.$inferSelect;
export type NewAdmin = typeof admins.$inferInsert;
export type AdminRole = (typeof adminRole.enumValues)[number];
export type AuditEntry = typeof auditLog.$inferSelect;
export type NewAuditEntry = typeof auditLog.$inferInsert;
