import Link from "next/link";
import { Container } from "./container";

const columns: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Directory",
    links: [
      { href: "/", label: "Browse the index" },
      { href: "/suggest", label: "Suggest an app" },
    ],
  },
  {
    title: "For vendors",
    links: [
      { href: "/login", label: "List your tool" },
      { href: "/legal/vendor-terms", label: "Vendor terms" },
    ],
  },
  {
    title: "About",
    links: [
      { href: "/about", label: "About this directory" },
      { href: "/contact", label: "Contact us" },
      { href: "/legal/terms", label: "Terms" },
      { href: "/legal/privacy", label: "Privacy" },
      { href: "/legal/cookies", label: "Cookies" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-[var(--color-line)] bg-[var(--color-night)] text-[#D9D6CE]">
      {/* edge bloom — soft pink/coral wash bleeding from the lower-left corner */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(60% 70% at 12% 100%, rgba(214, 51, 108, 0.45), transparent 60%), radial-gradient(50% 60% at 80% 90%, rgba(249, 115, 22, 0.30), transparent 65%)",
        }}
      />
      <Container className="relative grid gap-14 py-20 md:grid-cols-[1.4fr_3fr] md:py-24">
        <div className="max-w-md">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bloom" />
            <span className="font-heading text-xl leading-none tracking-tight text-white">
              Resolute<span className="text-white/40">/</span>Directory
            </span>
          </Link>
          <p className="mt-5 text-[15px] leading-relaxed text-white/65">
            An independent reference of project management and infrastructure
            software, organised by the stages of a project lifecycle. Inclusion
            on this site is not an endorsement.
          </p>
          <p className="mt-6 text-[13px] uppercase tracking-[0.18em] text-white/40">
            Curated by{" "}
            <Link
              href="/about"
              className="bloom-text underline-offset-4 transition hover:underline"
            >
              Resolute Management Consultancy
            </Link>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="font-body text-[12px] uppercase tracking-[0.18em] text-white/40">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-[15px] text-white/75 transition hover:text-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>

      <div className="relative border-t border-white/10">
        <Container className="flex flex-col gap-3 py-6 text-[13px] text-white/45 md:flex-row md:items-center md:justify-between">
          <p>
            &copy; {new Date().getFullYear()} Resolute Management Consultancy.
            All product names belong to their respective owners.
          </p>
          <p className="num">
            v0.1 · pre-launch
          </p>
        </Container>
      </div>
    </footer>
  );
}
