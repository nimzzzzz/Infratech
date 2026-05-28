import type { Metadata } from "next";
import { HomeIndex } from "@/components/home/index-page";

export const metadata: Metadata = {
  title:
    "Allinfratech - repository of infrastructure-related technology products and companies",
  description:
    "A repository of infrastructure-related technology products and companies.",
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
