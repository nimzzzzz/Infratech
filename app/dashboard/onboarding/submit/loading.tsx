import { Container } from "@/components/site/container";

/**
 * Loading state for /dashboard/onboarding/submit (the wizard).
 *
 * This is the heaviest page in the dashboard surface — 152 kB of
 * client JS for the multi-step form. The skeleton mirrors the
 * wizard's progress rail + step heading + 4 field placeholders
 * + bottom nav bar so the JS-bundle-loading window doesn't feel
 * like a broken page.
 */
export default function WizardLoading() {
  return (
    <Container className="max-w-3xl py-10 md:py-14">
      <div className="animate-pulse">
        <div className="h-3 w-16 bg-[var(--color-line-strong)]/30" />

        <div className="mt-8 h-3 w-48 bg-[var(--color-line-strong)]/40" />
        <div className="mt-4 h-10 w-2/3 bg-[var(--color-line-strong)]/40 md:h-12" />
        <div className="mt-7 grid grid-cols-3 gap-1.5">
          <span className="h-1 bg-[var(--color-coral)]/60" />
          <span className="h-1 bg-[var(--color-line-strong)]/30" />
          <span className="h-1 bg-[var(--color-line-strong)]/30" />
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={i === 0 || i === 3 ? "md:col-span-2" : ""}>
              <div className="h-3 w-24 bg-[var(--color-line-strong)]/40" />
              <div className="mt-2 h-11 w-full bg-[var(--color-line-strong)]/20" />
            </div>
          ))}
        </div>

        <div className="mt-12 flex items-center justify-between border-t border-[var(--color-line)] pt-6">
          <div className="h-3 w-12 bg-[var(--color-line-strong)]/20" />
          <div className="h-11 w-28 bg-[var(--color-line-strong)]/40" />
        </div>
      </div>
    </Container>
  );
}
