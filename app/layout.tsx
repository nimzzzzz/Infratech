import type { Metadata, Viewport } from "next";
import { Alike, Pavanam } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { MainChrome } from "@/components/site/main-chrome";
import "./globals.css";

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
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "InfraTechDB";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — project management software, mapped`,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "An independent reference of project management and infrastructure software, organised by stage and capability. Browse the products running feasibility, delivery, and operations.",
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: `${SITE_NAME} — project management software, mapped`,
    description:
      "An independent reference of project management and infrastructure software, organised by stage and capability.",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#FAFAF7",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
          <MainChrome>{children}</MainChrome>
        </body>
      </html>
    </ClerkProvider>
  );
}
