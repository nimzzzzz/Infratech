/**
 * Fake session for the auth UI shell. Replace with `auth()` from `@clerk/nextjs`
 * once Clerk + LinkedIn OAuth are configured (Phase 2 in PROGRESS.md).
 *
 * Names follow the taste-skill anti-slop rule: no John Doe / Acme / Nexus.
 */

export type MockUser = {
  name: string;
  title: string;
  email: string;
  initials: string;
  linkedinUrl: string;
};

export type MockCompany = {
  name: string;
  domain: string;
  size: string;
  industry: string;
};

export type MockSession = {
  user: MockUser;
  company: MockCompany;
};

export const mockSession: MockSession = {
  user: {
    name: "Marina Volkov",
    title: "Co-founder",
    email: "marina@arctus.io",
    initials: "MV",
    linkedinUrl: "https://linkedin.com/in/marinavolkov",
  },
  company: {
    name: "Arctus",
    domain: "arctus.io",
    size: "11-50",
    industry: "Construction software",
  },
};

export function getMockSession(): MockSession {
  return mockSession;
}
