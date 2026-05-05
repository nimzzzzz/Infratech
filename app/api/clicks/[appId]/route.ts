import { NextResponse } from "next/server";
import { recordOutboundClick } from "@/lib/queries/tracking";

/**
 * Outbound-click tracker.
 *
 * GET /api/clicks/{appId}?to=<encoded-vendor-url>
 *
 *   1. Validate appId is numeric.
 *   2. Validate `to` is a real http(s) URL (rejects javascript: / data:
 *      / file: schemes and other open-redirect bait).
 *   3. Fire-and-forget the DB log — never block the redirect on
 *      tracking failures.
 *   4. 302 to the target.
 *
 * The "Visit website" buttons on app detail pages link to this route;
 * the user sees a brief flash of our domain in the tab title before
 * the browser follows the redirect.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ appId: string }> },
) {
  const { appId } = await params;
  const numericId = Number.parseInt(appId, 10);
  if (!Number.isFinite(numericId)) {
    return new NextResponse("Bad request: appId not numeric", { status: 400 });
  }

  const url = new URL(req.url);
  const target = url.searchParams.get("to");
  if (!target) {
    return new NextResponse("Bad request: missing ?to", { status: 400 });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(target);
  } catch {
    return new NextResponse("Bad request: malformed ?to", { status: 400 });
  }
  if (!["http:", "https:"].includes(targetUrl.protocol)) {
    return new NextResponse("Bad request: only http(s) targets allowed", {
      status: 400,
    });
  }

  // Fire-and-forget. Tracking failure must not block the user's redirect.
  recordOutboundClick({
    appId: numericId,
    userAgent: req.headers.get("user-agent"),
    referrer: req.headers.get("referer"),
  }).catch((err) => {
    console.error("[clicks] log failed", err);
  });

  return NextResponse.redirect(targetUrl.toString(), 302);
}
