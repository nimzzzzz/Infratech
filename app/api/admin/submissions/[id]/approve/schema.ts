import { z } from "zod";

/** Body schema for POST /api/admin/submissions/:id/approve.
 *  No body fields — admin clicks Approve, the submission is published
 *  as-is (no edits applied). The honeypot is included anyway as a
 *  defense-in-depth signal even though the route is admin-only. */
export const approveBodySchema = z.object({
  website4: z.string().max(500).optional(),
});

export type ApproveBody = z.infer<typeof approveBodySchema>;
