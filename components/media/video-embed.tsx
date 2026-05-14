import { toEmbedSrc } from "@/lib/media/video";

/**
 * 16:9 video embed for the product detail page. YouTube or Vimeo
 * only — source URLs are validated + normalised server-side
 * (lib/media/video.ts) before being persisted. The client passes
 * through `toEmbedSrc` defensively in case a pre-normalisation
 * value somehow lands in the DB; renders nothing if normalisation
 * fails (the data-layer contract is "stored value is a normalised
 * embed URL", so the fallback is unreachable unless that contract
 * breaks).
 *
 * iframe security notes:
 *   - No `sandbox=""` attribute. YouTube's player breaks under
 *     full sandboxing; the iframe origin is the player's domain,
 *     so XSS isolation is upstream rather than ours.
 *   - `loading="lazy"` keeps the player JS off the initial paint
 *     so a long product page doesn't pay the cost when the video
 *     is below the fold.
 *   - `referrerPolicy="strict-origin-when-cross-origin"` is the
 *     modern default; locks down what the player sees about the
 *     referring page.
 *
 * Phase C — see plan PR 1. Vendor terms call out an exception for
 * curated video embeds in CLAUDE.md.
 */
export function VideoEmbed({ url }: { url: string | null | undefined }) {
  if (!url) return null;
  const src = toEmbedSrc(url);
  if (!src) return null;
  return (
    <div
      className="relative w-full overflow-hidden border border-[var(--color-line-strong)] bg-black"
      style={{ aspectRatio: "16 / 9" }}
    >
      <iframe
        src={src}
        title="Product video"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        className="absolute inset-0 h-full w-full"
      />
    </div>
  );
}
