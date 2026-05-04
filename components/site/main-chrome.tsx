"use client";

import { usePathname } from "next/navigation";
import { Header } from "./header";
import { Footer } from "./footer";

/**
 * Renders the public site chrome — header, main, footer — EXCEPT on auth
 * surfaces (/login, /dashboard/*, /admin/*), which own their own chrome via
 * their layout.tsx files.
 */
export function MainChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth =
    pathname.startsWith("/login") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin");

  if (isAuth) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
