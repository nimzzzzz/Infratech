"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, FlagPennant } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { FlagModal } from "./flag-modal";

/**
 * Per-product flag toggle rendered inside the admin directory product
 * list. Two states:
 *
 *   not flagged → "Flag" opens the FlagModal (optional reason input)
 *   flagged → "Unflag" goes via window.confirm — lighter UX, no reason
 *
 * Parent gates rendering on status === "published" — only a live
 * listing can be flagged. The flag overlay is independent of
 * `status`; a flagged product stays at "published" but every public
 * reader filters it out.
 */
export function ProductFlagButton({
  appId,
  appName,
  flagged,
  hasContactEmail,
}: {
  appId: number;
  appName: string;
  flagged: boolean;
  hasContactEmail: boolean;
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onUnflag = async () => {
    if (busy) return;
    const confirmed = window.confirm(
      `Unflag ${appName}? The product will be visible in the public directory and search results again.`,
    );
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/apps/${appId}/unflag`, {
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
      console.error("[product-flag-button] unflag failed", err);
      setError("Network error. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      {flagged ? (
        <button
          type="button"
          onClick={onUnflag}
          disabled={busy}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 border border-emerald-600 px-3 text-[12px] uppercase tracking-[0.18em] text-emerald-700 transition-colors",
            busy ? "opacity-70" : "hover:bg-emerald-600 hover:text-white",
          )}
        >
          <FlagPennant size={12} weight="regular" />
          {busy ? "Unflagging…" : "Unflag"}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex h-8 items-center gap-1.5 border border-rose-400 px-3 text-[12px] uppercase tracking-[0.18em] text-rose-700 transition-colors hover:bg-rose-100"
        >
          <Flag size={12} weight="regular" />
          Flag
        </button>
      )}
      {error ? (
        <p
          role="alert"
          className="text-[11px] text-rose-700"
        >
          {error}
        </p>
      ) : null}

      {modalOpen ? (
        <FlagModal
          appId={appId}
          appName={appName}
          hasContactEmail={hasContactEmail}
          onClose={() => setModalOpen(false)}
        />
      ) : null}
    </div>
  );
}
