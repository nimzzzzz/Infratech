import "server-only";
import { env } from "@/lib/env";

/**
 * Build the FROM header for outbound mail. EMAIL_FROM in the env may be:
 *   • a bare address ("hello@example.com")        → wrapped with display name
 *   • already in display form ("X <a@b.com>")     → returned as-is
 *
 * Display name is "InfraTechDB" — matches the masthead and what visitors
 * see on the directory itself, so the sender column in their inbox is
 * recognisable.
 */
export function fromAddress(): string {
  const { EMAIL_FROM } = env.resend();
  if (EMAIL_FROM.includes("<")) return EMAIL_FROM;
  return `InfraTechDB <${EMAIL_FROM}>`;
}

/** Internal BCC inbox — the Resolute team's copy of every inquiry. */
export function contactInbox(): string {
  return env.resend().EMAIL_CONTACT_INBOX;
}
