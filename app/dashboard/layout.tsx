import type { Metadata } from "next";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { LegalAcceptanceModal } from "@/components/onboarding/legal-acceptance-modal";
import {
  getDashboardHeaderData,
  getVendorSession,
} from "@/lib/auth/session";
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
  const session = await getVendorSession({ requireOnboarded: false });
  const header = await getDashboardHeaderData();
  const unreadCount = session.vendor
    ? await countUnreadForVendor(session.vendor.id)
    : 0;
  // Re-acceptance trigger (Phase B.2 PR 2): an already-onboarded
  // member whose latest accepted version is older than the live
  // TERMS_VERSION needs to re-accept. Skip the DB hit when the
  // member hasn't onboarded yet — the first-sign-in flow covers it.
  const reaccept = session.vendorMember.onboarded
    ? await needsReacceptance(session.vendorMember.id)
    : false;
  const firstName = session.vendorMember.name.split(" ")[0] ?? null;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--color-canvas)]">
      <DashboardHeader
        companyName={header.companyName}
        userName={header.userName}
        userInitials={header.userInitials}
        userTitle={header.userTitle}
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
