"use client";

import { useEffect, useRef, useState } from "react";
import { X, ChatCircleText } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/**
 * Vendor-side "request changes" modal. Captures the feedback note
 * (10-2000 chars), POSTs to
 * /api/submissions/:id/vendor-request-changes. Mirrors the admin
 * reject modal pattern (PR 1) for consistency.
 */
export function RequestChangesModal({
  submissionId,
  onClose,
  onRequested,
}: {
  submissionId: number;
  onClose: () => void;
  onRequested: () => void;
}) {
  const [feedback, setFeedback] = useState("");
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
    if (feedback.trim().length < 10) {
      setError(
        "Give the editorial team at least one sentence about what you'd like changed (10+ chars).",
      );
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/submissions/${submissionId}/vendor-request-changes`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ feedback: feedback.trim() }),
        },
      );
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Something went wrong");
        setSubmitting(false);
        return;
      }
      onRequested();
    } catch (err) {
      console.error("[vendor.request_changes] submit failed", err);
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-title"
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
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-coral)]">
              Request changes
            </p>
            <h2
              id="request-title"
              className="mt-3 font-heading text-[24px] leading-tight tracking-tight text-[var(--color-ink)]"
            >
              What would you like adjusted?
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

        <p className="mt-4 max-w-[58ch] text-[13px] leading-relaxed text-[var(--color-ink-2)]">
          Your note goes to the editorial team. They&rsquo;ll review and make
          another pass at your submission.
        </p>

        <label htmlFor="request-feedback" className="sr-only">
          Feedback for the editorial team
        </label>
        <textarea
          ref={textareaRef}
          id="request-feedback"
          rows={6}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="e.g. The tagline rewrite changes the meaning — our product isn't for engineering teams, it's for project managers. Please revert the tagline to my original or use phrasing closer to it."
          maxLength={2000}
          className="mt-4 w-full border border-[var(--color-line-strong)] bg-[var(--color-canvas)] px-3 py-2.5 text-[14px] leading-relaxed text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-ink)] focus:outline-none"
        />
        <p className="mt-1 text-[11px] text-[var(--color-ink-3)]">
          <span className="num">{feedback.length}</span> /{" "}
          <span className="num">2000</span>
        </p>

        {error ? (
          <p
            role="alert"
            className="mt-4 border border-[var(--color-coral)]/40 bg-[var(--color-coral)]/5 px-3 py-2 text-[13px] text-[var(--color-coral)]"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-[var(--color-line)] pt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex h-10 items-center px-4 text-[12px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink)] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={cn(
              "inline-flex h-11 items-center gap-2 bg-[var(--color-ink)] px-5 text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--color-canvas)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-coral)] active:translate-y-[1px]",
              submitting ? "opacity-70" : "hover:bg-[var(--color-ink-2)]",
            )}
          >
            <ChatCircleText size={13} weight="regular" />
            {submitting ? "Sending…" : "Send to editorial"}
          </button>
        </div>
      </form>
    </div>
  );
}
