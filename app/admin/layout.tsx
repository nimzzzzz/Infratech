import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminHeaderSkeleton } from "@/components/admin/admin-header-skeleton";
import { getAdminHeaderData } from "@/lib/auth/admin-session";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Admin layout shell. Synchronous — same Suspense pattern as the
 * dashboard layout so cross-layout navigations into `/admin/**`
 * surface the page's `loading.tsx` immediately, without waiting on
 * the header's data fetch. See app/dashboard/layout.tsx for the
 * full rationale.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--color-canvas)]">
      <Suspense fallback={<AdminHeaderSkeleton />}>
        <AdminHeaderShell />
      </Suspense>
      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  );
}

async function AdminHeaderShell() {
  const header = await getAdminHeaderData();
  return (
    <AdminHeader
      name={header.name}
      email={header.email}
      avatarUrl={header.avatarUrl}
    />
  );
}
