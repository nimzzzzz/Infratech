"use client";

import { useEffect, useRef, useState } from "react";
import {
  UploadSimple,
  X,
  Plus,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml";
const ACCEPT_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);
const MAX_BYTES = 1024 * 1024; // 1 MB
const MAX_IMAGES = 6;

export type GalleryItem = {
  file: File;
  alt: string;
};

export function GalleryUpload({
  items,
  onChange,
}: {
  items: GalleryItem[];
  onChange: (next: GalleryItem[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_IMAGES - items.length;
    if (remaining <= 0) {
      setError(`Max ${MAX_IMAGES} images.`);
      return;
    }
    const accepted: GalleryItem[] = [];
    for (const file of Array.from(files).slice(0, remaining)) {
      if (!ACCEPT_MIME.has(file.type)) {
        setError("Use PNG, JPG, WebP, or SVG.");
        continue;
      }
      if (file.size > MAX_BYTES) {
        setError(`${file.name} is over 1 MB.`);
        continue;
      }
      accepted.push({ file, alt: "" });
    }
    if (accepted.length > 0) {
      setError(null);
      onChange([...items, ...accepted]);
    }
  };

  const updateAlt = (index: number, alt: string) =>
    onChange(items.map((it, i) => (i === index ? { ...it, alt } : it)));

  const remove = (index: number) =>
    onChange(items.filter((_, i) => i !== index));

  const canAddMore = items.length < MAX_IMAGES;

  return (
    <div className="md:col-span-2">
      <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--color-ink-2)]">
        Gallery <span className="text-[var(--color-ink-3)] normal-case tracking-normal">(optional)</span>
      </p>
      <p className="mt-1 text-[12px] text-[var(--color-ink-3)]">
        Up to {MAX_IMAGES} photos &mdash; office, team, product screenshots,
        events. PNG / JPG / WebP / SVG, max 1 MB each. Each requires alt text.
      </p>

      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item, i) => (
          <GalleryItemRow
            key={i}
            item={item}
            onAltChange={(alt) => updateAlt(i, alt)}
            onRemove={() => remove(i)}
          />
        ))}

        {canAddMore ? (
          <li>
            <label
              className="flex h-full min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface)] px-4 py-6 transition-colors hover:border-[var(--color-ink)] hover:bg-[var(--color-canvas-warm)]/40"
            >
              <span className="grid h-9 w-9 place-items-center bg-[var(--color-canvas)] text-[var(--color-ink-2)] ring-1 ring-[var(--color-line-strong)]">
                {items.length === 0 ? (
                  <UploadSimple size={16} weight="regular" />
                ) : (
                  <Plus size={16} weight="bold" />
                )}
              </span>
              <p className="text-[13px] text-[var(--color-ink)]">
                {items.length === 0 ? "Add gallery photos" : "Add another"}
              </p>
              <p className="text-[11px] text-[var(--color-ink-3)]">
                {items.length} / {MAX_IMAGES} used
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
        <p className="mt-2 text-[12px] text-[var(--color-magenta)]">
          {error}
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
  item: GalleryItem;
  onAltChange: (alt: string) => void;
  onRemove: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(item.file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [item.file]);

  return (
    <li>
      <div className="flex flex-col gap-3 border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-3">
        <div className="flex items-start gap-3">
          <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden border border-[var(--color-line)] bg-[var(--color-canvas)]">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : null}
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="truncate text-[12px] text-[var(--color-ink)]">
              {item.file.name}
            </p>
            <p className="num text-[11px] text-[var(--color-ink-3)]">
              {(item.file.size / 1024).toFixed(0)} KB
            </p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove image"
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center text-[var(--color-ink-3)] transition-colors hover:text-[var(--color-magenta)]",
            )}
          >
            <X size={13} weight="bold" />
          </button>
        </div>
        <input
          type="text"
          value={item.alt}
          onChange={(e) => onAltChange(e.target.value)}
          placeholder="Alt text — describe this image *"
          maxLength={120}
          className="h-9 w-full border border-[var(--color-line-strong)] bg-[var(--color-canvas)] px-3 text-[13px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-ink)] focus:outline-none"
        />
      </div>
    </li>
  );
}
