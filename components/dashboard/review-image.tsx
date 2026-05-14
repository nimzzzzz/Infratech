/**
 * URL-based image preview for the wizard review screen. Replaces
 * the old File-based ReviewLogo (Phase C PR 2 swap — wizard form
 * state now holds Blob URLs, not File objects).
 *
 * Same visual treatment as the previous ReviewLogo so the review
 * block layout doesn't shift: 16x16 thumbnail, filename / alt text
 * subline, no remove button (use the Edit jump-link on the
 * ReviewBlock header).
 */
export function ReviewImage({
  label,
  url,
  alt,
}: {
  label: string;
  url: string;
  alt: string;
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-1">
      <dt className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-3)]">
        {label}
      </dt>
      <dd className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden border border-[var(--color-line)] bg-[var(--color-canvas)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="h-full w-full object-contain" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[14px] text-[var(--color-ink)]">
            {alt || (
              <span className="text-[var(--color-magenta)]">
                — alt text missing —
              </span>
            )}
          </span>
        </div>
      </dd>
    </div>
  );
}

/**
 * Compact gallery thumbnail strip for the review screen. Renders
 * up to N images side-by-side; alt text on hover via the title
 * attribute. Empty state is handled by the caller (typically a
 * "— not set —" placeholder via ReviewRow).
 */
export function ReviewGalleryStrip({
  label,
  items,
}: {
  label: string;
  items: Array<{ url: string; alt: string }>;
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-1">
      <dt className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-3)]">
        {label}
      </dt>
      <dd className="flex flex-wrap gap-2">
        {items.length === 0 ? (
          <span className="text-[14px] text-[var(--color-ink-3)]">
            — not set —
          </span>
        ) : (
          items.map((it, i) => (
            <span
              key={i}
              title={it.alt || "Missing alt text"}
              className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden border border-[var(--color-line)] bg-[var(--color-canvas)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={it.url}
                alt=""
                className="h-full w-full object-cover"
              />
            </span>
          ))
        )}
      </dd>
    </div>
  );
}
