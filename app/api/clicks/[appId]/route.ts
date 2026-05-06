import { NextResponse, after } from "next/server";
import { recordOutboundClick } from "@/lib/queries/tracking";

/**
 * Outbound-click tracker.
 *
 * GET /api/clicks/{appId}?to=<encoded-vendor-url>
 *
 *   1. Validate appId is numeric.
 *   2. Validate `to` is a real http(s) URL (rejects javascript: / data:
 *      / file: schemes and other open-redirect bait).
 *   3. Schedule the DB log via after() — runs AFTER the response is
 *      sent. On Vercel serverless this keeps the function alive long
 *      enough for the INSERT to complete; on standalone Node it runs
 *      in the same event-loop turn after .end().
 *   4. 302 to the target — fires immediately, no DB latency in the
 *      user-facing path.
 *
 * Tracking failure is silent — the user already got their redirect
 * before we even tried to write.
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

  // Capture headers before scheduling — `req` may be unavailable inside
  // after() depending on runtime.
  const userAgent = req.headers.get("user-agent");
  const referrer = req.headers.get("referer");

  after(async () => {
    try {
      await recordOutboundClick({ appId: numericId, userAgent, referrer });
    } catch (err) {
      console.error("[clicks] log failed", err);
    }
  });

  return NextResponse.redirect(targetUrl.toString(), 302);
}
