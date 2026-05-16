"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Clock, XCircle } from "@phosphor-icons/react";
import { CountrySelect } from "@/components/dashboard/country-select";
import { LogoUploadField } from "@/components/dashboard/logo-upload-field";
import { CompanyProfilePreview } from "@/components/dashboard/company-profile-preview";
import { cn } from "@/lib/utils";
import { EMPLOYEE_BANDS } from "@/app/api/company-edit/schema";
import type { CompanyEditStatus, VendorWithRegions } from "@/lib/queries/company-edit";

type Region = { slug: string; name: string };

type Props = {
  vendor: VendorWithRegions;
  editStatus: CompanyEditStatus;
  availableRegions: Region[];
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
  employeeBand: string;
};

type FieldErrors = Partial<Record<keyof FormState, string[]>>;

function vendorToFormState(vendor: VendorWithRegions): FormState {
  return {
    companyName: vendor.name,
    companyWebsite: vendor.websiteUrl ?? "",
    companyFounded: vendor.foundedYear ? String(vendor.foundedYear) : "",
    companyHeadquarters: vendor.hqCountry ?? "",
    companyRegions: vendor.regionSlugs,
    companyDescription: vendor.description ?? "",
    companyLogoUrl: vendor.logoUrl ?? null,
    companyLogoAlt: "",
    employeeBand: vendor.employeeBand ?? "",
  };
}

function payloadToFormState(payload: Record<string, unknown>): FormState {
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
    employeeBand: (payload.employeeBand as string) ?? "",
  };
}

function toggleRegion(regions: string[], slug: string): string[] {
  return regions.includes(slug)
    ? regions.filter((s) => s !== slug)
    : [...regions, slug];
}

export function CompanyEditForm({
  vendor,
  editStatus,
  availableRegions,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Determine initial edit mode state.
  const isPendingReview = editStatus?.status === "pending_review";
  const isRejected = editStatus?.status === "rejected";

  // Pre-fill from rejected payload so the vendor can fix and resubmit.
  const initialState: FormState =
    isRejected && editStatus.payload
      ? payloadToFormState(editStatus.payload)
      : vendorToFormState(vendor);

  const [form, setForm] = useState<FormState>(initialState);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const regionNameMap = new Map(availableRegions.map((r) => [r.slug, r.name]));

  const previewData = {
    name: form.companyName,
    websiteUrl: form.companyWebsite,
    foundedYear: form.companyFounded,
    hqCountry: form.companyHeadquarters,
    employeeBand: form.employeeBand,
    description: form.companyDescription,
    logoUrl: form.companyLogoUrl,
    regionNames: form.companyRegions
      .filter((s) => s !== "global")
      .map((s) => regionNameMap.get(s) ?? s),
  };

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setFieldErrors({});

    const body = {
      ...form,
      companyLogoUrl: form.companyLogoUrl ?? "",
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
            setFieldErrors(json.fieldErrors as FieldErrors);
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

  // ── PENDING STATE ─────────────────────────────────────────────────
  if (isPendingReview) {
    return (
      <div>
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
        <div className="mt-8">
          <CompanyProfilePreview data={previewData} />
        </div>
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

  // ── EDIT FORM ─────────────────────────────────────────────────────
  return (
    <div>
      {rejectedBanner}
      <div className="grid gap-10 md:grid-cols-[3fr_2fr] md:gap-12">
        {/* FORM */}
        <form onSubmit={handleSubmit} noValidate className="space-y-8">
          {/* Company name */}
          <Field
            label="Company name"
            htmlFor="company-name"
            error={fieldErrors.companyName?.[0]}
            required
          >
            <input
              id="company-name"
              type="text"
              value={form.companyName}
              onChange={(e) => set("companyName", e.target.value)}
              maxLength={200}
              className={inputCls(!!fieldErrors.companyName?.length)}
              placeholder="Acme Corp"
            />
          </Field>

          {/* Website */}
          <Field
            label="Website"
            htmlFor="company-website"
            error={fieldErrors.companyWebsite?.[0]}
            required
          >
            <input
              id="company-website"
              type="url"
              value={form.companyWebsite}
              onChange={(e) => set("companyWebsite", e.target.value)}
              maxLength={500}
              className={inputCls(!!fieldErrors.companyWebsite?.length)}
              placeholder="https://example.com"
            />
          </Field>

          {/* Founded year + Employee band (side by side on md+) */}
          <div className="grid gap-6 sm:grid-cols-2">
            <Field
              label="Founded year"
              htmlFor="company-founded"
              error={fieldErrors.companyFounded?.[0]}
              required
            >
              <input
                id="company-founded"
                type="text"
                inputMode="numeric"
                value={form.companyFounded}
                onChange={(e) => set("companyFounded", e.target.value)}
                maxLength={4}
                className={inputCls(!!fieldErrors.companyFounded?.length)}
                placeholder="2018"
              />
            </Field>
            <Field
              label="Team size"
              htmlFor="employee-band"
              error={fieldErrors.employeeBand?.[0]}
            >
              <select
                id="employee-band"
                value={form.employeeBand}
                onChange={(e) => set("employeeBand", e.target.value)}
                className={cn(inputCls(!!fieldErrors.employeeBand?.length), "appearance-none")}
              >
                <option value="">Select…</option>
                {EMPLOYEE_BANDS.map((b) => (
                  <option key={b} value={b}>
                    {b} employees
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* Headquarters */}
          <Field
            label="Headquarters country"
            htmlFor="company-hq"
            error={fieldErrors.companyHeadquarters?.[0]}
            required
          >
            <CountrySelect
              id="company-hq"
              value={form.companyHeadquarters}
              onChange={(v) => set("companyHeadquarters", v)}
            />
          </Field>

          {/* Regions */}
          <Field
            label="Regions served"
            error={fieldErrors.companyRegions?.[0]}
            hint="Select all regions where you actively operate."
            required
          >
            <div className="mt-2 flex flex-wrap gap-2">
              {availableRegions.map((r) => {
                const active = form.companyRegions.includes(r.slug);
                return (
                  <button
                    key={r.slug}
                    type="button"
                    onClick={() =>
                      set("companyRegions", toggleRegion(form.companyRegions, r.slug))
                    }
                    aria-pressed={active}
                    className={cn(
                      "px-3 py-1.5 text-[13px] uppercase tracking-[0.18em] transition-colors border",
                      active
                        ? "border-[var(--color-coral)] bg-[var(--color-coral)]/10 text-[var(--color-coral)]"
                        : "border-[var(--color-line-strong)] text-[var(--color-ink-2)] hover:border-[var(--color-ink-2)]",
                    )}
                  >
                    {r.name}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Description */}
          <Field
            label="Company description"
            htmlFor="company-description"
            error={fieldErrors.companyDescription?.[0]}
            hint="Describe what your company does. Shown on your vendor profile page."
            required
          >
            <textarea
              id="company-description"
              value={form.companyDescription}
              onChange={(e) => set("companyDescription", e.target.value)}
              maxLength={2000}
              rows={6}
              className={inputCls(!!fieldErrors.companyDescription?.length)}
              placeholder="We build software for infrastructure project teams…"
            />
            <p className="mt-1 text-right text-[12px] text-[var(--color-ink-3)]">
              {form.companyDescription.length}/2000
            </p>
          </Field>

          {/* Logo */}
          <Field
            label="Company logo"
            error={fieldErrors.companyLogoUrl?.[0]}
            hint="PNG or JPG, max 2 MB. Square logos work best."
          >
            <LogoUploadField
              scope="vendor_logo"
              value={{
                url: form.companyLogoUrl,
                alt: form.companyLogoAlt,
              }}
              onChange={(next) => {
                set("companyLogoUrl", next.url);
                set("companyLogoAlt", next.alt);
              }}
              error={fieldErrors.companyLogoUrl?.[0]}
            />
          </Field>

          {/* Honeypot */}
          <input
            type="text"
            name="honeypot"
            tabIndex={-1}
            aria-hidden
            className="absolute left-[-9999px] opacity-0"
            autoComplete="off"
          />

          {/* Global error */}
          {submitError ? (
            <p role="alert" className="text-[14px] text-[var(--color-coral)]">
              {submitError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-12 items-center gap-2 bg-[var(--color-coral)] px-6 text-[14px] uppercase tracking-[0.2em] text-white transition-opacity disabled:opacity-60"
          >
            {isPending ? "Submitting…" : "Submit for review"}
          </button>
        </form>

        {/* PREVIEW */}
        <aside className="hidden md:block">
          <CompanyProfilePreview data={previewData} />
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[14px] font-medium text-[var(--color-ink)]"
      >
        {label}
        {required ? (
          <span className="ml-1 text-[var(--color-coral)]" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      {hint ? (
        <p className="mb-2 text-[13px] text-[var(--color-ink-3)]">{hint}</p>
      ) : null}
      {children}
      {error ? (
        <p role="alert" className="mt-1.5 text-[13px] text-[var(--color-coral)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return cn(
    "w-full border bg-[var(--color-canvas)] px-3 py-2.5 text-[16px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:outline-none focus:ring-2 focus:ring-[var(--color-coral)]/40",
    hasError
      ? "border-[var(--color-coral)]"
      : "border-[var(--color-line-strong)]",
  );
}
