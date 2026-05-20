import { describe, it, expect, vi } from "vitest";
import { decideRoute } from "@/lib/auth/middleware-decision";

const noopDb = vi.fn().mockResolvedValue(false);
const adminDb = vi.fn().mockResolvedValue(true);

/**
 * Phase A.1 contract: `isAdminClaim` (boolean from JWT
 * publicMetadata.is_admin) is the hot-path signal; the DB fallback
 * fires only when the claim is undefined.
 *
 * Cross-redirect rules:
 *   - non-admin on /admin/** → /dashboard (NOT /?error=forbidden;
 *     keeps signed-in users inside the authenticated area)
 *   - admin on /dashboard/** → /admin (admins should never see the
 *     vendor UI; covers bookmarked URLs and stale tabs)
 */

describe("decideRoute — unauthenticated", () => {
  it("/dashboard → /login", async () => {
    const d = await decideRoute({
      pathname: "/dashboard",
      userId: null,
      isAdminClaim: undefined,
      isAdminInDb: noopDb,
      previewVendor: false,
      demoMode: false,
    });
    expect(d).toEqual({ kind: "redirect", to: "/login" });
  });

  it("/admin → /admin/login", async () => {
    const d = await decideRoute({
      pathname: "/admin",
      userId: null,
      isAdminClaim: undefined,
      isAdminInDb: noopDb,
      previewVendor: false,
      demoMode: false,
    });
    expect(d).toEqual({ kind: "redirect", to: "/admin/login" });
  });

  it("/ → next", async () => {
    const d = await decideRoute({
      pathname: "/",
      userId: null,
      isAdminClaim: undefined,
      isAdminInDb: noopDb,
      previewVendor: false,
      demoMode: false,
    });
    expect(d).toEqual({ kind: "next" });
  });

  it("/post-signin → /login", async () => {
    const d = await decideRoute({
      pathname: "/post-signin",
      userId: null,
      isAdminClaim: undefined,
      isAdminInDb: noopDb,
      previewVendor: false,
      demoMode: false,
    });
    expect(d).toEqual({ kind: "redirect", to: "/login" });
  });
});

describe("decideRoute — /admin/** (authenticated)", () => {
  it("vendor on /admin → /dashboard (was /?error=forbidden)", async () => {
    const d = await decideRoute({
      pathname: "/admin",
      userId: "user_v",
      isAdminClaim: false,
      isAdminInDb: noopDb,
      previewVendor: false,
      demoMode: false,
    });
    expect(d).toEqual({ kind: "redirect", to: "/dashboard" });
    expect(noopDb).not.toHaveBeenCalled();
  });

  it("admin on /admin → next", async () => {
    const d = await decideRoute({
      pathname: "/admin",
      userId: "user_a",
      isAdminClaim: true,
      isAdminInDb: noopDb,
      previewVendor: false,
      demoMode: false,
    });
    expect(d).toEqual({ kind: "next" });
  });

  it("DB fallback fires when claim is undefined", async () => {
    const d = await decideRoute({
      pathname: "/admin",
      userId: "user_unknown",
      isAdminClaim: undefined,
      isAdminInDb: adminDb,
      previewVendor: false,
      demoMode: false,
    });
    expect(d).toEqual({ kind: "next" });
    expect(adminDb).toHaveBeenCalled();
  });

  it("/admin/login is exempt", async () => {
    const d = await decideRoute({
      pathname: "/admin/login",
      userId: null,
      isAdminClaim: undefined,
      isAdminInDb: noopDb,
      previewVendor: false,
      demoMode: false,
    });
    expect(d).toEqual({ kind: "next" });
  });
});

describe("decideRoute — /dashboard/** (authenticated)", () => {
  it("vendor on /dashboard → next", async () => {
    const d = await decideRoute({
      pathname: "/dashboard",
      userId: "user_v",
      isAdminClaim: false,
      isAdminInDb: noopDb,
      previewVendor: false,
      demoMode: false,
    });
    expect(d).toEqual({ kind: "next" });
    expect(noopDb).not.toHaveBeenCalled();
  });

  it("admin on /dashboard → /admin (cross-redirect)", async () => {
    const d = await decideRoute({
      pathname: "/dashboard/messages",
      userId: "user_a",
      isAdminClaim: true,
      isAdminInDb: noopDb,
      previewVendor: false,
      demoMode: false,
    });
    expect(d).toEqual({ kind: "redirect", to: "/admin" });
  });

  it("DB fallback also fires for /dashboard when claim is undefined", async () => {
    const lookup = vi.fn().mockResolvedValue(true);
    const d = await decideRoute({
      pathname: "/dashboard",
      userId: "user_unknown",
      isAdminClaim: undefined,
      isAdminInDb: lookup,
      previewVendor: false,
      demoMode: false,
    });
    expect(d).toEqual({ kind: "redirect", to: "/admin" });
    expect(lookup).toHaveBeenCalled();
  });
});

describe("decideRoute — /post-signin (authenticated)", () => {
  it("authenticated → next (page does the branching)", async () => {
    const d = await decideRoute({
      pathname: "/post-signin",
      userId: "user_v",
      isAdminClaim: false,
      isAdminInDb: noopDb,
      previewVendor: false,
      demoMode: false,
    });
    expect(d).toEqual({ kind: "next" });
  });
});

describe("decideRoute — DEMO_MODE", () => {
  it("short-circuits everything to next", async () => {
    const d = await decideRoute({
      pathname: "/admin",
      userId: null,
      isAdminClaim: undefined,
      isAdminInDb: vi.fn().mockResolvedValue(false),
      previewVendor: false,
      demoMode: true,
    });
    expect(d).toEqual({ kind: "next" });
  });
});
