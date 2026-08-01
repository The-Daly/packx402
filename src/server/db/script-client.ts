import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { serverEnv } from "@/server/env.core";
import * as schema from "./schema";

/**
 * DB client for CLI scripts (seed, one-off migrations helpers) that run via tsx outside
 * the Next.js server bundle. Deliberately imports env.core, not env.ts — see the note in
 * drizzle.config.ts for why the `server-only` guard misfires outside Next's bundler.
 * App runtime code should import db/client.ts instead.
 */
const queryClient = postgres(serverEnv.DATABASE_URL, { max: 1 });
export const scriptDb = drizzle(queryClient, { schema });

export async function closeScriptDb() {
  await queryClient.end();
}
