import type { Metadata } from "next";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--color-canvas)]">
      <DashboardHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  );
}
