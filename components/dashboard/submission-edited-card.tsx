"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  ChatCircleText,
  ArrowRight,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { diffPayload } from "@/lib/submissions/diff";
import { SubmissionDiffView } from "./submission-diff-view";
import { RequestChangesModal } from "./request-changes-modal";

/**
 * Top-of-dashboard card for submissions in
 * `edited_awaiting_vendor_approval`. Renders the diff (admin's
 * edits vs the vendor's original payload) and the two primary
 * actions: Approve & publish (POST vendor-approve) or Request
 * changes (opens the feedback modal → POST vendor-request-changes).
 *
 * Server passes `payload` (the original submission) and
 * `adminEdits` (the admin's full post-edit copy) — same fields
 * driving the admin detail page's "Showing admin edits" banner
 * mirror.
 */
export function SubmissionEditedCard({
  submissionId,
  productName,
  payload,
  adminEdits,
}: {
  submissionId: number;
  productName: string;
  payload: Record<string, unknown> | null;
  adminEdits: Record<string, unknown> | null;
}) {
  const router = useRouter();
  const [requestOpen, setRequestOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const diff = diffPayload(payload, adminEdits);

  const onApprove = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/submissions/${submissionId}/vendor-approve`,
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
      // Success — refresh the dashboard. The card unmounts (status
      // is now published; the dashboard listings query picks up the
      // new apps row).
      router.refresh();
    } catch (err) {
      console.error("[vendor.approve] submit failed", err);
      setError("Network error. Please try again.");
      setBusy(false);
    }
  };

  return (
    <section className="mb-10 border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-6 md:p-8">
      <p className="text-[13px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
        Edits waiting on your approval
      </p>
      <h2 className="mt-3 font-heading text-[30px] leading-tight tracking-tight text-[var(--color-ink)] md:text-[34px]">
        We&rsquo;ve polished {productName}.
      </h2>
      <p className="mt-3 max-w-[60ch] text-[16px] leading-relaxed text-[var(--color-ink-2)] md:text-[17px]">
        Our editorial team made some edits. Review them below — approve to
        publish, or send the submission back with a note if anything looks
        off.
      </p>

      <div className="mt-8 border-t border-[var(--color-line)] pt-6">
        <SubmissionDiffView diff={diff} />
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-6 border border-[var(--color-coral)]/40 bg-[var(--color-coral)]/5 px-3 py-2 text-[15px] text-[var(--color-coral)]"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-8 flex flex-col gap-3 border-t border-[var(--color-line)] pt-6 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => setRequestOpen(true)}
          disabled={busy}
          className="group inline-flex h-11 items-center gap-2 border border-[var(--color-line-strong)] px-5 text-[14px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] transition-colors hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]"
        >
          <ChatCircleText size={13} weight="regular" />
          Request changes
        </button>
        <button
          type="button"
          onClick={onApprove}
          disabled={busy}
          className={cn(
            "group inline-flex h-11 items-center gap-2 bg-[var(--color-coral)] px-5 text-[14px] uppercase tracking-[0.18em] text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-magenta)] active:translate-y-[1px]",
            busy ? "opacity-70" : "hover:bg-[var(--color-coral-deep)]",
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

      {requestOpen ? (
        <RequestChangesModal
          submissionId={submissionId}
          onClose={() => setRequestOpen(false)}
          onRequested={() => {
            setRequestOpen(false);
            router.refresh();
          }}
        />
      ) : null}
    </section>
  );
}
