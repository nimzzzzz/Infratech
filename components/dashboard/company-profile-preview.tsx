"use client";

import {
  Buildings,
  Calendar,
  Globe,
  MapPin,
} from "@phosphor-icons/react";
import { LetterAvatar } from "@/components/browse/letter-avatar";

/**
 * Live preview of the public vendor profile shown next to the company
 * edit form. Visually mirrors the "At a glance" panel + description
 * block from /vendors/[slug] so the vendor sees the impact of an edit
 * before submitting. Reflects current form state only — fields the
 * edit form doesn't collect (employeeBand) aren't shown here even if
 * the vendors row has a value, otherwise the preview would lie about
 * what the edit will actually change.
 *
 * Keep this in sync with app/vendors/[slug]/page.tsx (the "At a
 * glance" rows and the description block). Tracked in BACKLOG.md
 * under fix/extract-company-fields.
 */

type PreviewData = {
  name: string;
  websiteUrl: string;
  foundedYear: string;
  hqCountry: string;
  description: string;
  logoUrl: string | null;
  /** Pre-formatted regions string. "All regions" when all 7 geo
   *  regions are selected, comma-joined names otherwise, null when
   *  the vendor has none. */
  regionsLabel: string | null;
};

export function CompanyProfilePreview({ data }: { data: PreviewData }) {
  const paragraphs = data.description
    .split(/\n\n+/)
    .filter((p) => p.trim().length > 0);

  return (
    <div className="border border-[var(--color-line-strong)] bg-[var(--color-surface)]">
      <div className="border-b border-[var(--color-line)] px-5 py-3">
        <p className="text-[12px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
          Profile preview
        </p>
      </div>

      <div className="p-5 md:p-6">
        <div className="flex items-start gap-4">
          {data.logoUrl ? (
            <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden border border-[var(--color-line)] bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.logoUrl}
                alt=""
                className="h-full w-full object-contain"
              />
            </span>
          ) : (
            <LetterAvatar
              name={data.name || "?"}
              className="h-14 w-14 shrink-0"
            />
          )}
          <div className="min-w-0">
            <p className="font-heading text-[26px] leading-tight tracking-tight md:text-[32px]">
              {data.name || (
                <span className="text-[var(--color-ink-3)]">Company name</span>
              )}
            </p>
            {data.websiteUrl ? (
              <p className="mt-0.5 truncate text-[14px] text-[var(--color-coral)]">
                {data.websiteUrl}
              </p>
            ) : null}
          </div>
        </div>

        <dl className="mt-5 space-y-3 border-t border-[var(--color-line)] pt-5">
          {data.foundedYear ? (
            <PreviewFactRow icon={Calendar} label="Founded">
              <span className="num">{data.foundedYear}</span>
            </PreviewFactRow>
          ) : null}
          {data.hqCountry ? (
            <PreviewFactRow icon={MapPin} label="Headquarters">
              {data.hqCountry}
            </PreviewFactRow>
          ) : null}
          {data.regionsLabel ? (
            <PreviewFactRow icon={Globe} label="Regions served">
              {data.regionsLabel}
            </PreviewFactRow>
          ) : null}
          <PreviewFactRow icon={Buildings} label="Products listed">
            <span className="text-[var(--color-ink-3)]">
              Set on your vendor page
            </span>
          </PreviewFactRow>
        </dl>

        {paragraphs.length > 0 ? (
          <div className="mt-5 space-y-3 border-t border-[var(--color-line)] pt-5">
            {paragraphs.slice(0, 2).map((p, i) => (
              <p
                key={i}
                className="text-[15px] leading-relaxed text-[var(--color-ink)]"
              >
                {p}
              </p>
            ))}
            {paragraphs.length > 2 ? (
              <p className="text-[13px] text-[var(--color-ink-3)]">
                +{paragraphs.length - 2} more{" "}
                {paragraphs.length - 2 === 1 ? "paragraph" : "paragraphs"}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-5 border-t border-[var(--color-line)] pt-5 text-[15px] text-[var(--color-ink-3)]">
            Description will appear here.
          </p>
        )}
      </div>
    </div>
  );
}

function PreviewFactRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{
    size?: number;
    weight?: "regular" | "bold" | "fill";
    className?: string;
  }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-2.5">
      <Icon
        size={13}
        weight="regular"
        className="mt-0.5 shrink-0 text-[var(--color-ink-3)]"
      />
      <div className="min-w-0">
        <dt className="text-[12px] uppercase tracking-[0.2em] text-[var(--color-ink-3)]">
          {label}
        </dt>
        <dd className="text-[15px] text-[var(--color-ink)]">{children}</dd>
      </div>
    </div>
  );
}
