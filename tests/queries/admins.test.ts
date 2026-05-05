import { describe, it, expect } from "vitest";
import { getAdminByClerkUserId, listAdmins } from "@/lib/queries/admins";

describe("admin queries", () => {
  it("getAdminByClerkUserId returns the seeded demo admin", async () => {
    const a = await getAdminByClerkUserId("demo_admin_seed");
    expect(a?.name).toBe("Sara Pellegrini");
    expect(a?.role).toBe("admin");
  });

  it("getAdminByClerkUserId returns null for unknown clerk_user_id", async () => {
    const a = await getAdminByClerkUserId("user_unknown_xyz");
    expect(a).toBeNull();
  });

  it("listAdmins returns the seeded admin", async () => {
    const all = await listAdmins();
    expect(all.length).toBeGreaterThanOrEqual(1);
    const sara = all.find((a) => a.email === "sara@resolute.example");
    expect(sara).toBeDefined();
  });
});
