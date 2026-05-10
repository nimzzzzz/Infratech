import type { Metadata } from "next";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { LegalAcceptanceModal } from "@/components/onboarding/legal-acceptance-modal";
import {
  getDashboardHeaderData,
  getVendorSession,
} from "@/lib/auth/session";
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
        firstName={firstName}
      />
    </div>
  );
}
