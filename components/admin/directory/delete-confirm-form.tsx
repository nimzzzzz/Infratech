"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash, WarningCircle, CheckCircle, ArrowRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/**
 * Delete-confirmation form for /admin/directory/[id]/delete.
 *
 * Strong-confirmation UX:
 *   - Optional reason textarea (stored in audit_log row + email)
 *   - Optional "block members from re-onboarding" checkbox
 *   - Typed-name confirmation: button disabled until typed value
 *     (trimmed, case-sensitive) exactly equals vendor.name
 *
 * After a successful POST, the form shows a "Permanently deleted"
 * confirmation card (parallel to the suspend modal's done state).
 * The card surfaces the email-sent / no-email-on-file outcome. A
 * "Back to directory" button finalises the navigation.
 */
export function DeleteConfirmForm({
  vendorId,
  vendorName,
  memberCount,
  hasContactEmail,
  isSelfMember,
}: {
  vendorId: number;
  vendorName: string;
  memberCount: number;
  hasContactEmail: boolean;
  /** True when the current admin is a vendor_member of THIS vendor.
   *  Pre-disables the block-members checkbox + surfaces a note. */
  isSelfMember: boolean;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [blockMembers, setBlockMembers] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ emailSent: boolean } | null>(null);

  const nameMatches = confirmation.trim() === vendorName;

  const onConfirm = async () => {
    if (busy || !nameMatches) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}/delete`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          confirmationName: confirmation,
          reason: reason.trim() ? reason.trim() : undefined,
          blockMembers,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        emailSent?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setError(json.error ?? "Something went wrong");
        setBusy(false);
        return;
      }
      setDone({ emailSent: Boolean(json.emailSent) });
      setBusy(false);
    } catch (err) {
      console.error("[delete-confirm-form] submit failed", err);
      setError("Network error. Please try again.");
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="border border-emerald-300 bg-emerald-50 p-6 md:p-8">
        <div className="flex items-start gap-3">
          <CheckCircle
            size={24}
            weight="fill"
            className="mt-0.5 shrink-0 text-emerald-600"
          />
          <div className="min-w-0">
            <p className="font-heading text-[24px] leading-tight tracking-tight md:text-[28px]">
              {vendorName} has been permanently deleted.
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-emerald-900">
              The company profile, all products, submissions, inquiries, and
              screenshots are gone. Vendor members are{" "}
              {blockMembers ? "orphaned and blocked" : "orphaned"}. Audit log
              entries remain.
            </p>
            {done.emailSent ? (
              <p className="mt-3 text-[14px] text-emerald-800">
                A notification email was sent to the company contact.
              </p>
            ) : (
              <p className="mt-3 inline-flex items-start gap-2 border border-amber-200 bg-amber-50 px-3 py-2 text-[14px] text-amber-900">
                <WarningCircle
                  size={16}
                  weight="fill"
                  className="mt-0.5 shrink-0 text-amber-600"
                />
                No contact email on file — no notification sent.
              </p>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end border-t border-emerald-200 pt-5">
          <button
            type="button"
            onClick={() => router.push("/admin/directory")}
            className="group inline-flex h-10 items-center gap-2 bg-[var(--color-ink)] px-4 text-[14px] uppercase tracking-[0.18em] text-[var(--color-canvas)]"
          >
            Back to directory
            <ArrowRight
              size={11}
              weight="bold"
              className="transition-transform duration-300 group-hover:translate-x-0.5"
            />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-rose-300 bg-rose-50/30 p-6 md:p-8">
      <p className="text-[13px] uppercase tracking-[0.22em] text-rose-700">
        Permanent deletion
      </p>
      <h2 className="mt-3 font-heading text-[22px] leading-tight tracking-tight">
        Confirm the deletion
      </h2>

      <label
        htmlFor="delete-reason"
        className="mt-6 block text-[14px] font-medium text-[var(--color-ink)]"
      >
        Reason (optional)
      </label>
      <p className="mt-1 text-[13px] text-[var(--color-ink-3)]">
        {hasContactEmail
          ? "Included verbatim in the notification email. Leave blank for a generic message."
          : "Recorded in the audit log only. No notification email will be sent (no contact email on file)."}
      </p>
      <textarea
        id="delete-reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="Optional explanation…"
        className="mt-2 w-full border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-2 text-[15px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-ink)] focus:outline-none"
      />
      <p className="mt-1 text-right text-[12px] text-[var(--color-ink-3)]">
        {reason.length}/1000
      </p>

      <label
        className={cn(
          "mt-6 flex cursor-pointer items-start gap-3 border border-[var(--color-line-strong)] bg-white p-4",
          isSelfMember && "cursor-not-allowed opacity-60",
        )}
      >
        <input
          type="checkbox"
          checked={blockMembers}
          onChange={(e) => setBlockMembers(e.target.checked)}
          disabled={isSelfMember}
          className="mt-1 h-4 w-4 shrink-0 accent-rose-600"
        />
        <span className="min-w-0">
          <span className="block text-[14px] font-medium text-[var(--color-ink)]">
            Also block members from re-onboarding
          </span>
          <span className="mt-1 block text-[13px] leading-relaxed text-[var(--color-ink-3)]">
            When checked, the {memberCount}{" "}
            {memberCount === 1 ? "member" : "members"} get suspended too —
            they can&rsquo;t sign in or onboard with a new company. Use this
            for fraud / abuse cases. For a legitimate company shutdown leave
            this unchecked so members can re-onboard normally.
          </span>
          {isSelfMember ? (
            <span className="mt-2 block text-[13px] text-amber-800">
              You&rsquo;re a member of this company. This option is disabled
              so you don&rsquo;t lock yourself out of the dashboard.
            </span>
          ) : null}
        </span>
      </label>

      <label
        htmlFor="delete-confirm"
        className="mt-6 block text-[14px] font-medium text-[var(--color-ink)]"
      >
        Type{" "}
        <span className="rounded bg-rose-100 px-1.5 py-0.5 font-mono text-[13px] text-rose-900">
          {vendorName}
        </span>{" "}
        to confirm
      </label>
      <input
        id="delete-confirm"
        type="text"
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
        autoComplete="off"
        className={cn(
          "mt-2 w-full border bg-[var(--color-surface)] px-3 py-2 text-[15px] text-[var(--color-ink)] focus:outline-none",
          nameMatches
            ? "border-emerald-500 focus:border-emerald-600"
            : confirmation
              ? "border-rose-400 focus:border-rose-500"
              : "border-[var(--color-line-strong)] focus:border-[var(--color-ink)]",
        )}
      />
      <p
        className={cn(
          "mt-1 text-[12px]",
          nameMatches
            ? "text-emerald-700"
            : confirmation
              ? "text-rose-600"
              : "text-[var(--color-ink-3)]",
        )}
      >
        {nameMatches
          ? "Name matches — delete is unlocked."
          : confirmation
            ? "Doesn't match — case-sensitive after trim."
            : "Required to enable the delete button."}
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-4 border border-rose-300 bg-rose-50 px-3 py-2 text-[14px] text-rose-800"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-8 flex flex-col gap-3 border-t border-rose-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={`/admin/directory/${vendorId}`}
          className="inline-flex h-10 items-center justify-center gap-2 border border-[var(--color-line-strong)] px-4 text-[14px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] transition-colors hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy || !nameMatches}
          className={cn(
            "inline-flex h-10 items-center gap-2 px-4 text-[14px] uppercase tracking-[0.18em] text-white transition-opacity",
            !nameMatches
              ? "cursor-not-allowed bg-rose-300"
              : busy
                ? "bg-rose-600/70"
                : "bg-rose-600 hover:bg-rose-700",
          )}
        >
          <Trash size={13} weight="regular" />
          {busy ? "Deleting…" : "Permanently delete company"}
        </button>
      </div>
    </div>
  );
}
