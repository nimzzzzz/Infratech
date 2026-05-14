"use client";

import { useState } from "react";
import { LogoUpload } from "./logo-upload";
import type { UploadScope } from "@/lib/media/upload-limits";

/**
 * Network-aware wrapper around <LogoUpload>. The inner component
 * is pure file-state (validates a File, holds it locally); this
 * wrapper kicks off the POST /api/uploads call on file selection
 * and surfaces the resulting Blob URL to the parent.
 *
 * The split is deliberate:
 *   - <LogoUpload> stays trivially testable (no fetch mock).
 *   - PR 3's admin upload reuses <LogoUpload> with a different
 *     network call — same UI, different auth path.
 *
 * Outward shape: `{ url, alt }`. The parent form persists this
 * pair; on submit, only the URL + alt go into the JSON body.
 *
 * Failure modes:
 *   - 400 (size / MIME) → message surfaced inline, file cleared
 *   - 401 / 503 / 5xx   → generic "Upload failed" message
 *   - Network blip      → "Try again" message
 */
export type LogoUploadFieldValue = {
  url: string | null;
  alt: string;
};

export function LogoUploadField({
  scope,
  value,
  onChange,
  error,
}: {
  scope: UploadScope;
  value: LogoUploadFieldValue;
  onChange: (next: LogoUploadFieldValue) => void;
  /** Parent-supplied validation error (e.g. from the wizard's
   *  Zod step check). Distinct from the in-component upload
   *  error — both render, but the Zod one wins visually because
   *  it's about the form state, not the network call. */
  error?: string | null;
}) {
  // We keep a local File copy so <LogoUpload> can render its
  // preview. Once the upload completes, the URL is the source
  // of truth — but the file preview stays visible until the
  // user picks a new file or removes this one.
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const onFileChange = async (next: File | null) => {
    setUploadError(null);
    setFile(next);
    if (!next) {
      onChange({ url: null, alt: value.alt });
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", next);
      fd.append("scope", scope);
      fd.append("alt", value.alt);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      if (!res.ok) {
        const j = (await res
          .json()
          .catch(() => ({}))) as { error?: string };
        setUploadError(j.error ?? "Upload failed");
        setFile(null);
        onChange({ url: null, alt: value.alt });
        return;
      }
      const j = (await res.json()) as { url: string };
      onChange({ url: j.url, alt: value.alt });
    } catch (err) {
      console.error("[logo-upload-field] upload failed", err);
      setUploadError("Network error — try again");
      setFile(null);
      onChange({ url: null, alt: value.alt });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <LogoUpload
        file={file}
        alt={value.alt}
        onFileChange={onFileChange}
        onAltChange={(alt) => onChange({ url: value.url, alt })}
      />
      {uploading ? (
        <p
          role="status"
          aria-live="polite"
          className="mt-2 text-[12px] text-[var(--color-ink-3)]"
        >
          Uploading…
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="mt-2 text-[12px] text-[var(--color-coral)]"
        >
          {error}
        </p>
      ) : null}
      {uploadError ? (
        <p
          role="alert"
          className="mt-2 text-[12px] text-[var(--color-magenta)]"
        >
          {uploadError}
        </p>
      ) : null}
    </div>
  );
}
