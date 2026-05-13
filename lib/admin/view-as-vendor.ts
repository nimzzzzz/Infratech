"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin-session";

/**
 * View-as-vendor toggle. Phase A.1.1.
 *
 * Admins are normally redirected from /dashboard/** to /admin by
 * middleware. The toggle sets a session cookie that loosens that
 * redirect rule so admins can QA the vendor flow. The cookie alone
 * doesn't grant access — middleware still requires
 * `is_admin === true` AND the cookie present.
 *
 * Cookie attributes:
 *   HttpOnly  — no JS read; only the middleware reads it
 *   Secure    — prod only; local dev runs over HTTP
 *   SameSite  — Lax (matches Clerk's session cookie)
 *   Path      — / (read on every request)
 *   Max-Age   — 4 hours (auto-cleanup if admin forgets)
 *
 * Server actions, not API routes — one-way state mutation that ends
 * in a redirect. Form-action wiring gives free progressive
 * enhancement, no client JS state, no double-submit risk.
 */

const COOKIE_NAME = "view_as_vendor";
const FOUR_HOURS_SECONDS = 4 * 60 * 60;

/**
 * Admin opts INTO vendor view. Re-verifies admin status server-side
 * — server actions are addressable URLs, can't trust the caller is
 * an admin just because the button rendered. getAdminSession()
 * redirects non-admins to /?error=forbidden.
 */
export async function enterVendorView() {
  await getAdminSession();
  const jar = await cookies();
  jar.set(COOKIE_NAME, "true", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: FOUR_HOURS_SECONDS,
  });
  redirect("/dashboard");
}

/**
 * Admin opts back OUT of vendor view. Permissive — no admin check
 * here. Anyone holding the cookie can clear it; clearing should be
 * a one-way street out, not gated. (Failure to clear is the worse
 * UX outcome.)
 */
export async function exitVendorView() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
  redirect("/admin");
}
