import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/site/container";
import { getVendorSession } from "@/lib/auth/session";
import { getAppForEdit, getProductEditStatus } from "@/lib/queries/product-edit";
import { listStages } from "@/lib/queries/taxonomy";
import { ProductEditPageClient } from "@/components/dashboard/product-edit-page-client";

export const metadata: Metadata = {
  title: "Edit product — Dashboard",
  robots: { index: false, follow: false },
};

export default async function ProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const appId = Number(idParam);
  if (!Number.isFinite(appId) || appId <= 0) notFound();

  const { vendor } = await getVendorSession();

  const [app, editStatus, allStages] = await Promise.all([
    getAppForEdit(appId),
    getProductEditStatus(appId),
    listStages(),
  ]);

  // Same 404 response whether the product is missing or owned by a
  // different vendor — no information leak.
  if (!app || app.vendorId !== vendor.id) notFound();

  return (
    <Container className="max-w-[1400px] py-10 md:py-14">
      <p className="text-[13px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
        Editing product
      </p>
      <h1 className="mt-4 font-heading text-[32px] leading-[1.04] tracking-tight md:text-[44px]">
        {app.name}
      </h1>
      <p className="mt-3 max-w-[60ch] text-[16px] leading-relaxed text-[var(--color-ink-2)]">
        Changes go through a brief editorial review before going live. The
        product URL{" "}
        <span className="num text-[var(--color-ink)]">/apps/{app.slug}</span>{" "}
        stays the same — only the content updates.
      </p>

      <div className="mt-10">
        <ProductEditPageClient
          app={app}
          editStatus={editStatus}
          allStages={allStages.map((s) => ({ slug: s.slug, name: s.name }))}
        />
      </div>
    </Container>
  );
}
