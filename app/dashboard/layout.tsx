import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardHeaderSkeleton } from "@/components/dashboard/dashboard-header-skeleton";
import { LegalAcceptanceModal } from "@/components/onboarding/legal-acceptance-modal";
import { PreviewVendorBanner } from "@/components/dashboard/preview-vendor-banner";
import { getVendorSession } from "@/lib/auth/session";
import { needsReacceptance } from "@/lib/legal/check-acceptance";
import { countUnreadForVendor } from "@/lib/queries/messages";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Dashboard layout shell. Synchronous — renders the outer wrapper
 * + the page's `children` without awaiting anything, so the
 * page's own `loading.tsx` skeleton appears the instant the
 * navigation begins.
 *
 * Perf (pass 3): pre-refactor, the layout awaited
 * `getVendorSession` + a Promise.all of unread/reaccept/cookies
 * BEFORE returning anything. Cross-layout navigations (e.g. `/` →
 * `/dashboard`) blocked on the layout's data fetch for ~30-80 ms
 * steady-state (500-1500 ms cold-start), during which the dashboard
 * `loading.tsx` couldn't fire — it lived inside this layout.
 *
 * The header + legal modal now sit behind Suspense boundaries. The
 * outer shell renders instantly; the header skeleton + page
 * skeleton stream in concurrently; the real chrome and modal swap
 * in as their data resolves. React's `cache()` wrapper on
 * `getVendorByMemberClerkUserId` dedupes the session fetch across
 * the two Suspense shells (header + modal), so it's still one DB
 * call per request.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--color-canvas)]">
      <Suspense fallback={<DashboardHeaderSkeleton />}>
        <DashboardHeaderShell />
      </Suspense>
      <main id="main" className="flex-1">
        {children}
      </main>
      <Suspense fallback={null}>
        <LegalModalShell />
      </Suspense>
    </div>
  );
}

/**
 * Header section — async server component. Fetches the session,
 * unread count, and preview-vendor cookie in parallel. Returns the
 * real `<DashboardHeader>` along with the optional
 * `<PreviewVendorBanner>` (rendered above the header when an admin
 * has the cookie set).
 *
 * Open shape — `vendor` may be null for brand-new sign-ins.
 */
async function DashboardHeaderShell() {
  const session = await getVendorSession({ requireOnboarded: false });
  const [unreadCount, cookieStore] = await Promise.all([
    session.vendor
      ? countUnreadForVendor(session.vendor.id)
      : Promise.resolve(0),
    cookies(),
  ]);

  // Phase A.1.1 — preview-vendor banner. Renders for admins who
  // have the cookie set; non-admins never see it (middleware
  // ensures admins are the only ones who can have a valid
  // matching session AND a cookie, but we double-check is_admin
  // here so a stale cookie inherited by a non-admin signing in
  // on the same browser doesn't render a confusing banner).
  const previewVendorCookie =
    cookieStore.get("preview_vendor")?.value === "true";
  const showPreviewVendorBanner =
    previewVendorCookie && session.vendorMember.isAdmin;

  return (
    <>
      {showPreviewVendorBanner ? <PreviewVendorBanner /> : null}
      <DashboardHeader
        companyName={session.vendor?.name ?? "—"}
        userName={session.vendorMember.name}
        userAvatarUrl={session.vendorMember.avatarUrl}
        userTitle={session.vendorMember.role}
        unreadCount={unreadCount}
      />
    </>
  );
}

/**
 * Legal-acceptance modal section — async server component.
 * Shares the cache()-deduped session lookup with the header shell;
 * the only additional fetch is `needsReacceptance` when the
 * member has already onboarded. Fallback is `null` (the modal
 * itself renders nothing for already-accepted users; an absent
 * modal during the fetch window is indistinguishable from the
 * normal case).
 */
async function LegalModalShell() {
  const session = await getVendorSession({ requireOnboarded: false });
  const reaccept = session.vendorMember.onboarded
    ? await needsReacceptance(session.vendorMember.id)
    : false;
  const firstName = session.vendorMember.name.split(" ")[0] ?? null;
  return (
    <LegalAcceptanceModal
      initialOnboarded={session.vendorMember.onboarded}
      needsReacceptance={reaccept}
      firstName={firstName}
    />
  );
}
