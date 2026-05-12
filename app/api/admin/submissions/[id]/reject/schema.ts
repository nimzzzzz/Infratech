import { z } from "zod";

/** Body schema for POST /api/admin/submissions/:id/reject. The
 *  rejection_reason is required (a rejection without a reason is
 *  hostile UX for the vendor). Plain-text only. */
export const rejectBodySchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, "Give the vendor at least one sentence of feedback")
    .max(2000)
    .refine((s) => !/[<>]/.test(s), {
      message: "HTML is not allowed",
    }),
});

export type RejectBody = z.infer<typeof rejectBodySchema>;
