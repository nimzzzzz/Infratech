import type { Metadata } from "next";
import { Container } from "@/components/site/container";
import { InnerHero } from "@/components/site/inner-hero";

export const metadata: Metadata = {
  title: "About",
  description:
    "About the Resolute Apps Directory — an independent reference for project management and infrastructure software, curated by Resolute Management Consultancy.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <InnerHero
        eyebrow="About"
        title={
          <>
            An independent reference,
            <br />
            <span className="text-[var(--color-ink-3)]">curated with care.</span>
          </>
        }
        body={
          <p>
            This directory exists to help project teams understand what software
            is actually used across the lifecycle of a capital project &mdash; from
            feasibility through operations &mdash; without wading through marketing
            copy.
          </p>
        }
      />
      <section className="bg-[var(--color-canvas)] pb-24 md:pb-32">
        <Container className="grid gap-14 md:grid-cols-[5fr_7fr]">
          <h2 className="text-[30px] leading-tight tracking-tight md:text-[40px]">
            Why we built this.
          </h2>
          <div className="space-y-5 text-[18px] leading-relaxed text-[var(--color-ink-2)] md:text-[19px]">
            <p>
              Project teams ask us the same question repeatedly: &ldquo;What
              software should we use for X?&rdquo; The honest answer depends on
              stage, scale, contract structure, and the team&rsquo;s existing data
              estate &mdash; not on which vendor has the slickest landing page.
            </p>
            <p>
              The directory is a soft credibility asset. It collects what
              we&rsquo;ve seen run real programmes, organised by stage and
              capability, with descriptions written by people who&rsquo;ve actually
              used the products. Inclusion here is not an endorsement &mdash; teams
              should always evaluate fit against their own constraints.
            </p>
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
              . Vendors do not pay for placement.
            </p>
          </div>
        </Container>
      </section>

      <section
        id="contact"
        className="border-t border-[var(--color-line)] bg-[var(--color-canvas)] pb-24 md:pb-32 pt-16 md:pt-20 scroll-mt-24"
      >
        <Container className="grid gap-14 md:grid-cols-[5fr_7fr]">
          <h2 className="text-[30px] leading-tight tracking-tight md:text-[40px]">
            Contact Resolute.
          </h2>
          <div className="space-y-5 text-[18px] leading-relaxed text-[var(--color-ink-2)] md:text-[19px]">
            <p>
              Reach out about the directory, partnership enquiries, or the
              wider work of the Digital &amp; AI Practice.
            </p>
            <address className="not-italic space-y-1.5 text-[var(--color-ink)]">
              <p className="">Resolute Management Consultancy</p>
              {/* TODO: fill in once the user provides them. */}
              <p className="text-[var(--color-ink-3)]">
                [Address line — TODO]
              </p>
              <p className="text-[var(--color-ink-3)]">[Email — TODO]</p>
              <p className="text-[var(--color-ink-3)]">[Phone — TODO]</p>
              <p>
                Website:{" "}
                <a
                  href="https://resolutemanagementconsultancy.com/"
                  target="_blank"
                  rel="noopener"
                  className="bloom-text underline-offset-4 hover:underline"
                >
                  resolutemanagementconsultancy.com
                </a>
              </p>
            </address>
          </div>
        </Container>
      </section>
    </>
  );
}
