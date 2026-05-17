"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CheckCircle,
  PencilSimple,
  XCircle,
  ArrowRight,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { EditForm } from "./edit-form";
import { RejectModal } from "./reject-modal";
import { ProductEditDiffView } from "./product-edit-diff-view";
import { CompanyEditDiffView } from "./company-edit-diff-view";
import type { AppDetail } from "@/lib/queries/apps";
import type { VendorWithRegions } from "@/lib/queries/company-edit";

type SubmissionType = "new" | "claim" | "company_edit" | "product_edit";

type SubmissionWithVendor = {
  id: number;
  type: SubmissionType;
  status: string;
  payload: unknown;
  adminEdits: unknown;
  rejectionReason: string | null;
  vendorFeedback: string | null;
  submittedAt: Date;
  reviewedAt: Date | null;
  publishedAt: Date | null;
  appId: number | null;
  vendor: {
    id: number;
    slug: string;
    name: string;
    contactEmail: string | null;
  };
};

const TYPE_LABEL: Record<string, string> = {
  new: "New product",
  company_edit: "Company edit",
  product_edit: "Product edit",
  claim: "Claim",
};

const TYPE_TONE: Record<string, string> = {
  new: "text-[var(--color-ink-2)] ring-[var(--color-line-strong)]",
  company_edit: "text-violet-700 ring-violet-300",
  product_edit: "text-sky-700 ring-sky-300",
  claim: "text-[var(--color-ink-2)] ring-[var(--color-line-strong)]",
};

export function SubmissionDetail({
  submission,
  liveApp,
  liveVendor,
}: {
  submission: SubmissionWithVendor;
  /** Live current values for a product_edit. RSC fetches via getAppById
   *  when submission.type === "product_edit"; null otherwise. */
  liveApp: AppDetail | null;
  /** Live current values for a company_edit. RSC fetches via
   *  getVendorWithRegions when submission.type === "company_edit"; null
   *  otherwise. */
  liveVendor: VendorWithRegions | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"read" | "edit">("read");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const payload = submission.payload as Record<string, unknown>;
  const edits = submission.adminEdits as Record<string, unknown> | null;

  const canTakeAction = submission.status === "pending_review";
  // admin.edit only makes sense for brand-new product submissions —
  // not for edits (where admin should approve or reject the vendor's
  // proposed change, not edit the edit).
  const canEdit = canTakeAction && submission.type === "new";

  // Title resolution differs by type. For new / product_edit we show
  // the product name; for company_edit we show the company name (from
  // the payload's companyName key).
  const title = (() => {
    if (submission.type === "company_edit") {
      return (
        ((payload?.companyName as string | undefined) ??
          submission.vendor.name) ||
        "—"
      );
    }
    return ((edits?.name ?? payload?.name) as string | undefined) ?? "—";
  })();

  const onApprove = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/submissions/${submission.id}/approve`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        },
      );
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Something went wrong");
        setBusy(false);
        return;
      }
      router.push("/admin/submissions?tab=published");
      router.refresh();
    } catch (err) {
      console.error("[admin.approve] submit failed", err);
      setError("Network error. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <p className="text-[13px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
              {humanStatus(submission.status)}
            </p>
            <TypePill type={submission.type} />
          </div>
          <h1 className="mt-3 font-heading text-[40px] leading-[1.04] tracking-tight md:text-[48px]">
            {title}
          </h1>
          <p className="mt-2 text-[16px] text-[var(--color-ink-2)]">
            from{" "}
            <span className="text-[var(--color-ink)]">
              {submission.vendor.name}
            </span>
            {submission.vendor.contactEmail ? (
              <>
                {" "}
                · {submission.vendor.contactEmail}
              </>
            ) : null}
          </p>
        </div>
      </div>

      {/* Vendor feedback banner — surfaces vendor.request_changes
          notes when the submission has bounced back to admin
          (PR 2 will write to vendorFeedback; PR 1 reads it
          defensively in case of seeded data). */}
      {submission.vendorFeedback ? (
        <aside className="mt-8 border border-amber-300 bg-amber-50 p-4 text-[15px] leading-relaxed text-amber-900">
          <p className="uppercase tracking-[0.18em] text-[13px] mb-1">
            Vendor feedback
          </p>
          <p className="whitespace-pre-wrap">{submission.vendorFeedback}</p>
        </aside>
      ) : null}

      {submission.rejectionReason ? (
        <aside className="mt-8 border border-rose-300 bg-rose-50 p-4 text-[15px] leading-relaxed text-rose-900">
          <p className="uppercase tracking-[0.18em] text-[13px] mb-1">
            Rejection reason on record
          </p>
          <p className="whitespace-pre-wrap">{submission.rejectionReason}</p>
        </aside>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mt-6 border border-[var(--color-coral)]/40 bg-[var(--color-coral)]/5 px-3 py-2 text-[15px] text-[var(--color-coral)]"
        >
          {error}
        </p>
      ) : null}

      {/* Type-branched body. "new" renders the existing ReadView /
          EditForm flow; the two edit types render their diff views
          (no Edit mode — admin.edit is invalid for edit submissions). */}
      {submission.type === "new" ? (
        mode === "read" ? (
          <ReadView payload={payload} adminEdits={edits} />
        ) : (
          <EditForm
            submissionId={submission.id}
            payload={payload}
            existingEdits={edits}
            onCancel={() => setMode("read")}
            onSaved={() => {
              setMode("read");
              router.refresh();
            }}
          />
        )
      ) : submission.type === "product_edit" && liveApp ? (
        <ProductEditDiffView liveApp={liveApp} payload={payload} />
      ) : submission.type === "company_edit" && liveVendor ? (
        <CompanyEditDiffView liveVendor={liveVendor} payload={payload} />
      ) : (
        // Defensive fallback: edit-type submission whose live target
        // was deleted (app unpublished, vendor row gone). Shouldn't
        // happen in normal flow but render something so the admin can
        // still reject it cleanly. (Cleanup of orphaned edit
        // submissions is PR 3 / backlog.)
        <p className="mt-10 border border-rose-200 bg-rose-50 p-4 text-[15px] text-rose-800">
          The live record this edit refers to is no longer available. This
          submission can&rsquo;t be approved — reject it instead.
        </p>
      )}

      {canTakeAction && mode === "read" ? (
        <div className="mt-10 flex flex-col gap-3 border-t border-[var(--color-line)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setRejectOpen(true)}
            disabled={busy}
            className="group inline-flex h-11 items-center gap-2 border border-[var(--color-line-strong)] px-5 text-[14px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] transition-colors hover:border-rose-400 hover:text-rose-700"
          >
            <XCircle size={13} weight="regular" />
            Reject
          </button>
          <div className="flex gap-3">
            {canEdit ? (
              <button
                type="button"
                onClick={() => setMode("edit")}
                disabled={busy}
                className="group inline-flex h-11 items-center gap-2 border border-[var(--color-ink)] px-5 text-[14px] uppercase tracking-[0.18em] text-[var(--color-ink)] transition-colors hover:bg-[var(--color-ink)] hover:text-[var(--color-canvas)]"
              >
                <PencilSimple size={13} weight="regular" />
                Edit
              </button>
            ) : null}
            <button
              type="button"
              onClick={onApprove}
              disabled={busy}
              className={cn(
                "group inline-flex h-11 items-center gap-2 bg-[var(--color-coral)] px-5 text-[14px] uppercase tracking-[0.18em] text-white transition-opacity",
                busy ? "opacity-70" : "",
              )}
            >
              <CheckCircle size={13} weight="regular" />
              {busy ? "Publishing…" : "Approve & publish"}
              <ArrowRight
                size={11}
                weight="bold"
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </button>
          </div>
        </div>
      ) : null}

      {rejectOpen ? (
        <RejectModal
          submissionId={submission.id}
          onClose={() => setRejectOpen(false)}
          onRejected={() => {
            setRejectOpen(false);
            router.push("/admin/submissions?tab=rejected");
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function TypePill({ type }: { type: SubmissionType }) {
  const label = TYPE_LABEL[type] ?? type;
  const tone = TYPE_TONE[type] ?? TYPE_TONE.new;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[13px] uppercase tracking-[0.18em] ring-1",
        tone,
      )}
    >
      {label}
    </span>
  );
}

function ReadView({
  payload,
  adminEdits,
}: {
  payload: Record<string, unknown>;
  adminEdits: Record<string, unknown> | null;
}) {
  const has = (key: string) =>
    adminEdits && adminEdits[key] !== undefined && adminEdits[key] !== null;
  const v = (key: string) =>
    (has(key) ? adminEdits![key] : payload[key]) as
      | string
      | string[]
      | undefined;

  return (
    <section className="mt-10 space-y-8 border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-6 md:p-8">
      {adminEdits ? (
        <p className="text-[13px] uppercase tracking-[0.22em] text-[var(--color-coral)]">
          Showing admin edits (waiting on vendor approval)
        </p>
      ) : null}
      <Row label="Name" value={asString(v("name"))} />
      <Row label="Slug" value={asString(v("slug"))} />
      <Row label="URL" value={asString(v("url"))} />
      <Row label="Tagline" value={asString(v("tagline"))} />
      <Row label="Description" value={asString(v("description"))} multiline />
      <Row label="Stages" value={asArray(v("stages")).join(", ")} />
      <Row label="Capabilities" value={asArray(v("capabilities")).join(", ")} />
      <Row label="Industries" value={asArray(v("industries")).join(", ")} />
      <Row label="Pricing" value={asArray(v("pricingModels")).join(", ")} />
    </section>
  );
}

function Row({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className={multiline ? "" : "grid grid-cols-[140px_1fr] gap-3"}>
      <p className="text-[13px] uppercase tracking-[0.18em] text-[var(--color-ink-3)]">
        {label}
      </p>
      <p
        className={cn(
          "text-[16px] text-[var(--color-ink)]",
          multiline && "mt-1 leading-relaxed whitespace-pre-wrap",
        )}
      >
        {value || (
          <span className="text-[var(--color-ink-3)]">— not set —</span>
        )}
      </p>
    </div>
  );
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function asArray(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]) : [];
}
function humanStatus(s: string): string {
  switch (s) {
    case "pending_review":
      return "Pending review";
    case "edited_awaiting_vendor_approval":
      return "Awaiting vendor approval";
    case "published":
      return "Published";
    case "rejected":
      return "Rejected";
    default:
      return s;
  }
}
