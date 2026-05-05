import {
  pgTable,
  pgEnum,
  serial,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { vendors } from "./vendors";
import { apps } from "./apps";

/**
 * Submissions are the moderation queue. Two flavours via the `type` enum:
 *
 *   • new   — vendor submitting a brand-new app. payload contains the full
 *             proposed app (name, tagline, description, taxonomy refs,
 *             customCapabilities/customIndustries proposals, optional
 *             company-on-first-submit data). app_id is NULL until approved.
 *
 *   • claim — vendor claiming an existing editorial stub. app_id points to
 *             the target app from the start; payload may carry edits the
 *             vendor proposes alongside the claim.
 *
 * Suggestions are the public "suggest an app" form — separate flow, no auth.
 * Lives in this file because the admin queue surfaces both.
 */
export const submissionType = pgEnum("submission_type", ["new", "claim"]);

export const submissionStatus = pgEnum("submission_status", [
  "pending",
  "in_review",
  "changes_requested",
  "approved",
  "rejected",
]);

export const submissions = pgTable(
  "submissions",
  {
    id: serial("id").primaryKey(),
    type: submissionType("type").notNull(),
    status: submissionStatus("status").notNull().default("pending"),
    submitterVendorId: integer("submitter_vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    /** Set on approval (new) or chosen at submit-time (claim). */
    appId: integer("app_id").references(() => apps.id, { onDelete: "set null" }),
    /** FK to admins.id wired in the audit/admins commit. */
    reviewerAdminId: integer("reviewer_admin_id"),
    payload: jsonb("payload").notNull(),
    reviewNotes: text("review_notes"),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("ix_submissions_status_submitted_at").on(t.status, t.submittedAt),
    index("ix_submissions_submitter").on(t.submitterVendorId),
  ],
);

export const suggestionStatus = pgEnum("suggestion_status", [
  "new",
  "contacted",
  "listed",
  "dismissed",
]);

export const suggestions = pgTable(
  "suggestions",
  {
    id: serial("id").primaryKey(),
    submitterName: text("submitter_name").notNull(),
    submitterEmail: text("submitter_email").notNull(),
    appName: text("app_name").notNull(),
    appUrl: text("app_url").notNull(),
    reason: text("reason"),
    status: suggestionStatus("status").notNull().default("new"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("ix_suggestions_status_created").on(t.status, t.createdAt)],
);

export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
export type SubmissionType = (typeof submissionType.enumValues)[number];
export type SubmissionStatus = (typeof submissionStatus.enumValues)[number];
export type Suggestion = typeof suggestions.$inferSelect;
export type SuggestionStatus = (typeof suggestionStatus.enumValues)[number];
