"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { TERMS_VERSION } from "@/lib/legal/terms-version";

/**
 * Blocking legal-acceptance modal.
 *
 * Two render triggers:
 *   • !initialOnboarded → first-sign-in flow (Phase B.2 PR 1)
 *   • needsReacceptance → existing user whose latest accepted version
 *     is older than the live TERMS_VERSION (Phase B.2 PR 2). Re-accept
 *     mode shows different copy and hides the sign-out button — the
 *     user already has an account and shouldn't be forced out for a
 *     terms bump.
 *
 * Submission:
 *   • POSTs to /api/onboarding/confirm with the live TERMS_VERSION
 *     and a hidden honeypot field "website2".
 *   • The route INSERTs an additive vendor_member_legal_acceptances
 *     row keyed on the current version; if one already exists for
 *     this member+version, it 200s with no write (idempotency).
 *   • On 200 we router.refresh() so the layout re-reads the
 *     acceptance state and the modal unmounts on next render.
 */

export type LegalAcceptanceModalProps = {
  initialOnboarded: boolean;
  /** True iff the member has accepted before, but their latest
   *  acceptance is older than the live TERMS_VERSION. */
  needsReacceptance?: boolean;
  /** Optional first name for greeting; falls back to a generic phrase. */
  firstName?: string | null;
};

export function LegalAcceptanceModal({
  initialOnboarded,
  needsReacceptance = false,
  firstName,
}: LegalAcceptanceModalProps) {
  const router = useRouter();
  const clerk = useClerk();
  const [accepted, setAccepted] = useState(false);
  const [website2, setWebsite2] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const shouldRender = !initialOnboarded || needsReacceptance;
  const isReaccept = initialOnboarded && needsReacceptance;

  // Lock background scroll while the modal is up.
  useEffect(() => {
    if (!shouldRender) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [shouldRender]);

  // Focus the card on mount so screen readers and keyboard users
  // land somewhere reasonable.
  useEffect(() => {
    if (!shouldRender) return;
    cardRef.current?.focus();
  }, [shouldRender]);

  if (!shouldRender) return null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (!accepted) {
      setError("You must accept the terms to continue.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/onboarding/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          acceptedTerms: true,
          termsVersion: TERMS_VERSION,
          website2,
        }),
      });
      if (!res.ok) {
        let message = "Something went wrong. Please try again.";
        try {
          const data = (await res.json()) as { error?: string };
          if (data.error) message = data.error;
        } catch {
          // ignore parse failure; default message stands
        }
        setError(message);
        setSubmitting(false);
        return;
      }
      // Success — refresh so the layout re-reads the onboarded state
      // and the modal unmounts. We deliberately do NOT navigate; the
      // user lands on whatever dashboard page they were already on.
      router.refresh();
    } catch (err) {
      console.error("[onboarding modal] submit failed", err);
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  const onSignOut = async () => {
    try {
      await clerk.signOut({ redirectUrl: "/" });
    } catch (err) {
      console.error("[onboarding modal] signOut failed", err);
      window.location.href = "/";
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[var(--color-canvas)]/95 px-4 py-8 backdrop-blur-sm"
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        className="w-full max-w-2xl border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-6 shadow-2xl outline-none md:p-10"
      >
        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-coral)]">
          {isReaccept ? "Updated terms" : "One last thing"}
        </p>
        <h2
          id="onboarding-modal-title"
          className="mt-4 font-heading text-[28px] leading-tight tracking-tight text-[var(--color-ink)] md:text-[32px]"
        >
          {isReaccept
            ? "Our terms have been updated."
            : firstName
              ? `Welcome, ${firstName}.`
              : "Welcome to AllInfratech."}
        </h2>
        <p className="mt-4 max-w-[58ch] text-[14px] leading-relaxed text-[var(--color-ink-2)] md:text-[15px]">
          {isReaccept
            ? "We've updated the terms that govern using AllInfratech as a vendor since you last accepted. Please review and re-accept to continue."
            : "Before you set up your listing, please confirm you accept the terms that govern using AllInfratech as a vendor. We log your acceptance for our records."}
        </p>

        <form onSubmit={onSubmit} className="mt-7 space-y-5">
          <label className="flex items-start gap-3 text-[14px] leading-relaxed text-[var(--color-ink)]">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              disabled={submitting}
              className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-coral)]"
              required
            />
            <span>
              I have read and accept the{" "}
              <a
                href="/legal/terms"
                target="_blank"
                rel="noopener"
                className="bloom-text underline-offset-4 hover:underline"
              >
                Terms of Service
              </a>
              , the{" "}
              <a
                href="/legal/vendor-terms"
                target="_blank"
                rel="noopener"
                className="bloom-text underline-offset-4 hover:underline"
              >
                Vendor Terms
              </a>
              , the{" "}
              <a
                href="/legal/privacy"
                target="_blank"
                rel="noopener"
                className="bloom-text underline-offset-4 hover:underline"
              >
                Privacy Policy
              </a>
              , and the{" "}
              <a
                href="/legal/cookies"
                target="_blank"
                rel="noopener"
                className="bloom-text underline-offset-4 hover:underline"
              >
                Cookie Policy
              </a>
              . I confirm I am authorised to act on behalf of the company I
              will be listing.
            </span>
          </label>

          {/* Honeypot — visually hidden, not seen by real users. Bots
              that fill every input will trip this and the API will
              return a silent 200 without writing the row. */}
          <div className="sr-only" aria-hidden="true">
            <label htmlFor="onboarding-website2">Website</label>
            <input
              id="onboarding-website2"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website2}
              onChange={(e) => setWebsite2(e.target.value)}
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="border border-[var(--color-coral)]/40 bg-[var(--color-coral)]/5 px-3 py-2 text-[13px] text-[var(--color-coral)]"
            >
              {error}
            </p>
          ) : null}

          <div
            className={
              isReaccept
                ? "flex justify-end pt-2"
                : "flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between"
            }
          >
            {/* In re-accept mode the user already has an account —
                forcing them through sign-out for a terms bump is
                hostile. The submit button stays the only action. */}
            {isReaccept ? null : (
              <button
                type="button"
                onClick={onSignOut}
                disabled={submitting}
                className="inline-flex h-10 items-center justify-center px-4 text-[12px] uppercase tracking-[0.18em] text-[var(--color-ink-3)] transition-colors hover:text-[var(--color-ink)] disabled:opacity-60"
              >
                Sign out
              </button>
            )}
            <button
              type="submit"
              disabled={submitting || !accepted}
              className="inline-flex h-11 items-center justify-center bg-[var(--color-ink)] px-6 text-[12px] uppercase tracking-[0.18em] text-[var(--color-canvas)] transition-colors hover:bg-[var(--color-ink-2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-coral)] active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[var(--color-ink)]"
            >
              {submitting
                ? "Confirming…"
                : isReaccept
                  ? "Accept updated terms"
                  : "Accept and continue"}
            </button>
          </div>

          <p className="pt-1 text-[11px] leading-relaxed text-[var(--color-ink-3)]">
            Terms version {TERMS_VERSION}.
          </p>
        </form>
      </div>
    </div>
  );
}
