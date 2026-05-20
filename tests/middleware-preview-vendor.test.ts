import { describe, it, expect, vi } from "vitest";
import { decideRoute } from "@/lib/auth/middleware-decision";

/**
 * Phase A.1.1 — preview-vendor-flow toggle. Cookie loosens the
 * admin → /admin redirect rule on /dashboard/** when the actor is
 * an admin AND the cookie is set. Cookie alone doesn't grant
 * access: is_admin is still required. Not impersonation — the
 * admin stays themselves.
 */

const noopDb = vi.fn().mockResolvedValue(false);

describe("decideRoute — preview-vendor cookie (Phase A.1.1)", () => {
  it("admin + previewVendor=true on /dashboard → next (loosens the redirect)", async () => {
    const d = await decideRoute({
      pathname: "/dashboard",
      userId: "user_admin",
      isAdminClaim: true,
      isAdminInDb: noopDb,
      previewVendor: true,
      demoMode: false,
    });
    expect(d).toEqual({ kind: "next" });
    expect(noopDb).not.toHaveBeenCalled();
  });

  it("admin WITHOUT previewVendor on /dashboard → /admin (existing behavior preserved)", async () => {
    const d = await decideRoute({
      pathname: "/dashboard/messages",
      userId: "user_admin",
      isAdminClaim: true,
      isAdminInDb: noopDb,
      previewVendor: false,
      demoMode: false,
    });
    expect(d).toEqual({ kind: "redirect", to: "/admin" });
  });

  it("non-admin + previewVendor=true on /dashboard → next (cookie alone is meaningless)", async () => {
    const d = await decideRoute({
      pathname: "/dashboard",
      userId: "user_vendor",
      isAdminClaim: false,
      isAdminInDb: noopDb,
      previewVendor: true,
      demoMode: false,
    });
    expect(d).toEqual({ kind: "next" });
  });

  it("DB fallback fires when claim is undefined; admin + cookie still passes through", async () => {
    const lookup = vi.fn().mockResolvedValue(true);
    const d = await decideRoute({
      pathname: "/dashboard",
      userId: "user_unknown_claim",
      isAdminClaim: undefined,
      isAdminInDb: lookup,
      previewVendor: true,
      demoMode: false,
    });
    expect(d).toEqual({ kind: "next" });
    expect(lookup).toHaveBeenCalled();
  });

  it("previewVendor cookie has no effect on /admin routes (admin still required)", async () => {
    const d = await decideRoute({
      pathname: "/admin",
      userId: "user_vendor",
      isAdminClaim: false,
      isAdminInDb: noopDb,
      previewVendor: true,
      demoMode: false,
    });
    expect(d).toEqual({ kind: "redirect", to: "/dashboard" });
  });
});
