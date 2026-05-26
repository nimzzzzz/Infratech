"use client";

import { SubmissionDiffView } from "@/components/dashboard/submission-diff-view";
import {
  diffPayload,
  PRODUCT_EDIT_DIFF_FIELDS,
} from "@/lib/submissions/diff";
import type { AppDetail } from "@/lib/queries/apps";

/**
 * Admin-side diff for a product_edit submission. Shows the LIVE
 * current values on the left, the vendor's proposed payload on the
 * right. Reuses the SubmissionDiffView renderer with overridden
 * column labels.
 *
 * The "live original" is an AppDetail (from getAppById). To compare
 * against the payload (which uses payload-style keys: url,
 * productLogoUrl, etc.) we project the AppDetail into the same key
 * shape — that's the only adapter needed; the diff engine handles
 * the rest.
 *
 * Media changes (logo, video, screenshots) are intentionally NOT in
 * the text-diff field set — they render as a separate block below
 * so the admin can eyeball image / video proposals directly.
 */
export function ProductEditDiffView({
  liveApp,
  payload,
}: {
  liveApp: AppDetail;
  payload: Record<string, unknown>;
}) {
  const liveAsPayload = liveAppToPayloadShape(liveApp);
  const diff = diffPayload(liveAsPayload, payload, PRODUCT_EDIT_DIFF_FIELDS);

  return (
    <section className="mt-10 space-y-8">
      <div className="border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-6 md:p-8">
        <p className="text-[13px] uppercase tracking-[0.22em] text-[var(--color-coral)]">
          Proposed edit
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-ink-2)]">
          The vendor proposed the following changes to{" "}
          <span className="text-[var(--color-ink)]">{liveApp.name}</span>. The
          slug is locked — the URL{" "}
          <span className="num text-[var(--color-ink)]">
            /apps/{liveApp.slug}
          </span>{" "}
          stays the same.
        </p>
        <div className="mt-6 border-t border-[var(--color-line)] pt-6">
          <SubmissionDiffView
            diff={diff}
            originalLabel="Current live values"
            editedLabel="Proposed update"
            emptyMessage="The proposed payload matches the live product on every editable field — no copy / taxonomy changes."
          />
        </div>
      </div>

      <MediaDiffBlock liveApp={liveApp} payload={payload} />
    </section>
  );
}

function liveAppToPayloadShape(app: AppDetail): Record<string, unknown> {
  return {
    name: app.name,
    slug: app.slug,
    url: app.websiteUrl,
    appleAppStoreUrl: app.appleAppStoreUrl ?? "",
    googlePlayUrl: app.googlePlayUrl ?? "",
    tagline: app.tagline ?? "",
    description: app.description ?? "",
    stages: app.stages.map((s) => s.slug),
    capabilities: app.capabilities.map((c) => c.slug),
    industries: app.industries.map((i) => i.slug),
    pricingModels: app.pricingModels.map((p) => p.slug),
    // Media fields — rendered separately, not text-diff'd.
    productLogoUrl: app.logoUrl,
    videoUrl: app.videoUrl,
    productGallery: app.screenshots.map((s) => ({
      url: s.url,
      alt: s.alt,
      position: s.position,
    })),
  };
}

function MediaDiffBlock({
  liveApp,
  payload,
}: {
  liveApp: AppDetail;
  payload: Record<string, unknown>;
}) {
  const proposedLogo = stringOrNull(payload.productLogoUrl);
  const proposedVideo = stringOrNull(payload.videoUrl);
  const proposedGallery = Array.isArray(payload.productGallery)
    ? (payload.productGallery as Array<{ url: string; alt: string }>)
    : [];

  const logoChanged = proposedLogo !== (liveApp.logoUrl ?? null);
  const videoChanged = proposedVideo !== (liveApp.videoUrl ?? null);
  const galleryChanged =
    proposedGallery.length !== liveApp.screenshots.length ||
    proposedGallery.some(
      (g, i) =>
        g.url !== liveApp.screenshots[i]?.url ||
        g.alt !== liveApp.screenshots[i]?.alt,
    );

  if (!logoChanged && !videoChanged && !galleryChanged) {
    return null;
  }

  return (
    <div className="border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-6 md:p-8">
      <p className="text-[13px] uppercase tracking-[0.22em] text-[var(--color-coral)]">
        Media changes
      </p>

      {logoChanged ? (
        <SideBySide
          label="Logo"
          original={
            liveApp.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={liveApp.logoUrl}
                alt=""
                className="h-24 w-24 border border-[var(--color-line)] bg-white object-contain p-2"
              />
            ) : (
              <NoValue />
            )
          }
          proposed={
            proposedLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={proposedLogo}
                alt=""
                className="h-24 w-24 border border-[var(--color-coral)] bg-white object-contain p-2"
              />
            ) : (
              <NoValue />
            )
          }
        />
      ) : null}

      {videoChanged ? (
        <SideBySide
          label="Video URL"
          original={
            liveApp.videoUrl ? (
              <p className="break-all text-[14px] text-[var(--color-ink-2)]">
                {liveApp.videoUrl}
              </p>
            ) : (
              <NoValue />
            )
          }
          proposed={
            proposedVideo ? (
              <p className="break-all text-[14px] text-[var(--color-ink)]">
                {proposedVideo}
              </p>
            ) : (
              <NoValue />
            )
          }
        />
      ) : null}

      {galleryChanged ? (
        <SideBySide
          label={`Screenshots (${liveApp.screenshots.length} → ${proposedGallery.length})`}
          original={<GalleryStrip items={liveApp.screenshots} highlighted={false} />}
          proposed={<GalleryStrip items={proposedGallery} highlighted />}
        />
      ) : null}
    </div>
  );
}

function SideBySide({
  label,
  original,
  proposed,
}: {
  label: string;
  original: React.ReactNode;
  proposed: React.ReactNode;
}) {
  return (
    <div className="mt-6 first:mt-0">
      <p className="text-[13px] uppercase tracking-[0.18em] text-[var(--color-ink-3)]">
        {label}
      </p>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-2 text-[12px] uppercase tracking-[0.18em] text-[var(--color-ink-3)]">
            Current
          </p>
          {original}
        </div>
        <div>
          <p className="mb-2 text-[12px] uppercase tracking-[0.18em] text-[var(--color-coral)]">
            Proposed
          </p>
          {proposed}
        </div>
      </div>
    </div>
  );
}

function GalleryStrip({
  items,
  highlighted,
}: {
  items: Array<{ url: string; alt: string }>;
  highlighted: boolean;
}) {
  if (items.length === 0) return <NoValue />;
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <li key={`${item.url}-${i}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.url}
            alt={item.alt}
            className={
              "h-16 w-24 border object-cover " +
              (highlighted
                ? "border-[var(--color-coral)]"
                : "border-[var(--color-line)]")
            }
          />
        </li>
      ))}
    </ul>
  );
}

function NoValue() {
  return (
    <p className="text-[14px] text-[var(--color-ink-3)]">— not set —</p>
  );
}

function stringOrNull(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}
