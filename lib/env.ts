import "server-only";

const required = (name: string, value: string | undefined): string => {
  if (!value || value.length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
};

const optional = (value: string | undefined): string | undefined =>
  value && value.length > 0 ? value : undefined;

export const env = {
  SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME ?? "InfraTechDB",
  HOLDING_PAGE: process.env.HOLDING_PAGE === "1",

  database: () => ({
    url: required("DATABASE_URL", process.env.DATABASE_URL),
  }),

  resend: () => ({
    apiKey: required("RESEND_API_KEY", process.env.RESEND_API_KEY),
    from: required("EMAIL_FROM", process.env.EMAIL_FROM),
    contactInbox: required("EMAIL_CONTACT_INBOX", process.env.EMAIL_CONTACT_INBOX),
  }),

  plausible: () => ({
    domain: optional(process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN),
    scriptUrl: optional(process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL),
  }),
};
