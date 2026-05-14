import { Container } from "@/components/site/container";

/**
 * Loading state for /dashboard/onboarding (welcome / add-your-tool
 * landing). Eyebrow + H1 + a couple of body paragraphs + a primary
 * CTA placeholder.
 */
export default function OnboardingLoading() {
  return (
    <Container className="max-w-3xl py-12 md:py-16">
      <div className="animate-pulse">
        <div className="h-3 w-40 bg-[var(--color-line-strong)]/40" />
        <div className="mt-4 h-12 w-3/4 bg-[var(--color-line-strong)]/40 md:h-14" />
        <div className="mt-5 space-y-2">
          <div className="h-4 w-full bg-[var(--color-line-strong)]/20" />
          <div className="h-4 w-5/6 bg-[var(--color-line-strong)]/20" />
        </div>
        <div className="mt-8 h-12 w-56 bg-[var(--color-line-strong)]/40" />
      </div>
    </Container>
  );
}
