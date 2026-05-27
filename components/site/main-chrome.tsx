"use client";

import { usePathname } from "next/navigation";
import { Header } from "./header";
import { Footer } from "./footer";

/**
 * Renders the public site chrome — header, main, footer — EXCEPT on auth
 * surfaces (/login, /dashboard/*, /admin/*, /sso-callback), which own
 * their own chrome via their layout.tsx files. The SSO callback page is
 * a short-lived OAuth-handoff surface that renders its own full-viewport
 * loading state; including it here would place the public footer at the
 * bottom of an otherwise-empty body (visible during cold-start sign-ins).
 */
export function MainChrome({
  children,
  isSignedIn = false,
}: {
  children: React.ReactNode;
  isSignedIn?: boolean;
}) {
  const pathname = usePathname();
  const isAuth =
    pathname.startsWith("/login") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/sso-callback");

  if (isAuth) {
    return <>{children}</>;
  }

  return (
    <>
      <Header isSignedIn={isSignedIn} />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
