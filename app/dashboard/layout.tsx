import type { Metadata } from "next";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { getDashboardHeaderData } from "@/lib/auth/session";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const header = await getDashboardHeaderData();

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--color-canvas)]">
      <DashboardHeader
        companyName={header.companyName}
        userName={header.userName}
        userInitials={header.userInitials}
        userTitle={header.userTitle}
        unreadCount={0}
      />
      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  );
}
