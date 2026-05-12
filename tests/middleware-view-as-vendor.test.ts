import { describe, it, expect, vi } from "vitest";
import { decideRoute } from "@/lib/auth/middleware-decision";

/**
 * Phase A.1.1 — view-as-vendor toggle. Cookie loosens the admin
 * → /admin redirect rule on /dashboard/** when the actor is an
 * admin AND the cookie is set. Cookie alone doesn't grant access:
 * is_admin is still required.
 */

const noopDb = vi.fn().mockResolvedValue(false);

describe("decideRoute — view-as-vendor cookie (Phase A.1.1)", () => {
  it("admin + viewAsVendor=true on /dashboard → next (loosens the redirect)", async () => {
    const d = await decideRoute({
      pathname: "/dashboard",
      userId: "user_admin",
      isAdminClaim: true,
      has2FA: true,
      isAdminInDb: noopDb,
      viewAsVendor: true,
      demoMode: false,
    });
    expect(d).toEqual({ kind: "next" });
    expect(noopDb).not.toHaveBeenCalled();
  });

  it("admin WITHOUT viewAsVendor on /dashboard → /admin (existing behavior preserved)", async () => {
    const d = await decideRoute({
      pathname: "/dashboard/messages",
      userId: "user_admin",
      isAdminClaim: true,
      has2FA: true,
      isAdminInDb: noopDb,
      viewAsVendor: false,
      demoMode: false,
    });
    expect(d).toEqual({ kind: "redirect", to: "/admin" });
  });

  it("non-admin + viewAsVendor=true on /dashboard → next (cookie alone is meaningless)", async () => {
    const d = await decideRoute({
      pathname: "/dashboard",
      userId: "user_vendor",
      isAdminClaim: false,
      has2FA: false,
      isAdminInDb: noopDb,
      viewAsVendor: true,
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
      has2FA: true,
      isAdminInDb: lookup,
      viewAsVendor: true,
      demoMode: false,
    });
    expect(d).toEqual({ kind: "next" });
    expect(lookup).toHaveBeenCalled();
  });

  it("viewAsVendor cookie has no effect on /admin routes (admin still required)", async () => {
    const d = await decideRoute({
      pathname: "/admin",
      userId: "user_vendor",
      isAdminClaim: false,
      has2FA: false,
      isAdminInDb: noopDb,
      viewAsVendor: true,
      demoMode: false,
    });
    expect(d).toEqual({ kind: "redirect", to: "/dashboard" });
  });
});
