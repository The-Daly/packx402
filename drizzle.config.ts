import { defineConfig } from "drizzle-kit";
// Deliberately imports env.core.ts, not env.ts: env.ts is guarded by the `server-only`
// package so it can never leak into a client bundle, but drizzle-kit runs as a
// standalone CLI outside the Next.js server-component boundary, where that guard misfires.
import { serverEnv } from "./src/server/env.core";

export default defineConfig({
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: serverEnv.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
