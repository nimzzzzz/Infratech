import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { env } from "@/lib/env";
import { db } from "@/lib/db/client";
import { admins, type Admin } from "@/lib/db/schema";
import { getAdminByClerkUserId } from "@/lib/queries/admins";

export type AdminSession = {
  admin: Admin;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

/**
 * Resolve the current admin session.
 *
 * In demo mode (NEXT_PUBLIC_DEMO_MODE=true and not production) we return
 * the first admin row found in the DB so the admin UI is browsable
 * without going through Clerk. Outside demo mode we require a real
 * Clerk session whose publicMetadata.role === "admin"; the middleware
 * additionally enforces 2FA.
 */
export async function getAdminSession(): Promise<AdminSession> {
  if (env.DEMO_MODE) {
    const [admin] = await db.select().from(admins).limit(1);
    if (admin) {
      return {
        admin,
        user: {
          id: admin.clerkUserId,
          name: admin.name,
          email: admin.email,
        },
      };
    }
  }

  const { userId, sessionClaims } = await auth();
  if (!userId) redirect("/admin/login");

  const role = (sessionClaims?.publicMetadata as { role?: string } | undefined)
    ?.role;
  if (role !== "admin") redirect("/?error=forbidden");

  const admin = await getAdminByClerkUserId(userId);
  if (!admin) redirect("/admin/login?error=no_admin");

  return {
    admin,
    user: {
      id: userId,
      name: admin.name,
      email: admin.email,
    },
  };
}

export async function getAdminHeaderData(): Promise<{
  name: string;
  initials: string;
  email: string;
}> {
  try {
    const { userId } = await auth();
    if (userId) {
      const admin = await getAdminByClerkUserId(userId);
      if (admin) {
        return {
          name: admin.name,
          email: admin.email,
          initials: initialsOf(admin.name),
        };
      }
    }
  } catch {
    // Middleware not wired yet, or unauthenticated. Fall through.
  }

  if (env.DEMO_MODE) {
    const [admin] = await db.select().from(admins).limit(1);
    if (admin) {
      return {
        name: admin.name,
        email: admin.email,
        initials: initialsOf(admin.name),
      };
    }
  }

  return { name: "—", email: "—", initials: "—" };
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
