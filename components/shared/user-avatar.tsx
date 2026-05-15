"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * V.2 (2026-05-13) — shared user pill avatar. Renders the LinkedIn
 * profile picture from Clerk when present, falls back to monogram
 * initials when missing OR when the image fetch errors out at
 * runtime (deleted picture, hotlink protection, etc.).
 *
 * Client component because the onError fallback can't be detected
 * server-side; the SSR pass renders the <img> tag and the client
 * runtime swaps to initials if the network request fails. With no
 * avatarUrl prop, both passes render the initials span directly.
 *
 * Plain <img> rather than next/image to keep the CDN domain
 * allowlist empty — Clerk's image_url host can shift (LinkedIn CDN
 * vs Clerk's own img.clerk.com proxy) and a misconfigured allowlist
 * would break the avatar harder than a graceful fallback.
 */
export type UserAvatarProps = {
  avatarUrl: string | null;
  name: string;
  size?: number;
  className?: string;
};

export function UserAvatar({
  avatarUrl,
  name,
  size = 32,
  className,
}: UserAvatarProps) {
  const [errored, setErrored] = useState(false);
  const initials = deriveInitials(name);

  if (!avatarUrl || errored) {
    return (
      <span
        className={cn(
          "grid place-items-center rounded-full bg-[var(--color-canvas-warm)] text-[13px] uppercase tracking-wider text-[var(--color-ink)] ring-1 ring-[var(--color-line-strong)]",
          className,
        )}
        style={{ width: size, height: size }}
        aria-label={name}
      >
        {initials}
      </span>
    );
  }

  return (
    <img
      src={avatarUrl}
      alt={name}
      loading="lazy"
      width={size}
      height={size}
      onError={() => setErrored(true)}
      className={cn(
        "rounded-full object-cover ring-1 ring-[var(--color-line-strong)]",
        className,
      )}
    />
  );
}

function deriveInitials(name: string): string {
  const parts = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return parts || "—";
}
