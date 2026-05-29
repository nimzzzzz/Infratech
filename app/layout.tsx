import type { Metadata, Viewport } from "next";
import { Alike, Pavanam } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { MainChrome } from "@/components/site/main-chrome";
import "./globals.css";

// The root layout reads auth() (added for the header-flicker fix), which
// requires the request context. That conflicts with statically-generated
// routes in the tree (e.g. /apps/[slug]) and surfaces as a 500 with
// digest DYNAMIC_SERVER_USAGE. Forcing dynamic rendering for the whole
// tree matches the auth() requirement. Trade-off: no edge-static caching
// for public pages — acceptable pre-launch; the proper fix is route
// groups isolating auth() to authenticated trees.
export const dynamic = "force-dynamic";

const alike = Alike({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-alike",
  display: "swap",
});

const pavanam = Pavanam({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-pavanam",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "Allinfratech";
const SITE_TITLE =
  "Allinfratech - repository of infrastructure-related technology products and companies";
const SITE_DESCRIPTION =
  "A repository of infrastructure-related technology products and companies.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#FAFAF7",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  return (
    <ClerkProvider>
      <html lang="en" className={`${alike.variable} ${pavanam.variable}`}>
        <body className="min-h-[100dvh] antialiased">
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-[var(--color-ink)] focus:px-3 focus:py-2 focus:text-sm focus:text-white"
          >
            Skip to content
          </a>
          <MainChrome isSignedIn={!!userId}>{children}</MainChrome>
        </body>
      </html>
    </ClerkProvider>
  );
}
