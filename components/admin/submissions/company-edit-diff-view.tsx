"use client";

import { SubmissionDiffView } from "@/components/dashboard/submission-diff-view";
import {
  diffPayload,
  COMPANY_EDIT_DIFF_FIELDS,
} from "@/lib/submissions/diff";
import type { VendorWithRegions } from "@/lib/queries/company-edit";

/**
 * Admin-side diff for a company_edit submission. Shows the LIVE
 * current vendor values on the left, the vendor's proposed payload
 * on the right. Reuses SubmissionDiffView; the only adapter is the
 * projection from a vendors row into the payload's key shape (the
 * payload uses companyName / companyWebsite / etc).
 */
export function CompanyEditDiffView({
  liveVendor,
  payload,
}: {
  liveVendor: VendorWithRegions;
  payload: Record<string, unknown>;
}) {
  const liveAsPayload = liveVendorToPayloadShape(liveVendor);
  const proposedAsPayload = {
    ...payload,
    leadershipContacts: leadershipContactsToLabels(payload.leadershipContacts),
  };
  const diff = diffPayload(
    liveAsPayload,
    proposedAsPayload,
    COMPANY_EDIT_DIFF_FIELDS,
  );

  const proposedLogo = stringOrNull(payload.companyLogoUrl);
  const logoChanged = proposedLogo !== (liveVendor.logoUrl ?? null);

  return (
    <section className="mt-10 space-y-8">
      <div className="border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-6 md:p-8">
        <p className="text-[13px] uppercase tracking-[0.22em] text-[var(--color-coral)]">
          Proposed edit
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-ink-2)]">
          The vendor proposed the following changes to{" "}
          <span className="text-[var(--color-ink)]">{liveVendor.name}</span>.
          The slug is locked — the URL{" "}
          <span className="num text-[var(--color-ink)]">
            /vendors/{liveVendor.slug}
          </span>{" "}
          stays the same.
        </p>
        <div className="mt-6 border-t border-[var(--color-line)] pt-6">
          <SubmissionDiffView
            diff={diff}
            originalLabel="Current live values"
            editedLabel="Proposed update"
            emptyMessage="The proposed payload matches the live company profile on every editable field — nothing actually changes."
          />
        </div>
      </div>

      {logoChanged ? (
        <div className="border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-6 md:p-8">
          <p className="text-[13px] uppercase tracking-[0.22em] text-[var(--color-coral)]">
            Logo change
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-[12px] uppercase tracking-[0.18em] text-[var(--color-ink-3)]">
                Current
              </p>
              {liveVendor.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={liveVendor.logoUrl}
                  alt=""
                  className="h-24 w-24 border border-[var(--color-line)] bg-white object-contain p-2"
                />
              ) : (
                <p className="text-[14px] text-[var(--color-ink-3)]">
                  — not set —
                </p>
              )}
            </div>
            <div>
              <p className="mb-2 text-[12px] uppercase tracking-[0.18em] text-[var(--color-coral)]">
                Proposed
              </p>
              {proposedLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={proposedLogo}
                  alt=""
                  className="h-24 w-24 border border-[var(--color-coral)] bg-white object-contain p-2"
                />
              ) : (
                <p className="text-[14px] text-[var(--color-ink-3)]">
                  — not set —
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function liveVendorToPayloadShape(
  vendor: VendorWithRegions,
): Record<string, unknown> {
  return {
    companyName: vendor.name,
    companyWebsite: vendor.websiteUrl ?? "",
    companyFounded: vendor.foundedYear ? String(vendor.foundedYear) : "",
    companyHeadquarters: vendor.hqCountry ?? "",
    companyRegions: vendor.regionSlugs,
    companyDescription: vendor.description ?? "",
    companyLogoUrl: vendor.logoUrl ?? "",
    leadershipContacts: vendor.leadershipContacts.map(
      (contact) => `${contact.name} — ${contact.title}`,
    ),
  };
}

function stringOrNull(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function leadershipContactsToLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (
        contact,
      ): contact is { name: string; title: string; linkedinUrl?: string } =>
        contact &&
        typeof contact === "object" &&
        typeof (contact as Record<string, unknown>).name === "string" &&
        typeof (contact as Record<string, unknown>).title === "string",
    )
    .map((contact) => `${contact.name} — ${contact.title}`);
}
