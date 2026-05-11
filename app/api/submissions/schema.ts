import { z } from "zod";

/**
 * Body schema for POST /api/submissions.
 *
 * Lives in a sibling file (not the route module) because Next.js
 * route handlers may only export HTTP method names + a small
 * metadata allowlist — exporting a Zod schema from route.ts breaks
 * the route-type generator. Same pattern as
 * app/api/onboarding/confirm/schema.ts.
 *
 * Field design:
 *
 * Company block ─ only required when the caller's vendor_members row
 *   has vendor_id === NULL. The route will pull these into a vendors
 *   INSERT during the transaction. Returning vendors send these
 *   anyway; the route just ignores them.
 *
 * Product block ─ always required. These land in apps on approval
 *   (Stage 5) but for PR 2 we just stash them in submissions.payload.
 *
 * Custom taxonomy proposals ─ free-text strings the admin reviewer
 *   decides whether to promote into canonical taxonomy on approval.
 *
 * Plain-text-only defensiveness ─ short of full Tiptap+sanitiser
 *   (CLAUDE.md §7, planned for a later phase) we reject any string
 *   containing `<` or `>` as a belt-and-braces check. Real rich text
 *   support requires a proper allowlist sanitiser.
 *
 * Honeypot ─ "website3" not "website" / "website2" so the same
 *   browser autofilling all three honeypots in a session can't make
 *   a bot collide across endpoints. Non-empty value → silent 200.
 */
const plainText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((s) => !/[<>]/.test(s), {
      message: "HTML is not allowed",
    });

const optionalPlainText = (max: number) =>
  plainText(max).optional().or(z.literal(""));

const slug = z.string().array();

export const submissionBodySchema = z.object({
  // --- Company block (used only if vendor_members.vendor_id is null) ---
  companyName: optionalPlainText(200),
  companyWebsite: z.string().trim().url().max(500).optional().or(z.literal("")),
  companyFounded: z.string().trim().max(4).optional().or(z.literal("")),
  companyHeadquarters: optionalPlainText(100),
  companyRegions: slug.max(20).optional(),
  companyDescription: optionalPlainText(2000),

  // --- Product block (always required) ---
  name: plainText(200).min(1),
  url: z.string().trim().url().max(500),
  tagline: plainText(200).min(1),
  description: plainText(2000).min(1),
  stages: slug.min(1).max(10),
  capabilities: slug.max(20),
  industries: slug.max(20),
  pricing: z.string().trim().min(1).max(80),
  customCapabilities: z.array(plainText(80)).max(10).optional(),
  customIndustries: z.array(plainText(80)).max(10).optional(),
  customPricing: optionalPlainText(80),

  // --- Honeypot ---
  website3: z.string().max(500).optional(),
});

export type SubmissionBody = z.infer<typeof submissionBodySchema>;
