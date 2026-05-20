import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * POST /api/admin/exit-preview-vendor — clear the preview_vendor
 * cookie. Phase A.1.1 (renamed for honesty).
 *
 * Used by the dashboard / admin header sign-out handlers to clear
 * the cookie BEFORE Clerk's signOut() redirects the user away. The
 * server action exitVendorPreview() also clears the cookie but ends
 * in a redirect — this route exists so a client fetch() can compose
 * cleanly with the existing await clerk.signOut() flow without
 * redirect interactions.
 *
 * Permissive — no auth check. Anyone holding the cookie can clear
 * it; clearing should be a one-way street out, not gated.
 */
export async function POST() {
  const jar = await cookies();
  jar.delete("preview_vendor");
  return NextResponse.json({ success: true });
}
