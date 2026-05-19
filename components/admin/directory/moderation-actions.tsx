"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowCounterClockwise,
  ArrowRight,
  Trash,
  XCircle,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { SuspendModal } from "./suspend-modal";

/**
 * Moderation actions card on /admin/directory/[id]. Two states:
 *
 *   active → "Suspend company" button (opens the SuspendModal with
 *            optional reason input)
 *   suspended → "Reinstate company" button (small inline confirm via
 *               window.confirm — lighter UX since the action is
 *               reversal of a deliberate action; no reason needed)
 *
 * Delete action is INTENTIONALLY not built here — A.4 PR 2.
 * Product-level Flag is INTENTIONALLY not built — A.4 PR 3.
 */
export function ModerationActions({
  vendorId,
  vendorName,
  suspended,
  hasContactEmail,
}: {
  vendorId: number;
  vendorName: string;
  suspended: boolean;
  hasContactEmail: boolean;
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onUnsuspend = async () => {
    if (busy) return;
    const confirmed = window.confirm(
      `Reinstate ${vendorName}? Their company profile and products will be visible again and their team can sign in.`,
    );
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}/unsuspend`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Something went wrong");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch (err) {
      console.error("[moderation-actions] unsuspend failed", err);
      setError("Network error. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="border border-rose-200 bg-rose-50/40 p-5 md:p-6">
      <p className="text-[13px] uppercase tracking-[0.22em] text-rose-700">
        Moderation
      </p>
      <h2 className="mt-3 font-heading text-[22px] leading-tight tracking-tight">
        {suspended ? "Reinstate this company" : "Suspend this company"}
      </h2>
      <p className="mt-2 max-w-[60ch] text-[15px] leading-relaxed text-[var(--color-ink-2)]">
        {suspended
          ? "Re-enables their public listing and dashboard access. The vendor's contact gets a notification email."
          : "Hides their company profile and all products from the public directory and blocks their team from signing in. Reversible — you can reinstate them from this page. The vendor's contact gets a notification email."}
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-4 border border-rose-300 bg-rose-50 px-3 py-2 text-[14px] text-rose-800"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-5">
        {suspended ? (
          <button
            type="button"
            onClick={onUnsuspend}
            disabled={busy}
            className={cn(
              "inline-flex h-10 items-center gap-2 border border-emerald-600 bg-emerald-600 px-4 text-[14px] uppercase tracking-[0.18em] text-white transition-opacity",
              busy ? "opacity-70" : "hover:bg-emerald-700",
            )}
          >
            <ArrowCounterClockwise size={13} weight="regular" />
            {busy ? "Reinstating…" : "Reinstate company"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex h-10 items-center gap-2 border border-rose-400 px-4 text-[14px] uppercase tracking-[0.18em] text-rose-800 transition-colors hover:bg-rose-100"
          >
            <XCircle size={13} weight="regular" />
            Suspend company
          </button>
        )}
      </div>

      {/* Permanent deletion — separate visual section, separate
          confirmation page (NOT a modal). The link is a regular
          navigation, not a destructive POST; the destructive action
          fires only after typed-name confirmation on the next
          page. */}
      <div className="mt-6 border-t border-rose-200 pt-5">
        <p className="text-[13px] uppercase tracking-[0.22em] text-rose-700">
          Permanent deletion
        </p>
        <p className="mt-2 max-w-[60ch] text-[14px] leading-relaxed text-[var(--color-ink-2)]">
          Removes the company and all of its products, submissions, and
          inquiries forever. Members are orphaned (optionally blocked from
          re-onboarding). Not reversible.
        </p>
        <Link
          href={`/admin/directory/${vendorId}/delete`}
          prefetch
          className="group mt-3 inline-flex h-10 items-center gap-2 border border-rose-600 px-4 text-[14px] uppercase tracking-[0.18em] text-rose-700 transition-colors hover:bg-rose-600 hover:text-white"
        >
          <Trash size={13} weight="regular" />
          Delete company…
          <ArrowRight
            size={11}
            weight="bold"
            className="transition-transform duration-300 group-hover:translate-x-0.5"
          />
        </Link>
      </div>
      {/* TODO(A.4 PR 3): per-product Flag action lives on the products
          list above, not here. */}

      {modalOpen ? (
        <SuspendModal
          vendorId={vendorId}
          vendorName={vendorName}
          hasContactEmail={hasContactEmail}
          onClose={() => setModalOpen(false)}
        />
      ) : null}
    </div>
  );
}
