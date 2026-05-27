import type { Metadata } from "next";
import {
  DocumentLayout,
  type DocumentSection,
} from "@/components/site/document-layout";

export const metadata: Metadata = {
  title: "About",
  description:
    "About AllInfratech — an independent reference for project management and infrastructure software, curated by Resolute Management Consultancy.",
  alternates: { canonical: "/about" },
};

const sections: DocumentSection[] = [
  {
    id: "what-this-is",
    label: "What this is",
    content: (
      <p>
        AllInfratech is a curated directory of project-management and
        infrastructure-technology software. It exists to help project teams
        understand what tools are actually used across the lifecycle of a capital
        project &mdash; from feasibility through operations &mdash; without
        wading through marketing copy.
      </p>
    ),
  },
  {
    id: "why-we-built-this",
    label: "Why we built this",
    content: (
      <>
        <p>
          Project teams ask us the same question repeatedly: &ldquo;What software
          should we use for X?&rdquo; The honest answer depends on stage, scale,
          contract structure, and the team&rsquo;s existing data estate &mdash;
          not on which vendor has the slickest landing page.
        </p>
        <p>
          The directory collects what we&rsquo;ve seen run real programmes,
          organised by stage and capability, with descriptions written by people
          who&rsquo;ve actually used the products. Inclusion here is not an
          endorsement &mdash; teams should always evaluate fit against their own
          constraints.
        </p>
      </>
    ),
  },
  {
    id: "who-curates-it",
    label: "Who curates it",
    content: (
      <p>
        The directory is curated by{" "}
        <a
          href="https://resolutemanagementconsultancy.com/"
          target="_blank"
          rel="noopener nofollow"
          className="bloom-text underline-offset-4 hover:underline"
        >
          Resolute Management Consultancy
        </a>
        , a management consultancy. Vendors do not pay for placement. For
        questions about the directory, email{" "}
        <strong>team@allinfratech.com</strong>.
      </p>
    ),
  },
];

export default function AboutPage() {
  return (
    <DocumentLayout
      eyebrow="About"
      title="An independent reference, curated with care."
      sections={sections}
    />
  );
}
