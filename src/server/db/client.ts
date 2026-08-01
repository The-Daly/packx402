import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { serverEnv } from "@/server/env";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  packx402PgClient?: postgres.Sql;
};

const queryClient =
  globalForDb.packx402PgClient ??
  postgres(serverEnv.DATABASE_URL, { max: serverEnv.NODE_ENV === "production" ? 10 : 5 });

if (serverEnv.NODE_ENV !== "production") {
  globalForDb.packx402PgClient = queryClient;
}

export const db = drizzle(queryClient, { schema });
export type Database = typeof db;
