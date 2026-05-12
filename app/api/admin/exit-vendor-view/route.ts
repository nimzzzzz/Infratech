import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * POST /api/admin/exit-vendor-view — clear the view_as_vendor
 * cookie. Phase A.1.1.
 *
 * Used by the dashboard header's sign-out handler to clear the
 * cookie BEFORE Clerk's signOut() redirects the user away. The
 * server action exitVendorView() also clears the cookie but ends
 * in a redirect — this route exists so a client fetch() can
 * compose cleanly with the existing await clerk.signOut() flow
 * without redirect interactions.
 *
 * Permissive — no auth check. Anyone holding the cookie can clear
 * it; clearing should be a one-way street out, not gated.
 */
export async function POST() {
  const jar = await cookies();
  jar.delete("view_as_vendor");
  return NextResponse.json({ success: true });
}
