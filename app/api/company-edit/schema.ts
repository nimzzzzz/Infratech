import { z } from "zod";
import { companyStepSchema } from "@/app/api/submissions/schema";

/**
 * Body schema for POST /api/company-edit.
 *
 * Re-uses the signup wizard's `companyStepSchema` verbatim and only
 * adds a honeypot field for spam protection — the same data that's
 * collected on signup should be editable later, no more and no less.
 * Any divergence between this schema and `companyStepSchema` is a
 * bug (see BACKLOG.md "fix/extract-company-fields").
 */
export const companyEditBodySchema = companyStepSchema.extend({
  honeypot: z.string().max(500).optional(),
});

export type CompanyEditBody = z.infer<typeof companyEditBodySchema>;
