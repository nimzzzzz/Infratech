"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin-session";

/**
 * Vendor-flow preview toggle. Phase A.1.1 (renamed for honesty).
 *
 * NOT impersonation — there is no vendor selection, no identity swap,
 * no "act as vendor X" mode. The admin stays themselves the entire
 * time; the toggle just sets a cookie that loosens the middleware
 * rule which would otherwise redirect admins away from /dashboard/**.
 * Result: the admin walks through the vendor flow with their own
 * (typically empty) vendor_members row, useful for QA but not for
 * inspecting a specific vendor's data.
 *
 * The cookie alone doesn't grant access — middleware still requires
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

const COOKIE_NAME = "preview_vendor";
const FOUR_HOURS_SECONDS = 4 * 60 * 60;

/**
 * Admin opts INTO the vendor-flow preview. Re-verifies admin status
 * server-side — server actions are addressable URLs, can't trust the
 * caller is an admin just because the button rendered.
 * getAdminSession() redirects non-admins to /?error=forbidden.
 */
export async function enterVendorPreview() {
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
 * Admin opts back OUT of the vendor-flow preview. Permissive — no
 * admin check here. Anyone holding the cookie can clear it; clearing
 * should be a one-way street out, not gated. (Failure to clear is
 * the worse UX outcome.)
 */
export async function exitVendorPreview() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
  redirect("/admin");
}
