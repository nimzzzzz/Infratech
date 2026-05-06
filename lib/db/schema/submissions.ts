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
import { admins } from "./audit";

/**
 * Submissions are the moderation queue.
 *
 *   • new   — vendor submitting a brand-new app. payload contains the full
 *             proposed app (name, tagline, description, taxonomy refs,
 *             customCapabilities/customIndustries proposals, optional
 *             company-on-first-submit data). app_id is NULL until approved.
 *
 *   • claim — DEPRECATED 2026-05-06. The directory is invitation-only and
 *             listings are seeded by the admin team — there is no public
 *             "claim an existing listing" path. Enum value is retained so
 *             historical / seeded rows keep loading; new rows MUST be
 *             type = 'new'. Do not add a writer for type = 'claim'.
 *
 * Suggestions schema is similarly retained but unused — the surface that
 * wrote into it (/suggest) was removed at the same scope-narrowing.
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
    reviewerAdminId: integer("reviewer_admin_id").references(() => admins.id, {
      onDelete: "set null",
    }),
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
