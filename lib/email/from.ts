import "server-only";
import { env } from "@/lib/env";

/**
 * Build the FROM header for outbound mail. EMAIL_FROM in the env may be:
 *   • a bare address ("hello@example.com")        → wrapped with display name
 *   • already in display form ("X <a@b.com>")     → returned as-is
 *
 * Display name is "AllInfratech Directory" — explicit "Directory"
 * suffix disambiguates the inbox sender column from the company
 * name that vendors might also see in unrelated correspondence.
 * Matches the spec set during the production-domain switch.
 */
export function fromAddress(): string {
  const { EMAIL_FROM } = env.resend();
  if (EMAIL_FROM.includes("<")) return EMAIL_FROM;
  return `AllInfratech Directory <${EMAIL_FROM}>`;
}

/** Internal BCC inbox — the Resolute team's copy of every inquiry. */
export function contactInbox(): string {
  return env.resend().EMAIL_CONTACT_INBOX;
}
