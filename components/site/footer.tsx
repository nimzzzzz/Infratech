import Link from "next/link";
import Image from "next/image";
import { Container } from "./container";

const columns: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Vendors",
    links: [{ href: "/login?intent=submit", label: "List your product" }],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/terms", label: "Terms and Services" },
      { href: "/legal/privacy", label: "Cookies & Privacy Policy" },
    ],
  },
  {
    title: "About",
    links: [
      { href: "/about", label: "Purpose" },
      { href: "/about#contact", label: "Contact Resolute" },
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
      <Container className="relative py-20 md:py-24">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="font-body text-[14px] uppercase tracking-[0.18em] text-white/40">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      prefetch
                      className="text-[17px] text-white/75 transition hover:text-white"
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
        <Container className="flex flex-col items-start gap-4 py-6 text-[15px] text-white/45 md:flex-row md:items-center">
          <Link
            href="/about"
            aria-label="Resolute Management Consultancy"
            className="shrink-0"
          >
            <Image
              src="/resolute-logo.png"
              alt="Resolute Management Consultancy"
              width={56}
              height={56}
              className="h-12 w-auto"
              priority={false}
            />
          </Link>
          <p className="leading-relaxed">
            A community service of the Digital &amp; AI Practice of{" "}
            <Link
              href="/about"
              className="text-white/65 underline-offset-4 transition hover:text-white/90 hover:underline"
            >
              Resolute Management Consultancy
            </Link>
            . &copy; {new Date().getFullYear()}. All product and company names
            belong to their respective owners.
          </p>
        </Container>
      </div>
    </footer>
  );
}
