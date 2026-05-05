import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

/**
 * Pooled Drizzle client for application code (Server Components, Server
 * Actions, Route Handlers). Uses the Neon pooler endpoint so per-request
 * connection cost stays low.
 *
 * Migrations and the seed script use a separate unpooled client — the pooler
 * doesn't support the long-running prepared transactions Drizzle's migrator
 * issues.
 */
const dbUrl = env.database().DATABASE_URL;

const queryClient = postgres(dbUrl, { prepare: false });

export const db = drizzle(queryClient, { schema });

export type Database = typeof db;
