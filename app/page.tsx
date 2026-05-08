import type { Metadata } from "next";
import { HomeIndex } from "@/components/home/index-page";

export const metadata: Metadata = {
  title: "AllInfratech — the index of project products",
  description:
    "An independent reference of project management and infrastructure software, organised by stage, capability, and industry.",
  alternates: { canonical: "/" },
};

// Filter-driven directory view; URL search params drive the response.
export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  return <HomeIndex searchParams={sp} />;
}
