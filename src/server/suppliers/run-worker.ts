import { scriptDb as db, closeScriptDb } from "@/server/db/script-client";
import { runSupplierPurchaseWorkerLoop } from "./purchase-worker";

/**
 * Entry point for the long-running supplier-purchase worker process (spec sections
 * 39-40) — run via `npm run worker:supplier-purchases`. Uses scriptDb (not the app's
 * client.ts) since this runs standalone via tsx, outside the Next.js server bundle — see
 * script-client.ts's own comment on why env.ts's `server-only` guard requires that split.
 *
 * This is a real, always-on worker process, not a request handler or cron job: deploy it
 * as its own long-running process (e.g. a separate container/dyno) alongside the Next.js
 * app, not as part of the web server's request-handling capacity.
 */
console.log("Supplier-purchase worker starting — polling every 5s when idle...");

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}, closing DB connection and exiting...`);
  await closeScriptDb();
  process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

runSupplierPurchaseWorkerLoop(db).catch(async (err) => {
  console.error("Supplier-purchase worker crashed:", err);
  await closeScriptDb();
  process.exit(1);
});
