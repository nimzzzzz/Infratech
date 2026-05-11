import { z } from "zod";
import { hasRealHostname, normaliseUrl } from "@/lib/submissions/url";

/**
 * Body schema for POST /api/submissions, plus per-step subschemas the
 * client wizard runs during inline validation.
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
 * URL fields use `.transform(normaliseUrl).pipe(z.string().url())` —
 * vendors typing "example.com" get an automatic "https://" prefix
 * before structural validation. The transformed value is what lands
 * in the row.
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

const HOSTNAME_ERROR = "Enter a valid web address (e.g. example.com)";

const url = (max: number) =>
  z
    .string()
    .trim()
    .min(1, "Required")
    .transform(normaliseUrl)
    .pipe(z.string().url(HOSTNAME_ERROR).max(max))
    // Defence beyond z.url(): hostnames with no dot ("rr", "example",
    // "localhost") parse as valid URLs but are never real websites
    // for our use case. hasRealHostname checks the URL's hostname for
    // a dot + 2+ char TLD. Lives in lib/submissions/url.ts so the
    // rule is reusable and unit-testable.
    .refine(hasRealHostname, { message: HOSTNAME_ERROR });

const optionalUrl = (max: number) =>
  z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? normaliseUrl(v) : v))
    .pipe(
      z
        .string()
        .url(HOSTNAME_ERROR)
        .max(max)
        // Same hostname rule as `url()` above, applied only when a
        // value is present. Empty strings pass through unchecked.
        .refine(hasRealHostname, { message: HOSTNAME_ERROR })
        .optional()
        .or(z.literal("")),
    );

const slugArray = z.string().array();

const foundedYear = z
  .string()
  .trim()
  .regex(/^\d{4}$/, "Enter a 4-digit year")
  .refine(
    (s) => {
      const n = Number(s);
      return n >= 1900 && n <= new Date().getFullYear();
    },
    { message: "Year is out of range" },
  );

// ────────────────────────────────────────────────────────────────────
// Per-step subschemas (client wizard runs these before allowing
// advance). Naming mirrors the wizard's step structure so the parent
// component picks the right one per step index.
// ────────────────────────────────────────────────────────────────────

/** Step 1 (fresh signup only). Company-level fields. */
export const companyStepSchema = z.object({
  companyName: plainText(200).min(1, "Required"),
  companyWebsite: url(500),
  companyFounded: foundedYear,
  companyHeadquarters: plainText(100).min(1, "Required"),
  companyRegions: slugArray.min(1, "Pick at least one region").max(20),
  companyDescription: plainText(2000).min(1, "Required"),
});

/**
 * Step 2 (always, regardless of skipCompanyStep). All four product
 * sub-sections combined — the wizard renders them as one scroll so
 * a single validate call against this schema gives the right error
 * surface per field.
 */
export const productStepSchema = z
  .object({
    name: plainText(200).min(1, "Required"),
    url: url(500),
    tagline: plainText(200).min(1, "Required"),
    description: plainText(2000).min(1, "Required"),
    stages: slugArray.min(1, "Pick at least one stage").max(10),
    capabilities: slugArray.max(20),
    customCapabilities: z.array(plainText(80)).max(10).optional(),
    industries: slugArray.max(20),
    customIndustries: z.array(plainText(80)).max(10).optional(),
    pricing: z.string().trim().min(1, "Pick a pricing model").max(80),
    customPricing: optionalPlainText(80),
  })
  .superRefine((d, ctx) => {
    // At least one capability — canonical OR proposed.
    if (
      d.capabilities.length === 0 &&
      (d.customCapabilities?.length ?? 0) === 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["capabilities"],
        message: "Pick at least one capability or propose one",
      });
    }
    // At least one industry — canonical OR proposed.
    if (
      d.industries.length === 0 &&
      (d.customIndustries?.length ?? 0) === 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["industries"],
        message: "Pick at least one industry or propose one",
      });
    }
    // "Other" pricing requires the free-text describer.
    if (
      d.pricing === "__custom__" &&
      (d.customPricing?.trim().length ?? 0) === 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["customPricing"],
        message: "Describe the pricing model",
      });
    }
  });

// ────────────────────────────────────────────────────────────────────
// Full submission body — the server-side schema. Looser on optional
// company fields (the route conditionally requires them when the
// vendor_members row has vendor_id NULL). Step subschemas above
// enforce the stricter client-side contract.
// ────────────────────────────────────────────────────────────────────

export const submissionBodySchema = z.object({
  // --- Company block (used only if vendor_members.vendor_id is null) ---
  companyName: optionalPlainText(200),
  companyWebsite: optionalUrl(500),
  companyFounded: z
    .string()
    .trim()
    .max(4)
    .optional()
    .or(z.literal("")),
  companyHeadquarters: optionalPlainText(100),
  companyRegions: slugArray.max(20).optional(),
  companyDescription: optionalPlainText(2000),

  // --- Product block (always required) ---
  name: plainText(200).min(1),
  url: url(500),
  tagline: plainText(200).min(1),
  description: plainText(2000).min(1),
  stages: slugArray.min(1).max(10),
  capabilities: slugArray.max(20),
  industries: slugArray.max(20),
  pricing: z.string().trim().min(1).max(80),
  customCapabilities: z.array(plainText(80)).max(10).optional(),
  customIndustries: z.array(plainText(80)).max(10).optional(),
  customPricing: optionalPlainText(80),

  // --- Honeypot ---
  website3: z.string().max(500).optional(),
});

export type SubmissionBody = z.infer<typeof submissionBodySchema>;
export type CompanyStepInput = z.infer<typeof companyStepSchema>;
export type ProductStepInput = z.infer<typeof productStepSchema>;
