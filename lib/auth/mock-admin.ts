/**
 * Fake admin session. Replace with `auth()` + an admin role check
 * (e.g. session.user.publicMetadata.role === "admin") once Clerk lands.
 */

export type MockAdmin = {
  name: string;
  title: string;
  email: string;
  initials: string;
};

export const mockAdmin: MockAdmin = {
  name: "Sara Pellegrini",
  title: "Editorial lead",
  email: "sara@resolute.example",
  initials: "SP",
};

export function getMockAdmin(): MockAdmin {
  return mockAdmin;
}
