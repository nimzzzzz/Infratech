"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, WarningCircle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/**
 * Modal that confirms a product flag with an optional reason. The
 * reason (if provided) is stored on the audit_log row and rendered
 * verbatim in the vendor's notification email. If left blank, a
 * generic email body is sent.
 *
 * Mirrors SuspendModal (suspend-modal.tsx) but scoped to a single
 * product — only the flagged listing is hidden, the rest of the
 * vendor stays public.
 */
export function FlagModal({
  appId,
  appName,
  hasContactEmail,
  onClose,
}: {
  appId: number;
  appName: string;
  hasContactEmail: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onConfirm = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/apps/${appId}/flag`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reason: reason.trim() ? reason.trim() : undefined,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Something went wrong");
        setBusy(false);
        return;
      }
      setDone(true);
      setBusy(false);
    } catch (err) {
      console.error("[flag-modal] submit failed", err);
      setError("Network error. Please try again.");
      setBusy(false);
    }
  };

  const closeAndRefresh = () => {
    onClose();
    router.refresh();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-night)]/60 p-4"
    >
      <div className="w-full max-w-lg bg-[var(--color-canvas)] p-6 md:p-8">
        <h2 className="font-heading text-[24px] leading-tight tracking-tight md:text-[28px]">
          {done ? `${appName} has been flagged.` : `Flag ${appName}?`}
        </h2>

        {done ? (
          <div className="mt-5 space-y-3">
            <p className="text-[15px] leading-relaxed text-[var(--color-ink-2)]">
              This product is now hidden from the public directory and search
              results. The vendor&rsquo;s company profile and other products
              remain visible.
            </p>
            {hasContactEmail ? (
              <p className="text-[14px] text-[var(--color-ink-3)]">
                A notification email was sent to the company contact.
              </p>
            ) : (
              <p className="flex items-start gap-2 border border-amber-200 bg-amber-50 p-3 text-[14px] text-amber-900">
                <WarningCircle
                  size={16}
                  weight="fill"
                  className="mt-0.5 shrink-0 text-amber-600"
                />
                No contact email on file — no notification was sent.
              </p>
            )}
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={closeAndRefresh}
                className="inline-flex h-10 items-center gap-2 bg-[var(--color-ink)] px-4 text-[14px] uppercase tracking-[0.18em] text-[var(--color-canvas)]"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-ink-2)]">
              Flagging hides this single product from the public directory
              and search results. The vendor&rsquo;s company profile and any
              other products stay visible. This is reversible — you can
              unflag it from this page.
            </p>

            <label
              htmlFor="flag-reason"
              className="mt-6 block text-[14px] font-medium text-[var(--color-ink)]"
            >
              Reason (optional)
            </label>
            <p className="mt-1 text-[13px] text-[var(--color-ink-3)]">
              {hasContactEmail
                ? "If provided, this is included verbatim in the notification email to the vendor. Leave blank for a generic message."
                : "Recorded in the audit log. No notification email will be sent (no contact email on file)."}
            </p>
            <textarea
              id="flag-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Optional explanation for the vendor…"
              className="mt-2 w-full border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-2 text-[15px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-ink)] focus:outline-none"
            />
            <p className="mt-1 text-right text-[12px] text-[var(--color-ink-3)]">
              {reason.length}/1000
            </p>

            {error ? (
              <p
                role="alert"
                className="mt-3 border border-rose-300 bg-rose-50 px-3 py-2 text-[14px] text-rose-800"
              >
                {error}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 border-t border-[var(--color-line)] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="inline-flex h-10 items-center gap-2 border border-[var(--color-line-strong)] px-4 text-[14px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] transition-colors hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={busy}
                className={cn(
                  "inline-flex h-10 items-center gap-2 bg-rose-600 px-4 text-[14px] uppercase tracking-[0.18em] text-white transition-opacity",
                  busy ? "opacity-70" : "hover:bg-rose-700",
                )}
              >
                <Flag size={13} weight="regular" />
                {busy ? "Flagging…" : "Flag product"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
