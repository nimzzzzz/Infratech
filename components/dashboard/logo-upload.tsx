"use client";

import { useEffect, useRef, useState } from "react";
import {
  UploadSimple,
  Image as ImageIcon,
  X,
  Check,
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

export type LogoUploadValue = {
  file: File | null;
  alt: string;
};

export function LogoUpload({
  file,
  alt,
  onFileChange,
  onAltChange,
}: {
  file: File | null;
  alt: string;
  onFileChange: (file: File | null) => void;
  onAltChange: (alt: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // generate / clean up preview URL
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const validateAndSet = (next: File | undefined | null) => {
    if (!next) return;
    if (!ACCEPT_MIME.has(next.type)) {
      setError("Use a PNG, JPG, WebP, or SVG.");
      return;
    }
    if (next.size > MAX_BYTES) {
      setError("Logo must be 1 MB or smaller.");
      return;
    }
    setError(null);
    onFileChange(next);
  };

  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    validateAndSet(dropped);
  };

  const onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    validateAndSet(e.target.files?.[0]);
    // reset so re-selecting the same file still fires change
    e.target.value = "";
  };

  const remove = () => {
    onFileChange(null);
    onAltChange("");
    setError(null);
  };

  const sizeLabel = file ? formatBytes(file.size) : "";

  return (
    <div className="md:col-span-2">
      {/* Wrapper (LogoUploadField caller) renders the section
          heading + helper text. This component renders only the
          drop zone + alt input — see Phase C heading-cleanup. */}
      {file && previewUrl ? (
        <div className="mt-3 flex items-start gap-4 border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden border border-[var(--color-line)] bg-[var(--color-canvas)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt=""
              className="h-full w-full object-contain"
            />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="flex items-center gap-1.5 text-[13px] uppercase tracking-[0.18em] text-[var(--color-coral)]">
              <Check size={11} weight="bold" />
              Selected
            </p>
            <p className="truncate font-heading text-[18px] leading-tight">
              {file.name}
            </p>
            <p className="num text-[13px] text-[var(--color-ink-3)]">
              {sizeLabel} &middot; {file.type.replace("image/", "").toUpperCase()}
            </p>
          </div>
          <button
            type="button"
            onClick={remove}
            aria-label="Remove logo"
            className="inline-flex h-8 w-8 items-center justify-center text-[var(--color-ink-3)] transition-colors hover:text-[var(--color-magenta)]"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
      ) : (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn(
            "mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed bg-[var(--color-surface)] px-4 py-8 transition-colors",
            dragOver
              ? "border-[var(--color-coral)] bg-[var(--color-canvas-warm)]"
              : "border-[var(--color-line-strong)] hover:border-[var(--color-ink)] hover:bg-[var(--color-canvas-warm)]/40",
          )}
        >
          <span className="grid h-10 w-10 place-items-center bg-[var(--color-canvas)] text-[var(--color-ink-2)] ring-1 ring-[var(--color-line-strong)]">
            <UploadSimple size={18} weight="regular" />
          </span>
          <p className="text-[15px] text-[var(--color-ink)]">
            <span className="">Click to choose</span>{" "}
            <span className="text-[var(--color-ink-3)]">
              or drop a file here
            </span>
          </p>
          <p className="text-[13px] text-[var(--color-ink-3)]">
            PNG, JPG, WebP, or SVG &middot; up to 1 MB
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            onChange={onSelect}
            className="sr-only"
            aria-label="Upload logo"
          />
        </label>
      )}

      {error ? (
        <p className="mt-2 text-[14px] text-[var(--color-magenta)]">
          {error}
        </p>
      ) : null}

      {file ? (
        <div className="mt-4 flex flex-col gap-2">
          <label
            htmlFor="logoAlt"
            className="flex items-center gap-1.5 text-[14px] uppercase tracking-[0.18em] text-[var(--color-ink-2)]"
          >
            <ImageIcon size={11} weight="regular" />
            Alt text
          </label>
          <input
            id="logoAlt"
            type="text"
            value={alt}
            onChange={(e) => onAltChange(e.target.value)}
            placeholder='e.g. "AllInfratech wordmark in coral"'
            maxLength={100}
            className="h-11 w-full border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 text-[16px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-ink)] focus:outline-none"
          />
          <p className="text-[13px] text-[var(--color-ink-3)]">
            Optional &mdash; short description for accessibility.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
