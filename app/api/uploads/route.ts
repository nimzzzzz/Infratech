import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { env } from "@/lib/env";
import { getVendorSession } from "@/lib/auth/session";
import {
  extensionForMime,
  isValidScope,
  validateUpload,
  type UploadScope,
} from "@/lib/media/upload-limits";

/**
 * Vendor upload endpoint. Accepts `multipart/form-data` with:
 *   - file:  the binary blob
 *   - scope: "vendor_logo" | "app_logo" | "vendor_gallery"
 *   - alt:   alt text (passed back to the caller so the wizard
 *            can stash it in form state; the public alt attribute
 *            sources from submissions.payload, not from here)
 *
 * Auth: vendor session required (open shape — uploads happen
 * during step 1 of the wizard, before the vendor row is created
 * on publish, so `vendor_id` may still be null).
 *
 * Blob key layout:
 *   <scope>/<vendor_id or member-<member_id>>/<timestamp>-<rand>.<ext>
 *
 * The vendor-keyed prefix is intentional — a future cleanup job
 * can list+delete by prefix when a vendor is suspended without
 * scanning every key in the store.
 *
 * Phase C PR 1. Admin uploads land in PR 3 against this same
 * route (different auth path, scope override via body).
 */

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  // Auth gate — open shape; the wizard's step 1 fires uploads
  // before the vendor row exists, so don't require it. The
  // vendorMember row is always present (lazy-create runs on
  // first sign-in).
  let memberId: number;
  let vendorId: number | null;
  try {
    const session = await getVendorSession({ requireOnboarded: false });
    memberId = session.vendorMember.id;
    vendorId = session.vendor?.id ?? null;
  } catch {
    // getVendorSession redirects internally; if it throws here
    // it's because there's no signed-in user.
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify the Vercel Blob token is wired before parsing the
  // body — a clean 503 beats failing inside put() if env isn't
  // configured (dev box without a token, broken deploy, etc.).
  let token: string;
  try {
    token = env.blob().BLOB_READ_WRITE_TOKEN;
  } catch {
    return NextResponse.json(
      { error: "Upload storage isn't configured" },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Body must be multipart/form-data" },
      { status: 400 },
    );
  }

  const scopeRaw = form.get("scope");
  const altRaw = form.get("alt");
  const fileEntry = form.get("file");

  if (typeof scopeRaw !== "string" || !isValidScope(scopeRaw)) {
    return NextResponse.json(
      { error: "Missing or invalid scope", code: "scope" },
      { status: 400 },
    );
  }
  if (!(fileEntry instanceof File)) {
    return NextResponse.json(
      { error: "Missing file", code: "file" },
      { status: 400 },
    );
  }

  const validation = validateUpload(scopeRaw, fileEntry);
  if (validation) {
    return NextResponse.json(
      { error: validation.message, code: validation.kind },
      { status: 400 },
    );
  }

  const scope = scopeRaw as UploadScope;
  const alt = typeof altRaw === "string" ? altRaw.trim().slice(0, 200) : "";

  const keyVendor = vendorId ?? `member-${memberId}`;
  const ext = extensionForMime(fileEntry.type);
  const filename =
    `${scope}/${keyVendor}/` +
    `${Date.now()}-${randomHex(8)}.${ext}`;

  try {
    const blob = await put(filename, fileEntry, {
      access: "public",
      token,
      contentType: fileEntry.type,
    });
    return NextResponse.json({ url: blob.url, alt });
  } catch (err) {
    console.error("[uploads] put failed", err);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 502 },
    );
  }
}

function randomHex(byteCount: number): string {
  const bytes = new Uint8Array(byteCount);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
