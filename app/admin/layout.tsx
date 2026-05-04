import type { Metadata } from "next";
import { AdminHeader } from "@/components/admin/admin-header";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--color-canvas)]">
      <AdminHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  );
}
