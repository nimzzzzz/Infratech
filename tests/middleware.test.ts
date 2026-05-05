import { describe, it, expect, vi } from "vitest";
import { decideRoute } from "@/lib/auth/middleware-decision";

const noopDbLookup = vi.fn().mockResolvedValue(false);

describe("decideRoute", () => {
  it("a) Unauthenticated → /dashboard redirects to /login", async () => {
    const d = await decideRoute({
      pathname: "/dashboard",
      userId: null,
      role: undefined,
      has2FA: false,
      isAdminInDb: noopDbLookup,
      demoMode: false,
    });
    expect(d).toEqual({ kind: "redirect", to: "/login" });
  });

  it("b) Unauthenticated → /admin redirects to /admin/login", async () => {
    const d = await decideRoute({
      pathname: "/admin",
      userId: null,
      role: undefined,
      has2FA: false,
      isAdminInDb: noopDbLookup,
      demoMode: false,
    });
    expect(d).toEqual({ kind: "redirect", to: "/admin/login" });
  });

  it("c) Unauthenticated → / returns next()", async () => {
    const d = await decideRoute({
      pathname: "/",
      userId: null,
      role: undefined,
      has2FA: false,
      isAdminInDb: noopDbLookup,
      demoMode: false,
    });
    expect(d).toEqual({ kind: "next" });
  });

  it("d) Authenticated as vendor → /admin redirects to /?error=forbidden", async () => {
    const d = await decideRoute({
      pathname: "/admin",
      userId: "user_abc",
      role: "vendor",
      has2FA: false,
      isAdminInDb: noopDbLookup,
      demoMode: false,
    });
    expect(d).toEqual({ kind: "redirect", to: "/?error=forbidden" });
    expect(noopDbLookup).not.toHaveBeenCalled();
  });

  it("e) Authenticated as admin (with 2FA) → /admin returns next()", async () => {
    const d = await decideRoute({
      pathname: "/admin",
      userId: "user_admin",
      role: "admin",
      has2FA: true,
      isAdminInDb: noopDbLookup,
      demoMode: false,
    });
    expect(d).toEqual({ kind: "next" });
  });

  it("f) Authenticated as admin (without 2FA) → /admin redirects to /admin/2fa-setup", async () => {
    const d = await decideRoute({
      pathname: "/admin",
      userId: "user_admin",
      role: "admin",
      has2FA: false,
      isAdminInDb: noopDbLookup,
      demoMode: false,
    });
    expect(d).toEqual({ kind: "redirect", to: "/admin/2fa-setup" });
  });

  it("g) JWT claim missing role + admins row exists → DB fallback allows /admin", async () => {
    const dbLookup = vi.fn().mockResolvedValue(true);
    const d = await decideRoute({
      pathname: "/admin",
      userId: "user_admin",
      role: undefined,
      has2FA: true,
      isAdminInDb: dbLookup,
      demoMode: false,
    });
    expect(d).toEqual({ kind: "next" });
    expect(dbLookup).toHaveBeenCalledTimes(1);
  });

  it("g'') JWT claim missing role + DB says NOT admin → still /?error=forbidden", async () => {
    const dbLookup = vi.fn().mockResolvedValue(false);
    const d = await decideRoute({
      pathname: "/admin",
      userId: "user_admin",
      role: undefined,
      has2FA: true,
      isAdminInDb: dbLookup,
      demoMode: false,
    });
    expect(d).toEqual({ kind: "redirect", to: "/?error=forbidden" });
    expect(dbLookup).toHaveBeenCalledTimes(1);
  });

  it("h) DEMO_MODE bypasses ALL auth checks", async () => {
    // Even unauthenticated /admin should pass through in demo mode.
    const dbLookup = vi.fn();
    const d = await decideRoute({
      pathname: "/admin",
      userId: null,
      role: undefined,
      has2FA: false,
      isAdminInDb: dbLookup,
      demoMode: true,
    });
    expect(d).toEqual({ kind: "next" });
    expect(dbLookup).not.toHaveBeenCalled();
  });

  it("/admin/login is exempt from admin gating (otherwise admins can't log in)", async () => {
    const d = await decideRoute({
      pathname: "/admin/login",
      userId: null,
      role: undefined,
      has2FA: false,
      isAdminInDb: noopDbLookup,
      demoMode: false,
    });
    expect(d).toEqual({ kind: "next" });
  });

  it("/admin/2fa-setup is exempt from the 2FA-required check", async () => {
    // An admin without 2FA still needs to reach this page to set it up.
    const d = await decideRoute({
      pathname: "/admin/2fa-setup",
      userId: "user_admin",
      role: "admin",
      has2FA: false,
      isAdminInDb: noopDbLookup,
      demoMode: false,
    });
    expect(d).toEqual({ kind: "next" });
  });

  it("trusts JWT claim when present and not 'admin' — does NOT fall back to DB", async () => {
    const dbLookup = vi.fn().mockResolvedValue(true);
    const d = await decideRoute({
      pathname: "/admin",
      userId: "user_vendor",
      role: "vendor",
      has2FA: true,
      isAdminInDb: dbLookup,
      demoMode: false,
    });
    expect(d).toEqual({ kind: "redirect", to: "/?error=forbidden" });
    // Crucial: if a vendor's JWT says vendor, we don't escalate them
    // even if the DB has a stale admin row.
    expect(dbLookup).not.toHaveBeenCalled();
  });
});
