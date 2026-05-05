import { NextResponse } from "next/server";
import { recordAppView } from "@/lib/queries/tracking";

/**
 * Page-view counter.
 *
 * POST /api/views/{appId}
 *
 * Called from a tiny client component mounted on the app detail page —
 * one request per page render. ISR caches the page itself, so a server-
 * side increment in the page render would only fire once per
 * revalidation window. Doing it via a separate POST means each visitor
 * triggers one ping regardless of cache state.
 *
 * Returns 204 always (don't waste bytes on a body, don't surface DB
 * errors to the client). Failures log server-side.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ appId: string }> },
) {
  const { appId } = await params;
  const numericId = Number.parseInt(appId, 10);
  if (!Number.isFinite(numericId)) {
    return new NextResponse(null, { status: 400 });
  }
  try {
    await recordAppView(numericId);
  } catch (err) {
    console.error("[views] increment failed", err);
  }
  return new NextResponse(null, { status: 204 });
}
