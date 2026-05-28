"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCircle, Clock, XCircle } from "@phosphor-icons/react";
import { CountrySelect } from "@/components/dashboard/country-select";
import { LogoUploadField } from "@/components/dashboard/logo-upload-field";
import { CompanyProfilePreview } from "@/components/dashboard/company-profile-preview";
import { LeadershipContactsField } from "@/components/dashboard/leadership-contacts-field";
import { lookups, regions } from "@/lib/data/taxonomy";
import { companyStepSchema } from "@/app/api/submissions/schema";
import { cn } from "@/lib/utils";
import type { CompanyEditStatus, VendorWithRegions } from "@/lib/queries/company-edit";
import type {
  LeadershipContactPayload,
  VendorLeadershipContact,
} from "@/lib/queries/vendor-leadership";
import type { VendorMember } from "@/lib/db/schema";

/**
 * Company profile edit form. By design, this MUST mirror the signup
 * wizard's CompanyStep (components/dashboard/submit-wizard.tsx) field
 * for field — same labels, hints, input types, validation rules, and
 * chip behaviour. The only allowed differences are:
 *   - the submit button copy
 *   - the pending / rejected / success banner states (edit-only UX)
 *
 * The duplicated UI primitives below (Field, FieldError, ChipGroup,
 * inputClsWithError, textareaClsWithError, err, GEO_REGION_SLUGS) are
 * copies of the wizard-private helpers. Lifting them into a shared
 * module is tracked in BACKLOG.md as "fix/extract-company-fields" so
 * this drift can't happen again — until then, ANY edit here should be
 * mirrored in submit-wizard.tsx and vice versa.
 */

type Props = {
  vendor: VendorWithRegions;
  vendorMember: VendorMember;
  leadershipContacts: VendorLeadershipContact[];
  editStatus: CompanyEditStatus;
};

type FormState = {
  companyName: string;
  companyWebsite: string;
  companyFounded: string;
  companyHeadquarters: string;
  companyRegions: string[];
  companyDescription: string;
  companyLogoUrl: string | null;
  companyLogoAlt: string;
  leadershipContacts: LeadershipContactPayload[];
};

type FieldErrors = Partial<Record<string, string[]>>;

// Mirror of the wizard's GEO_REGION_SLUGS — geographic regions only,
// excluding the "global" UI meta-chip.
const GEO_REGION_SLUGS = regions
  .filter((r) => r.slug !== "global")
  .map((r) => r.slug);

function vendorToFormState(
  vendor: VendorWithRegions,
  vendorMember: VendorMember,
  leadershipContacts: VendorLeadershipContact[],
): FormState {
  return {
    companyName: vendor.name,
    companyWebsite: vendor.websiteUrl ?? "",
    companyFounded: vendor.foundedYear ? String(vendor.foundedYear) : "",
    companyHeadquarters: vendor.hqCountry ?? "",
    companyRegions: vendor.regionSlugs,
    companyDescription: vendor.description ?? "",
    companyLogoUrl: vendor.logoUrl ?? null,
    companyLogoAlt: "",
    leadershipContacts: leadershipToFormState(
      leadershipContacts,
      vendorMember,
    ),
  };
}

function payloadToFormState(
  payload: Record<string, unknown>,
  vendorMember: VendorMember,
): FormState {
  return {
    companyName: (payload.companyName as string) ?? "",
    companyWebsite: (payload.companyWebsite as string) ?? "",
    companyFounded: (payload.companyFounded as string) ?? "",
    companyHeadquarters: (payload.companyHeadquarters as string) ?? "",
    companyRegions: Array.isArray(payload.companyRegions)
      ? (payload.companyRegions as string[])
      : [],
    companyDescription: (payload.companyDescription as string) ?? "",
    companyLogoUrl: (payload.companyLogoUrl as string | null) ?? null,
    companyLogoAlt: (payload.companyLogoAlt as string) ?? "",
    leadershipContacts: payloadLeadershipToFormState(
      payload.leadershipContacts,
      vendorMember,
    ),
  };
}

function leadershipToFormState(
  rows: VendorLeadershipContact[],
  vendorMember: VendorMember,
): LeadershipContactPayload[] {
  if (rows.length > 0) {
    return rows.map(({ name, title, linkedinUrl }) => ({
      name,
      title,
      linkedinUrl,
    }));
  }
  return [
    {
      name: vendorMember.name,
      title: vendorMember.role ?? "",
      linkedinUrl: vendorMember.linkedinUrl ?? "",
    },
  ];
}

function payloadLeadershipToFormState(
  value: unknown,
  vendorMember: VendorMember,
): LeadershipContactPayload[] {
  if (!Array.isArray(value) || value.length === 0) {
    return leadershipToFormState([], vendorMember);
  }
  return value
    .slice(0, 4)
    .filter(
      (item): item is LeadershipContactPayload =>
        item &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).name === "string" &&
        typeof (item as Record<string, unknown>).title === "string" &&
        typeof (item as Record<string, unknown>).linkedinUrl === "string",
    )
    .map((item) => ({
      name: item.name,
      title: item.title,
      linkedinUrl: item.linkedinUrl,
    }));
}

export function CompanyEditForm({
  vendor,
  vendorMember,
  leadershipContacts,
  editStatus,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isPendingReview = editStatus?.status === "pending_review";
  const isRejected = editStatus?.status === "rejected";

  const initialState: FormState =
    isRejected && editStatus.payload
      ? payloadToFormState(editStatus.payload, vendorMember)
      : vendorToFormState(vendor, vendorMember, leadershipContacts);

  const [data, setData] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const toggleRegion = (slug: string) =>
    setData((d) => ({
      ...d,
      companyRegions: d.companyRegions.includes(slug)
        ? d.companyRegions.filter((s) => s !== slug)
        : [...d.companyRegions, slug],
    }));

  const clearError = (key: string) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const setField = <K extends keyof FormState>(key: K) =>
    (value: FormState[K]) => {
      update(key, value);
      clearError(key as string);
    };

  function validate(): boolean {
    const result = companyStepSchema.safeParse({
      companyName: data.companyName,
      companyWebsite: data.companyWebsite,
      companyFounded: data.companyFounded,
      companyHeadquarters: data.companyHeadquarters,
      companyRegions: data.companyRegions,
      companyDescription: data.companyDescription,
      companyLogoUrl: data.companyLogoUrl ?? "",
      companyLogoAlt: data.companyLogoAlt,
      leadershipContacts: data.leadershipContacts,
    });
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors as FieldErrors;
      setErrors(flat);
      const firstKey = Object.keys(flat)[0];
      if (firstKey) {
        requestAnimationFrame(() => {
          document
            .getElementById(firstKey)
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      }
      return false;
    }
    // Apply transforms (URL normalisation) back into state so the user
    // sees "https://example.com" instead of the raw "example.com" they
    // typed if the POST round-trips an error.
    setData((d) => ({ ...d, ...(result.data as Partial<FormState>) }));
    setErrors({});
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    const body = {
      companyName: data.companyName,
      companyWebsite: data.companyWebsite,
      companyFounded: data.companyFounded,
      companyHeadquarters: data.companyHeadquarters,
      companyRegions: data.companyRegions,
      companyDescription: data.companyDescription,
      companyLogoUrl: data.companyLogoUrl ?? "",
      companyLogoAlt: data.companyLogoAlt,
      leadershipContacts: data.leadershipContacts,
    };

    startTransition(async () => {
      try {
        const res = await fetch("/api/company-edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = (await res.json()) as {
          success?: boolean;
          error?: string;
          fieldErrors?: Record<string, string[]>;
          code?: string;
        };

        if (!res.ok) {
          if (json.fieldErrors) {
            setErrors(json.fieldErrors as FieldErrors);
          }
          setSubmitError(json.error ?? "Something went wrong.");
          return;
        }

        setSubmitted(true);
        router.refresh();
      } catch {
        setSubmitError("Network error — please try again.");
      }
    });
  }

  // ── SUCCESS STATE ─────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex items-start gap-3 border border-emerald-200 bg-emerald-50 p-5">
        <CheckCircle
          size={20}
          weight="fill"
          className="mt-0.5 shrink-0 text-emerald-600"
        />
        <div>
          <p className="font-medium text-emerald-800">
            Edit submitted for review
          </p>
          <p className="mt-1 text-[15px] text-emerald-700">
            The Resolute team will review your changes and publish them shortly.
            You&rsquo;ll see them live on your vendor profile once approved.
          </p>
        </div>
      </div>
    );
  }

  const allGeoSelected = GEO_REGION_SLUGS.every((s) =>
    data.companyRegions.includes(s),
  );

  const previewData = {
    name: data.companyName,
    websiteUrl: data.companyWebsite,
    foundedYear: data.companyFounded,
    hqCountry: data.companyHeadquarters,
    description: data.companyDescription,
    logoUrl: data.companyLogoUrl,
    leadershipContacts: data.leadershipContacts,
    regionsLabel:
      data.companyRegions.length === 0
        ? null
        : allGeoSelected
          ? "All regions"
          : data.companyRegions
              .map((s) => lookups.region.get(s) ?? s)
              .join(", "),
  };

  // ── PENDING STATE — no editable form, preview still shown ─────────
  if (isPendingReview) {
    return (
      // items-start — same fix as the product edit pending state.
      // Without it the short amber banner stretches to match the
      // preview's full height (grid default align-items: stretch);
      // with it the banner sits compact at the top with empty space
      // below.
      <div className="grid items-start gap-10 md:grid-cols-[3fr_2fr] md:gap-12">
        <div className="flex items-start gap-3 border border-amber-200 bg-amber-50 p-5">
          <Clock
            size={20}
            weight="fill"
            className="mt-0.5 shrink-0 text-amber-600"
          />
          <div>
            <p className="font-medium text-amber-800">Edit under review</p>
            <p className="mt-1 text-[15px] text-amber-700">
              Your most recent company profile update is being reviewed by the
              Resolute team. You can&rsquo;t submit another edit until this one
              is processed.
            </p>
          </div>
        </div>
        <aside>
          <CompanyProfilePreview data={previewData} />
        </aside>
      </div>
    );
  }

  // ── REJECTED BANNER (form still editable below) ───────────────────
  const rejectedBanner =
    isRejected && editStatus ? (
      <div className="mb-8 flex items-start gap-3 border border-rose-200 bg-rose-50 p-5">
        <XCircle
          size={20}
          weight="fill"
          className="mt-0.5 shrink-0 text-rose-500"
        />
        <div>
          <p className="font-medium text-rose-800">Edit not approved</p>
          <p className="mt-1 text-[15px] text-rose-700">
            {editStatus.rejectionReason ??
              "The Resolute team rejected your edit. Please review and resubmit."}
          </p>
          <p className="mt-2 text-[14px] text-rose-600">
            The form below is pre-filled with your rejected submission. Make
            your corrections and submit again.
          </p>
        </div>
      </div>
    ) : null;

  // ── EDIT FORM — mirrors wizard's CompanyStep ──────────────────────
  // Wrapped in a split-view: form on the left, live preview on the
  // right at md+ (stacks below on mobile). Preview is a deliberate V.1
  // feature, not part of the wizard's design language — that's the
  // only intentional difference from the wizard's CompanyStep besides
  // the submit button copy, locked slug, and banner states.
  return (
    <div className="grid gap-10 md:grid-cols-[3fr_2fr] md:gap-12">
      <form onSubmit={handleSubmit} noValidate>
        {rejectedBanner}

        <div className="grid gap-6 md:grid-cols-2">
        <div className="md:col-span-2">
          <Field
            label="Company name"
            htmlFor="companyName"
            required
            error={err(errors, "companyName")}
          >
            <input
              id="companyName"
              type="text"
              value={data.companyName}
              onChange={(e) => setField("companyName")(e.target.value)}
              className={inputClsWithError(err(errors, "companyName"))}
              aria-invalid={!!err(errors, "companyName")}
            />
          </Field>
        </div>

        <Field
          label="Company website"
          htmlFor="companyWebsite"
          required
          error={err(errors, "companyWebsite")}
          hint="example.com or https://example.com"
        >
          <input
            id="companyWebsite"
            type="text"
            value={data.companyWebsite}
            onChange={(e) => setField("companyWebsite")(e.target.value)}
            placeholder="example.com"
            className={inputClsWithError(err(errors, "companyWebsite"))}
            aria-invalid={!!err(errors, "companyWebsite")}
          />
        </Field>

        <Field
          label="Year founded"
          htmlFor="companyFounded"
          required
          error={err(errors, "companyFounded")}
        >
          <input
            id="companyFounded"
            type="number"
            inputMode="numeric"
            value={data.companyFounded}
            onChange={(e) => setField("companyFounded")(e.target.value)}
            placeholder="e.g. 2017"
            min={1900}
            max={new Date().getFullYear()}
            className={cn(
              inputClsWithError(err(errors, "companyFounded")),
              "num",
            )}
            aria-invalid={!!err(errors, "companyFounded")}
          />
        </Field>

        <Field
          label="Headquarters country"
          htmlFor="companyHeadquarters"
          required
          hint="Where the company is legally based."
          error={err(errors, "companyHeadquarters")}
        >
          <CountrySelect
            id="companyHeadquarters"
            value={data.companyHeadquarters}
            onChange={(v) => setField("companyHeadquarters")(v)}
          />
        </Field>

        <div id="companyRegions" className="md:col-span-2 scroll-mt-24">
          <ChipGroup
            label="Regions you operate in"
            required
            hint="Pick every region where the company can serve customers."
            options={regions}
            selected={
              allGeoSelected
                ? [...data.companyRegions, "global"]
                : data.companyRegions
            }
            onToggle={(slug) => {
              if (slug === "global") {
                update(
                  "companyRegions",
                  allGeoSelected ? [] : GEO_REGION_SLUGS,
                );
              } else {
                toggleRegion(slug);
              }
              clearError("companyRegions");
            }}
            error={err(errors, "companyRegions")}
          />
        </div>

        <div className="md:col-span-2">
          <Field
            label="Company description"
            htmlFor="companyDescription"
            required
            hint="A brief description of the company. (Product descriptions will come later.)"
            error={err(errors, "companyDescription")}
          >
            <textarea
              id="companyDescription"
              rows={6}
              value={data.companyDescription}
              onChange={(e) => setField("companyDescription")(e.target.value)}
              placeholder="What the company builds. Founding context or distinctive angle."
              maxLength={2000}
              className={textareaClsWithError(err(errors, "companyDescription"))}
              aria-invalid={!!err(errors, "companyDescription")}
            />
            <p className="text-[13px] text-[var(--color-ink-3)]">
              <span className="num">{data.companyDescription.length}</span> /{" "}
              <span className="num">2000</span>
            </p>
          </Field>
        </div>

        <div id="leadershipContacts" className="md:col-span-2 scroll-mt-24">
          <LeadershipContactsField
            contacts={data.leadershipContacts}
            error={err(errors, "leadershipContacts")}
            idPrefix="leadershipContacts"
            onChange={(contacts) => {
              update("leadershipContacts", contacts);
              clearError("leadershipContacts");
            }}
          />
        </div>

        <div id="companyLogoUrl" className="md:col-span-2 scroll-mt-24">
          <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink)]">
            Company logo
          </p>
          <p className="mt-1 text-[16px] text-[var(--color-ink-3)]">
            PNG, JPG, WebP, or SVG up to 1 MB. Square or landscape works best.
          </p>
          <div className="mt-3">
            <LogoUploadField
              scope="vendor_logo"
              value={{
                url: data.companyLogoUrl,
                alt: data.companyLogoAlt,
              }}
              onChange={(next) => {
                update("companyLogoUrl", next.url);
                update("companyLogoAlt", next.alt);
                clearError("companyLogoUrl");
              }}
              error={err(errors, "companyLogoUrl")}
            />
          </div>
        </div>
      </div>

      {/* Honeypot — sr-only input; bots fill every input they see. */}
      <input
        type="text"
        name="honeypot"
        tabIndex={-1}
        aria-hidden
        className="absolute left-[-9999px] opacity-0"
        autoComplete="off"
      />

      {submitError ? (
        <p
          role="alert"
          className="mt-6 text-[14px] text-[var(--color-coral)]"
        >
          {submitError}
        </p>
      ) : null}

        <div className="mt-8 flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-12 items-center gap-2 bg-[var(--color-coral)] px-6 text-[14px] uppercase tracking-[0.2em] text-white transition-opacity disabled:opacity-60"
          >
            {isPending ? "Submitting…" : "Submit edit"}
          </button>
        </div>
      </form>

      <aside>
        <CompanyProfilePreview data={previewData} />
      </aside>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Local copies of wizard-private primitives. Source of truth lives in
// components/dashboard/submit-wizard.tsx — keep these byte-equivalent.
// Tracked in BACKLOG.md as fix/extract-company-fields.
// ──────────────────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-[14px] text-[var(--color-coral)]">
      {message}
    </p>
  );
}

function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={htmlFor}
        className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink)]"
      >
        {label}
        {required ? <span className="text-[var(--color-magenta)]"> *</span> : null}
      </label>
      {children}
      {error ? (
        <FieldError message={error} />
      ) : hint ? (
        <p className="text-[16px] text-[var(--color-ink-3)]">{hint}</p>
      ) : null}
    </div>
  );
}

const inputCls =
  "h-11 w-full border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 text-[16px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-ink)] focus:outline-none";

function inputClsWithError(err?: string | null): string {
  return err
    ? `${inputCls} border-[var(--color-coral)] focus:border-[var(--color-coral)]`
    : inputCls;
}

const textareaCls =
  "border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-2.5 text-[16px] leading-relaxed text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-ink)] focus:outline-none";

function textareaClsWithError(err?: string | null): string {
  return err
    ? `${textareaCls} border-[var(--color-coral)] focus:border-[var(--color-coral)]`
    : textareaCls;
}

function err(errors: FieldErrors, key: string): string | null {
  return errors[key]?.[0] ?? null;
}

function ChipGroup({
  label,
  required,
  hint,
  options,
  selected,
  onToggle,
  error,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  options: { slug: string; name: string }[];
  selected: string[];
  onToggle: (slug: string) => void;
  error?: string | null;
}) {
  return (
    <div>
      <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink)]">
        {label}
        {required ? (
          <span className="text-[var(--color-magenta)]"> *</span>
        ) : null}
      </p>
      {error ? (
        <FieldError message={error} />
      ) : hint ? (
        <p className="mt-1 text-[16px] text-[var(--color-ink-3)]">{hint}</p>
      ) : null}
      <ul className="mt-4 flex flex-wrap gap-2">
        {options.map((opt) => {
          const checked = selected.includes(opt.slug);
          return (
            <li key={opt.slug}>
              <button
                type="button"
                onClick={() => onToggle(opt.slug)}
                aria-pressed={checked}
                className={cn(
                  "inline-flex items-center gap-1.5 border px-3 py-1.5 text-[14px] transition-colors",
                  checked
                    ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-canvas)]"
                    : "border-[var(--color-line-strong)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:border-[var(--color-ink)]",
                )}
              >
                {checked ? <Check size={11} weight="bold" /> : null}
                <span>{opt.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
