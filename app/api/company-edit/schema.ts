import { z } from "zod";
import { companyStepSchema } from "@/app/api/submissions/schema";

export const EMPLOYEE_BANDS = [
  "1–10",
  "11–50",
  "51–200",
  "201–500",
  "501–1000",
  "1000+",
] as const;

export type EmployeeBand = (typeof EMPLOYEE_BANDS)[number];

/**
 * Body schema for POST /api/company-edit.
 *
 * Extends the product-wizard's company step with:
 *   - employeeBand: optional enum of headcount bands
 *   - honeypot: silent discard on non-empty value
 *
 * All other validations (URL structure, plain-text XSS guard, region
 * slug array, blob-URL check) are inherited from companyStepSchema.
 */
export const companyEditBodySchema = companyStepSchema.extend({
  employeeBand: z.enum(EMPLOYEE_BANDS).optional().or(z.literal("")),
  honeypot: z.string().max(500).optional(),
});

export type CompanyEditBody = z.infer<typeof companyEditBodySchema>;
