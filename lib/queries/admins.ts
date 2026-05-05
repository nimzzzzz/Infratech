import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { admins } from "@/lib/db/schema";

export async function getAdminByClerkUserId(clerkUserId: string) {
  const [row] = await db
    .select()
    .from(admins)
    .where(eq(admins.clerkUserId, clerkUserId))
    .limit(1);
  return row ?? null;
}

export const listAdmins = () =>
  db.select().from(admins).orderBy(admins.name);
