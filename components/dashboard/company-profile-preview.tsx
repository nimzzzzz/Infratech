"use client";

import { LetterAvatar } from "@/components/browse/letter-avatar";
import { Buildings, Calendar, MapPin, UsersThree } from "@phosphor-icons/react";

type PreviewData = {
  name: string;
  websiteUrl: string;
  foundedYear: string;
  hqCountry: string;
  employeeBand: string;
  description: string;
  logoUrl: string | null;
  regionNames: string[];
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
        {/* Logo + name */}
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

        {/* Facts */}
        <dl className="mt-5 space-y-3 border-t border-[var(--color-line)] pt-5">
          {data.foundedYear ? (
            <div className="flex items-baseline gap-2.5">
              <Calendar
                size={13}
                weight="regular"
                className="mt-0.5 shrink-0 text-[var(--color-ink-3)]"
              />
              <div>
                <dt className="text-[12px] uppercase tracking-[0.2em] text-[var(--color-ink-3)]">
                  Founded
                </dt>
                <dd className="num text-[15px] text-[var(--color-ink)]">
                  {data.foundedYear}
                </dd>
              </div>
            </div>
          ) : null}
          {data.employeeBand ? (
            <div className="flex items-baseline gap-2.5">
              <UsersThree
                size={13}
                weight="regular"
                className="mt-0.5 shrink-0 text-[var(--color-ink-3)]"
              />
              <div>
                <dt className="text-[12px] uppercase tracking-[0.2em] text-[var(--color-ink-3)]">
                  Team size
                </dt>
                <dd className="text-[15px] text-[var(--color-ink)]">
                  {data.employeeBand}
                </dd>
              </div>
            </div>
          ) : null}
          {data.hqCountry ? (
            <div className="flex items-baseline gap-2.5">
              <MapPin
                size={13}
                weight="regular"
                className="mt-0.5 shrink-0 text-[var(--color-ink-3)]"
              />
              <div>
                <dt className="text-[12px] uppercase tracking-[0.2em] text-[var(--color-ink-3)]">
                  Headquarters
                </dt>
                <dd className="text-[15px] text-[var(--color-ink)]">
                  {data.hqCountry}
                </dd>
              </div>
            </div>
          ) : null}
          {data.regionNames.length > 0 ? (
            <div className="flex items-baseline gap-2.5">
              <Buildings
                size={13}
                weight="regular"
                className="mt-0.5 shrink-0 text-[var(--color-ink-3)]"
              />
              <div>
                <dt className="text-[12px] uppercase tracking-[0.2em] text-[var(--color-ink-3)]">
                  Regions served
                </dt>
                <dd className="text-[15px] text-[var(--color-ink)]">
                  {data.regionNames.join(", ")}
                </dd>
              </div>
            </div>
          ) : null}
        </dl>

        {/* Description */}
        {paragraphs.length > 0 ? (
          <div className="mt-5 border-t border-[var(--color-line)] pt-5 space-y-3">
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
