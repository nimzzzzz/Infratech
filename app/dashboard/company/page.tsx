import type { Metadata } from "next";
import { getVendorSession } from "@/lib/auth/session";
import { getVendorWithRegions, getCompanyEditStatus } from "@/lib/queries/company-edit";
import { Container } from "@/components/site/container";
import { CompanyEditForm } from "@/components/dashboard/company-edit-form";

export const metadata: Metadata = {
  title: "Company profile — Dashboard",
  alternates: { canonical: "/dashboard/company" },
};

export default async function CompanyProfilePage() {
  const { vendor, vendorMember } = await getVendorSession();

  const [vendorWithRegions, editStatus] = await Promise.all([
    getVendorWithRegions(vendor.id),
    getCompanyEditStatus(vendor.id),
  ]);

  // vendorWithRegions will always be non-null here because getVendorSession
  // (requireOnboarded=true by default) guarantees vendor exists.
  const vendorData = vendorWithRegions ?? {
    ...vendor,
    regionSlugs: [] as string[],
    leadershipContacts: [],
  };

  return (
    <Container className="max-w-6xl py-12 md:py-16">
      <p className="text-[14px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
        Company profile
      </p>
      <h1 className="mt-4 font-heading text-[36px] leading-[1.04] tracking-tight md:text-[48px]">
        {vendor.name}
      </h1>
      <p className="mt-3 max-w-[60ch] text-[16px] leading-relaxed text-[var(--color-ink-2)]">
        Changes go through a brief editorial review before going live on your
        public vendor profile.
      </p>

      <div className="mt-10">
        <CompanyEditForm
          vendor={vendorData}
          vendorMember={vendorMember}
          leadershipContacts={vendorData.leadershipContacts}
          editStatus={editStatus}
        />
      </div>
    </Container>
  );
}
