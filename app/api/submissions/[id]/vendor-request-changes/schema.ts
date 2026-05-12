import { z } from "zod";

/** Body schema for POST /api/submissions/:id/vendor-request-changes.
 *  Same plain-text-only refinement as the admin reject reason; same
 *  10-2000 char range. */
export const vendorRequestChangesBodySchema = z.object({
  feedback: z
    .string()
    .trim()
    .min(10, "Tell the editorial team at least one sentence about what you'd like changed.")
    .max(2000)
    .refine((s) => !/[<>]/.test(s), {
      message: "HTML is not allowed",
    }),
});

export type VendorRequestChangesBody = z.infer<
  typeof vendorRequestChangesBodySchema
>;
