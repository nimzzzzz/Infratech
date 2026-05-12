import { z } from "zod";

/**
 * Body schema for POST /api/admin/submissions/:id/edit. Admin
 * supplies the full edited payload. Same shape as the wizard's
 * submitted payload, but every field optional — the route fills
 * unset fields from the original submission.payload before saving
 * to admin_edits.
 *
 * Plain-text only on free-text fields (HTML rejected the same way
 * as the wizard schema in app/api/submissions/schema.ts).
 */
const plainText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((s) => !/[<>]/.test(s), {
      message: "HTML is not allowed",
    });

export const editBodySchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric + hyphen")
    .optional(),
  name: plainText(200).optional(),
  tagline: plainText(200).optional(),
  description: plainText(2000).optional(),
  stages: z.array(z.string()).max(10).optional(),
  capabilities: z.array(z.string()).max(20).optional(),
  industries: z.array(z.string()).max(20).optional(),
  pricing: z.string().trim().max(80).optional(),
});

export type EditBody = z.infer<typeof editBodySchema>;
