"use client";

import { useEffect, useRef, useState } from "react";
import { X, XCircle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/**
 * Reject submission modal. Captures the required reason text and
 * POSTs to /api/admin/submissions/:id/reject. Closes on success or
 * surfaces server validation errors inline.
 *
 * Escape + backdrop-click both close (this is a confirmable reject;
 * harder gating than the legal-acceptance modal which blocks Escape).
 */
export function RejectModal({
  submissionId,
  onClose,
  onRejected,
}: {
  submissionId: number;
  onClose: () => void;
  onRejected: () => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (reason.trim().length < 10) {
      setError("Give the vendor at least one sentence of feedback (10+ chars).");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/admin/submissions/${submissionId}/reject`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason: reason.trim() }),
        },
      );
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Something went wrong");
        setSubmitting(false);
        return;
      }
      onRejected();
    } catch (err) {
      console.error("[admin.reject] submit failed", err);
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-title"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[var(--color-canvas)]/85 px-4 py-8 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <form
        onSubmit={onSubmit}
        className="w-full max-w-xl border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-6 shadow-2xl md:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[13px] uppercase tracking-[0.22em] text-[var(--color-coral)]">
              Reject submission
            </p>
            <h2
              id="reject-title"
              className="mt-3 font-heading text-[26px] leading-tight tracking-tight text-[var(--color-ink)]"
            >
              What needs to change?
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex h-8 w-8 items-center justify-center text-[var(--color-ink-3)] transition-colors hover:text-[var(--color-ink)]"
            aria-label="Close"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        <p className="mt-4 max-w-[58ch] text-[15px] leading-relaxed text-[var(--color-ink-2)]">
          The vendor sees this text verbatim in the rejection email and on
          their dashboard. Be specific so they know what to fix and can
          resubmit cleanly.
        </p>

        <label htmlFor="reject-reason" className="sr-only">
          Rejection reason
        </label>
        <textarea
          ref={textareaRef}
          id="reject-reason"
          rows={6}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. The product description over-promises features the website doesn't list. Trim to factual capabilities and resubmit."
          maxLength={2000}
          className="mt-4 w-full border border-[var(--color-line-strong)] bg-[var(--color-canvas)] px-3 py-2.5 text-[16px] leading-relaxed text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-ink)] focus:outline-none"
        />
        <p className="mt-1 text-[13px] text-[var(--color-ink-3)]">
          <span className="num">{reason.length}</span> /{" "}
          <span className="num">2000</span>
        </p>

        {error ? (
          <p
            role="alert"
            className="mt-4 border border-rose-300 bg-rose-50 px-3 py-2 text-[15px] text-rose-900"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-[var(--color-line)] pt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex h-10 items-center px-4 text-[14px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink)] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={cn(
              "inline-flex h-11 items-center gap-2 bg-rose-600 px-5 text-[14px] uppercase tracking-[0.18em] text-white transition-opacity",
              submitting ? "opacity-70" : "hover:bg-rose-700",
            )}
          >
            <XCircle size={13} weight="regular" />
            {submitting ? "Rejecting…" : "Reject submission"}
          </button>
        </div>
      </form>
    </div>
  );
}
