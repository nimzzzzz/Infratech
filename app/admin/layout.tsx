import type { Metadata } from "next";
import { AdminHeader } from "@/components/admin/admin-header";
import { getAdminHeaderData } from "@/lib/auth/admin-session";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const header = await getAdminHeaderData();

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--color-canvas)]">
      <AdminHeader
        name={header.name}
        initials={header.initials}
        email={header.email}
      />
      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  );
}
