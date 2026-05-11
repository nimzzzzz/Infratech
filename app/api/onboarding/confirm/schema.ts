import { z } from "zod";

/**
 * Body schema for POST /api/onboarding/confirm.
 *
 * Lives in a sibling file (not the route module) because Next.js
 * route handlers may only export the HTTP method names (GET, POST,
 * etc.) plus a small allowlist of metadata keys — exporting a Zod
 * schema directly from route.ts breaks the route-type generator.
 */
export const onboardingConfirmBodySchema = z.object({
  acceptedTerms: z.boolean(),
  termsVersion: z.string().min(1).max(40),
  // Honeypot — real users never see this input. Bots fill everything,
  // so a non-empty value is a near-perfect signal to drop silently.
  // Named `website2` (not `website`) so it doesn't collide with the
  // contact-vendor honeypot if a single browser autofills both.
  website2: z.string().max(500).optional(),
});

export type OnboardingConfirmBody = z.infer<typeof onboardingConfirmBodySchema>;
