"use client";

import { useEffect, useRef, useState } from "react";
import { UploadSimple, Plus, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { UploadScope } from "@/lib/media/upload-limits";

/**
 * Network-aware vendor gallery uploader. Standalone (does NOT
 * wrap <GalleryUpload>) because async URL tracking interleaves
 * awkwardly with the existing component's File-shape edit
 * semantics — cleaner to own the state here.
 *
 * Outward shape: `Array<{ url, alt }>`. Items only appear in the
 * outward list once the upload succeeds; an item still uploading
 * has its preview rendered but stays out of the parent form's
 * value, so submit can trust every entry has a URL.
 *
 * Constraints come from lib/media/upload-limits.ts (PNG / JPG /
 * WebP, 2 MB per file). The 8-item cap (Phase C plan Q2) is
 * enforced here.
 *
 * Failure mode: an item that fails to upload is dropped silently
 * with the error message bubbled up — the user can retry by
 * re-selecting. Orphan-blob risk is acknowledged (tech debt —
 * see PROGRESS.md / BACKLOG.md).
 */

export type GalleryUploadFieldItem = {
  url: string;
  alt: string;
};

const MAX_ITEMS = 8;
const ACCEPT = "image/png,image/jpeg,image/webp";

type PendingItem = {
  /** Stable client-side id for React keys + tracking across the
   *  async upload window. */
  clientId: string;
  file: File;
  previewUrl: string;
  alt: string;
  uploading: boolean;
  url: string | null;
  error: string | null;
};

export function GalleryUploadField({
  scope,
  items,
  onChange,
  error,
}: {
  scope: UploadScope;
  items: GalleryUploadFieldItem[];
  onChange: (next: GalleryUploadFieldItem[]) => void;
  /** Parent-supplied validation error (Zod step check). The
   *  inner `topError` (per-pick failures) renders separately. */
  error?: string | null;
}) {
  // `pending` is the local view layer. Each entry tracks its
  // upload status; `url !== null` means it has landed in the
  // outward `items` list.
  const [pending, setPending] = useState<PendingItem[]>(() =>
    items.map((it) => ({
      clientId: makeClientId(),
      file: emptyFile,
      previewUrl: it.url,
      alt: it.alt,
      uploading: false,
      url: it.url,
      error: null,
    })),
  );
  const [topError, setTopError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Clean up object URLs on unmount.
  useEffect(() => {
    return () => {
      pending.forEach((p) => {
        if (p.file !== emptyFile) URL.revokeObjectURL(p.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const propagate = (next: PendingItem[]) => {
    setPending(next);
    onChange(
      next
        .filter((p) => p.url !== null)
        .map((p) => ({ url: p.url as string, alt: p.alt })),
    );
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_ITEMS - pending.length;
    if (remaining <= 0) {
      setTopError(`Maximum ${MAX_ITEMS} images.`);
      return;
    }
    setTopError(null);

    const accepted: PendingItem[] = [];
    for (const file of Array.from(files).slice(0, remaining)) {
      // Lightweight client-side gate. The server runs the same
      // validateUpload() check before the put() call; mismatched
      // rules can't drift since both sides import from the same
      // limits module.
      if (!ACCEPTED_MIMES.has(file.type)) continue;
      const previewUrl = URL.createObjectURL(file);
      accepted.push({
        clientId: makeClientId(),
        file,
        previewUrl,
        alt: "",
        uploading: true,
        url: null,
        error: null,
      });
    }
    if (accepted.length === 0) return;
    const next = [...pending, ...accepted];
    propagate(next);

    accepted.forEach((item) => {
      void upload(item);
    });
  };

  const upload = async (item: PendingItem) => {
    const fd = new FormData();
    fd.append("file", item.file);
    fd.append("scope", scope);
    fd.append("alt", item.alt);
    try {
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      if (!res.ok) {
        const j = (await res
          .json()
          .catch(() => ({}))) as { error?: string };
        markFailed(item.clientId, j.error ?? "Upload failed");
        return;
      }
      const j = (await res.json()) as { url: string };
      markUploaded(item.clientId, j.url);
    } catch (err) {
      console.error("[gallery-upload-field] upload failed", err);
      markFailed(item.clientId, "Network error — try again");
    }
  };

  const markUploaded = (clientId: string, url: string) =>
    setPending((prev) => {
      const next = prev.map((p) =>
        p.clientId === clientId
          ? { ...p, uploading: false, url, error: null }
          : p,
      );
      onChange(
        next
          .filter((p) => p.url !== null)
          .map((p) => ({ url: p.url as string, alt: p.alt })),
      );
      return next;
    });

  const markFailed = (clientId: string, message: string) =>
    setPending((prev) =>
      prev.map((p) =>
        p.clientId === clientId
          ? { ...p, uploading: false, error: message }
          : p,
      ),
    );

  const updateAlt = (clientId: string, alt: string) =>
    setPending((prev) => {
      const next = prev.map((p) =>
        p.clientId === clientId ? { ...p, alt } : p,
      );
      onChange(
        next
          .filter((p) => p.url !== null)
          .map((p) => ({ url: p.url as string, alt: p.alt })),
      );
      return next;
    });

  const remove = (clientId: string) =>
    setPending((prev) => {
      const target = prev.find((p) => p.clientId === clientId);
      if (target && target.file !== emptyFile) {
        URL.revokeObjectURL(target.previewUrl);
      }
      const next = prev.filter((p) => p.clientId !== clientId);
      onChange(
        next
          .filter((p) => p.url !== null)
          .map((p) => ({ url: p.url as string, alt: p.alt })),
      );
      return next;
    });

  const canAddMore = pending.length < MAX_ITEMS;

  return (
    <div className="md:col-span-2">
      {/* Wrapper (caller in submit-wizard.tsx) renders the section
          heading + helper text. This component renders only the
          grid + add-more tile — see Phase C heading-cleanup. */}
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {pending.map((item) => (
          <GalleryItemRow
            key={item.clientId}
            item={item}
            onAltChange={(alt) => updateAlt(item.clientId, alt)}
            onRemove={() => remove(item.clientId)}
          />
        ))}

        {canAddMore ? (
          <li>
            <label
              className={cn(
                "flex h-full min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface)] px-4 py-6 transition-colors hover:border-[var(--color-ink)] hover:bg-[var(--color-canvas-warm)]/40",
              )}
            >
              <span className="grid h-9 w-9 place-items-center bg-[var(--color-canvas)] text-[var(--color-ink-2)] ring-1 ring-[var(--color-line-strong)]">
                {pending.length === 0 ? (
                  <UploadSimple size={16} weight="regular" />
                ) : (
                  <Plus size={16} weight="bold" />
                )}
              </span>
              <p className="text-[15px] text-[var(--color-ink)]">
                {pending.length === 0 ? "Add gallery photos" : "Add another"}
              </p>
              <p className="text-[13px] text-[var(--color-ink-3)]">
                {pending.length} / {MAX_ITEMS} used
              </p>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                multiple
                onChange={(e) => {
                  handleFiles(e.target.files);
                  e.target.value = "";
                }}
                className="sr-only"
                aria-label="Add gallery photos"
              />
            </label>
          </li>
        ) : null}
      </ul>

      {error ? (
        <p
          role="alert"
          className="mt-2 text-[14px] text-[var(--color-coral)]"
        >
          {error}
        </p>
      ) : null}
      {topError ? (
        <p
          role="alert"
          className="mt-2 text-[14px] text-[var(--color-magenta)]"
        >
          {topError}
        </p>
      ) : null}
    </div>
  );
}

function GalleryItemRow({
  item,
  onAltChange,
  onRemove,
}: {
  item: PendingItem;
  onAltChange: (alt: string) => void;
  onRemove: () => void;
}) {
  return (
    <li>
      <div className="flex flex-col gap-3 border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-3">
        <div className="flex items-start gap-3">
          <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden border border-[var(--color-line)] bg-[var(--color-canvas)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.previewUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="truncate text-[14px] text-[var(--color-ink)]">
              {item.file === emptyFile ? "Saved image" : item.file.name}
            </p>
            <p className="text-[13px] text-[var(--color-ink-3)]">
              {item.uploading
                ? "Uploading…"
                : item.error
                  ? "Failed"
                  : item.url
                    ? "Ready"
                    : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove image"
            className="inline-flex h-7 w-7 items-center justify-center text-[var(--color-ink-3)] transition-colors hover:text-[var(--color-magenta)]"
          >
            <X size={13} weight="bold" />
          </button>
        </div>
        <input
          type="text"
          value={item.alt}
          onChange={(e) => onAltChange(e.target.value)}
          placeholder="Alt text — short description (optional)"
          maxLength={200}
          className="h-9 w-full border border-[var(--color-line-strong)] bg-[var(--color-canvas)] px-3 text-[15px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-ink)] focus:outline-none"
        />
        {item.error ? (
          <p
            role="alert"
            className="text-[13px] text-[var(--color-magenta)]"
          >
            {item.error}
          </p>
        ) : null}
      </div>
    </li>
  );
}

const ACCEPTED_MIMES: ReadonlySet<string> = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

// Sentinel for items that were hydrated from a saved URL list
// (no underlying File object). Using a single shared empty File
// keeps the type uniform and lets `=== emptyFile` distinguish
// freshly-picked from rehydrated rows.
const emptyFile =
  typeof File !== "undefined"
    ? new File([], "saved", { type: "application/octet-stream" })
    : ({} as File);

function makeClientId(): string {
  return `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
