import "server-only";

/**
 * Server-only environment validation. Importing this module from a client component
 * fails the build (via the `server-only` package) — that is the point: secrets must
 * never be reachable from client bundles. Use this from app runtime code (API routes,
 * server components, server actions). CLI scripts should import env.core.ts directly.
 */
export { serverEnv, type ServerEnv } from "./env.core";
