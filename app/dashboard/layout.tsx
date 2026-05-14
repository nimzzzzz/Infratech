import type { Metadata } from "next";
import { cookies } from "next/headers";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { LegalAcceptanceModal } from "@/components/onboarding/legal-acceptance-modal";
import { ViewAsVendorBanner } from "@/components/dashboard/view-as-vendor-banner";
import { getVendorSession } from "@/lib/auth/session";
import { needsReacceptance } from "@/lib/legal/check-acceptance";
import { countUnreadForVendor } from "@/lib/queries/messages";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Open shape — layout must tolerate the brand-new sign-in case
  // (vendor null, vendorMember.onboarded false). The legal-acceptance
  // modal renders ON TOP of the page based on this flag; it must
  // mount before any page underneath could trigger a redirect or
  // request data the unverified user shouldn't yet see.
  //
  // Perf (pass 1): the layout previously called both
  // getVendorSession AND getDashboardHeaderData, which fetched the
  // same vendor_members + vendors join twice per render. Header
  // data is now derived directly from the session — the underlying
  // query is cache()-deduped so any page that also calls
  // getVendorSession on top hits the same row without a second
  // round trip. The remaining two ancillary queries (unread count +
  // re-acceptance check) run in parallel rather than serially.
  const session = await getVendorSession({ requireOnboarded: false });
  const [unreadCount, reaccept, cookieStore] = await Promise.all([
    session.vendor
      ? countUnreadForVendor(session.vendor.id)
      : Promise.resolve(0),
    session.vendorMember.onboarded
      ? needsReacceptance(session.vendorMember.id)
      : Promise.resolve(false),
    cookies(),
  ]);
  const firstName = session.vendorMember.name.split(" ")[0] ?? null;

  // Phase A.1.1 — view-as-vendor banner. Renders for admins who
  // have the cookie set; non-admins never see it (middleware
  // ensures admins are the only ones who can have a valid
  // matching session AND a cookie, but we double-check is_admin
  // here so a stale cookie inherited by a non-admin signing in
  // on the same browser doesn't render a confusing banner).
  const viewAsVendorCookie =
    cookieStore.get("view_as_vendor")?.value === "true";
  const showVendorViewBanner =
    viewAsVendorCookie && session.vendorMember.isAdmin;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--color-canvas)]">
      {showVendorViewBanner ? <ViewAsVendorBanner /> : null}
      <DashboardHeader
        companyName={session.vendor?.name ?? "—"}
        userName={session.vendorMember.name}
        userAvatarUrl={session.vendorMember.avatarUrl}
        userTitle={session.vendorMember.role}
        unreadCount={unreadCount}
      />
      <main id="main" className="flex-1">
        {children}
      </main>
      <LegalAcceptanceModal
        initialOnboarded={session.vendorMember.onboarded}
        needsReacceptance={reaccept}
        firstName={firstName}
      />
    </div>
  );
}
