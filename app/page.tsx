import type { Metadata } from "next";
import { HomeIndex } from "@/components/home/index-page";

export const metadata: Metadata = {
  title: "InfraTechDB — the index of project products",
  description:
    "An independent reference of project management and infrastructure software, organised by stage, capability, and industry.",
  alternates: { canonical: "/" },
};

// Featured + latest matter — re-render every 10 minutes.
export const revalidate = 600;

export default async function HomePage() {
  return <HomeIndex />;
}
