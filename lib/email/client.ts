import "server-only";
import { Resend } from "resend";
import { env } from "@/lib/env";

/**
 * Lazy-initialised Resend client. Constructed on first use so a missing
 * RESEND_API_KEY at boot doesn't crash routes that never send email
 * (most of the site). The error surfaces only when env.resend() runs,
 * with a structured Zod message pointing at the missing key.
 */
let cached: Resend | null = null;

export function getResend(): Resend {
  if (cached) return cached;
  const { RESEND_API_KEY } = env.resend();
  cached = new Resend(RESEND_API_KEY);
  return cached;
}

/**
 * Test-only reset hook. Tests that swap the Resend mock between
 * cases need a way to clear the cached client; production callers
 * have no reason to call this.
 */
export function __resetResendForTests(): void {
  cached = null;
}
